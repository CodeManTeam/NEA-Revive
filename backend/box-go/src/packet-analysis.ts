import { MuReadStream } from "mudb/stream"
import { decodeMessage, loadCapture } from "./capture"

const PROTOCOL_ORDER = [
  "netLog", "models", "gameNet", "gameClock", "input", "sound", "gameTerrain",
  "gameChat", "playerProtocol", "entityInteract", "dialog", "navigator", "ref",
  "rtc", "gui", "market", "teleport", "remoteChannel", "gameUI", "admin",
] as const

interface PacketEntry {
  id: number
  protocol: string
  message: string
  schema: any | null
}

interface PacketGroup {
  id: number
  protocol: string
  message: string
  count: number
  bytes: number
  decoded: number
  errors: number
  samples: unknown[]
}

export async function analyzePackets(path: string): Promise<object> {
  const capture = await loadCapture(path)
  const protocolPath = new URL("../protocol.ts", import.meta.url).href
  const protocols = await import(protocolPath) as Record<string, any>
  const sendTable = buildTable(protocols, "server")
  const receiveTable = buildTable(protocols, "client")
  const groups = new Map<string, PacketGroup>()

  for (const message of capture.messages) {
    if (message.direction !== "send" && message.direction !== "receive") continue
    const payload = decodeMessage(message)
    if (!(payload instanceof Uint8Array)) continue
    const stream = new MuReadStream(payload)
    let id: number
    try { id = stream.readVarint() } catch { continue }
    const table = message.direction === "send" ? sendTable : receiveTable
    const entry = table[id] ?? { id, protocol: "unknown", message: "unknown", schema: null }
    const key = `${message.direction}:${id}`
    let group = groups.get(key)
    if (!group) {
      group = { id, protocol: entry.protocol, message: entry.message, count: 0, bytes: 0, decoded: 0, errors: 0, samples: [] }
      groups.set(key, group)
    }
    group.count += 1
    group.bytes += payload.byteLength
    if (!entry.schema || entry.message === "raw") continue
    try {
      const value = stream.offset < stream.length
        ? entry.schema.patch(entry.schema.identity, stream)
        : entry.schema.clone(entry.schema.identity)
      group.decoded += 1
      if (group.samples.length < 3) group.samples.push(toSerializable(value))
      entry.schema.free(value)
    } catch {
      group.errors += 1
    }
  }

  return {
    capture: path,
    note: "mudb schema delta encoding; no packet encryption detected",
    groups: [...groups.entries()].map(([key, group]) => ({ direction: key.split(":")[0], ...group }))
      .sort((a, b) => b.count - a.count),
  }
}

function buildTable(protocols: Record<string, any>, side: "client" | "server"): PacketEntry[] {
  const table: PacketEntry[] = []
  for (const protocolName of PROTOCOL_ORDER) {
    const protocol = protocols[protocolName]
    if (!protocol) continue
    const messages = protocol[side] ?? {}
    for (const message of Object.keys(messages).sort()) {
      table.push({ id: table.length, protocol: protocol.name ?? protocolName, message, schema: messages[message] })
    }
    table.push({ id: table.length, protocol: protocol.name ?? protocolName, message: "raw", schema: null })
  }
  return table
}

function toSerializable(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value, (_key, item) => {
    if (ArrayBuffer.isView(item)) return Array.from(item as unknown as ArrayLike<number>)
    return item
  }))
}
