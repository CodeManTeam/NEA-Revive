import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import vm from "node:vm";

import { receiveNativePlayerTerrainReset } from "./support/native-player-session.mjs";
import { createDemoClientRuntimeFixture } from "./support/demo-client-runtime-fixture.mjs";

const DEFAULT_FIXTURE_CONTENT_ID = "100110008";

test("native Player starts from an isolated build root and serves the client script", { timeout: 30_000 }, async () => {
  const playerPort = await freePort();
  const controlPort = await freePort();
  const buildRoot = await mkdtemp(join(tmpdir(), "nea-native-player-"));
  const child = spawn(process.execPath, ["src/server.mjs"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NEA_DEMO_PORT: String(playerPort),
      NEA_DEMO_CONTROL_PORT: String(controlPort),
      NEA_DEMO_BUILD_ROOT: buildRoot,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", chunk => { output += chunk; });
  child.stderr.on("data", chunk => { output += chunk; });
  try {
    const status = await waitForStatus(playerPort);
    assert.equal(status.world, "project-package-v1");
    assert.deepEqual(status.clientScriptModules, ["clientIndex.js"]);
    assert.equal(status.localClient.pagePath, "/p/local-bedwars");
    assert.ok(status.protocols.includes("remote-channel"));
    const page = await fetch(`http://127.0.0.1:${playerPort}/play/nea-script-lab?contentId=100110008`);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /id="GameIframe"/);
  } catch (error) {
    error.message += `\n${output.slice(-4000)}`;
    throw error;
  } finally {
    stopProcessTree(child);
    await rm(buildRoot, { recursive: true, force: true });
  }
});

test("native Player derives the launcher route from an imported Showcase id", { timeout: 30_000 }, async () => {
  const playerPort = await freePort();
  const controlPort = await freePort();
  const buildRoot = await mkdtemp(join(tmpdir(), "nea-showcase-player-"));
  const sourceRoot = join(process.cwd(), "showcase");
  const child = spawn(process.execPath, ["src/server.mjs"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NEA_DEMO_PORT: String(playerPort),
      NEA_DEMO_CONTROL_PORT: String(controlPort),
      NEA_DEMO_BUILD_ROOT: buildRoot,
      NEA_DEMO_SOURCE_ROOT: sourceRoot,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", chunk => { output += chunk; });
  child.stderr.on("data", chunk => { output += chunk; });
  try {
    const status = await waitForStatus(playerPort);
    assert.equal(status.localClient.pagePath, "/p/local-bedwars");
    const page = await fetch(`http://127.0.0.1:${playerPort}/play/nea-capability-showcase?contentId=100110008`);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /id="GameIframe"/);
    assert.match(output, /Player: http:\/\/127\.0\.0\.1:\d+\/play\/nea-capability-showcase\?contentId=100110008/);
  } catch (error) {
    error.message += `\n${output.slice(-4000)}`;
    throw error;
  } finally {
    stopProcessTree(child);
    await rm(buildRoot, { recursive: true, force: true });
  }
});

test("native Player MuDB session completes the live Server Script Runtime handshake", { timeout: 30_000 }, async () => {
  const playerPort = await freePort();
  const controlPort = await freePort();
  const buildRoot = await mkdtemp(join(tmpdir(), "nea-native-runtime-loop-"));
  const child = spawnDemoServer({ buildRoot, controlPort, playerPort });
  let output = "";
  child.stdout.on("data", chunk => { output += chunk; });
  child.stderr.on("data", chunk => { output += chunk; });
  try {
    await waitForStatus(playerPort);
    const pendingServerEvents = [];
    const pendingClientEvents = [];
    let deliveredClientModules;
    let clientRuntimeStarted = false;
    let liveServerEventSender = event => { pendingServerEvents.push(structuredClone(event)); };
    const clientFixture = createDemoClientRuntimeFixture(event => liveServerEventSender(event));
    const result = await receiveNativePlayerTerrainReset({
      baseUrl: `http://127.0.0.1:${playerPort}`,
      contentId: DEFAULT_FIXTURE_CONTENT_ID,
      fingerPrint: "public-runtime-loop-player",
      settleMS: 1_500,
      timeoutMS: 30_000,
      afterTerrainReset: async ({ sendServerEvent }) => {
        liveServerEventSender = sendServerEvent;
        const deliveredSource = await verifyDeliveredClientModule({ buildRoot, modules: deliveredClientModules });
        vm.runInNewContext(deliveredSource, clientFixture.context, {
          filename: "clientIndex.js",
        });
        clientRuntimeStarted = true;
        for (const event of pendingClientEvents.splice(0)) clientFixture.events.emit("client", event);
        for (const event of pendingServerEvents.splice(0)) sendServerEvent(event);
      },
      onClientScriptModules: modules => { deliveredClientModules = modules; },
      onRemoteEvent: event => {
        if (clientRuntimeStarted) clientFixture.events.emit("client", event);
        else pendingClientEvents.push(event);
      },
    });
    const eventTypes = result.remoteEvents.map(event => event?.type);
    assert.ok(eventTypes.includes("nea-demo:welcome"), "Server Script Runtime must handle the Player join");
    assert.ok(eventTypes.includes("nea-demo:ack"), "client-to-server event must return through the live Runtime bridge");
    assert.ok(clientFixture.sent.some(event => event.type === "nea-demo:ready"));
    assert.match(clientFixture.status.textContent, /server: client ready acknowledged/);
    assert.ok(clientFixture.logs.some(message => message.includes("welcome received at server tick")));
    assert.match(output, /server runtime received client ready/);
    assert.match(output, /Server Script Runtime modules: declared=1 loaded=1 entryLoaded=true/);
  } catch (error) {
    error.message += `\n${output.slice(-4000)}`;
    throw error;
  } finally {
    stopProcessTree(child);
    await rm(buildRoot, { recursive: true, force: true });
  }
});

async function verifyDeliveredClientModule({ buildRoot, modules }) {
  assert.deepEqual(Object.keys(modules ?? {}), ["clientIndex.js"]);
  const source = modules["clientIndex.js"];
  const identity = {
    name: "clientIndex.js",
    bytes: Buffer.byteLength(source, "utf8"),
    sha256: createHash("sha256").update(source, "utf8").digest("hex"),
  };
  const project = await readJson(join(buildRoot, "dao3.project.json"));
  const capabilityManifest = await readJson(join(buildRoot, project.capabilities));
  const admitted = capabilityManifest.inputs.modules.find(module => module.side === "client" && module.name === identity.name);
  assert.deepEqual(admitted && {
    name: admitted.name,
    bytes: admitted.bytes,
    sha256: admitted.sha256,
  }, identity, "MuDB module bytes must match capability admission");
  const publishedManifest = await readJson(join(
    process.cwd(),
    "..",
    "local-player",
    "archive",
    "project",
    project.packageId,
    "client-scripts",
    "manifest.json",
  ));
  assert.deepEqual(publishedManifest.files, [identity], "MuDB module bytes must match Player publication");
  return source;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function spawnDemoServer({ buildRoot, controlPort, playerPort }) {
  return spawn(process.execPath, ["src/server.mjs"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NEA_DEMO_PORT: String(playerPort),
      NEA_DEMO_CONTROL_PORT: String(controlPort),
      NEA_DEMO_BUILD_ROOT: buildRoot,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function waitForStatus(port) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/status`);
      if (response.ok) return response.json();
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error("Native Player status endpoint did not become ready");
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      server.close(error => error ? reject(error) : resolve(port));
    });
  });
}

function stopProcessTree(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === "win32") {
    try { execFileSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" }); } catch {}
    return;
  }
  child.kill("SIGTERM");
}
