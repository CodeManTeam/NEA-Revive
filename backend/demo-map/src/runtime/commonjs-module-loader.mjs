import vm from "node:vm";

export class CommonJsModuleLoader {
  #context;
  #directories;
  #environment;
  #environmentKey;
  #executionId = 0;
  #moduleCache = new Map();
  #moduleSource;
  #resources;
  #timeout;

  constructor(options) {
    this.#context = options.context;
    this.#moduleSource = new Map(Object.entries(options.modules ?? {}).map(([name, source]) => [normalizeModulePath(name), String(source)]));
    this.#resources = options.resources;
    // Real map scripts may run heavy top-level work at load (the captured
    // parkour map scans every voxel to flood water: ~4M getVoxel calls). Keep a
    // generous bound so legitimate maps load while still catching infinite loops.
    this.#timeout = options.timeout ?? 15_000;
    this.#directories = collectDirectories(this.#moduleSource.keys());
    this.#environment = options.environment ?? {};
    this.#environmentKey = options.environmentKey ?? "__neaCommonJsModuleEnvironment";
    if (options.environment === undefined) Object.defineProperty(this.#context, this.#environmentKey, { value: this.#environment });
  }

  loadModule(filename, parent = null) {
    const normalized = normalizeModulePath(filename);
    const cached = this.#moduleCache.get(normalized);
    if (cached) return cached.exports;
    const source = this.#moduleSource.get(normalized);
    if (source === undefined) throw new Error(`error loading module: ${normalized}, module not found`);

    const parts = parseAbsolutePath(normalized);
    const prefix = parts.slice(0, -1);
    const moduleInfo = {
      filename: normalized,
      parent,
      require: undefined,
      children: [],
      exports: {},
      loaded: false,
      id: normalized,
    };
    this.#moduleCache.set(normalized, moduleInfo);
    if (parent) parent.children.push(moduleInfo);

    const require = request => {
      const resolved = this.resolve(request, normalized);
      const dependency = this.#moduleCache.get(resolved);
      return dependency ? dependency.exports : this.loadModule(resolved, moduleInfo);
    };
    require.resolve = request => this.resolve(request, normalized);
    moduleInfo.require = require;

    const executionId = this.#executionId += 1;
    this.#environment.current = {
      exports: moduleInfo.exports,
      require,
      resources: this.#resources,
      module: moduleInfo,
      filename: normalized,
      dirname: prefix.join("/"),
      executionId,
    };
    try {
      const script = new vm.Script(
        `(function (exports, require, resources, module, __filename, __dirname) {\n${source}\n})(globalThis[${JSON.stringify(this.#environmentKey)}].current.exports, globalThis[${JSON.stringify(this.#environmentKey)}].current.require, globalThis[${JSON.stringify(this.#environmentKey)}].current.resources, globalThis[${JSON.stringify(this.#environmentKey)}].current.module, globalThis[${JSON.stringify(this.#environmentKey)}].current.filename, globalThis[${JSON.stringify(this.#environmentKey)}].current.dirname);`,
        { filename: normalized, displayErrors: true },
      );
      script.runInContext(this.#context, { timeout: this.#timeout });
      moduleInfo.loaded = true;
    } finally {
      if (this.#environment.current?.executionId === executionId) this.#environment.current = undefined;
    }
    return moduleInfo.exports;
  }

  resolve(request, parentFilename) {
    const parts = parseAbsolutePath(parentFilename);
    const prefix = parts.slice(0, -1);
    const path = String(request || "");
    let finalPath;
    if (path.length === 0) finalPath = parts.slice();
    else if (path.startsWith(".")) finalPath = prefix.slice();
    else if (path.startsWith("/")) finalPath = [];
    else finalPath = ["node_modules"];

    for (const segment of path.split("/")) {
      if (segment === ".") continue;
      if (segment === "..") finalPath.pop();
      else if (segment === "") finalPath.length = 0;
      else finalPath.push(segment);
    }
    let resolved = finalPath.join("/");
    if (this.#directories.has(resolved)) resolved += "/index.js";
    return resolved;
  }

  snapshot() {
    return [...this.#moduleCache.values()].map(moduleInfo => ({
      id: moduleInfo.id,
      filename: moduleInfo.filename,
      loaded: moduleInfo.loaded,
      parent: moduleInfo.parent?.id ?? null,
      children: moduleInfo.children.map(child => child.id),
    }));
  }
}

export function normalizeModulePath(path) {
  return parseAbsolutePath(String(path)).join("/");
}

function parseAbsolutePath(path) {
  const result = [];
  for (const part of path.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") result.pop();
    else result.push(part);
  }
  return result;
}

function collectDirectories(moduleNames) {
  const directories = new Set();
  for (const name of moduleNames) {
    const parts = name.split("/");
    for (let index = 1; index < parts.length; index += 1) directories.add(parts.slice(0, index).join("/"));
  }
  return directories;
}