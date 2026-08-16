import { mkdirSync } from "node:fs"
import { writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { chromium } from "playwright"
import { loadCapture, type CapturedMessage, type CapturedSocket } from "./capture"

interface BrowserCaptureOptions {
  sourceCapturePath: string
  durationMs?: number
}

export async function runBrowserCapture(options: BrowserCaptureOptions): Promise<string> {
  const source = await loadCapture(options.sourceCapturePath)
  const durationMs = options.durationMs ?? Number(process.env.BOX_GO_CAPTURE_MS ?? 45_000)
  const sockets: CapturedSocket[] = []
  const messages: CapturedMessage[] = []
  const resources = new Map<string, { name: string; initiatorType: string; size: number }>()
  const errors: string[] = []
  const startedAt = new Date().toISOString()

  const browser = await chromium.launch({
    headless: process.env.BOX_GO_HEADED !== "1",
    executablePath: process.env.BOX_GO_CHROME || "C:/tmp/ms-playwright/chromium-1228/chrome-win64/chrome.exe",
    args: ["--autoplay-policy=no-user-gesture-required", "--disable-dev-shm-usage"],
  })
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  const page = await context.newPage()

  page.on("response", response => {
    const request = response.request()
    resources.set(response.url(), {
      name: response.url(),
      initiatorType: request.resourceType(),
      size: Number(response.headers()["content-length"] ?? 0),
    })
  })
  page.on("pageerror", error => errors.push(error.message.slice(0, 500)))
  page.on("websocket", socket => {
    const id = sockets.length
    const parsed = new URL(socket.url())
    sockets.push({ id, url: socket.url(), sid: parsed.searchParams.get("sid"), createdAt: new Date().toISOString() })
    socket.on("framesent", event => messages.push(frame(id, "send", event.payload)))
    socket.on("framereceived", event => messages.push(frame(id, "receive", event.payload)))
    socket.on("close", () => messages.push({ id, direction: "event", type: "close", at: Date.now() }))
    socket.on("socketerror", error => errors.push(String(error).slice(0, 500)))
  })

  try {
    await page.goto(source.pageUrl, { waitUntil: "domcontentloaded", timeout: 60_000 })
    await page.waitForTimeout(5_000)
    const canvas = page.locator("canvas").first()
    if (await canvas.count()) {
      await canvas.click({ position: { x: 20, y: 20 }, force: true }).catch(() => undefined)
      await page.keyboard.press("KeyW").catch(() => undefined)
    } else {
      await page.locator("body").click({ position: { x: 100, y: 100 }, force: true }).catch(() => undefined)
    }
    await page.waitForTimeout(durationMs)
    await page.screenshot({ path: resolve("dump", "browser-test.png"), fullPage: true })
  } finally {
    await browser.close()
  }

  const outputDirectory = resolve("dump", "downloaded")
  mkdirSync(outputDirectory, { recursive: true })
  const outputPath = resolve(outputDirectory, `box-go-browser-${new Date().toISOString().replace(/[:.]/g, "-")}.json`)
  await writeFile(outputPath, JSON.stringify({
    format: "box-go-capture",
    version: 1,
    startedAt,
    pageUrl: source.pageUrl,
    sockets,
    messages,
    resources: [...resources.values()],
    errors,
    title: await page.title().catch(() => ""),
    finalUrl: page.url(),
    bytes: messages.reduce((sum, message) => sum + (message.bytes ?? 0), 0),
  }), "utf8")
  return outputPath
}

function frame(id: number, direction: "send" | "receive", payload: string | Buffer): CapturedMessage {
  if (typeof payload === "string") return { id, direction, kind: "text", data: payload, at: Date.now() }
  return { id, direction, kind: "binary", bytes: payload.byteLength, base64: payload.toString("base64"), at: Date.now() }
}
