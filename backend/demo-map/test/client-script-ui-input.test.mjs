import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import { HistoricalClientEventEmitterFixture } from "../../../Middleware/runtime-compat/conformance/client-ui-tree.mjs";

const clientScript = await readFile(new URL("../project/scripts/client.js", import.meta.url), "utf8");

test("client script creates status UI and handles pointer-lock input through RemoteChannel", () => {
  const fixture = createClientRuntimeFixture();
  vm.runInNewContext(clientScript, fixture.context, { filename: "clientIndex.js" });

  assert.equal(fixture.status.parent, fixture.ui);
  assert.match(fixture.status.textContent, /NEA Client Runtime: active/);
  assert.match(fixture.status.textContent, /RemoteChannel directed \+ broadcast delivery/);
  assert.match(fixture.status.textContent, /deferred: historical physics, chat ingress, group storage/);
  assert.deepEqual(fixture.sent, [{ type: "nea-demo:ready", runtimeApiVersion: "0.1.0" }]);

  fixture.remoteEvents.emit("client", {
    type: "nea-demo:welcome",
    tick: 4,
    clientContract: "dao3-client-runtime/v1",
    serverContract: "nea-server-runtime/v1",
    collision: { boundsHalfExtents: [1, 2, 3], shapeHalfExtents: [0.5, 1, 0.5] },
    postureStatus: "standing confirmed",
  });
  assert.match(fixture.status.textContent, /server: nea-server-runtime\/v1 @ tick 4/);

  fixture.pointerLockEvents.emit("pointerlockchange", { isLocked: true });

  assert.match(fixture.status.textContent, /pointer: locked/);
  assert.deepEqual(fixture.sent.at(-1), { type: "nea-demo:pointer-lock", isLocked: true });

  fixture.remoteEvents.emit("client", {
    type: "nea-demo:pointer-lock-ack",
    isLocked: true,
  });
  assert.match(fixture.status.textContent, /input: pointer locked/);
});

function createClientRuntimeFixture() {
  const pointerLockEvents = new HistoricalClientEventEmitterFixture();
  const remoteEvents = new HistoricalClientEventEmitterFixture();
  const sent = [];
  const ui = { children: [] };
  const status = createStatusNode();
  const context = {
    console: { log() {}, warn() {}, error() {} },
    UiText: { create: () => status },
    Vec2: { create: value => createVector(value) },
    Vec3: { create: value => createVector(value) },
    input: { pointerLockEvents },
    remoteChannel: {
      events: remoteEvents,
      sendServerEvent: event => sent.push(structuredClone(event)),
    },
    ui,
  };
  context.globalThis = context;
  return { context, pointerLockEvents, remoteEvents, sent, status, ui };
}

function createStatusNode() {
  return {
    anchor: createVector(),
    autoWordWrap: true,
    parent: undefined,
    position: { offset: createVector() },
    size: { offset: createVector() },
    textColor: createVector(),
    textContent: "",
    textFontSize: 0,
    textStrokeColor: createVector(),
    textStrokeThickness: 0,
    textXAlignment: "",
    textYAlignment: "",
  };
}

function createVector(value = {}) {
  return {
    copy(next) {
      Object.assign(this, next);
    },
    ...value,
  };
}
