import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(root, "..", "..");
const relativeBundlePath = "local-player/archive/project/bedwars/client-runtime/assets/_next/static/chunks/474.c17d0cc8a4489c84.js";
const bundlePath = resolve(repositoryRoot, relativeBundlePath);
const source = await readFile(bundlePath, "utf8");
const relativeEngineBundlePath = "local-player/archive/project/bedwars/client-runtime/assets/_next/static/chunks/734.8dcb480d99773395.js";
const engineSource = await readFile(resolve(repositoryRoot, relativeEngineBundlePath), "utf8");
const docs = JSON.parse(await readFile(resolve(root, "generated", "docs-api-index.json"), "utf8"));
const sha256 = createHash("sha256").update(source).digest("hex");
const uiInputModuleStart = engineSource.indexOf("21031:function");
const uiInputModuleEnd = engineSource.indexOf("2524:function", uiInputModuleStart);
if (uiInputModuleStart < 0 || uiInputModuleEnd < 0) throw new Error("Historical client UiInput module boundaries were not found");
const uiInputModuleSource = engineSource.slice(uiInputModuleStart, uiInputModuleEnd);

const requiredMarkers = [
  "93474:function",
  "new Compartment(",
  "this.compartment.import(e)",
  "e.state.clientModules",
  "n=\"clientIndex.js\"",
  "remoteChannel:new De(e.remoteChannel)",
  "screenWidth:n,screenHeight:o",
];

for (const marker of requiredMarkers) {
  if (!source.includes(marker)) throw new Error(`Historical client runtime no longer contains ${marker}`);
}

if (!source.includes("UiInput:harden(ye.l)")) throw new Error("Historical client runtime no longer hardens UiInput");
if (!engineSource.includes("e.placeholderOpacity=1")) throw new Error("Historical client UI state no longer proves placeholderOpacity storage");
if (uiInputModuleSource.includes("placeholderOpacity")) throw new Error("Historical UiInput wrapper now exposes placeholderOpacity; update the compatibility classification");

for (const marker of ["syncClientScriptModules:function(e)", "n._state.clientModules=y.ClientScriptSrcSchema.clone(e)"]) {
  if (!engineSource.includes(marker)) throw new Error(`Historical Player engine no longer contains ${marker}`);
}

const globalNames = [
  "console",
  "ui",
  "UiNode",
  "UiRenderable",
  "UiComponent",
  "UiBox",
  "UiText",
  "UiInput",
  "UiImage",
  "UiScale",
  "UiScrollBox",
  "UiScreen",
  "PointerEventBehavior",
  "ImageDisplayMode",
  "UITextFontFamily",
  "navigator",
  "input",
  "screen",
  "world",
  "http",
  "media",
  "FormData",
  "ClientRemoteChannel",
  "remoteChannel",
  "setInterval",
  "clearInterval",
  "setTimeout",
  "clearTimeout",
  "sleep",
  "EventEmitter",
  "Coord2",
  "Vec3",
  "Vec2",
  "screenWidth",
  "screenHeight",
  "Math",
  "Date",
  "Audio",
  "MediaErrorCode",
  "MediaError",
  "DeviceType",
  "call",
  "callAsync",
];

