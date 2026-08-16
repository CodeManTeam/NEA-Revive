import assert from "node:assert/strict";
import test from "node:test";

import { loadRepositoryRuntimeCompatibility, publicRuntimeCapabilities } from "../src/project-capability.mjs";

test("public client grants are derived from confirmed Runtime bindings", async () => {
  const { currentRuntime } = await loadRepositoryRuntimeCompatibility();
  const capabilities = publicRuntimeCapabilities(currentRuntime, "client");
  assert.deepEqual(capabilities, ["client.core", "client.http", "client.media", "client.navigator", "client.remote-channel", "client.ui", "client.world"]);
  assert.ok(!capabilities.includes("client.script"));
});
