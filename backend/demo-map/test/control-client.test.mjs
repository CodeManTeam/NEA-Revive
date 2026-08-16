import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { cancelDialogsOnBackend, getPlayerStateFromBackend, kickPlayerOnBackend, linkPlayerOnBackend, openDialogOnBackend, queuePlayerStateToBackend, sendChatMessagesToBackend, sendChatMessageToBackend, sendClientEventToBackend, sendGuiCommandToBackend } from "../src/control-client.mjs";

test("control client rejects an invalid token and accepts an authenticated delivery", async () => {
  const received = [];
  const server = createServer(async (request, response) => {
    response.setHeader("content-type", "application/json");
    if (request.headers.authorization !== "Bearer expected") {
      response.statusCode = 401;
      response.end(JSON.stringify({ ok: false, error: "unauthorized" }));
      return;
    }
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    received.push(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    response.end(JSON.stringify({ ok: true }));
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;

  await assert.rejects(
    sendClientEventToBackend({ port, token: "wrong", session: "local...0001", event: { type: "probe" } }),
    /unauthorized/,
  );
  await sendClientEventToBackend({ port, token: "expected", session: "local...0001", event: { type: "ack" } });
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));

  assert.deepEqual(received, [{ session: "local...0001", event: { type: "ack" } }]);
});

test("control client sends GUI commands and propagates native results", async () => {
  const received = [];
  const server = createServer(async (request, response) => {
    response.setHeader("content-type", "application/json");
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    received.push({ url: request.url, body: JSON.parse(Buffer.concat(chunks).toString("utf8")) });
    response.end(JSON.stringify({ ok: true, result: { text: "3" } }));
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const result = await sendGuiCommandToBackend({ port, token: "expected", session: "local...0003", command: { operation: "getAttribute", selector: "#score", name: "text" } });
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  assert.deepEqual(result, { text: "3" });
  assert.deepEqual(received, [{ url: "/__nea/control/gui-command", body: { session: "local...0003", command: { operation: "getAttribute", selector: "#score", name: "text" } } }]);
});

test("control client opens and cancels recovered Player dialogs", async () => {
  const received = [];
  const server = createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    received.push({ url: request.url, body: JSON.parse(Buffer.concat(chunks).toString("utf8")) });
    response.setHeader("content-type", "application/json");
    response.end(request.url.endsWith("cancel-all")
      ? JSON.stringify({ ok: true, cancelled: 2 })
      : JSON.stringify({ ok: true, result: { type: "text", data: "done" } }));
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const result = await openDialogOnBackend({ port, token: "expected", session: "local...0005", config: { type: "text", content: "Ready" } });
  const cancelled = await cancelDialogsOnBackend({ port, token: "expected", session: "local...0005" });
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  assert.deepEqual(result, { type: "text", data: "done" });
  assert.equal(cancelled, 2);
  assert.deepEqual(received, [
    { url: "/__nea/control/dialog", body: { session: "local...0005", config: { type: "text", content: "Ready" } } },
    { url: "/__nea/control/dialog-cancel-all", body: { session: "local...0005" } },
  ]);
});

test("control client sends broadcast and private chat messages", async () => {
  const received = [];
  const server = createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    received.push({ url: request.url, body: JSON.parse(Buffer.concat(chunks).toString("utf8")) });
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ ok: true, delivered: 1 }));
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  await sendChatMessageToBackend({ port, token: "expected", message: { text: "broadcast", senderId: 0, private: false, duration: 0, hideFloat: false } });
  await sendChatMessageToBackend({ port, token: "expected", session: "local...0004", message: { text: "private", senderId: 0, private: true, duration: 0, hideFloat: false } });
  await sendChatMessagesToBackend({ port, token: "expected", deliveries: [
    { message: { text: "overflow-a", senderId: 0, private: false, duration: 0, hideFloat: false } },
    { session: "local...0004", message: { text: "overflow-b", senderId: 0, private: true, duration: 0, hideFloat: false } },
  ] });
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  assert.deepEqual(received, [
    { url: "/__nea/control/chat-message", body: { message: { text: "broadcast", senderId: 0, private: false, duration: 0, hideFloat: false } } },
    { url: "/__nea/control/chat-message", body: { session: "local...0004", message: { text: "private", senderId: 0, private: true, duration: 0, hideFloat: false } } },
    { url: "/__nea/control/chat-message", body: { deliveries: [
      { message: { text: "overflow-a", senderId: 0, private: false, duration: 0, hideFloat: false } },
      { session: "local...0004", message: { text: "overflow-b", senderId: 0, private: true, duration: 0, hideFloat: false } },
    ] } },
  ]);
});

