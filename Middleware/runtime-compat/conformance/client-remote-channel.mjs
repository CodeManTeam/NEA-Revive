export function encodeHistoricalServerEvent(tick, event) {
  return encodeHistoricalRemoteEvent(tick, event);
}

export function encodeHistoricalClientEvent(tick, event) {
  return encodeHistoricalRemoteEvent(tick, event);
}

function encodeHistoricalRemoteEvent(tick, event) {
  return Object.freeze({
    tick: requireTick(tick),
    args: JSON.stringify(event),
  });
}

export function decodeHistoricalClientEvent(packet) {
  return decodeHistoricalEvent(packet);
}

export function decodeHistoricalServerEvent(packet) {
  return decodeHistoricalEvent(packet);
}

function decodeHistoricalEvent(packet) {
  if (!packet || typeof packet.args !== "string") return null;
  try {
    return Object.freeze({
      tick: requireTick(packet.tick),
      event: JSON.parse(packet.args),
    });
  } catch {
    return null;
  }
}

export class HistoricalServerRemoteChannelFixture {
  #listeners = new Set();
  #getTick;
  #sendPacket;

  constructor(options = {}) {
    this.#getTick = options.getTick ?? (() => 0);
    this.#sendPacket = options.sendPacket ?? (() => {});
  }

  sendClientEvent(event) {
    this.#sendPacket(encodeHistoricalServerEvent(this.#getTick(), event));
  }

  receivePacket(packet) {
    const decoded = decodeHistoricalServerEvent(packet);
    if (!decoded) return false;
    for (const listener of [...this.#listeners]) listener(decoded);
    return true;
  }

  onServerEvent(listener) {
    if (typeof listener !== "function") throw new TypeError("RemoteChannel listener must be a function");
    this.#listeners.add(listener);
    return listener;
  }

  removeServerEventListener(listener) {
    this.#listeners.delete(listener);
  }

  diagnostics() {
    return Object.freeze({ listeners: this.#listeners.size });
  }
}

export class HistoricalClientRemoteChannelFixture {
  #started = false;
  #pending = [];
  #listeners = new Set();
  #getTick;
  #sendPacket;
  #events = new FixtureEventEmitter(["client"]);

  constructor(options = {}) {
    this.#getTick = options.getTick ?? (() => 0);
    this.#sendPacket = options.sendPacket ?? (() => {});
    this.events = Object.freeze({
      on: (type, listener) => this.#events.on(type, listener),
      once: (type, listener) => this.#events.once(type, listener),
      remove: (type, listener) => this.#events.remove(type, listener),
      removeAll: (type, listener) => this.#events.removeAll(type, listener),
      add: (type, listener) => this.#events.on(type, listener),
      off: (type, listener) => this.#events.remove(type, listener),
    });
  }

  sendServerEvent(event) {
    const packet = encodeHistoricalClientEvent(this.#getTick(), event);
    this.#sendPacket(packet);
  }

  onClientEvent(listener) {
    if (typeof listener !== "function") throw new TypeError("RemoteChannel listener must be a function");
    this.#listeners.add(listener);
    return listener;
  }

  removeEventListener(listener) {
    this.#listeners.delete(listener);
  }

  receivePacket(packet) {
    if (!this.#started) {
      this.#pending.push(structuredClone(packet));
      return false;
    }
    return this.#deliver(packet);
  }

  start() {
    if (this.#started) return;
    this.#started = true;
    const pending = this.#pending;
    this.#pending = [];
    for (const packet of pending) this.#deliver(packet);
  }

  clear() {
    this.#listeners.clear();
    this.#events.removeAll();
  }

  stop() {
    this.#started = false;
    this.#pending = [];
    this.clear();
  }

  diagnostics() {
    return Object.freeze({
      started: this.#started,
      pendingPackets: this.#pending.length,
      listeners: this.#listeners.size,
    });
  }

  #deliver(packet) {
    const decoded = decodeHistoricalClientEvent(packet);
    if (!decoded) return false;
    for (const listener of [...this.#listeners]) listener(decoded.event);
    this.#events.emit("client", decoded.event);
    return true;
  }
}

class FixtureEventEmitter {
  #allowedTypes;
  #listeners = new Map();

  constructor(allowedTypes) {
    this.#allowedTypes = new Set(allowedTypes);
  }

  on(type, listener) {
    this.#require(type, listener);
    const listeners = this.#listeners.get(type) ?? [];
    listeners.push({ listener, once: false });
    this.#listeners.set(type, listeners);
  }

  once(type, listener) {
    this.#require(type, listener);
    const listeners = this.#listeners.get(type) ?? [];
    listeners.push({ listener, once: true });
    this.#listeners.set(type, listeners);
  }

  remove(type, listener) {
    this.#require(type, listener);
    const listeners = this.#listeners.get(type) ?? [];
    const index = listeners.findIndex(item => item.listener === listener);
    if (index >= 0) listeners.splice(index, 1);
    if (listeners.length === 0) this.#listeners.delete(type);
  }

  removeAll(type, listener) {
    if (type === undefined) {
      this.#listeners.clear();
      return;
    }
    this.#requireType(type);
    if (listener === undefined) {
      this.#listeners.delete(type);
      return;
    }
    if (typeof listener !== "function") throw new TypeError("Event listener must be a function");
    const listeners = (this.#listeners.get(type) ?? []).filter(item => item.listener !== listener);
    if (listeners.length === 0) this.#listeners.delete(type);
    else this.#listeners.set(type, listeners);
  }

  emit(type, event) {
    this.#requireType(type);
    const listeners = [...(this.#listeners.get(type) ?? [])];
    for (const item of listeners) {
      item.listener(event);
      if (item.once) this.remove(type, item.listener);
    }
  }

  #require(type, listener) {
    this.#requireType(type);
    if (typeof listener !== "function") throw new TypeError("Event listener must be a function");
  }

  #requireType(type) {
    if (!this.#allowedTypes.has(type)) throw new RangeError(`Unsupported event type: ${type}`);
  }
}

function requireTick(value) {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError("RemoteChannel tick must be a non-negative safe integer");
  return value;
}
