import { EventSignal } from "./event-signal.mjs";
import { ParsedGameSelector } from "./game-selector.mjs";
import { Vector3 } from "./vector3.mjs";
import { GameRGBColor, GameRGBAColor } from "./colors.mjs";

export class GameBounds3 {
  static fromPoints(...points) {
    const lo = new Vector3();
    const hi = new Vector3();
    lo.x = lo.y = lo.z = Infinity;
    hi.x = hi.y = hi.z = -Infinity;
    for (const point of points) {
      lo.x = Math.min(lo.x, point.x);
      lo.y = Math.min(lo.y, point.y);
      lo.z = Math.min(lo.z, point.z);
      hi.x = Math.max(hi.x, point.x);
      hi.y = Math.max(hi.y, point.y);
      hi.z = Math.max(hi.z, point.z);
    }
    return new GameBounds3(lo, hi);
  }

  constructor(lo, hi) {
    this.lo = lo instanceof Vector3 ? lo : Vector3.from(lo);
    this.hi = hi instanceof Vector3 ? hi : Vector3.from(hi);
  }

  intersect(bounds) { return new GameBounds3(this.lo.max(bounds.lo), this.hi.min(bounds.hi)); }
  contains(point) { return !(point.x < this.lo.x || point.x > this.hi.x || point.y < this.lo.y || point.y > this.hi.y || point.z < this.lo.z || point.z > this.hi.z); }
  containsBounds(bounds) { return this.contains(bounds.lo) && this.contains(bounds.hi); }
  intersects(bounds) { return this.lo.x < bounds.hi.x && bounds.lo.x < this.hi.x && this.lo.y < bounds.hi.y && bounds.lo.y < this.hi.y && this.lo.z < bounds.hi.z && bounds.lo.z < this.hi.z; }
  set(lox, loy, loz, hix, hiy, hiz) { this.lo.set(lox, loy, loz); this.hi.set(hix, hiy, hiz); return this; }
  copy(bounds) { this.lo.copy(bounds.lo); this.hi.copy(bounds.hi); return this; }
  toString() { return `{ lo:${this.lo.toString()}, hi:${this.hi.toString()} }`; }
}

export class RuntimeGameZone {
  #active = new Set();
  #enter = new EventSignal();
  #leave = new EventSignal();
  #remove;
  #selectorSource = "*";
  #selectorTest = new ParsedGameSelector("*");

  constructor(config, remove) {
    this.#remove = remove;
    this.bounds = new GameBounds3([0, 0, 0], [0, 0, 0]);
    this.selector = "*";
    this.massScale = 0;
    this.force = new Vector3(0, 0, 0);
    this.fogEnabled = false;
    this.fogColor = new GameRGBColor(1, 1, 1);
    this.fogStartDistance = 0;
    this.fogHeightOffset = -8;
    this.fogHeightFalloff = 0.8;
    this.fogDensity = 0;
    this.fogMax = 1;
    this.snowEnabled = false;
    this.snowDensity = 1;
    this.snowSizeLo = 0.1;
    this.snowSizeHi = 1;
    this.snowFallSpeed = 1;
    this.snowSpinSpeed = 0;
    this.snowColor = new GameRGBAColor(1, 1, 1, 1);
    this.snowTexture = "snow/snow2.part";
    this.rainEnabled = false;
    this.rainDensity = 1;
    this.rainDirection = new Vector3(0, 1, 0);
    this.rainSpeed = 1;
    this.rainSizeLo = 0.5;
    this.rainSizeHi = 0.5;
    this.rainInterference = 0;
    this.rainColor = new GameRGBAColor(1, 1, 1, 1);
    this.skyEnabled = false;
    this.skyMode = "natural";
    this.skySunPhase = 4 / 24;
    this.skySunFrequency = 0;
    this.skyLunarPhase = 0;
    this.skySunDirection = new Vector3(0, -1, 0);
    this.skySunLight = new GameRGBColor(1000, 1000, 1000);
    this.skyLeftLight = new GameRGBColor(0, 0, 0);
    this.skyRightLight = new GameRGBColor(0, 0, 0);
    this.skyBottomLight = new GameRGBColor(0, 0, 0);
    this.skyTopLight = new GameRGBColor(0, 0, 0);
    this.skyFrontLight = new GameRGBColor(0, 0, 0);
    this.skyBackLight = new GameRGBColor(0, 0, 0);
    Object.assign(this, config);
    this.bounds = config.bounds instanceof GameBounds3 ? config.bounds : new GameBounds3(config.bounds?.lo ?? [0, 0, 0], config.bounds?.hi ?? [0, 0, 0]);
    this.force = Vector3.from(config.force ?? this.force);
    this._syncSelector();
  }

  entities() { return [...this.#active]; }
  onEnter(handler) { return this.#enter.on(handler); }
  nextEnter() { return this.#enter.next(); }
  onLeave(handler) { return this.#leave.on(handler); }
  nextLeave() { return this.#leave.next(); }
  remove() { this.#remove(); }

  _enter(tick, entity) {
    this.#active.add(entity);
    this.#enter.emit(Object.freeze({ tick, entity }));
  }

  _leave(tick, entity) {
    this.#active.delete(entity);
    this.#leave.emit(Object.freeze({ tick, entity }));
  }

  _has(entity) { return this.#active.has(entity); }
  _clear() { this.#active.clear(); this.#enter.clear(); this.#leave.clear(); }
  _matchesSelector(entity) { this._syncSelector(); return this.#selectorTest.test(entity); }
  _isPlayerSelector() { this._syncSelector(); return this.#selectorSource === "player"; }
  _syncSelector() {
    if (this.selector === this.#selectorSource) return;
    this.#selectorTest = new ParsedGameSelector(this.selector);
    this.selector = this.#selectorSource = this.#selectorTest.normalize();
  }
}

export class GameZoneSystem {
  #zones = [];
  #tick = 0;

  list() { return this.#zones.slice(); }

  add(config = {}) {
    const zone = new RuntimeGameZone(config, () => this.remove(zone));
    this.#zones.push(zone);
    return zone;
  }

  remove(zone) {
    const index = this.#zones.indexOf(zone);
    if (index < 0) return;
    this.#zones.splice(index, 1);
    for (const entity of zone.entities()) zone._leave(this.#tick, entity);
    zone._clear();
  }

  poll(tick, entities, players = entities) {
    this.#tick = tick;
    for (const zone of this.#zones) {
      for (const entity of zone.entities()) if (!matches(zone, entity)) zone._leave(tick, entity);
      // Player-only zones are common in recovered maps. Avoid rescanning every
      // static prop (often hundreds of entities) on every simulation tick.
      const candidates = zone._isPlayerSelector() ? players : entities;
      for (const entity of candidates) if (!zone._has(entity) && matches(zone, entity)) zone._enter(tick, entity);
    }
  }
}

function matches(zone, entity) {
  if (entity?.collides === false || !zone._matchesSelector(entity)) return false;
  const position = Vector3.from(entity.position);
  const bounds = Vector3.from(entity.bounds ?? [0, 0, 0]);
  return position.x >= zone.bounds.lo.x - bounds.x
    && position.y >= zone.bounds.lo.y - bounds.y
    && position.z >= zone.bounds.lo.z - bounds.z
    && position.x <= zone.bounds.hi.x + bounds.x
    && position.y <= zone.bounds.hi.y + bounds.y
    && position.z <= zone.bounds.hi.z + bounds.z;
}
