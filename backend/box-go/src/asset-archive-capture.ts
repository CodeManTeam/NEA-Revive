import { createHash } from "node:crypto"
import { existsSync } from "node:fs"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, isAbsolute, relative, resolve, sep } from "node:path"
import { chromium, type Response } from "playwright"

const defaultDurationMilliseconds = 120_000
const defaultMaximumBytes = 64 * 1024 * 1024
const defaultOutputDirectory = "dump/recovered-assets"
const opaqueKeyPattern = /^[A-Za-z0-9_-]{43}$/
const blockKeyPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,255}$/

type ResourceKind = "engine/m" | "avatar/m" | "block"

interface CaptureOptions {
  readonly pageUrl: string
  readonly outputDirectory: string
  readonly durationMilliseconds: number
  readonly maximumBytes: number
  readonly headed: boolean
  readonly waitForEnter: boolean
  readonly executablePath?: string
}

interface CapturedEntry {
  readonly kind: ResourceKind
  readonly key: string
  readonly file: string
  readonly bytes: number
  readonly sha256: string
  readonly contentType: string
}

interface SkippedEntry {
  readonly kind: ResourceKind
  readonly key: string
  readonly reason: string
}

class AssetCollector {
  readonly entries: CapturedEntry[] = []
  readonly skipped: SkippedEntry[] = []
  private readonly captured = new Set<string>()
  private readonly inFlight = new Map<string, Promise<void>>()

  constructor(
    private readonly outputDirectory: string,
    private readonly maximumBytes: number,
  ) {}

  capture(response: Response): Promise<void> {
    const target = captureTarget(response.url())
    if (!target) return Promise.resolve()
    const id = `${target.kind}/${target.key}`
    if (this.captured.has(id)) return Promise.resolve()
    const existing = this.inFlight.get(id)
    if (existing) return existing
    const task = this.captureResponse(response, target.kind, target.key)
      .catch(error => {
        this.recordSkip(target.kind, target.key, error instanceof Error ? error.message : "capture failed")
      })
      .finally(() => this.inFlight.delete(id))
    this.inFlight.set(id, task)
    return task
  }

  async finish(): Promise<void> {
    while (this.inFlight.size > 0) {
      await Promise.all([...this.inFlight.values()])
    }
  }

  async writeManifest(): Promise<string> {
    const root = resolve(this.outputDirectory)
    await mkdir(root, { recursive: true })
    const manifestPath = resolve(root, "manifest.json")
    const entries = [...this.entries].sort(compareEntries)
    const skipped = [...this.skipped].sort(compareSkipped)
    await writeFile(manifestPath, `${JSON.stringify({
      format: "box-go-private-asset-capture",
      version: 1,
      entries,
      skipped,
    }, null, 2)}\n`, "utf8")
    return manifestPath
  }

  private async captureResponse(response: Response, kind: ResourceKind, key: string): Promise<void> {
    const status = response.status()
    if (status < 200 || status >= 300) {
      this.recordSkip(kind, key, `HTTP ${status}`)
      return
    }
    const contentLength = Number(response.headers()["content-length"])
    if (Number.isFinite(contentLength) && contentLength > this.maximumBytes) {
      this.recordSkip(kind, key, `declared size exceeds ${this.maximumBytes} bytes`)
      return
    }
    let bytes: Buffer
    try {
      bytes = await response.body()
    } catch {
      this.recordSkip(kind, key, "response body was unavailable")
      return
    }
    if (bytes.byteLength > this.maximumBytes) {
      this.recordSkip(kind, key, `body exceeds ${this.maximumBytes} bytes`)
      return
    }
    const sha256 = createHash("sha256").update(bytes).digest("hex")
    const destination = outputPath(this.outputDirectory, kind, key)
    const file = relative(resolve(this.outputDirectory), destination).split(sep).join("/")
    await mkdir(dirname(destination), { recursive: true })
    try {
      const existing = await readFile(destination)
      const existingHash = createHash("sha256").update(existing).digest("hex")
      if (existingHash !== sha256) {
        this.recordSkip(kind, key, "existing file has a different SHA-256")
        return
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
      await writeFile(destination, bytes, { flag: "wx" })
    }
    this.captured.add(`${kind}/${key}`)
    this.entries.push({
      kind,
      key,
      file,
      bytes: bytes.byteLength,
      sha256,
      contentType: safeContentType(response.headers()["content-type"]),
    })
    console.log(`Captured ${kind}/${key} (${bytes.byteLength} bytes)`)
  }

  private recordSkip(kind: ResourceKind, key: string, reason: string): void {
    const normalized = reason.replace(/[\r\n]+/g, " ").slice(0, 160)
    if (!this.skipped.some(entry => entry.kind === kind && entry.key === key && entry.reason === normalized)) {
      this.skipped.push({ kind, key, reason: normalized })
    }
  }
}

function parseOptions(args: readonly string[]): CaptureOptions {
  let pageUrl: string | undefined
  let outputDirectory = defaultOutputDirectory
  let durationMilliseconds = defaultDurationMilliseconds
  let maximumBytes = defaultMaximumBytes
  let headed = true
  let waitForEnter = true
  let executablePath: string | undefined

  for (let index = 0; index < args.length; index++) {
    const argument = args[index]
    if (argument === "--url") {
      pageUrl = requiredValue(args, ++index, "--url")
    } else if (argument === "--out") {
      outputDirectory = requiredValue(args, ++index, "--out")
    } else if (argument === "--duration") {
      durationMilliseconds = positiveInteger(requiredValue(args, ++index, "--duration"), "--duration")
    } else if (argument === "--max-bytes") {
      maximumBytes = positiveInteger(requiredValue(args, ++index, "--max-bytes"), "--max-bytes")
    } else if (argument === "--browser") {
      executablePath = requiredValue(args, ++index, "--browser")
    } else if (argument === "--headless") {
      headed = false
      waitForEnter = false
    } else if (argument === "--no-wait") {
      waitForEnter = false
    } else if (argument === "--help") {
      printUsage()
      process.exit(0)
    } else {
      throw new Error(`Unknown option: ${argument}`)
    }
  }
  if (!pageUrl) throw new Error("--url is required")
  const parsedUrl = new URL(pageUrl)
  if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
    throw new Error("--url must use HTTP or HTTPS")
  }
  return {
    pageUrl,
    outputDirectory,
    durationMilliseconds,
    maximumBytes,
    headed,
    waitForEnter,
    executablePath,
  }
}

