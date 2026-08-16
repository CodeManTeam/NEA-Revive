import test from "node:test";
import assert from "node:assert/strict";
import { selectorCapabilityRefinementContract } from "../conformance/selector-capability-refinement.mjs";

test("selector capability refinement never promotes dynamic or unknown component paths", () => {
  assert.deepEqual(selectorCapabilityRefinementContract.projectReadyTokens, ["*", "entity", "player", ".tag", "#id"]);
  assert.deepEqual(selectorCapabilityRefinementContract.projectPartialInputs, [
    "dynamic expression",
    "unknown bare component",
    "escaped or multiline literal",
    "whitespace-bearing id/tag token",
  ]);
  assert.match(selectorCapabilityRefinementContract.policy, /every call statically avoids/);
});
