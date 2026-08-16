import { createServer, type Server as HttpServer } from "node:http"
import { pathToFileURL } from "node:url"
import { MuServer } from "mudb"
import { MuWebSocketServer } from "mudb/socket/web/server"
import { box3Protocols, gameClock, gameNet } from "../protocol"

export interface CompatServerOptions {
  host?: string
  port?: number
  path?: string
  quiet?: boolean
}

export interface CompatServerHandle {
  host: string
  port: number
  path: string
  httpServer: HttpServer
  mudbServer: MuServer
  close(): Promise<void>
}

interface RuntimeStats {
  startedAt: string
  connections: number
  messages: number
  byProtocol: Record<string, number>
  byMessage: Record<string, number>
}

export async function startCompatServer(options: CompatServerOptions = {}): Promise<CompatServerHandle> {
  const host = options.host ?? "127.0.0.1"
  const requestedPort = options.port ?? Number(process.env.BOX3_COMPAT_PORT ?? 8080)
  const path = options.path ?? "/ws"
  const log = options.quiet ? () => undefined : console.log
  const logger = options.quiet ? { log() {}, error() {}, exception() {} } : undefined
  const stats: RuntimeStats = {
    startedAt: new Date().toISOString(),
    connections: 0,
    messages: 0,
    byProtocol: {},
    byMessage: {},
  }

  const httpServer = createServer((request, response) => {
    if (request.url === "/api/status") {
      response.writeHead(200, { "content-type": "application/json; charset=utf-8" })
      response.end(JSON.stringify({ ...stats, protocols: box3Protocols.map(protocol => protocol.name) }))
      return
    }
    response.writeHead(200, { "content-type": "text/plain; charset=utf-8" })
    response.end(`Box3 compatibility server\nWebSocket: ${path}\n`)
  })

  const socketServer = new MuWebSocketServer({ server: httpServer, path, logger })
  const mudbServer = new MuServer(socketServer, logger)

  for (const schema of box3Protocols) {
    const protocol = mudbServer.protocol(schema as any)
    const handlers: Record<string, (client: any, data: unknown, unreliable: boolean) => void> = {}

    for (const messageName of Object.keys(schema.server)) {
      handlers[messageName] = (_client, _data, unreliable) => {
        recordMessage(stats, schema.name, messageName)
        log(`[${schema.name}] ${messageName}${unreliable ? " (unreliable)" : ""}`)
      }
    }

    if (schema === gameClock) {
      handlers.ping = (client, clientClock) => {
        recordMessage(stats, schema.name, "ping")
        client.message.pong({
          clientClock,
          serverClock: Date.now(),
          frameSkip: 0,
        })
      }
    }

    if (schema === gameNet) {
      handlers.join = client => {
        recordMessage(stats, schema.name, "join")
        log(`[session] join ${shortSession(client.sessionId)}`)
      }
      handlers.synchronize = client => {
        recordMessage(stats, schema.name, "synchronize")
        log(`[session] synchronize ${shortSession(client.sessionId)}`)
      }
    }

    protocol.configure({
      message: handlers as any,
      raw: (client: any, data: Uint8Array | string, unreliable: boolean) => {
        recordMessage(stats, schema.name, "raw")
        const bytes = typeof data === "string" ? data.length : data.byteLength
        log(`[${schema.name}] raw ${bytes} bytes${unreliable ? " (unreliable)" : ""} from ${shortSession(client.sessionId)}`)
      },
      connect: client => {
        if (schema === box3Protocols[0]) {
          stats.connections += 1
          log(`[session] connected ${shortSession(client.sessionId)}`)
        }
      },
      disconnect: client => {
        if (schema === box3Protocols[0]) log(`[session] disconnected ${shortSession(client.sessionId)}`)
      },
    })
  }

  const mudbReady = new Promise<void>((resolve, reject) => {
    mudbServer.start({ ready: resolve, close: reject })
  })
  await new Promise<void>((resolve, reject) => {
    httpServer.once("error", reject)
    httpServer.listen(requestedPort, host, () => {
      httpServer.off("error", reject)
      resolve()
    })
  })
  await mudbReady

  const address = httpServer.address()
  if (!address || typeof address === "string") throw new Error("Compatibility server did not bind a TCP port")
  log(`Box3 compatibility server: http://${host}:${address.port}`)
  log(`Box3 WebSocket endpoint: ws://${host}:${address.port}${path}`)

  return {
    host,
    port: address.port,
    path,
    httpServer,
    mudbServer,
    async close() {
      if (mudbServer.running) mudbServer.destroy()
      await new Promise<void>(resolve => httpServer.close(() => resolve()))
    },
  }
}

function recordMessage(stats: RuntimeStats, protocol: string, message: string): void {
  stats.messages += 1
  stats.byProtocol[protocol] = (stats.byProtocol[protocol] ?? 0) + 1
  const key = `${protocol}.${message}`
  stats.byMessage[key] = (stats.byMessage[key] ?? 0) + 1
}

function shortSession(value: string): string {
  if (value.length <= 12) return value
  return `${value.slice(0, 6)}...${value.slice(-4)}`
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = await startCompatServer()
  const shutdown = async () => {
    await server.close()
    process.exit(0)
  }
  process.once("SIGINT", shutdown)
  process.once("SIGTERM", shutdown)
}
