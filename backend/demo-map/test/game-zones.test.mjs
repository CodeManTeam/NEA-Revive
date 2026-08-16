import assert from "node:assert/strict";
import test from "node:test";
import { GameBounds3, GameZoneSystem } from "../src/runtime/game-zones.mjs";
import { Vector3 } from "../src/runtime/vector3.mjs";

test("implements recovered dynamic zone enter leave and removal", () => {
  const system=new GameZoneSystem();const events=[];const zone=system.add({bounds:new GameBounds3(new Vector3(0,0,0),new Vector3(2,2,2)),selector:"player"});zone.onEnter(e=>events.push(`enter:${e.tick}:${e.entity.id}`));zone.onLeave(e=>events.push(`leave:${e.tick}:${e.entity.id}`));const player={id:"p",isPlayer:true,position:new Vector3(1,1,1),bounds:new Vector3(.5,1,.5)};system.poll(1,[player]);assert.deepEqual(zone.entities(),[player]);player.position=new Vector3(3,3,3);system.poll(2,[player]);assert.deepEqual(events,["enter:1:p","leave:2:p"]);zone.remove();assert.deepEqual(system.list(),[]);
});

test("normalizes changed selectors and excludes non-colliding entities", () => {
  const system = new GameZoneSystem();
  const zone = system.add({ bounds: new GameBounds3([0, 0, 0], [2, 2, 2]), selector: " player, .runner " });
  const player = { id: "player-a", isPlayer: true, collides: true, position: new Vector3(1, 1, 1), bounds: new Vector3(0.5, 0.5, 0.5), hasTag: () => false };
  const ghost = { id: "ghost", isPlayer: false, collides: false, position: new Vector3(1, 1, 1), bounds: new Vector3(0.5, 0.5, 0.5), hasTag: tag => tag === "runner" };
  assert.equal(zone.selector, ".runner,player");
  system.poll(1, [player, ghost]);
  assert.deepEqual(zone.entities(), [player]);
  zone.selector = " #ghost ";
  system.poll(2, [player, ghost]);
  assert.equal(zone.selector, "#ghost");
  assert.deepEqual(zone.entities(), []);
});
