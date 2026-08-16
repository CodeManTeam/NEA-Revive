import assert from "node:assert/strict";
import test from "node:test";
import { GameGuiRuntime } from "../src/runtime/game-gui.mjs";

test("implements recovered GameGUI command and ui-node surfaces", async () => {
  const commands = [];
  const gui = new GameGuiRuntime({
    resolvePlayerId: entity => entity.runtimeId,
    transport: command => { commands.push(command); return command.operation === "getAttribute" ? "value" : undefined; },
  });
  const player = { id: "Guest", runtimeId: "player-1" };
  await gui.init(player, { name: "menu" });
  await gui.show(player, "menu", true);
  await gui.remove(player, "#old");
  await gui.setAttribute(player, "#score", "text", "3");
  assert.equal(await gui.getAttribute(player, "#score", "text"), "value");
  assert.deepEqual(gui.ui.text({ color: "red" }, ["hello"]), { name: "text", attributes: { color: "red" }, children: ["hello"] });
  let message; gui.onMessage(event => { message = event; }); gui.dispatch(player, "buy", { id: 2 });
  assert.equal(message.name, "buy");
  assert.deepEqual(commands.map(command => command.operation), ["init", "show", "remove", "setAttribute", "getAttribute"]);
  assert.deepEqual(commands.map(command => command.playerId), ["player-1", "player-1", "player-1", "player-1", "player-1"]);
});
