export function parseBackendEvent(line) {
  const join = line.match(/^\[session\] join (.+)$/);
  if (join) return Object.freeze({ type: "player-join", sessionLabel: requireSessionBridgeLabel(join[1]) });
  const leave = line.match(/^\[session\] disconnected (.+)$/);
  if (leave) return Object.freeze({ type: "player-leave", sessionLabel: requireSessionBridgeLabel(leave[1]) });

  const entityMap = line.match(/^\[game-net:entity-map\] (.+)$/);
  if (entityMap) {
    const packet = JSON.parse(entityMap[1]);
    if (!Array.isArray(packet?.entities)) throw new Error("game-net entity map requires entities");
    return Object.freeze({ type: "entity-map", entities: structuredClone(packet.entities) });
  }

  const input = line.match(/^\[game-net:input\] (\S+) (.+)$/);
  if (input) {
    const packet = JSON.parse(input[2]);
    if (!Array.isArray(packet?.events)) throw new Error("game-net input packet requires events");
    return Object.freeze({
      type: "input-events",
      sessionLabel: requireSessionBridgeLabel(input[1]),
      packet: structuredClone(packet),
    });
  }

  const interact = line.match(/^\[entity-interact\] (\S+) (.+)$/);
  if (interact) {
    const packet = JSON.parse(interact[2]);
    if (!Number.isSafeInteger(packet?.id) || packet.id < 0 || !Number.isFinite(packet?.tick)) throw new Error("entity interact requires id and tick");
    return Object.freeze({
      type: "entity-interact",
      sessionLabel: requireSessionBridgeLabel(interact[1]),
      entityId: packet.id,
      tick: packet.tick,
    });
  }

  const keyboard = line.match(/^\[game-net:keyboard\] (\S+) (.+)$/);
  if (keyboard) {
    const packet = JSON.parse(keyboard[2]);
    if (!Number.isSafeInteger(packet?.tick) || packet.tick < 0 || !isKeyCodeArray(packet.keyDown) || !isKeyCodeArray(packet.keyUp)) {
      throw new Error("game-net keyboard packet requires a tick and key arrays");
    }
    return Object.freeze({
      type: "keyboard-events",
      sessionLabel: requireSessionBridgeLabel(keyboard[1]),
      tick: packet.tick,
      keyDown: Object.freeze([...packet.keyDown]),
      keyUp: Object.freeze([...packet.keyUp]),
    });
  }

  const gui = line.match(/^\[gui:message\] (\S+) (.+)$/);
  if (gui) {
    const packet = JSON.parse(gui[2]);
    if (typeof packet?.name !== "string" || typeof packet?.payload !== "string") throw new Error("GUI message requires name and JSON payload");
    return Object.freeze({
      type: "gui-message",
      sessionLabel: requireSessionBridgeLabel(gui[1]),
      name: packet.name,
      payload: structuredClone(JSON.parse(packet.payload)),
    });
  }

  const remote = line.match(/^\[remote-channel:event\] (\S+) (.+)$/);
  if (!remote) return null;
  const packet = JSON.parse(remote[2]);
  const event = typeof packet?.args === "string" ? JSON.parse(packet.args) : packet;
  return Object.freeze({
    type: "client-event",
    sessionLabel: requireSessionBridgeLabel(remote[1]),
    tick: Number.isSafeInteger(packet?.tick) ? packet.tick : 0,
    event: structuredClone(event),
  });
}

function isKeyCodeArray(value) {
  return Array.isArray(value) && value.length <= 64 && value.every(keyCode => Number.isInteger(keyCode) && keyCode >= 0 && keyCode <= 255);
}

function requireSessionBridgeLabel(value) {
  if (!/^session-sha256-[0-9a-f]{64}$/.test(value)) throw new Error("backend event requires a stable session bridge label");
  return value;
}