const supportedDocumentedIds = [
  "client.global.http",
  "client.global.input",
  "client.global.media",
  "client.global.navigator",
  "client.global.remoteChannel",
  "client.global.screen",
  "client.global.screenHeight",
  "client.global.screenWidth",
  "client.global.ui",
  "client.global.world",
  "client.object.ClientHttp",
  "client.object.ClientMedia",
  "client.object.ClientNavigator",
  "client.object.ClientRemoteChannel",
  "client.object.ClientScreen",
  "client.object.ClientWorld",
  "client.object.InputSystem",
  "client.ClientHttp.fetch",
  "client.ClientScreen.resize",
  "client.ClientWorld.rendering3d",
  "client.input.lockPointer",
  "client.input.pointerdown",
  "client.input.pointerlockchange",
  "client.input.pointerlockerror",
  "client.input.pointerup",
  "client.input.unlockPointer",
  "client.ClientMedia.playAudio",
  "client.ClientMedia.startRecording",
  "client.ClientMedia.stopPlayAudio",
  "client.ClientMedia.stopRecording",
  "client.ClientNavigator.getDeviceInfo",
  "client.ClientNavigator.language",
  "client.ClientNavigator.userAgent",
  "client.remoteChannel.sendServerEvent",
  "client.object.Coord2",
  "client.Coord2.create",
  "client.Coord2.offset",
  "client.Coord2.scale",
  "client.object.Vec2",
  "client.Vec2.copy",
  "client.Vec2.create",
  "client.Vec2.x",
  "client.Vec2.y",
  "client.object.Vec3",
  "client.Vec3.b",
  "client.Vec3.copy",
  "client.Vec3.create",
  "client.Vec3.g",
  "client.Vec3.r",
  "client.Vec3.x",
  "client.Vec3.y",
  "client.Vec3.z",
  "client.UiBox.create",
  "client.UiImage.complete",
  "client.UiImage.create",
  "client.UiImage.image",
  "client.UiImage.imageDisplayMode",
  "client.UiImage.imageOpacity",
  "client.UiImage.load",
  "client.UiScale.create",
  "client.UiScale.scale",
  "client.UiScrollBox.create",
  "client.UiScrollBox.scrollPosition",
  "client.UiText.autoWordWrap",
  "client.UiText.create",
  "client.UiText.richText",
  "client.UiText.textColor",
  "client.UiText.textContent",
  "client.UiText.textFontFamily",
  "client.UiText.textFontSize",
  "client.UiText.textLineHeight",
  "client.UiText.textStrokeColor",
  "client.UiText.textStrokeOpacity",
  "client.UiText.textStrokeThickness",
  "client.UiText.textXAlignment",
  "client.UiText.textYAlignment",
  "client.object.UiNode",
  "client.object.UiScale",
  "client.UiNode.children",
  "client.UiNode.clone",
  "client.UiNode.events",
  "client.UiNode.findChildByName",
  "client.UiNode.name",
  "client.UiNode.parent",
  "client.UiNode.uiScale",
  "client.UiRenderable.anchor",
  "client.UiRenderable.autoResize",
  "client.UiRenderable.backgroundColor",
  "client.UiRenderable.backgroundOpacity",
  "client.UiRenderable.pointerEventBehavior",
  "client.UiRenderable.position",
  "client.UiRenderable.rotation",
  "client.UiRenderable.size",
  "client.UiRenderable.visible",
  "client.UiRenderable.zIndex",
  "client.UiScreen.create",
  "client.UiScreen.getAllScreen",
  "client.UiScreen.visible",
  "client.UiScreen.zIndex",
  "client.EventEmitter.add",
  "client.EventEmitter.emit",
  "client.EventEmitter.off",
  "client.EventEmitter.on",
  "client.EventEmitter.once",
  "client.EventEmitter.remove",
  "client.EventEmitter.removeAll",
  "client.Audio.Audio",
  "client.Audio.ended",
  "client.Audio.error",
  "client.Audio.load",
  "client.Audio.loadeddata",
  "client.Audio.pause",
  "client.Audio.play",
  "client.Audio.src",
  "client.Audio.volume",
  "client.MediaError.code",
  "client.MediaError.MediaError",
  "client.MediaError.message",
  "client.UiInput.blur",
  "client.UiInput.create",
  "client.UiInput.focus",
  "client.UiInput.isFocus",
  "client.UiInput.placeholder",
  "client.UiInput.placeholderColor",
  "client.remoteChannel.onClientEvent",
];

