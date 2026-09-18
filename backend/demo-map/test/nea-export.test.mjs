import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);
const root = fileURLToPath(new URL("../../../", import.meta.url));
const cli = join(root, "tools", "nea-export.mjs");
const sample = join(root, "packages", "bedwars-s2", "assets", "mesh", "弓.vb");

test("nea-export converts a VB model to VOX and glTF", async () => {
  const out = await mkdtemp(join(tmpdir(), "nea-export-"));
  try {
    const { stdout } = await run(process.execPath, [cli, "convert", sample, "--out", out, "--format", "both", "--name", "bow"]);
    const result = JSON.parse(stdout);
    assert.equal(result.written.length, 2);
    assert.equal((await readFile(join(out, "bow.vox"))).subarray(0, 4).toString("ascii"), "VOX ");
    const gltf = JSON.parse(await readFile(join(out, "bow.gltf"), "utf8"));
    assert.equal(gltf.asset.generator, "ArenaPro Web VCode Exporter");
    assert.ok(result.summary.meshCount > 0);
  } finally {
    await rm(out, { recursive: true, force: true });
  }
});

test("nea-export inspects the unpacked exporter directory", async () => {
  const exporter = join(root, "reference", "output", "_software", "_apkunpack");
  const { stdout } = await run(process.execPath, [cli, "inspect", exporter, "--json"]);
  const report = JSON.parse(stdout);
  assert.equal(report.kind, "apk-unpacked-exporter");
  assert.equal(report.hasConverter, true);
  assert.equal(report.hasWebEntry, true);
  assert.equal(report.hasMapCatalog, true);
});
