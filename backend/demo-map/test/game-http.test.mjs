import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { loadPreservedBlockCatalog } from "../../../Backend/local-player/src/block-info.mjs";
import { importMapProject } from "../src/import-project.mjs";
import { createRuntimeHttpClient, GameHttpFetchResponse } from "../src/runtime/game-http.mjs";
import { ScriptRuntime } from "../src/runtime/script-runtime.mjs";

const archiveRoot = resolve(fileURLToPath(new URL("../../../Backend/local-player/archive", import.meta.url)));
const blockCatalog = await loadPreservedBlockCatalog(archiveRoot, "world-bedwars.json");
const silentLogger = { info() {}, warn() {}, error() {} };

function createAllowedHttpClient(port, options = {}) {
  return createRuntimeHttpClient({
    ...options,
    allowedOrigins: [`http://127.0.0.1:${port}`],
    logger: silentLogger,
  });
}

async function withHttpServer(handler, run) {
  const server = createServer(handler);
  await new Promise((resolveListening, reject) => server.once("error", reject).listen(0, "127.0.0.1", resolveListening));
  const { port } = server.address();
  try {
    return await run(port);
  } finally {
    await new Promise(resolveClosed => server.close(resolveClosed));
  }
}

test("fetches JSON and exposes the recovered GameHttpFetchResponse surface", async () => {
  await withHttpServer((request, response) => {
    assert.equal(request.method, "GET");
    response.writeHead(200, "OK", { "content-type": "application/json", "x-demo": "yes" });
    response.end(JSON.stringify({ hello: "world", count: 3 }));
  }, async port => {
    const client = createAllowedHttpClient(port);
    const response = await client.fetch(`http://127.0.0.1:${port}/json`);
    assert.ok(response instanceof GameHttpFetchResponse);
    assert.equal(response.ok, true);
    assert.equal(response.status, 200);
    assert.equal(response.statusText, "OK");
    assert.deepEqual(response.headers["content-type"], "application/json");
    assert.deepEqual(response.headers["x-demo"], "yes");
    assert.deepEqual(await response.json(), { hello: "world", count: 3 });
  });
});

test("marks non-2xx responses as not ok without rejecting", async () => {
  await withHttpServer((request, response) => {
    response.writeHead(404, "Not Found");
    response.end("missing");
  }, async port => {
    const client = createAllowedHttpClient(port);
    const response = await client.fetch(`http://127.0.0.1:${port}/missing`);
    assert.equal(response.ok, false);
    assert.equal(response.status, 404);
    assert.equal(response.statusText, "Not Found");
    assert.equal(await response.text(), "missing");
  });
});

test("sends the recovered method, headers and body options", async () => {
  await withHttpServer((request, response) => {
    const chunks = [];
    request.on("data", chunk => chunks.push(chunk));
    request.on("end", () => {
      response.writeHead(200, "OK");
      response.end(JSON.stringify({ method: request.method, auth: request.headers["x-demo-auth"], echo: Buffer.concat(chunks).toString() }));
    });
  }, async port => {
    const client = createAllowedHttpClient(port);
    const response = await client.fetch(`http://127.0.0.1:${port}/echo`, {
      method: "POST",
      headers: { "x-demo-auth": "demo-value" },
      body: "payload",
    });
    const result = await response.json();
    assert.deepEqual(result, { method: "POST", auth: "demo-value", echo: "payload" });
  });
});

test("rejects unsupported protocols, methods, bodies and timeouts", async () => {
  const client = createRuntimeHttpClient({ allowedOrigins: ["https://example.com"], logger: silentLogger });
  await assert.rejects(() => client.fetch("ftp://example.com/file"), /Unsupported protocol: ftp:/);
  await assert.rejects(() => client.fetch("https://example.com", { method: "TRACE" }), /Unsupported request method: TRACE/);
  await assert.rejects(() => client.fetch("https://example.com", { body: { data: 1 } }), /HTTP body must be a string or an ArrayBuffer/);
  await assert.rejects(() => client.fetch("https://example.com", { timeout: 0 }), /HTTP timeout must be a positive number/);
  await assert.rejects(() => client.fetch("not-a-url"), /Invalid URL/);
});

test("times out when the remote stays silent beyond the timeout", async () => {
  await withHttpServer((request, response) => {
    setTimeout(() => response.end("late"), 400);
  }, async port => {
    const client = createAllowedHttpClient(port);
    await assert.rejects(() => client.fetch(`http://127.0.0.1:${port}/slow`, { timeout: 50 }), /timed out after 50ms/);
  });
});