const requiredMemberMarkers = {
  "client.object.ClientHttp": "http:new m",
  "client.object.ClientMedia": "media:new U",
  "client.object.ClientNavigator": "ClientNavigator:d",
  "client.object.ClientRemoteChannel": "ClientRemoteChannel:De",
  "client.object.ClientScreen": "ClientScreen:Be",
  "client.object.ClientWorld": "ClientWorld:p",
  "client.object.InputSystem": "InputSystem:Oe",
  "client.input.lockPointer": "t.lockPointer=function()",
  "client.input.pointerdown": "a.emit(\"pointerdown\",u)",
  "client.input.pointerlockchange": "pointerLockEvents.emit(\"pointerlockchange\"",
  "client.input.pointerlockerror": "pointerLockEvents.emit(\"pointerlockerror\"",
  "client.input.pointerup": "a.emit(\"pointerup\",c)",
  "client.input.unlockPointer": "t.unlockPointer=function()",
  "client.ClientHttp.fetch": "e.prototype.fetch=function(e)",
  "client.ClientScreen.resize": "this.events.emit(\"resize\"",
  "client.ClientWorld.rendering3d": "Object.defineProperties(this,{rendering3d:e})",
  "client.ClientMedia.playAudio": "t.playAudio=function(e)",
  "client.ClientMedia.startRecording": "t.startRecording=function()",
  "client.ClientMedia.stopPlayAudio": "t.stopPlayAudio=function()",
  "client.ClientMedia.stopRecording": "t.stopRecording=function()",
  "client.ClientNavigator.getDeviceInfo": "this.getDeviceInfo=e",
  "client.ClientNavigator.language": "this.language=n",
  "client.ClientNavigator.userAgent": "this.userAgent=t",
  "client.remoteChannel.sendServerEvent": "this.sendServerEvent=function(e)",
};

for (const [id, marker] of Object.entries(requiredMemberMarkers)) {
  if (!source.includes(marker)) throw new Error(`Historical client runtime no longer proves ${id}`);
}

for (const marker of [
  "21050:function",
  "AO:function(){return u},Sg:function(){return c},_U:function(){return s}",
  "this.offset=new c(t.offset),this.scale=new c(t.ratio)",
  "this.copy=function(e){n.x=e.x,n.y=e.y}",
  't[0]="undefined"!==typeof e.x?e.x:e.r',
]) {
  if (!engineSource.includes(marker)) throw new Error(`Historical client vector wrappers no longer contain ${marker}`);
}

for (const marker of [
  'return n.create=function(){return a.l.createRenderable("box")}',
  'image:{get:function(){return e.image},set:function(t){e.image=t}}',
  'imageOpacity:{get:function(){return e.imageOpacity},set:function(t){e.imageOpacity=t}}',
  'imageDisplayMode:{get:function(){return e.imageDisplayMode}',
  'complete:{get:function(){return e.complete}}',
  'r.events.emit("load",{target:s(r)})',
  'return n.create=function(){return a.l.createRenderable("image")}',
  'scrollPosition=new o.Sg(e.scrollPosition)',
  'return n.create=function(){return a.l.createRenderable("scrollBox")}',
  'textColor=new a.AO(e.textColor)',
  'textStrokeColor=new a.AO(e.textStrokeColor)',
  'autoWordWrap:{get:function(){return e.autoWordWrap}',
  'textLineHeight:{get:function(){return e.textLineHeight}',
  'textContent:{get:function(){return harden(e.textContent)}',
  'textFontSize:{get:function(){return e.textFontSize}',
  'textXAlignment:{get:function(){switch(e.textXAlignment)',
  'textYAlignment:{get:function(){switch(e.textYAlignment)',
  'textStrokeOpacity:{get:function(){return e.textStrokeOpacity}',
  'textStrokeThickness:{get:function(){return e.textStrokeThickness}',
  'textFontFamily:{get:function(){return e.textFontFamily}',
  'richText:{configurable:!0,get:function(){return e.richText}',
  'return n.create=function(){return i.l.createRenderable("text")}',
]) {
  if (!engineSource.includes(marker)) throw new Error(`Historical client UI wrappers no longer contain ${marker}`);
}

for (const marker of [
  'return n.create=function(){return M.l.createComponent("scale")}',
  'scale:{get:function(){return e.scale},set:function(t)',
]) {
  if (!source.includes(marker)) throw new Error(`Historical client UiScale wrapper no longer contains ${marker}`);
}

