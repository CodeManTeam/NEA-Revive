const esbuild = require(process.argv[2]);
const { patchGenericRemoteChannelBundle } = require("./patch-generic-remote-channel.cjs");
const { applyBackendCompatPatch } = require("./apply-backend-compat-patch.cjs");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const sourceRoot = process.argv[3];
const cliRoot = join(sourceRoot, "legacy/box3-compat/src");
const originalCliSource = readFileSync(join(cliRoot, "cli.ts"), "utf8")
  .replace(/\nif \(process\.argv\[1\][\s\S]*$/u, "");
const clientScriptStatement = "  const clientScripts = projectRoot ? Object.freeze({}) : await loadClientScriptModules(config.assetRoot)";
const withClientManifest = originalCliSource.replace(clientScriptStatement, `  const clientScriptManifest = process.env.BOX3_CLIENT_SCRIPT_MANIFEST
  const clientScripts = projectRoot && !clientScriptManifest
    ? Object.freeze({})
    : await loadClientScriptModules(config.assetRoot, clientScriptManifest)`);
if (withClientManifest === originalCliSource) throw new Error("Unable to inject external client script manifest support");
const withControlImport = withClientManifest.replace(
  'import { pathToFileURL } from "node:url"',
  'import { pathToFileURL } from "node:url"\nimport { createServer as createNeaControlServer, type Server as NeaControlServer } from "node:http"',
);
if (withControlImport === withClientManifest) throw new Error("Unable to inject control bridge import");
const withControlStart = withControlImport.replace(
  "  if (projectRoot) logger.info(`Player compatibility project package: ${projectRoot}`)",
  "  const neaControlServer = await startNeaControlBridge(server, logger)\n  if (projectRoot) logger.info(`Player compatibility project package: ${projectRoot}`)",
);
if (withControlStart === withControlImport) throw new Error("Unable to start control bridge");
const withControlStop = withControlStart.replace(
  "    await server.stop()",
  "    await stopNeaControlBridge(neaControlServer)\n    await server.stop()",
);
if (withControlStop === withControlStart) throw new Error("Unable to stop control bridge");
const cliSource = `${withControlStop}\n\n${controlBridgeSource()}`;

esbuild.build({
  stdin: {
    contents: `${cliSource}\nmain().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});`,
    loader: "ts",
    resolveDir: cliRoot,
    sourcefile: "bundled-cli.ts",
  },
  absWorkingDir: process.argv[3],
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node24",
  outfile: process.argv[4],
  logLevel: "warning",
  plugins: [{
    name: "nea-demo-remote-event-log",
    setup(build) {
      build.onLoad({ filter: /wire[\\/]protocols\.ts$/ }, args => {
        const original = readFileSync(args.path, "utf8");
        const marker = /        uiTree: new MuDictionary\(new MuStruct\(\{[\s\S]*?\r?\n        \}\)\)/u;
        const replacement = `        uiTree: new MuDictionary(new MuStruct({
          type: new MuVarint(),
          childrenIds: new MuArray(new MuASCII()),
          id: new MuASCII(),
          name: new MuUTF8(),
          parentId: new MuASCII(),
          value: new MuOption(new MuUnion({
            screen: screenSchema,
            element: elementUnion,
          }))
        }), Number.POSITIVE_INFINITY, {
          ROOT_ID: {
            type: 0,
            childrenIds: ["DEFAULT_SCREEN_ID"],
            id: "ROOT_ID",
            name: "Root",
            parentId: "",
            value: { type: "", data: undefined },
          },
          DEFAULT_SCREEN_ID: {
            type: 2,
            childrenIds: [],
            id: "DEFAULT_SCREEN_ID",
            name: "screen",
            parentId: "ROOT_ID",
            value: {
              type: "screen",
              data: { zIndex: 1, enable: true, layout: { type: "none", data: undefined } },
            },
          },
        })`;
        const contents = original.replace(marker, replacement);
        if (contents === original) throw new Error("Unable to inject historical gameUI identity");
        return { contents, loader: "ts" };
      });
      build.onLoad({ filter: /remote-channel\.ts$/ }, args => {
        const original = readFileSync(args.path, "utf8");
        const marker = "      const handled = context.bedwarsRemoteSessions?.handleServerEvent(client, data) ?? false";
        const contents = original.replace(marker, `${marker}
      if (process.env.BOX3_LOG_REMOTE_EVENTS === "1") {
        context.logger.info(\`[remote-channel:event] \${shortSession(client.sessionId)} \${JSON.stringify(data)}\`)
      }`);
        if (contents === original) throw new Error("Unable to inject remote-channel event logging");
        return { contents, loader: "ts" };
      });
      build.onLoad({ filter: /session[\\/]bedwars-remote\.ts$/ }, args => {
        const original = readFileSync(args.path, "utf8");
        const marker = "  /** Opens a recovered server-side interaction panel for this client. */";
        const method = `  /** Loopback control ingress for project Script Runtime events. */
  sendExternalEvent(sessionLabel: string, event: Record<string, unknown>): boolean {
    const session = [...this.sessions.values()].find(candidate => {
      if (candidate.sessionId === sessionLabel) return true
      if (candidate.sessionId.length <= 12) return candidate.sessionId === sessionLabel
      return candidate.sessionId.slice(0, 6) + "..." + candidate.sessionId.slice(-4) === sessionLabel
    })
    if (!session?.client) return false
    const sender = session.client.message.sendClientEvent
    if (typeof sender !== "function") return false
    ;(sender as (payload: { tick: number; args: string }) => void)({
      tick: session.nextTick++,
      args: JSON.stringify(event),
    })
    return true
  }

`;
        const contents = original.replace(marker, `${method}${marker}`);
        if (contents === original) throw new Error("Unable to inject external remote event sender");
        return { contents, loader: "ts" };
      });
      build.onLoad({ filter: /app[\\/]box3-server\.ts$/ }, args => {
        const original = readFileSync(args.path, "utf8");
        const marker = /  \/\*\*\r?\n   \* Host-only ingress for the recovered player-protocol profile-dialog frame\./u;
        const method = `  /** Loopback-only ingress used by the NEA Script Runtime bridge. */
  sendRemoteClientEvent(sessionLabel: string, event: Record<string, unknown>): boolean {
    if (!this.running) return false
    return this.historicalProjectInstance?.bedwarsRemoteSessions?.sendExternalEvent(sessionLabel, event) ?? false
  }

  sendChatMessage(sessionId: string | undefined, message: unknown): number | boolean {
    if (!this.running) return false
    return this.historicalProjectInstance?.sendChatMessage(sessionId, message) ?? false
  }

  sendChatMessages(deliveries: unknown): number | boolean {
    if (!this.running) return false
    return this.historicalProjectInstance?.sendChatMessages(deliveries) ?? false
  }

  playerRuntimeState(sessionLabel: string): Record<string, unknown> | undefined {
    if (!this.running) return undefined
    return this.historicalProjectInstance?.playerRuntimeState(sessionLabel)
  }

  queuePlayerRuntimeState(sessionLabel: string, state: Record<string, unknown>): boolean {
    if (!this.running) return false
    return this.historicalProjectInstance?.queuePlayerRuntimeState(sessionLabel, state) ?? false
  }

`;
        const contents = original.replace(marker, match => `${method}${match}`);
        if (contents === original) throw new Error("Unable to inject Box3 remote event ingress");
        return { contents, loader: "ts" };
      });
      build.onLoad({ filter: /app[\\/]legacy-historical-project-instance\.ts$/ }, args => {
        const original = readFileSync(args.path, "utf8");
        const marker = '    const bedwarsEnabled = options.world.gameplayMode !== "base"';
        const withRemoteSessions = original.replace(
          marker,
          '    const bedwarsEnabled = options.world.gameplayMode !== "base" || process.env.BOX3_ENABLE_REMOTE_SESSIONS === "1"',
        );
        if (withRemoteSessions === original) throw new Error("Unable to enable opt-in remote sessions for base worlds");
        const methodMarker = "  /** Starts services whose timers must begin only after the gateway is listening. */";
        const methods = `  playerRuntimeState(sessionLabel: string): Record<string, unknown> | undefined {
    const frame = this.gameRuntime.snapshot()
    const player = frame.players.find(candidate => candidate.sessionId === sessionLabel
      || (candidate.sessionId.length > 12 && candidate.sessionId.slice(0, 6) + "..." + candidate.sessionId.slice(-4) === sessionLabel))
    if (!player) return undefined
    return { tick: frame.tick, playerId: player.playerId, position: player.position, velocity: player.velocity, bodyHalfExtents: player.bodyHalfExtents, bodyShapeHalfExtents: player.bodyShapeHalfExtents, ...neaPlayerPublicState(player) }
  }

  queuePlayerRuntimeState(sessionLabel: string, state: Record<string, unknown>): boolean {
    const frame = this.gameRuntime.snapshot()
    const player = frame.players.find(candidate => candidate.sessionId === sessionLabel
      || (candidate.sessionId.length > 12 && candidate.sessionId.slice(0, 6) + "..." + candidate.sessionId.slice(-4) === sessionLabel))
    if (!player) return false
    return this.gameRuntime.enqueueInput(player.sessionId, {
      kind: "temporary-legacy-position-transform",
      position: state.position ?? player.position,
      velocity: state.velocity ?? player.velocity,
      ...neaPlayerPublicState(state),
    })
  }

`;
        const contents = withRemoteSessions.replace(methodMarker, `${methods}${methodMarker}`);
        if (contents === withRemoteSessions) throw new Error("Unable to inject authoritative player state bridge");
        return { contents, loader: "ts" };
      });
      build.onLoad({ filter: /register-protocols\.ts$/ }, args => {
        const original = readFileSync(args.path, "utf8");
        const marker = "        context.stats.record(schema.name, messageName)";
        const withGameUiImport = original.replace("  gameTerrain,\n  models,", "  gameTerrain,\n  gameUI,\n  models,");
        if (withGameUiImport === original) throw new Error("Unable to inject gameUI import");
        const connectMarker = "        if (schema === gameTerrain) context.projectBootstrapSessions.connectTerrain(client)";
        const withMinimalUi = withGameUiImport.replace(connectMarker, `${connectMarker}
        if (schema === gameUI && process.env.BOX3_MINIMAL_GAME_UI === "1") {
          const reset = client.message.reset
          if (typeof reset === "function") reset({
            running: true,
            defaultScreenId: "DEFAULT_SCREEN_ID",
            pictureAssets: {},
            uiTree: {
              ROOT_ID: {
                type: 0,
                childrenIds: ["DEFAULT_SCREEN_ID"],
                id: "ROOT_ID",
                name: "Root",
                parentId: "",
                value: { type: "", data: undefined },
              },
              DEFAULT_SCREEN_ID: {
                type: 2,
                childrenIds: [],
                id: "DEFAULT_SCREEN_ID",
                name: "screen",
                parentId: "ROOT_ID",
                value: {
                  type: "screen",
                  data: { zIndex: 1, enable: true, layout: { type: "none", data: undefined } },
                },
              },
            },
          })
        }`);
        if (withMinimalUi === withGameUiImport) throw new Error("Unable to inject minimal gameUI reset");
        const contents = withMinimalUi.replace(marker, `${marker}
        if (process.env.BOX3_LOG_NET_EVENTS === "1" && schema === box3Protocols[0]) {
          context.logger.info(\`[net-log:event] \${shortSession(client.sessionId)} \${JSON.stringify(data)}\`)
        }`);
        if (contents === withMinimalUi) throw new Error("Unable to inject net-log event logging");
        return { contents, loader: "ts" };
      });
    },
  }],
}).then(() => {
  patchGenericRemoteChannelBundle(process.argv[4]);
  applyBackendCompatPatch(process.argv[4]);
}).catch(error => {
  console.error(error);
  process.exitCode = 1;
});

function controlBridgeSource() {
  return String.raw`
async function startNeaControlBridge(server: Box3Server, logger: ReturnType<typeof createConsoleLogger>): Promise<NeaControlServer | undefined> {
  const token = process.env.BOX3_CONTROL_TOKEN
  const portText = process.env.BOX3_CONTROL_PORT
  if (!token || !portText) return undefined
  const port = Number(portText)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("BOX3_CONTROL_PORT must be a valid TCP port")
  const controlServer = createNeaControlServer(async (request, response) => {
    response.setHeader("content-type", "application/json; charset=utf-8")
    if (request.socket.remoteAddress !== "127.0.0.1" && request.socket.remoteAddress !== "::1") {
      response.statusCode = 403
      response.end(JSON.stringify({ ok: false, error: "loopback only" }))
      return
    }
    if (request.headers.authorization !== "Bearer " + token) {
      response.statusCode = 401
      response.end(JSON.stringify({ ok: false, error: "unauthorized" }))
      return
    }
    try {
      const url = new URL(request.url ?? "/", "http://127.0.0.1")
      if (request.method === "GET" && url.pathname === "/__nea/control/player-state") {
        const session = url.searchParams.get("session")
        if (!session) throw new Error("session is required")
        const state = server.playerRuntimeState(session)
        response.statusCode = state ? 200 : 404
        response.end(JSON.stringify(state ? { ok: true, state } : { ok: false, error: "player state not found" }))
        return
      }
      const chunks: Buffer[] = []
      let bytes = 0
      for await (const chunk of request) {
        bytes += chunk.length
        if (bytes > 64 * 1024) throw new Error("request body too large")
        chunks.push(chunk)
      }
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>
      if (request.method === "POST" && url.pathname === "/__nea/control/send-client-event") {
        if (typeof body.session !== "string" || body.session.length === 0 || !body.event || typeof body.event !== "object" || Array.isArray(body.event)) {
          throw new Error("session and event are required")
        }
        const delivered = server.sendRemoteClientEvent(body.session, body.event as Record<string, unknown>)
        response.statusCode = delivered ? 200 : 404
        response.end(JSON.stringify(delivered ? { ok: true } : { ok: false, error: "session not connected" }))
        return
      }
      if (request.method === "POST" && url.pathname === "/__nea/control/player-state") {
        if (typeof body.session !== "string" || body.session.length === 0 || !body.state || typeof body.state !== "object" || Array.isArray(body.state)) {
          throw new Error("session and state are required")
        }
        const state = body.state as Record<string, unknown>
        if (state.position !== undefined && !isNeaVector(state.position)) throw new Error("position must be a finite vector")
        if (state.velocity !== undefined && !isNeaVector(state.velocity)) throw new Error("velocity must be a finite vector")
        for (const field of neaPlayerPublicNumberFields) {
          if (state[field] !== undefined && !isNeaPlayerPublicNumber(state[field])) throw new Error(field + " must be a finite number from 0 to 1024")
        }
        const queued = server.queuePlayerRuntimeState(body.session, state)
        response.statusCode = queued ? 202 : 404
        response.end(JSON.stringify(queued ? { ok: true, queued: true } : { ok: false, error: "player state not found" }))
        return
      }
      response.statusCode = 404
      response.end(JSON.stringify({ ok: false, error: "not found" }))
    } catch (error) {
      response.statusCode = 400
      response.end(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }))
    }
  })
  await new Promise<void>((resolve, reject) => {
    controlServer.once("error", reject)
    controlServer.listen(port, "127.0.0.1", () => {
      controlServer.off("error", reject)
      resolve()
    })
  })
  logger.info("[nea-control] listening on 127.0.0.1:" + port)
  return controlServer
}

async function stopNeaControlBridge(server: NeaControlServer | undefined): Promise<void> {
  if (!server?.listening) return
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
}

function isNeaVector(value: unknown): value is readonly [number, number, number] {
  return Array.isArray(value) && value.length === 3 && value.every(component => typeof component === "number" && Number.isFinite(component))
}

const neaPlayerPublicNumberFields = Object.freeze([
  "walkSpeed",
  "runSpeed",
  "runAcceleration",
  "jumpPower",
  "jumpSpeedFactor",
  "jumpAccelerationFactor",
  "doubleJumpPower",
  "crouchSpeed",
  "crouchAcceleration",
  "flySpeed",
  "flyAcceleration",
  "swimAcceleration",
  "swimSpeed",
  "walkAcceleration",
])

function isNeaPlayerPublicNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1024
}

function neaPlayerPublicState(source: Record<string, unknown>): Record<string, number> {
  const state: Record<string, number> = {}
  for (const field of neaPlayerPublicNumberFields) {
    const value = source[field]
    if (isNeaPlayerPublicNumber(value)) state[field] = value
  }
  return state
}
`;
}
