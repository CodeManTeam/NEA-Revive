import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const report = JSON.parse(await readFile(new URL("generated/api-abi-completeness.json", root), "utf8"));
const docs = JSON.parse(await readFile(new URL("generated/docs-api-index.json", root), "utf8"));
const protocols = JSON.parse(await readFile(new URL("abi/protocols.json", root), "utf8"));
const matrix = JSON.parse(await readFile(new URL("abi/compatibility-matrix.json", root), "utf8"));
const catalogs = Object.fromEntries(await Promise.all(["client", "server", "shared"].map(async side => [
  side,
  JSON.parse(await readFile(new URL(`abi/${side}-runtime.json`, root), "utf8")),
])));

test("API ABI completeness has no structural or propagation gaps", () => {
  assert.equal(report.status, "complete");
  assert.deepEqual(report.gaps, []);
  assert.equal(report.summary.documentation.entries, docs.entries.length);
  assert.equal(report.summary.documentation.memberVariants, docs.entries.reduce((total, entry) => total + entry.memberVariants.length, 0));
  assert.equal(report.summary.compatibilityMatrix.coveredDocumentationEntries, docs.entries.length);
  assert.equal(matrix.entries.length, docs.entries.length);
  for (const [side, catalog] of Object.entries(catalogs)) {
    assert.equal(report.summary.catalogs[side], catalog.entries.length, `${side} catalog count must match the generated report`);
  }
});

test("rest parameters retain their documented ABI shape", () => {
  const fromPoints = docs.entries.find(entry => entry.id === "shared.GameBounds3.fromPoints");
  const method = fromPoints.memberVariants.find(variant => variant.kind === "method");
  assert.deepEqual(method.signature.parameters, [{
    name: "points",
    optional: false,
    type: "GameVector3[]",
    rest: true,
  }]);
  assert.equal(method.signature.returns, "GameBounds3");
});

test("protocol ABI exposes explicit direction and schema records", () => {
  assert.equal(protocols.messages.length, protocols.summary.messages);
  assert.equal(protocols.messages.length, 180);
  assert.deepEqual(protocols.summary.byDirection, {
    "server-to-client": 86,
    "client-to-server": 94,
  });
  for (const message of protocols.messages) {
    assert.match(message.direction, /^(server-to-client|client-to-server)$/);
    assert.ok(message.schema && typeof message.schema === "object" && !Array.isArray(message.schema));
    assert.ok(message.evidence.length > 0);
    assert.ok(message.availability);
    assert.ok(message.compatibility);
  }
});
