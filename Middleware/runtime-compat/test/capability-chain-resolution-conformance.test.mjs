import test from "node:test";
import assert from "node:assert/strict";
import { capabilityChainResolutionContract } from "../conformance/capability-chain-resolution.mjs";

test("capability analysis preserves nested DAO3 ownership and dynamic-member blocking", () => {
  assert.ok(capabilityChainResolutionContract.supportedChains.includes("GameChatEvent.player -> GamePlayerEntity"));
  assert.ok(capabilityChainResolutionContract.supportedChains.includes("GameEntity.player -> GamePlayerEntity"));
  assert.match(capabilityChainResolutionContract.localExtensionClassification, /reported as extension/);
  assert.match(capabilityChainResolutionContract.dynamicMemberPolicy, /block launch/);
});
