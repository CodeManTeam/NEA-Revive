#!/usr/bin/env node
import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { convertVbBuffer, loadVbConverter } from "./lib/vb-converter.mjs";

const ROOT = resolve(import.meta.dirname, "..");
const DEFAULT_CONVERTER = join(ROOT, "reference", "output_software_apkunpack", "assets", "vb-converter.js");

function usage() {
  console.log(`Usage:
  node tools/nea-export.mjs inspect <apk-unpacked-root> [--json]
  node tools/nea-export.mjs convert <file.vb> [--out <dir>] [--format vox|gltf|both] [--name <name>]
  node tools/nea-export.mjs convert-dir <dir> [--out <dir>] [--format vox|gltf|both]

The converter defaults to reference/output_software_apkunpack/assets/vb-converter.js.`);
}

function option(args, name, fallback) {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1];
}

function normalizeConverterPath(input) {
  if (!input) return DEFAULT_CONVERTER;
  const candidate = resolve(input);
  if (candidate.endsWith("output\\_software\\_apkunpack\\assets\\vb-converter.js")) {
    return candidate.replace("output\\_software\\_apkunpack", "output_software_apkunpack");
  }
  return candidate;
}

function normalizeExporterRoot(input) {
  const candidate = resolve(input);
  const normalized = candidate.replace(/([\\/])output[\\/]_software[\\/]_apkunpack$/i, "$1output_software_apkunpack");
  return normalized;
}

async function collectVbFiles(root) {
  const result = [];
  async function visit(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile() && extname(entry.name).toLowerCase() === ".vb") result.push(path);
    }
  }
  await visit(root);
  return result.sort((a, b) => a.localeCompare(b));
}

async function inspect(root, json) {
  const resolved = normalizeExporterRoot(root);
  const assets = join(resolved, "assets");
  const report = {
    root: resolved,
    kind: "apk-unpacked-exporter",
    converter: join(assets, "vb-converter.js"),
    webEntry: join(assets, "index.html"),
    mapCatalog: join(assets, "dao3_maps.json"),
    hasConverter: false,
    hasWebEntry: false,
    hasMapCatalog: false,
    vbFiles: 0,
  };
  for (const key of ["converter", "webEntry", "mapCatalog"]) {
    try { await access(report[key]); report[`has${key[0].toUpperCase()}${key.slice(1)}`] = true; } catch {}
  }
  if (report.hasConverter) report.vbFiles = (await collectVbFiles(resolved)).length;
  if (json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`Exporter root: ${report.root}`);
    console.log(`Converter: ${report.hasConverter ? "yes" : "missing"}`);
    console.log(`Web entry: ${report.hasWebEntry ? "yes" : "missing"}`);
    console.log(`Map catalog: ${report.hasMapCatalog ? "yes" : "missing"}`);
    console.log(`VB files: ${report.vbFiles}`);
  }
  if (!report.hasConverter) throw new Error(`Not an APK exporter directory: ${report.converter} is missing`);
}

async function convertOne(file, outDir, format, name, converter) {
  const input = resolve(file);
  const bytes = await readFile(input);
  const base = name || basename(input, extname(input));
  const result = await convertVbBuffer(converter, bytes, base);
  await mkdir(outDir, { recursive: true });
  const written = [];
  if (format === "vox" || format === "both") {
    const path = join(outDir, `${base}.vox`);
    await writeFile(path, result.vox);
    written.push(path);
  }
  if (format === "gltf" || format === "both") {
    const path = join(outDir, `${base}.gltf`);
    await writeFile(path, result.gltf, "utf8");
    written.push(path);
  }
  return { input, written, summary: result.summary };
}

async function main() {
  const [command, input, ...args] = process.argv.slice(2);
  if (!command || command === "--help" || command === "-h") { usage(); return; }
  if (!input) throw new Error("Missing input path");
  const format = option(args, "--format", "both");
  if (!new Set(["vox", "gltf", "both"]).has(format)) throw new Error(`Unsupported format: ${format}`);
  const converterPath = normalizeConverterPath(option(args, "--converter", DEFAULT_CONVERTER));
  const converter = await loadVbConverter(converterPath);

  if (command === "inspect") {
    await inspect(input, args.includes("--json"));
    return;
  }
  if (command === "convert") {
    const outDir = resolve(option(args, "--out", dirname(resolve(input))));
    const result = await convertOne(input, outDir, format, option(args, "--name"), converter);
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (command === "convert-dir") {
    const sourceDir = resolve(input);
    const outDir = resolve(option(args, "--out", join(sourceDir, "converted")));
    const files = await collectVbFiles(sourceDir);
    for (const file of files) {
      const targetDir = join(outDir, relative(sourceDir, dirname(file)));
      const result = await convertOne(file, targetDir, format, undefined, converter);
      console.log(`${relative(sourceDir, file)} -> ${result.written.map(path => relative(outDir, path)).join(", ")}`);
    }
    console.log(`Converted ${files.length} VB file(s).`);
    return;
  }
  throw new Error(`Unknown command: ${command}`);
}

main().catch(error => {
  console.error(`nea-export: ${error.message}`);
  process.exitCode = 1;
});