for (const marker of [
  "2524:function",
  "Object.defineProperties(this,{name:",
  "parent:n,children:{get:function()",
  "uiScale:{get:function()",
  "this.findChildByName=function(e)",
  "this.clone=function()",
  "this.events=new r.v,this.event=this.events",
  "65549:function",
  "anchor=new a.Sg(e.anchor)",
  "position=new a._U(e.transform.position)",
  "backgroundColor=new a.AO(e.backgroundColor)",
  "size=new a._U(e.transform.size)",
  "backgroundOpacity:{get:function(){return e.backgroundOpacity}",
  "autoResize:{get:function(){switch(e.autoResize)",
  "pointerEventBehavior:{get:function(){return e.pointerEventBehavior}",
  "rotation:{get:function(){return e.rotation/s.n1}",
  "592:function",
  "return n.getAllScreen=function(){return a.l.getAllScreen()}",
  'n.create=function(){return a.l.createScreen()}',
  "53601:function",
  "this.emit=function(e,n){t.emit(e,n)}",
  "this.add=function(e,n){t.addListener(e,n)}",
  "this.remove=function(e,n){t.removeListener(e,n)}",
  "this.on=function(e,n){t.on(e,n)}",
  "this.off=function(e,n){t.off(e,n)}",
  "this.once=function(e,n){t.once(e,n)}",
  "this.removeAll=function(e)",
  "21031:function",
  "placeholderColor=new r.AO(e.placeholderColor)",
  "o.focus=function()",
  "o.blur=function()",
  "placeholder:{get:function(){return e.placeholder}",
  "isFocus:{get:function()",
  'return n.create=function(){return a.l.createRenderable("input")}',
  'this.emit("focus",{target:this.attached})',
  'this.emit("blur",{target:e})',
]) {
  if (!engineSource.includes(marker)) throw new Error(`Historical client base UI wrappers no longer contain ${marker}`);
}

for (const marker of [
  "Audio:harden(H)",
  "l=function(e,t){this.code=e,this.message=t}",
  "u.load=function()",
  "u.play=function()",
  "u.pause=function()",
  'key:"src"',
  'key:"volume"',
  'r.emit("ended"',
  'e.emit("loadeddata"',
  'e.emit("error"',
  "this.onClientEvent=function(e){return n.remoteEvents.sub(e)}",
]) {
  if (!source.includes(marker)) throw new Error(`Historical client audio/event wrappers no longer contain ${marker}`);
}

const documentedById = new Map();
for (const entry of docs.entries) {
  if (!documentedById.has(entry.id)) documentedById.set(entry.id, entry);
}

const evidence = {
  type: "player-bundle",
  path: relativeBundlePath,
  symbol: "module 93474 ClientScript / SES global construction",
  confidence: "direct",
};
const engineEvidence = {
  type: "player-bundle",
  path: relativeEngineBundlePath,
  symbol: "module 76459 game-net syncClientScriptModules",
  confidence: "direct",
};
const vectorEvidence = {
  type: "player-bundle",
  path: relativeEngineBundlePath,
  symbol: "module 21050 Coord2 / Vec2 / Vec3 wrappers",
  confidence: "direct",
};
const uiWidgetEvidence = {
  type: "player-bundle",
  path: relativeEngineBundlePath,
  symbol: "modules 20162 / 9583 / 37672 / 84941 client UI wrappers",
  confidence: "direct",
};
const uiScaleEvidence = {
  type: "player-bundle",
  path: relativeBundlePath,
  symbol: "module 93474 UiScale wrapper",
  confidence: "direct",
};
const uiBaseEvidence = {
  type: "player-bundle",
  path: relativeEngineBundlePath,
  symbol: "modules 2524 / 65549 / 592 UiNode inheritance wrappers",
  confidence: "direct",
};
const uiEventEvidence = {
  type: "player-bundle",
  path: relativeEngineBundlePath,
  symbol: "module 53601 UI EventEmitter wrapper",
  confidence: "direct",
};
const uiInputEvidence = {
  type: "player-bundle",
  path: relativeEngineBundlePath,
  symbol: "module 21031 UiInput wrapper and input focus events",
  confidence: "direct",
};
const uiInputStateEvidence = {
  type: "player-bundle",
  path: relativeEngineBundlePath,
  symbol: "underlying UiInput renderable placeholderOpacity state",
  confidence: "direct",
};
const hardenedUiInputEvidence = {
  type: "player-bundle",
  path: relativeBundlePath,
  symbol: "module 93474 hardened UiInput global",
  confidence: "direct",
};
const audioEvidence = {
  type: "player-bundle",
  path: relativeBundlePath,
  symbol: "module 93474 Audio wrapper",
  confidence: "direct",
};
const mediaErrorEvidence = {
  type: "player-bundle",
  path: relativeBundlePath,
  symbol: "module 93474 MediaError wrapper",
  confidence: "direct",
};

