import { existsSync, readdirSync, statSync } from "node:fs"
import { readFile } from "node:fs/promises"
import { join, resolve } from "node:path"

export interface CapturedSocket {
  id: number
  url: string
  sid?: string | null
  createdAt?: string
}

export interface CapturedMessage {
  id: number
  direction: "send" | "receive" | "event"
  kind?: "text" | "binary"
  type?: string
  data?: string
  base64?: string
  bytes?: number
  at: number
}

export interface CaptureFile {
  format: "box-go-capture"
  version: number
  startedAt: string
  pageUrl: string
  sockets: CapturedSocket[]
  messages: CapturedMessage[]
  resources: Array<{ name: string; initiatorType?: string; size?: number }>
}

export interface CaptureSummary {
  path: string
  pageUrl: string
  startedAt: string
  sockets: number
  messages: number
  sent: number
  received: number
  binaryBytes: number
  resources: number
  durationMs: number
}

const DEFAULT_CAPTURE_DIR = resolve("dump", "downloaded")

export function findLatestCapture(directory = DEFAULT_CAPTURE_DIR): string {
  if (!existsSync(directory)) throw new Error(`Capture directory not found: ${directory}`)
  const files = readdirSync(directory)
    .filter(name => /^box-go-.*\.json$/.test(name) && !name.includes("manifest"))
    .map(name => join(directory, name))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
  if (!files[0]) throw new Error(`No capture JSON found in ${directory}`)
  return files[0]
}

export async function loadCapture(path: string): Promise<CaptureFile> {
  const capture = JSON.parse(await readFile(path, "utf8")) as CaptureFile
  if (capture.format !== "box-go-capture" || !Array.isArray(capture.messages)) {
    throw new Error(`Unsupported capture file: ${path}`)
  }
  return capture
}

export async function analyzeCapture(path: string): Promise<CaptureSummary> {
  const capture = await loadCapture(path)
  const times = capture.messages.map(message => message.at).filter(Number.isFinite)
  return {
    path: resolve(path),
    pageUrl: redactUrl(capture.pageUrl),
    startedAt: capture.startedAt,
    sockets: capture.sockets.length,
    messages: capture.messages.length,
    sent: capture.messages.filter(message => message.direction === "send").length,
    received: capture.messages.filter(message => message.direction === "receive").length,
    binaryBytes: capture.messages.reduce((sum, message) => sum + (message.bytes ?? 0), 0),
    resources: capture.resources.length,
    durationMs: times.length > 1 ? Math.max(...times) - Math.min(...times) : 0,
  }
}

export function decodeMessage(message: CapturedMessage): Uint8Array | string | null {
  if (message.kind === "text") return message.data ?? ""
  if (message.kind === "binary" && message.base64) return new Uint8Array(Buffer.from(message.base64, "base64"))
  return null
}

function redactUrl(value: string): string {
  try {
    const url = new URL(value)
    if (url.searchParams.has("token")) url.searchParams.set("token", "[redacted]")
    if (url.searchParams.has("sid")) url.searchParams.set("sid", "[redacted]")
    return url.toString()
  } catch {
    return value
  }
}
