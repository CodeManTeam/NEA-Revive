import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { importMapProject } from "../src/import-project.mjs";

test("imports preservation-only environment into an optional package resource", async () => {
  const fixture = resolve(fileURLToPath(new URL("../project", import.meta.url)));
  const temporaryRoot = await mkdtemp(join(tmpdir(), "nea-map-environment-"));
  const source = join(temporaryRoot, "source");
  const output = join(temporaryRoot, "project");
  await cp(fixture, source, { recursive: true });
  const manifestPath = join(source, "nea.map.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.world.environment = "world/environment.json";
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(join(source, "world", "environment.json"), `${JSON.stringify({
    formatVersion: "nea-recovered-environment/v1",
    compatibility: "partial",
    source: "recovered-project",
    fields: { drawDistance: 128 },
    diagnostics: [{ code: "runtime-consumption-unverified" }],
  }, null, 2)}\n`);

  const result = await importMapProject(source, output);
  assert.equal(result.environment.compatibility, "partial");
  const world = JSON.parse(await readFile(join(output, "world", "world.json"), "utf8"));
  assert.equal(world.environment, "world/environment.json");
  const environment = JSON.parse(await readFile(join(output, "world", "environment.json"), "utf8"));
  assert.deepEqual(environment.fields, { drawDistance: 128 });
});
