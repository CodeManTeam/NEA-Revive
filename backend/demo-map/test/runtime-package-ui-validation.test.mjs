import assert from "node:assert/strict";
import test from "node:test";

import { validateUiSource, validateUiTreeBinding } from "../src/format.mjs";

function validUi() {
  return {
    format: "nea-recovered-client-ui",
    version: 1,
    sourceMessage: "gameUI.reset",
    running: true,
    defaultScreenId: "screen",
    pictureAssets: {},
    uiTree: {
      ROOT_ID: { id: "ROOT_ID", type: 0, name: "Root", parentId: "", childrenIds: ["screen"] },
      screen: { id: "screen", type: 1, name: "Screen", parentId: "ROOT_ID", childrenIds: [], value: { type: "screen" } },
    },
  };
}

test("runtime package UI validation binds the default screen to the recovered tree", () => {
  assert.equal(validateUiSource(validUi()).defaultScreenId, "screen");
  assert.throws(() => validateUiSource({ ...validUi(), defaultScreenId: "missing" }), /default screen/);
  assert.throws(() => validateUiSource({ ...validUi(), uiTree: { ...validUi().uiTree, ROOT_ID: { ...validUi().uiTree.ROOT_ID, childrenIds: [] } } }), /parent link/);
});

test("recovered UI tree binding rejects an invalid default screen before package output", () => {
  assert.equal(validateUiTreeBinding("screen", validUi().uiTree).defaultScreenId, "screen");
  assert.throws(() => validateUiTreeBinding("missing", validUi().uiTree), /default screen/);
});
