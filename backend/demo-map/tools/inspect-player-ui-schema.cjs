const { readFileSync, readdirSync } = require("node:fs");
const { join, resolve } = require("node:path");
const vm = require("node:vm");

const chunksRoot = resolve(__dirname, "../../../local-player/archive/project/bedwars/client-runtime/assets/_next/static/chunks");
const factories = Object.create(null);
const registrations = [];
registrations.push = entry => {
  if (entry?.[1]) Object.assign(factories, entry[1]);
  return registrations.length;
};
const browserGlobal = { webpackChunk_N_E: registrations, __NEXT_P: [] };
const sandbox = {
  self: browserGlobal,
  window: browserGlobal,
  location: { href: "http://127.0.0.1/", origin: "http://127.0.0.1", protocol: "http:" },
  navigator: { userAgent: "nea-schema-inspector" },
  importScripts: () => {},
  document: {
    createElement: () => ({ setAttribute() {}, style: {}, appendChild() {} }),
    getElementsByTagName: () => [],
    head: { appendChild() {} },
  },
};
vm.createContext(sandbox);

for (const path of listJavaScript(chunksRoot)) {
  if (/\\(?:278\.|750\.|main-|webpack-)/.test(path)) continue;
  try {
    vm.runInContext(readFileSync(path, "utf8"), sandbox, { filename: path, timeout: 2_000 });
  } catch (error) {
    console.warn(`[inspect-ui] skipped ${path}: ${error.message}`);
  }
}

const cache = Object.create(null);
function webpackRequire(id) {
  if (cache[id]) return cache[id].exports;
  const factory = factories[id];
  if (!factory) throw new Error(`Webpack module ${id} was not found`);
  const module = { exports: {} };
  cache[id] = module;
  factory(module, module.exports, webpackRequire);
  return module.exports;
}
webpackRequire.d = (exports, definition) => {
  for (const key in definition) {
    if (webpackRequire.o(definition, key) && !webpackRequire.o(exports, key)) {
      Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
    }
  }
};
webpackRequire.o = (object, property) => Object.prototype.hasOwnProperty.call(object, property);
webpackRequire.r = exports => {
  if (typeof Symbol !== "undefined" && Symbol.toStringTag) Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
  Object.defineProperty(exports, "__esModule", { value: true });
};
webpackRequire.n = module => {
  const getter = module?.__esModule ? () => module.default : () => module;
  webpackRequire.d(getter, { a: getter });
  return getter;
};

const ui = webpackRequire(12907);
const tree = webpackRequire(53814);
const schema = ui.UITreeRDA.stateSchema;
console.log(JSON.stringify({
  rootId: tree.ROOT_ID,
  rootName: tree.ROOT_NAME,
  defaultScreenId: ui.DEFAULT_SCREEN_ID,
  identity: schema.toJSON(schema.identity),
  schemaKeys: Object.keys(schema),
}, null, 2));

function listJavaScript(root) {
  const files = [];
  for (const entry of readdirSync(root, { recursive: true, withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith(".js")) files.push(join(entry.parentPath, entry.name));
  }
  return files.sort();
}