test("control client reads and queues authoritative player state", async () => {
  const writes = [];
  const server = createServer(async (request, response) => {
    response.setHeader("content-type", "application/json");
    if (request.headers.authorization !== "Bearer expected") {
      response.statusCode = 401;
      response.end(JSON.stringify({ ok: false, error: "unauthorized" }));
      return;
    }
    const url = new URL(request.url, "http://127.0.0.1");
    if (request.method === "GET") {
      response.end(JSON.stringify({ ok: true, state: { tick: 9, playerId: 7, position: [1, 2, 3], velocity: [4, 5, 6] } }));
      return;
    }
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    writes.push(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    response.statusCode = 202;
    response.end(JSON.stringify({ ok: true, queued: true }));
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const state = await getPlayerStateFromBackend({ port, token: "expected", session: "local...0002" });
  await queuePlayerStateToBackend({ port, token: "expected", session: "local...0002", state: { position: [8, 9, 10], velocity: [1, 2, 3] } });
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  assert.deepEqual(state.position, [1, 2, 3]);
  assert.deepEqual(writes, [{ session: "local...0002", state: { position: [8, 9, 10], velocity: [1, 2, 3] } }]);
});

test("control client requests a targeted backend player kick", async () => {
  const received = [];
  const server = createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    received.push({ url: request.url, body: JSON.parse(Buffer.concat(chunks).toString("utf8")) });
    response.setHeader("content-type", "application/json");
    response.statusCode = 202;
    response.end(JSON.stringify({ ok: true, kicked: true }));
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  assert.equal(await kickPlayerOnBackend({ port, token: "expected", session: "local...0010" }), true);
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  assert.deepEqual(received, [{ url: "/__nea/control/player-kick", body: { session: "local...0010" } }]);
});

test("control client sends a targeted Player link command", async () => {
  const received = [];
  const server = createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    received.push({ url: request.url, body: JSON.parse(Buffer.concat(chunks).toString("utf8")) });
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ ok: true, delivered: true }));
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  assert.equal(await linkPlayerOnBackend({ port, token: "expected", session: "local...0011", href: "https://example.test", linkOptions: { isConfirm: false, isNewTab: true } }), true);
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  assert.deepEqual(received, [{ url: "/__nea/control/player-link", body: { session: "local...0011", href: "https://example.test", options: { isConfirm: false, isNewTab: true } } }]);
});

test("control client reports the route-specific fallback for non-JSON errors", async () => {
  const server = createServer((request, response) => {
    response.statusCode = 502;
    response.setHeader("content-type", "text/plain");
    response.end("upstream unavailable");
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  await assert.rejects(
    sendClientEventToBackend({ port, token: "expected", session: "local...0006", event: { type: "tick" } }),
    /Backend control bridge failed with HTTP 502/,
  );
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

test("control client forwards abort signals to the fetch request", async () => {
  const server = createServer(() => {});
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const controller = new AbortController();
  const abortTimer = setTimeout(() => controller.abort(), 20);
  await assert.rejects(
    sendClientEventToBackend({ port, token: "expected", session: "local...0007", event: { type: "tick" }, signal: controller.signal }),
    error => error?.name === "AbortError",
  );
  clearTimeout(abortTimer);
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

test("control client applies an optional request timeout", async () => {
  const server = createServer(() => {});
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  await assert.rejects(
    sendClientEventToBackend({ port, token: "expected", session: "local...0008", event: { type: "tick" }, timeoutMS: 20 }),
    /Control request timed out after 20ms/,
  );
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

test("control client rejects invalid request timeout values", async () => {
  await assert.rejects(
    sendClientEventToBackend({ port: 1, token: "expected", session: "local...0009", event: { type: "tick" }, timeoutMS: 0 }),
    /timeoutMS must be a positive integer/,
  );
});
