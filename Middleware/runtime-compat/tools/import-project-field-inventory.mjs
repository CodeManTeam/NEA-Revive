import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { sanitizeCapture } from "../../../Evidence/preservation-dump/sanitize-private-capture.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(root, "..", "..");
const worksRoot = resolve(repositoryRoot, "Evidence", "works", "private");
const output = resolve(root, "evidence", "project-field-inventory.json");
const temporaryRoot = await mkdtemp(join(tmpdir(), "nea-project-field-inventory-"));

try {
  const directories = (await readdir(worksRoot, { withFileTypes: true }))
    .filter(entry => entry.isDirectory())
    .sort((left, right) => left.name.localeCompare(right.name));
  const samples = [];
  for (const directory of directories) {
    const result = await sanitizeCapture(resolve(worksRoot, directory.name), join(temporaryRoot, `sample-${samples.length + 1}`));
    const descriptorCount = result.files.filter(file => file.kind === "descriptor").length;
    if (descriptorCount === 0) continue;
    samples.push({
      sample: `sample-${String(samples.length + 1).padStart(3, "0")}`,
      descriptorCount,
      fields: result.fieldInventory,
    });
  }
  if (samples.length === 0) throw new Error("No private project descriptors were available for inventory");
  const observedFields = new Set(samples.flatMap(sample => sample.fields.map(field => field.path)));
  const coreFields = ["voxels", "entitiesTree", "environment", "physics", "player", "features", "uiTree"];
  const evidence = {
    format: "nea-redacted-project-field-inventory",
    version: 1,
    generatedAt: new Date().toISOString(),
    privacy: {
      sourceValuesIncluded: false,
      sourcePathsIncluded: false,
      sourceNamesIncluded: false,
      sourceScriptsIncluded: false,
    },
    provenance: {
      sourceClass: "approved-local-private-inspection",
      redactionStatus: "schema-only-and-redacted-values",
      publicStatus: "public-sanitized",
      reproducibilityLimit: "Original project values, work names, source paths, scripts, identities, and private capture payloads are intentionally unavailable.",
    },
    migrationReadiness: {
      targetFormat: "nea-map/v1",
      status: "partial",
      confirmedFieldPresence: coreFields.filter(field => observedFields.has(field)),
      evidenceDeferred: [
        "voxel chunk value encoding",
        "entity tree value encoding",
        "environment value semantics",
        "physics value semantics",
        "player value semantics",
        "UI tree value semantics",
      ],
    },
    samples,
  };
  await writeFile(output, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  console.log(`Imported ${samples.length} anonymous project field inventory sample(s).`);
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
