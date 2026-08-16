export class GameGuiRuntime {
  #listeners = [];
  #resolvePlayerId;
  #transport;

  constructor(options = {}) {
    this.#resolvePlayerId = options.resolvePlayerId ?? (entity => entity?.id);
    this.#transport = options.transport ?? (async () => undefined);
    this.init = (entity, config) => this.#send("init", entity, { config });
    this.show = (entity, name, allowMultiple = false) => this.#send("show", entity, { name, allowMultiple });
    this.remove = (entity, selector) => this.#send("remove", entity, { selector });
    this.getAttribute = (entity, selector, name) => this.#send("getAttribute", entity, { selector, name });
    this.setAttribute = (entity, selector, name, value) => this.#send("setAttribute", entity, { selector, name, value });
    this.onMessage = listener => { if (typeof listener !== "function") throw new TypeError("GUI listener must be a function"); this.#listeners.push(listener); return () => { const index=this.#listeners.indexOf(listener); if(index>=0)this.#listeners.splice(index,1); }; };
    this.ui = new Proxy({}, { get: (_, name) => (attributes, children) => ({ name, attributes, children }) });
  }

  dispatch(entity, name, payload) {
    const event = Object.freeze({ entity, name: String(name), payload: structuredClone(payload) });
    for (const listener of [...this.#listeners]) listener(event);
  }

  #send(operation, entity, payload) {
    const playerId = this.#resolvePlayerId(entity);
    if (!playerId) throw new Error("GUI command requires an entity");
    return Promise.resolve(this.#transport({ operation, playerId, ...structuredClone(payload) }));
  }
}
