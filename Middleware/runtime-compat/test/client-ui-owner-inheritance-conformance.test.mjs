import test from "node:test";
import assert from "node:assert/strict";
import { clientUiOwnerInheritanceContract } from "../conformance/client-ui-owner-inheritance.mjs";

test("client UI capability ownership follows the recovered declaration hierarchy", () => {
  assert.deepEqual(clientUiOwnerInheritanceContract.hierarchy.UiText, ["UiRenderable", "UiNode"]);
  assert.deepEqual(clientUiOwnerInheritanceContract.hierarchy.UiInput, ["UiText", "UiRenderable", "UiNode"]);
  assert.deepEqual(clientUiOwnerInheritanceContract.inheritedRenderableMembers, ["anchor", "position", "size"]);
  assert.match(clientUiOwnerInheritanceContract.policy, /never treats an inherited native member as an unknown/);
});
