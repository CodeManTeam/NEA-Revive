import assert from "node:assert/strict";
import { createServer } from "node:net";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { dirname, resolve } from "node:path";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const backendEntry = resolve(projectRoot, "Backend/local-player/backend/start.cjs");
const archiveRoot = resolve(projectRoot, "Backend/local-player/archive");
const controlToken = "contract-test-token";

test("local Player control bridge exposes its authenticated error contract", async () => {
  const controlPort = await findFreePort();
  const child = spawn(process.execPath, [backendEntry], {
    cwd: resolve(projectRoot, "Backend/local-player/backend"),
    env: {
      ...process.env,
      BOX3_PORT: "0",
      BOX3_ASSET_ROOT: archiveRoot,
      BOX3_WORLD_MANIFEST: "world-bedwars.json",
      BOX3_CONTROL_PORT: String(controlPort),
      BOX3_CONTROL_TOKEN: controlToken,
      BOX3_DISABLE_LEGACY_GAMEPLAY: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    await waitForOutput(child, "[nea-control] listening", 15_000);
    await assertResponse(controlPort, "/__nea/control/player-state", { expectedStatus: 401 });
    await assertResponse(controlPort, "/__nea/control/player-state", {
      expectedStatus: 400,
      token: controlToken,
      method: "GET",
      query: { session: "" },
      expectedError: "session is required",
    });
    await assertResponse(controlPort, "/__nea/control/send-client-event", {
      expectedStatus: 400,
      token: controlToken,
      body: { session: "", event: { type: "test" } },
      expectedError: "session and event are required",
    });
    await assertResponse(controlPort, "/__nea/control/unknown", {
      expectedStatus: 404,
      token: controlToken,
      body: {},
      expectedError: "not found",
    });
  } finally {
    child.kill("SIGTERM");
    await once(child, "exit");
  }
});

async function findFreePort() {
  const probe = createServer();
  await new Promise(resolveListen => probe.listen(0, "127.0.0.1", resolveListen));
  const port = probe.address().port;
  await new Promise((resolveClose, rejectClose) => probe.close(error => error ? rejectClose(error) : resolveClose()));
  return port;
}

function waitForOutput(child, marker, timeoutMS) {
  return new Promise((resolveOutput, rejectOutput) => {
    let output = "";
    const timer = setTimeout(() => {
      cleanup();
      rejectOutput(new Error(`backend did not announce control bridge: ${output}`));
    }, timeoutMS);
    const onData = chunk => {
      output += chunk.toString();
      if (!output.includes(marker)) return;
      cleanup();
      resolveOutput();
    };
    const onExit = () => {
      cleanup();
      rejectOutput(new Error(`backend exited before announcing control bridge: ${output}`));
    };
    const cleanup = () => {
      clearTimeout(timer);
      child.stdout.off("data", onData);
      child.off("exit", onExit);
    };
    child.stdout.on("data", onData);
    child.once("exit", onExit);
  });
}

async function assertResponse(port, path, options) {
  const url = new URL(`http://127.0.0.1:${port}${path}`);
  for (const [name, value] of Object.entries(options.query ?? {})) url.searchParams.set(name, value);
  const response = await fetch(url, {
    method: options.method ?? "POST",
    headers: {
      ...(options.token === undefined ? {} : { authorization: `Bearer ${options.token}` }),
      ...(options.body === undefined ? {} : { "content-type": "application/json" }),
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
  const result = await response.json();
  assert.equal(response.status, options.expectedStatus);
  if (options.expectedError !== undefined) assert.equal(result.error, options.expectedError);
}
