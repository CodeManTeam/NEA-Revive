import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const wrapperPath = fileURLToPath(new URL("../tools/probe-remote-channel.cjs", import.meta.url));
const probePath = fileURLToPath(new URL("../tools/probe-remote-channel.mjs", import.meta.url));
const fakeResearchRoot = "D:\\nea-missing-research-root";

test("remote probe wrapper requires an explicit research root", () => {
  const result = runNode(wrapperPath);
  assert.equal(result.status, 1);
  assert.match(result.output, /local research project root/);
});

test("remote probe validates its control token before loading research modules", () => {
  const result = runNode(probePath, [fakeResearchRoot]);
  assert.equal(result.status, 1);
  assert.match(result.output, /NEA_DEMO_CONTROL_TOKEN is required/);
  assert.doesNotMatch(result.output, /Cannot find module|ENOENT/);
});

test("remote probe rejects invalid control URLs before loading research modules", () => {
  const result = runNode(probePath, [fakeResearchRoot], {
    NEA_DEMO_CONTROL_TOKEN: "test-token",
    NEA_DEMO_CONTROL_URL: "not-a-url",
  });
  assert.equal(result.status, 1);
  assert.match(result.output, /NEA_DEMO_CONTROL_URL must be an absolute HTTP URL/);
  assert.doesNotMatch(result.output, /Cannot find module|ENOENT/);
});

function runNode(scriptPath, args = [], overrides = {}) {
  const environment = { ...process.env, ...overrides };
  delete environment.NEA_LEGACY_ROOT;
  if (!Object.hasOwn(overrides, "NEA_DEMO_CONTROL_TOKEN")) delete environment.NEA_DEMO_CONTROL_TOKEN;
  if (!Object.hasOwn(overrides, "NEA_DEMO_CONTROL_URL")) delete environment.NEA_DEMO_CONTROL_URL;
  const result = spawnSync(process.execPath, [scriptPath, ...args], { encoding: "utf8", env: environment });
  return { output: `${result.stdout}\n${result.stderr}`, status: result.status };
}
