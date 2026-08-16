import assert from "node:assert/strict";
import test from "node:test";
import { ParsedGameSelector, matchesGameSelector } from "../../../Frontend/demo-map/src/runtime/game-selector.mjs";
import { createSelectorFixtureEntities, gameSelectorCases, gameSelectorResultContract } from "../conformance/game-selector.mjs";

test("local selector matches the recovered ParsedSelector union grammar", () => {
  const entities = createSelectorFixtureEntities();
  for (const fixture of gameSelectorCases) {
    assert.deepEqual(entities.filter(entity => matchesGameSelector(entity, fixture.selector)).map(entity => entity.id), fixture.matches, fixture.selector);
  }
});

test("selector normalization and coercion follow the recovered implementation", () => {
  assert.equal(new ParsedGameSelector("#b,.z,.a,#a,player").normalize(), ".a,.z,#a,#b,player");
  assert.equal(new ParsedGameSelector("entity,.ignored").normalize(), "*");
  assert.equal(new ParsedGameSelector({ toString: () => ".red" }).normalize(), ".red");
});

test("querySelectorAll return contract records the recovered mutable detached array", () => {
  assert.deepEqual(gameSelectorResultContract, {
    mutable: true,
    detachedFromWorldCollection: true,
    preservesEntityOrder: true,
  });
});