test("rejects oversized response bodies", async () => {
  await withHttpServer((request, response) => {
    response.writeHead(200, "OK");
    response.end("x".repeat(512));
  }, async port => {
    const client = createAllowedHttpClient(port, { maxResponseBytes: 128 });
    await assert.rejects(() => client.fetch(`http://127.0.0.1:${port}/big`), /exceeds the 128-byte limit/);
  });
});

test("close releases the response and later reads reject", async () => {
  await withHttpServer((request, response) => {
    response.writeHead(200, "OK");
    response.end("closable");
  }, async port => {
    const client = createAllowedHttpClient(port);
    const response = await client.fetch(`http://127.0.0.1:${port}/close`);
    assert.equal(await response.text(), "closable");
    await response.close();
    await assert.rejects(() => response.text(), /closed/);
    await assert.rejects(() => response.json(), /closed/);
    await response.close();
  });
});

test("exposes arrayBuffer bytes", async () => {
  await withHttpServer((request, response) => {
    response.writeHead(200, "OK", { "content-type": "application/octet-stream" });
    response.end(Buffer.from([0, 1, 2, 255]));
  }, async port => {
    const client = createAllowedHttpClient(port);
    const response = await client.fetch(`http://127.0.0.1:${port}/bin`);
    const buffer = await response.arrayBuffer();
    assert.deepEqual([...new Uint8Array(buffer)], [0, 1, 2, 255]);
  });
});

test("http global requires the dedicated runtime capability", async () => {
  const source = resolve(fileURLToPath(new URL("../project", import.meta.url)));
  const output = join(await mkdtemp(join(tmpdir(), "nea-runtime-http-capability-")), "project");
  await importMapProject(source, output);
  const project = JSON.parse(await readFile(join(output, "dao3.project.json"), "utf8"));
  const scriptManifestPath = join(output, project.scripts);
  const scriptManifest = JSON.parse(await readFile(scriptManifestPath, "utf8"));
  scriptManifest.capabilities = scriptManifest.capabilities.filter(capability => capability !== "server.http");
  await writeFile(scriptManifestPath, `${JSON.stringify(scriptManifest, null, 2)}\n`, "utf8");
  await writeFile(join(output, "scripts", "server.js"), `http.fetch("https://example.com");`, "utf8");
  const runtime = await ScriptRuntime.load(output, { blockCatalog, logger: silentLogger });
  await assert.rejects(() => runtime.start(), /Script capability not granted: server\.http/);
  runtime.stop();
});

test("server scripts can fetch over the runtime http global", async () => {
  await withHttpServer((request, response) => {
    response.writeHead(200, "OK", { "content-type": "application/json" });
    response.end(JSON.stringify({ tick: 7 }));
  }, async port => {
    const source = resolve(fileURLToPath(new URL("../project", import.meta.url)));
    const output = join(await mkdtemp(join(tmpdir(), "nea-runtime-http-request-")), "project");
    await importMapProject(source, output);
    await writeFile(join(output, "scripts", "server.js"), `
      world.onPlayerJoin(({ entity: player }) => {
        http.fetch("http://127.0.0.1:${port}/tick", { timeout: 5000 })
          .then(async response => {
            player.httpResult = { ok: response.ok, status: response.status, body: await response.json() };
          })
          .catch(error => {
            player.httpResult = { error: String(error.message ?? error) };
          });
      });
    `, "utf8");
    const runtime = await ScriptRuntime.load(output, {
      blockCatalog,
      logger: silentLogger,
      httpOptions: { allowedOrigins: [`http://127.0.0.1:${port}`] },
    });
    await runtime.start();
    const player = runtime.addPlayer({ id: "http-writer" });
    for (let attempt = 0; attempt < 100 && player.httpResult === undefined; attempt += 1) {
      await new Promise(resolveEvent => setTimeout(resolveEvent, 1));
    }
    runtime.stop();
    assert.deepEqual(JSON.parse(JSON.stringify(player.httpResult)), { ok: true, status: 200, body: { tick: 7 } });
  });
});

test("denies requests unless the host explicitly allows the origin", async () => {
  const client = createRuntimeHttpClient({ logger: silentLogger });
  await assert.rejects(() => client.fetch("https://example.com"), /HTTP origin is not allowed/);
});
