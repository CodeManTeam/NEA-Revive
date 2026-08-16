import { HistoricalClientEventEmitterFixture } from "../../../../Middleware/runtime-compat/conformance/client-ui-tree.mjs";

export function createDemoClientRuntimeFixture(sendServerEvent, events = new HistoricalClientEventEmitterFixture()) {
  if (typeof sendServerEvent !== "function") throw new Error("Demo client fixture requires a server-event sender");
  const pointerLockEvents = new HistoricalClientEventEmitterFixture();
  if (!events || typeof events.on !== "function") throw new Error("Demo client fixture requires a client-event interface");
  const sent = [];
  const logs = [];
  const ui = { children: [] };
  const status = createStatusNode();
  const context = {
    console: { log: message => logs.push(String(message)), warn() {}, error() {} },
    UiText: { create: () => status },
    Vec2: { create: value => createVector(value) },
    Vec3: { create: value => createVector(value) },
    input: { pointerLockEvents },
    remoteChannel: {
      events,
      sendServerEvent: event => {
        sent.push(structuredClone(event));
        sendServerEvent(event);
      },
    },
    ui,
  };
  context.globalThis = context;
  return { context, events, logs, pointerLockEvents, sent, status, ui };
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
