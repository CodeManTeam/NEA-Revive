import assert from "node:assert/strict";
import vm from "node:vm";
import test from "node:test";
import { CommonJsModuleLoader, normalizeModulePath } from "../src/runtime/commonjs-module-loader.mjs";

test("normalizes module paths like ScriptResourceSync", () => {
  assert.equal(normalizeModulePath("/scripts/./nested/../index.js"), "scripts/index.js");
  assert.equal(normalizeModulePath("../../index.js"), "index.js");
});

test("loads relative modules with cache and native module metadata", () => {
  const context = vm.createContext({ order: [] });
  const loader = new CommonJsModuleLoader({
    context,
    modules: {
      "index.js": `
        const first = require("./lib/value.js");
        const second = require("./lib/value.js");
        module.exports = { first, same: first === second, resolved: require.resolve("./lib/value.js") };
      `,
      "lib/value.js": `order.push(__filename); module.exports = { dirname: __dirname, id: module.id };`,
    },
  });
  assert.deepEqual(structuredClone(loader.loadModule("index.js")), {
    first: { dirname: "lib", id: "lib/value.js" },
    same: true,
    resolved: "lib/value.js",
  });
  assert.deepEqual(context.order, ["lib/value.js"]);
  assert.deepEqual(loader.snapshot(), [
    { id: "index.js", filename: "index.js", loaded: true, parent: null, children: ["lib/value.js"] },
    { id: "lib/value.js", filename: "lib/value.js", loaded: true, parent: "index.js", children: [] },
  ]);
});

test("resolves directories, absolute paths, and node_modules paths", () => {
  const loader = new CommonJsModuleLoader({
    context: vm.createContext({}),
    modules: {
      "app/index.js": `module.exports = [require("./feature"), require("/shared.js"), require("pkg")];`,
      "app/feature/index.js": `module.exports = "feature";`,
      "shared.js": `module.exports = "shared";`,
      "node_modules/pkg/index.js": `module.exports = "package";`,
    },
  });
  assert.deepEqual(structuredClone(loader.loadModule("app/index.js")), ["feature", "shared", "package"]);
});

test("returns partial exports for circular dependencies", () => {
  const loader = new CommonJsModuleLoader({
    context: vm.createContext({}),
    modules: {
      "a.js": `exports.name = "a"; exports.peer = require("./b.js").name;`,
      "b.js": `exports.name = "b"; exports.peer = require("./a.js").name;`,
    },
  });
  assert.deepEqual(structuredClone(loader.loadModule("a.js")), { name: "a", peer: "b" });
  assert.deepEqual(structuredClone(loader.loadModule("b.js")), { name: "b", peer: "a" });
});

test("rejects modules absent from the synchronized module set", () => {
  const loader = new CommonJsModuleLoader({ context: vm.createContext({}), modules: { "index.js": `require("./missing.js");` } });
  assert.throws(() => loader.loadModule("index.js"), /error loading module: missing\.js, module not found/);
});