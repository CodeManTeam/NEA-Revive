import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const coverage = JSON.parse(await readFile(new URL("../generated/authoritative-runtime-evidence-coverage.json", import.meta.url), "utf8"));

test("authoritative evidence coverage indexes every local source class used by phase 5", () => {
  assert.deepEqual(coverage.indexedSourceSets.map(source => source.id), [
    "origin-server-runtime",
    "external-reference-runtime-adapters",
    "local-player-backend",
    "archived-player-bundle",
    "player-browser-profile",
    "legacy-worktree",
    "posture-delta-frame-corpus",
  ]);
  assert.equal(coverage.contactBinding.originReferences > 0, true);
  assert.equal(coverage.contactBinding.originDefinitions, 0);
  assert.equal(coverage.contactBinding.status, "reference-only");
});

test("coverage distinguishes standing producers from missing posture producers", () => {
  assert.equal(coverage.postureShapeProducer.clientMotorShapeWrites, 0);
  assert.deepEqual(coverage.postureShapeProducer.externalReferenceShapeWrites, []);
  assert.deepEqual(coverage.postureShapeProducer.backendPostureAdjacentShapeWrites, []);
  assert.deepEqual(coverage.postureShapeProducer.legacyPlayerShapeWrites, []);
  assert.equal(coverage.postureShapeProducer.publicFrameCount, 0);
  assert.equal(coverage.postureShapeProducer.clientToServerBinaryFrames, 1864);
  assert.equal(coverage.postureShapeProducer.frameCorpusStatus, "not-found-in-safe-local-frame-corpus");
  assert.equal(coverage.postureShapeProducer.status, "not-found-in-indexed-local-evidence");
});

test("cached Player pages are classified as HTTP HTML instead of PUBLIC frames", () => {
  assert.deepEqual(coverage.cacheClassification.playRouteResponseKinds, ["html"]);
  assert.equal(coverage.cacheClassification.ignoredTemporaryFiles, 1);
  assert.match(coverage.cacheClassification.finding, /not persisted WebSocket PUBLIC frames/);
});
