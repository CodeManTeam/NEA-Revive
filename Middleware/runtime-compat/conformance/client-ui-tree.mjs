export class HistoricalClientUiNodeFixture {
  #children = [];
  #parent;

  constructor(name = "") {
    this.name = String(name);
    this.events = new HistoricalClientEventEmitterFixture();
  }

  get children() {
    return Object.freeze([...this.#children]);
  }

  get parent() {
    return this.#parent;
  }

  set parent(value) {
    if (value !== undefined && !(value instanceof HistoricalClientUiNodeFixture)) {
      throw new TypeError("UI parent must be another UiNode or undefined");
    }
    if (value === this.#parent) return;
    this.#parent?.#removeChild(this);
    this.#parent = value;
    value?.#addChild(this);
  }

  findChildByName(name) {
    const expected = String(name);
    return this.#children.find(child => child.name === expected);
  }

  #addChild(child) {
    if (!this.#children.includes(child)) this.#children.push(child);
  }

  #removeChild(child) {
    const index = this.#children.indexOf(child);
    if (index >= 0) this.#children.splice(index, 1);
  }
}

export class HistoricalClientUiScreenFixture extends HistoricalClientUiNodeFixture {
  constructor(name = "") {
    super(name);
    this.visible = true;
    this.zIndex = 0;
  }
}

export class HistoricalClientEventEmitterFixture {
  #listeners = new Map();

  on(type, listener) {
    this.#add(type, listener, false);
  }

  once(type, listener) {
    this.#add(type, listener, true);
  }

  add(type, listener) {
    this.on(type, listener);
  }

  remove(type, listener) {
    this.#require(type, listener);
    const listeners = this.#listeners.get(type) ?? [];
    const index = listeners.findIndex(item => item.listener === listener);
    if (index >= 0) listeners.splice(index, 1);
    if (listeners.length === 0) this.#listeners.delete(type);
  }

  off(type, listener) {
    this.remove(type, listener);
  }

  removeAll(type, listener) {
    if (type === undefined) {
      this.#listeners.clear();
      return;
    }
    if (listener === undefined) {
      this.#listeners.delete(String(type));
      return;
    }
    this.#require(type, listener);
    const listeners = (this.#listeners.get(String(type)) ?? []).filter(item => item.listener !== listener);
    if (listeners.length === 0) this.#listeners.delete(String(type));
    else this.#listeners.set(String(type), listeners);
  }

  emit(type, event) {
    const key = String(type);
    for (const item of [...(this.#listeners.get(key) ?? [])]) {
      item.listener(event);
      if (item.once) this.remove(key, item.listener);
    }
  }

  #add(type, listener, once) {
    this.#require(type, listener);
    const key = String(type);
    const listeners = this.#listeners.get(key) ?? [];
    listeners.push({ listener, once });
    this.#listeners.set(key, listeners);
  }

  #require(type, listener) {
    if (typeof listener !== "function") throw new TypeError(`Event listener for ${String(type)} must be a function`);
  }
}
