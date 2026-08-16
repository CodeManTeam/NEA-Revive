import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { validateClientUiState } = require("../../../Backend/local-player/backend/client-ui-state.cjs");

const capturedFixture = () => ({
  format: "nea-recovered-client-ui",
  version: 1,
  sourceMessage: "gameUI.reset",
  running: true,
  defaultScreenId: "DEFAULT_SCREEN_ID",
  pictureAssets: {},
  uiTree: {
    ROOT_ID: { type: 0, childrenIds: ["DEFAULT_SCREEN_ID"], id: "ROOT_ID", name: "Root", parentId: "" },
    DEFAULT_SCREEN_ID: {
      type: 2,
      childrenIds: ["HOTBAR_ID"],
      id: "DEFAULT_SCREEN_ID",
      name: "main",
      parentId: "ROOT_ID",
      value: { type: "screen", data: { zIndex: 1, enable: true, layout: { type: "none" } } },
    },
    HOTBAR_ID: {
      type: 2,
      childrenIds: [],
      id: "HOTBAR_ID",
      name: "Hotbar",
      parentId: "DEFAULT_SCREEN_ID",
      value: { type: "element", data: { type: "box", data: { visible: true } } },
    },
  },
});

test("captured editor UI trees normalize to gameUI.reset state", () => {
  const state = validateClientUiState(capturedFixture());
  assert.equal(state.defaultScreenId, "DEFAULT_SCREEN_ID");
  assert.equal(state.uiTree.DEFAULT_SCREEN_ID.name, "main");
  assert.equal(state.uiTree.HOTBAR_ID.parentId, "DEFAULT_SCREEN_ID");
  assert.equal(state.uiTree.ROOT_ID.value, undefined);
});

test("captured editor UI trees reject inconsistent links", () => {
  const fixture = capturedFixture();
  fixture.uiTree.HOTBAR_ID.parentId = "ROOT_ID";
  assert.throws(() => validateClientUiState(fixture), /child link is invalid/);
});
