import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const serverSource = await readFile(new URL("../src/server.mjs", import.meta.url), "utf8");

test("demo server accepts an isolated build root for concurrent Player instances", () => {
  assert.match(serverSource, /process\.env\.NEA_DEMO_BUILD_ROOT/);
  assert.match(serverSource, /const defaultBuildRoot = resolve\(/);
});
