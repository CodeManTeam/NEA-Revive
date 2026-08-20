import test from "node:test";
import assert from "node:assert/strict";
import { buildProjectAssetResolver } from "../src/project-asset-resolver.mjs";

test("project asset resolver prefers exact names and reverses one category prefix", () => {
  const exact = { name: "audio/door.mp3" };
  const captured = { name: "audio/audio_door.mp3" };
  const resolver = buildProjectAssetResolver([captured, exact]);
  assert.deepEqual(resolver.resolve("audio/door.mp3"), { asset: exact, match: "exact" });

  const aliasOnly = buildProjectAssetResolver([captured]);
  assert.deepEqual(aliasOnly.resolve("audio/door.mp3"), { asset: captured, match: "category-prefix-alias" });
  assert.equal(aliasOnly.resolve("audio/audio_door.mp3")?.asset, captured);
});

test("project asset resolver rejects unsafe and ambiguous declarations", () => {
  const duplicateA = { name: "audio/audio_door.mp3", path: "a" };
  const duplicateB = { name: "audio/audio_door.mp3", path: "b" };
  const resolver = buildProjectAssetResolver([duplicateA, duplicateB, { name: "../escape" }]);
  assert.equal(resolver.resolve("audio/audio_door.mp3"), undefined);
  assert.equal(resolver.resolve("audio/door.mp3"), undefined);
  assert.equal(resolver.resolve("../escape"), undefined);
});
