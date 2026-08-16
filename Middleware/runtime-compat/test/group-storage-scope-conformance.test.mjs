import assert from "node:assert/strict";
import test from "node:test";
import { groupStorageScopeContract, resolveGroupStorageScope } from "../conformance/group-storage-scope.mjs";

test("group storage scope preserves the recovered empty-id disable rule", () => {
  assert.deepEqual(resolveGroupStorageScope(undefined), { groupId: null });
  assert.deepEqual(resolveGroupStorageScope({ groupId: "" }), { groupId: null });
  assert.equal(groupStorageScopeContract.defaultLaunchState, "blocked");
});

test("group storage scope accepts a concrete manifest-bound group identity", () => {
  assert.deepEqual(resolveGroupStorageScope({ groupId: "group-7" }), { groupId: "group-7" });
  assert.equal(groupStorageScopeContract.configuredLaunchState, "partial");
  assert.throws(() => resolveGroupStorageScope({ groupId: " group-7" }), /groupId is invalid/);
  assert.throws(() => resolveGroupStorageScope({ groupId: "group\n7" }), /groupId is invalid/);
});
