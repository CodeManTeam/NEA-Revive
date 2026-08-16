export const gameSelectorCases = Object.freeze([
  Object.freeze({ selector: "*", matches: ["entity-a", "entity-b", "player-a"] }),
  Object.freeze({ selector: "entity", matches: ["entity-a", "entity-b", "player-a"] }),
  Object.freeze({ selector: "player", matches: ["player-a"] }),
  Object.freeze({ selector: ".red", matches: ["entity-a"] }),
  Object.freeze({ selector: "#entity-b", matches: ["entity-b"] }),
  Object.freeze({ selector: ".red,#entity-b", matches: ["entity-a", "entity-b"] }),
  Object.freeze({ selector: ".box .red", matches: [] }),
  Object.freeze({ selector: "unknown-component", matches: [] }),
]);

export const gameSelectorResultContract = Object.freeze({
  mutable: true,
  detachedFromWorldCollection: true,
  preservesEntityOrder: true,
});

export function createSelectorFixtureEntities() {
  return [
    entity("entity-a", ["box", "red"]),
    entity("entity-b", ["box", "blue"]),
    entity("player-a", ["ready"], true),
    entity("destroyed-a", ["red"], false, true),
  ];
}

function entity(id, tags, isPlayer = false, destroyed = false) {
  const values = new Set(tags);
  return Object.freeze({ id, isPlayer, destroyed, hasTag: tag => values.has(tag) });
}