function captureTarget(rawUrl: string): { kind: ResourceKind; key: string } | undefined {
  let path: string
  try {
    path = new URL(rawUrl).pathname
  } catch {
    return undefined
  }
  const match = /^\/(engine\/m|avatar\/m|block)\/([^/]+)$/.exec(path)
  if (!match) return undefined
  const kindValue = match[1]
  const key = match[2]
  if (!kindValue || !key) return undefined
  const kind = kindValue as ResourceKind
  if ((kind === "engine/m" || kind === "avatar/m") && !opaqueKeyPattern.test(key)) return undefined
  if (kind === "block" && !blockKeyPattern.test(key)) return undefined
  return { kind, key }
}

function outputPath(root: string, kind: ResourceKind, key: string): string {
  const resolvedRoot = resolve(root)
  const candidate = resolve(resolvedRoot, kind, key)
  const local = relative(resolvedRoot, candidate)
  if (local === "" || local === ".." || local.startsWith(`..${sep}`) || isAbsolute(local)) {
    throw new Error("Capture destination escapes the output directory")
  }
  return candidate
}

function findBrowserExecutable(): string | undefined {
  const configured = process.env.BOX_GO_CAPTURE_BROWSER
  if (configured) return configured
  const candidates = [
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  ]
  return candidates.find(candidate => existsSync(candidate))
}

function requiredValue(args: readonly string[], index: number, option: string): string {
  const value = args[index]
  if (!value || value.startsWith("--")) throw new Error(`${option} requires a value`)
  return value
}

function positiveInteger(value: string, option: string): number {
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new Error(`${option} must be a positive integer`)
  return parsed
}

function safeContentType(value: string | undefined): string {
  if (!value) return "application/octet-stream"
  return value.replace(/[^\x20-\x7e]/g, "").slice(0, 200) || "application/octet-stream"
}

function compareEntries(left: CapturedEntry, right: CapturedEntry): number {
  return `${left.kind}/${left.key}`.localeCompare(`${right.kind}/${right.key}`)
}

function compareSkipped(left: SkippedEntry, right: SkippedEntry): number {
  return `${left.kind}/${left.key}/${left.reason}`.localeCompare(`${right.kind}/${right.key}/${right.reason}`)
}

async function waitForEnter(message: string): Promise<void> {
  if (!process.stdin.isTTY) {
    console.log("Standard input is not interactive; starting the capture window now.")
    return
  }
  process.stdout.write(`${message}\n`)
  await new Promise<void>(resolve => process.stdin.once("data", () => resolve()))
}

function printUsage(): void {
  console.log("Usage: npm run dump:assets -- --url <game-page-url> [--out <directory>] [--duration <milliseconds>] [--headless] [--no-wait] [--browser <path>]")
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2))
  const collector = new AssetCollector(options.outputDirectory, options.maximumBytes)
  const executablePath = options.executablePath ?? findBrowserExecutable()
  if (!executablePath) {
    throw new Error("No Chromium-based browser found. Pass --browser <path> or set BOX_GO_CAPTURE_BROWSER.")
  }
  const browser = await chromium.launch({
    headless: !options.headed,
    executablePath,
    args: ["--autoplay-policy=no-user-gesture-required", "--disable-dev-shm-usage"],
  })
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } })
    context.on("response", response => {
      void collector.capture(response)
    })
    const page = await context.newPage()
    console.log("Opening the game page in a disposable browser context.")
    try {
      await page.goto(options.pageUrl, { waitUntil: "domcontentloaded", timeout: 90_000 })
    } catch {
      throw new Error("Opening the game page failed. Check the URL and complete any required sign-in in headed mode.")
    }
    if (options.waitForEnter) {
      await waitForEnter("Enter the game, then press Enter here to start the capture window.")
    }
    await page.waitForTimeout(options.durationMilliseconds)
    await collector.finish()
    const manifestPath = await collector.writeManifest()
    console.log(`Captured ${collector.entries.length} resource bodies; manifest: ${manifestPath}`)
    if (collector.skipped.length > 0) {
      console.log(`Skipped ${collector.skipped.length} matching responses; inspect the sanitized manifest for reasons.`)
    }
  } finally {
    await browser.close()
  }
}

await main()
