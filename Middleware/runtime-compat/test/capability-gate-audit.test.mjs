import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("capability gate audit classifies every anonymous corpus requirement conservatively", async () => {
  const [audit, matrix, current] = await Promise.all([
    readJson("generated/capability-gate-audit.json"),
    readJson("abi/compatibility-matrix.json"),
    readJson("abi/current-runtime.json"),
  ]);
  const entries = new Map(matrix.entries.map(entry => [entry.id, entry]));
  const currentEntries = new Map(current.entries.map(entry => [entry.id, entry]));
  assert.equal(audit.format, "nea-capability-gate-audit");
  assert.equal(audit.version, 1);
  assert.equal(Object.hasOwn(audit, "generatedAt"), false);
  assert.equal(audit.requirements.length, audit.summary.requirements);
  assert.equal(audit.summary.ready + audit.summary.partial + audit.summary.blocked, audit.summary.gatedRequirements);
  assert.equal(audit.summary.gatedRequirements + audit.summary.scriptOwned, audit.summary.requirements);
  assert.equal(audit.summary.readyOccurrences + audit.summary.partialOccurrences + audit.summary.blockedOccurrences, audit.summary.occurrences);
  for (const requirement of audit.requirements) {
    assert.ok(["ready", "partial", "blocked", "script-owned"].includes(requirement.launchState));
    if (requirement.launchState === "script-owned") {
      assert.equal(requirement.corpusState, "custom-extension");
      continue;
    }
    const declaration = entries.get(requirement.canonicalId);
    if (requirement.launchState === "blocked") continue;
    assert.ok(requirement.executableBindingIds.length > 0, `${requirement.canonicalId} has no executable binding`);
    const bindingId = requirement.executableBindingIds.find(id => currentEntries.has(id));
    const binding = currentEntries.get(bindingId);
    assert.ok(binding, `${requirement.canonicalId} has no current-runtime binding`);
    if (requirement.resolution !== "current-runtime-recovered") {
      assert.ok(declaration, `${requirement.side}:${requirement.usage} has no compatibility declaration`);
      assert.equal(declaration.executable, true, `${requirement.canonicalId} is not executable`);
    }
    const localBinding = declaration?.localBindings?.find(item => item.localId === bindingId);
    const effectiveCompatibility = localBinding?.status ?? declaration?.status ?? binding.compatibility ?? binding.status;
    if (requirement.resolution === "current-runtime-recovered" && requirement.launchState === "ready") {
      assert.ok(requirement.reasons.some(reason => reason.includes("Direct evidence resolves")));
    } else {
      assert.equal(requirement.launchState === "partial", effectiveCompatibility === "partial" || requirement.resolution === "current-runtime-recovered");
    }
  }
  const byUsage = new Map(audit.requirements.map(item => [`${item.side}:${item.usage}`, item]));
  for (const usage of ["world.raycast", "world.onClick", "storage.getDataStorage"]) {
    assert.equal(byUsage.get(`server:${usage}`)?.launchState, "partial", `${usage} must not be overstated as ready`);
  }
  assert.equal(byUsage.get("server:world.onChat")?.launchState, "blocked");
  assert.equal(byUsage.get("client:remoteChannel.events")?.launchState, "ready");
  assert.equal(byUsage.get("client:input.pointerLockEvents")?.launchState, "ready");
  assert.equal(byUsage.get("client:screen.events")?.launchState, "ready");
  assert.equal(byUsage.get("server:world.size")?.launchState, "ready");
  for (const usage of ["gui.init", "gui.remove", "gui.getAttribute", "gui.setAttribute"]) {
    assert.equal(byUsage.get(`server:${usage}`)?.launchState, "ready", `${usage} has direct origin, transport, local implementation, and test evidence`);
  }
  assert.equal(byUsage.get("server:world.querySelectorAll")?.canonicalId, "server.GameWorld.querySelectorAll");
  assert.equal(byUsage.get("server:world.querySelectorAll")?.resolution, "matrix-owner");
});

test("capability gate audit contains no private source identity", async () => {
  const text = await readFile(resolve(root, "generated", "capability-gate-audit.json"), "utf8");
  assert.doesNotMatch(text, /dump\/private|works\/private|manual-cdp|bedwars|parkour|\u8d77\u5e8a\u6218\u4e89|\u8dd1\u9177/i);
});

async function readJson(path) {
  return JSON.parse(await readFile(resolve(root, path), "utf8"));
}