const entries = supportedDocumentedIds.map(id => {
  const documented = documentedById.get(id);
  if (!documented) throw new Error(`Documented client ABI entry ${id} was not found`);
  return {
    ...structuredClone(documented),
    ...entryOverrides(id),
    availability: "confirmed",
    compatibility: "native",
    capability: capabilityFor(id),
    notes: [
      ...(documented.notes ?? []),
      "Confirmed in the archived Player client Script Runtime implementation.",
    ],
    evidence: [...(documented.evidence ?? []), evidence, ...entryImplementationEvidence(id)],
  };
});

entries.push(
  recoveredMember("client.remoteChannel.events", "property", "remoteChannel", "events", { type: "EventEmitter<{client:any}>", readonly: true }, "client.remote-channel", {
    eventBus: "remoteChannel.events",
    eventName: "client",
  }, "The archived ClientRemoteChannel constructs an EventEmitter and emits the client event after each decoded server event."),
  recoveredMember("client.input.pointerLockEvents", "property", "input", "pointerLockEvents", { type: "EventEmitter<PointerLockEvents>", readonly: true }, "client.ui", {
    propertyPath: "input.pointerLockEvents",
    access: "read-only",
  }, "The archived InputSystem constructs pointerLockEvents and emits pointerlockchange and pointerlockerror."),
  recoveredMember("client.ClientScreen.events", "property", "ClientScreen", "events", { type: "EventEmitter<ScreenEvents>", readonly: true }, "client.ui", {
    propertyPath: "screen.events",
    access: "read-only",
  }, "The archived ClientScreen constructs an EventEmitter and emits resize events."),
);

entries.push(
  runtimeEntry("client.runtime.moduleDelivery", "protocol", "runtime", "moduleDelivery", {
    schema: "game-net.syncClientScriptModules -> dictionary<string, UTF-8 source>",
  }, "Server-delivered client module sources are cloned into state.clientModules."),
  runtimeEntry("client.runtime.moduleEntry", "profile", "runtime", "moduleEntry", {
    entry: "clientIndex.js",
    resolver: "relative specifier basename",
  }, "The archived runtime starts clientIndex.js and resolves imported modules from the delivered dictionary."),
  runtimeEntry("client.runtime.sandbox", "profile", "runtime", "sandbox", {
    engine: "SES Compartment",
    lockdown: { overrideTaming: "severe", errorTaming: "unsafe" },
  }, "Client scripts execute in a dedicated SES Compartment with an explicit endowment object."),
);

const analysis = {
  format: "nea-player-client-script-runtime-analysis",
  version: 1,
  generatedAt: new Date().toISOString(),
  source: {
    path: relativeBundlePath,
    bytes: Buffer.byteLength(source),
    sha256,
    webpackModule: 93474,
  },
  engineSource: {
    path: relativeEngineBundlePath,
    bytes: Buffer.byteLength(engineSource),
    sha256: createHash("sha256").update(engineSource).digest("hex"),
    webpackModule: 76459,
  },
  execution: {
    engine: "SES Compartment",
    entryModule: "clientIndex.js",
    moduleSource: "state.clientModules",
    deliveryMessage: "game-net.syncClientScriptModules",
    lifecycle: ["start", "tick", "startPoll", "notifySync", "stop"],
  },
  globals: globalNames,
  remoteChannel: {
    send: "JSON.stringify -> remote-channel.sendServerEvent {tick,args}",
    receive: "remote-channel.sendClientEvent -> pending event queue -> JSON.parse -> receiveClientEvent",
    listenerMethods: ["onClientEvent", "removeEventListener", "clear", "events.on('client')"],
  },
  entries,
  unavailable: [{
    id: "client.UiInput.placeholderOpacity",
    status: "confirmed-wrapper-absent",
    reason: "The archived Player stores placeholderOpacity on the underlying UiInput renderable, but module 21031 exposes no public getter and module 93474 hardens the UiInput constructor, so delivered map scripts cannot add a compatible wrapper without replacing the historical runtime provider.",
    evidence: [uiInputEvidence, uiInputStateEvidence, hardenedUiInputEvidence],
  }],
  unresolved: [
    "Client APIs declared by documentation but absent from this archived Player build.",
    "Exact UiEvent property aliases exposed by generated API wrappers.",
    "Whether storage, resources, voxels and rtc existed in other historical Player versions.",
  ],
};

