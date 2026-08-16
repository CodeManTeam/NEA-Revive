export function createBackendEventBridge(options) {
  validateOptions(options);
  return event => dispatchBackendEvent(event, options);
}

function validateOptions(options) {
  if (!options || typeof options !== "object") throw new TypeError("Backend event bridge options are required");
  if (!(options.sessionPlayers instanceof Map) || !(options.playerSessions instanceof Map)) {
    throw new TypeError("Backend event bridge requires session maps");
  }
  if (!options.runtime || typeof options.runtime !== "object") throw new TypeError("Backend event bridge requires a runtime");
  if (!Array.isArray(options.spawnPoint) || options.spawnPoint.length !== 3) throw new TypeError("Backend event bridge requires a three-component spawn point");
  if (!options.logger || typeof options.logger.log !== "function") throw new TypeError("Backend event bridge requires a logger");
}

function dispatchBackendEvent(event, options) {
  if (!event || typeof event !== "object") return false;
  const handler = EVENT_HANDLERS[event.type];
  return handler ? handler(event, options) : false;
}

const EVENT_HANDLERS = Object.freeze({
  "player-join": handlePlayerJoin,
  "player-leave": handlePlayerLeave,
  "entity-map": handleEntityMap,
  "input-events": handleInputEvents,
  "entity-interact": handleEntityInteract,
  "keyboard-events": handleKeyboardEvents,
  "gui-message": handleGuiMessage,
  "client-event": handleClientEvent,
});

function handlePlayerJoin(event, options) {
  if (options.sessionPlayers.has(event.sessionLabel)) return false;
  const playerId = `player-${options.sessionPlayers.size + 1}`;
  options.sessionPlayers.set(event.sessionLabel, playerId);
  options.playerSessions.set(playerId, event.sessionLabel);
  options.runtime.addPlayer({ id: playerId, name: "Guest", position: options.spawnPoint, authority: "backend" });
  return true;
}

function handlePlayerLeave(event, options) {
  const playerId = options.sessionPlayers.get(event.sessionLabel);
  if (!playerId) return false;
  options.runtime.removePlayer(playerId);
  options.sessionPlayers.delete(event.sessionLabel);
  options.playerSessions.delete(playerId);
  return true;
}

function handleEntityMap(event, options) {
  const bound = options.runtime.bindBackendEntities(event.entities);
  options.logger.log(`[demo] Script Runtime bound ${bound}/${event.entities.length} backend entities`);
  return true;
}

function handleInputEvents(event, options) {
  const playerId = options.sessionPlayers.get(event.sessionLabel);
  if (!playerId) return false;
  options.runtime.dispatchInputEvents(playerId, event.packet);
  return true;
}

function handleEntityInteract(event, options) {
  const playerId = options.sessionPlayers.get(event.sessionLabel);
  if (!playerId) return false;
  options.runtime.dispatchInteract(playerId, event.entityId, event.tick);
  return true;
}

function handleKeyboardEvents(event, options) {
  const playerId = options.sessionPlayers.get(event.sessionLabel);
  if (!playerId) return false;
  for (const keyCode of event.keyDown) options.runtime.dispatchKeyboardEvent("keyDown", playerId, event.tick, keyCode);
  for (const keyCode of event.keyUp) options.runtime.dispatchKeyboardEvent("keyUp", playerId, event.tick, keyCode);
  return true;
}

function handleGuiMessage(event, options) {
  const playerId = options.sessionPlayers.get(event.sessionLabel);
  if (!playerId) return false;
  options.runtime.dispatchGuiMessage(playerId, event.name, event.payload);
  return true;
}

function handleClientEvent(event, options) {
  const playerId = options.sessionPlayers.get(event.sessionLabel) ?? options.sessionPlayers.values().next().value;
  if (!playerId) return false;
  options.logger.log(`[script:remote] <- ${playerId} ${JSON.stringify(event.event)}`);
  options.runtime.dispatchClientEvent(playerId, event.event);
  return true;
}
