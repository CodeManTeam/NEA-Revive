import assert from "node:assert/strict";
import test from "node:test";
import {
  HistoricalClientUiNodeFixture,
  HistoricalClientUiScreenFixture,
} from "../conformance/client-ui-tree.mjs";

test("UiNode findChildByName follows the documented direct-child lookup", () => {
  const ui = new HistoricalClientUiNodeFixture("ui");
  const panel = new HistoricalClientUiNodeFixture("panel");
  const button = new HistoricalClientUiNodeFixture("button");
  panel.parent = ui;
  button.parent = panel;
  assert.equal(ui.findChildByName("panel"), panel);
  assert.equal(ui.findChildByName("button"), undefined);
  assert.equal(panel.findChildByName("button"), button);
  assert.deepEqual(ui.children, [panel]);
  button.parent = ui;
  assert.equal(panel.findChildByName("button"), undefined);
  assert.equal(ui.findChildByName("button"), button);
});

test("UiScreen preserves name, visibility, hierarchy, and node events", () => {
  const screen = new HistoricalClientUiScreenFixture("hud");
  const events = [];
  screen.events.once("pointerdown", event => events.push(event));
  screen.events.emit("pointerdown", { target: screen });
  screen.events.emit("pointerdown", { target: screen });
  screen.visible = false;
  screen.zIndex = 7;
  assert.equal(screen.name, "hud");
  assert.equal(screen.visible, false);
  assert.equal(screen.zIndex, 7);
  assert.deepEqual(events, [{ target: screen }]);
});