const outputPath = resolve(root, "generated", "player-client-script-runtime-analysis.json");
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(analysis, null, 2)}\n`);
console.log(`Analyzed Player client Script Runtime; ${globalNames.length} globals and ${entries.length} ABI entries confirmed.`);

function runtimeEntry(id, kind, owner, name, signature, note) {
  return {
    id,
    side: "client",
    kind,
    owner,
    name,
    signature,
    availability: "confirmed",
    compatibility: "native",
    capability: "client.script",
    since: null,
    notes: [note],
    evidence: id === "client.runtime.moduleDelivery" ? [engineEvidence, evidence] : [evidence],
  };
}

function recoveredMember(id, kind, owner, name, signature, capability, binding, note) {
  return {
    id,
    side: "client",
    kind,
    owner,
    name,
    signature,
    availability: "confirmed",
    compatibility: "native",
    capability,
    since: null,
    notes: [note],
    evidence: [evidence],
    binding,
  };
}

function entryOverrides(id) {
  const bindings = {
    "client.ClientScreen.resize": { kind: "event", binding: { eventBus: "screen.events", eventName: "resize" } },
    "client.input.pointerdown": { kind: "event", binding: { eventBus: "input.uiEvents", eventName: "pointerdown" } },
    "client.input.pointerup": { kind: "event", binding: { eventBus: "input.uiEvents", eventName: "pointerup" } },
    "client.input.pointerlockchange": { kind: "event", binding: { eventBus: "input.pointerLockEvents", eventName: "pointerlockchange" } },
    "client.input.pointerlockerror": { kind: "event", binding: { eventBus: "input.pointerLockEvents", eventName: "pointerlockerror" } },
    "client.ClientWorld.rendering3d": { binding: { propertyPath: "world.rendering3d", access: "read-write" } },
    "client.UiImage.load": { kind: "event", binding: { eventBus: "UiImage.events", eventName: "load" } },
    "client.Audio.Audio": { kind: "constructor", binding: { global: "Audio" } },
    "client.Audio.loadeddata": { kind: "event", binding: { eventBus: "Audio", eventName: "loadeddata" } },
    "client.Audio.ended": { kind: "event", binding: { eventBus: "Audio", eventName: "ended" } },
    "client.MediaError.MediaError": { kind: "constructor", binding: { global: "MediaError" } },
  };
  return bindings[id] ?? {};
}

function capabilityFor(id) {
  if (id.includes("remoteChannel")) return "client.remote-channel";
  if (id.includes("ClientMedia") || /client\.(?:Audio|MediaError)\./.test(id)) return "client.media";
  if (id.includes("ClientHttp")) return "client.http";
  if (id.includes("ClientNavigator")) return "client.navigator";
  if (id.includes("ClientWorld")) return "client.world";
  if (id.includes("ClientScreen") || id.includes("InputSystem") || id.startsWith("client.input.") || id === "client.global.ui" || /client\.(?:object\.)?(?:Coord2|Vec2|Vec3|UiNode|UiRenderable|UiScreen|UiBox|UiImage|UiScale|UiScrollBox|UiText|UiInput|EventEmitter)(?:\.|$)/.test(id)) return "client.ui";
  if (id.startsWith("client.global.")) return "client.core";
  return "client.script";
}

function entryImplementationEvidence(id) {
  const result = [];
  if (/client\.(?:object\.)?(?:Coord2|Vec2|Vec3)(?:\.|$)/.test(id)) result.push(vectorEvidence);
  if (/client\.(?:UiBox|UiImage|UiScrollBox|UiText)\./.test(id)) result.push(uiWidgetEvidence);
  if (id.startsWith("client.UiScale.")) result.push(uiScaleEvidence);
  if (id === "client.object.UiScale") result.push(uiScaleEvidence);
  if (/client\.(?:object\.UiNode|UiNode\.|UiRenderable\.|UiScreen\.)/.test(id)) result.push(uiBaseEvidence);
  if (id.startsWith("client.EventEmitter.")) result.push(uiEventEvidence);
  if (id.startsWith("client.UiInput.")) result.push(uiInputEvidence);
  if (id.startsWith("client.Audio.")) result.push(audioEvidence);
  if (id.startsWith("client.MediaError.")) result.push(mediaErrorEvidence);
  return result;
}
