export class HistoricalChatFifo {
  #buffer = [];
  #limit;
  #remaining;

  constructor(limit = null) {
    if (limit !== null && (!Number.isSafeInteger(limit) || limit < 0)) throw new TypeError("Chat messages-per-tick limit must be a non-negative safe integer or null");
    this.#limit = limit;
    this.#remaining = limit;
  }

  enqueue(value) {
    if (this.#limit === null || this.#remaining > 0) {
      if (this.#remaining !== null) this.#remaining -= 1;
      return Object.freeze([value]);
    }
    this.#buffer.push(value);
    return Object.freeze([]);
  }

  drainTickBoundary() {
    const buffered = this.#buffer;
    this.#buffer = [];
    this.#remaining = this.#limit;
    return Object.freeze(buffered);
  }

  diagnostics() {
    return Object.freeze({ limit: this.#limit, remaining: this.#remaining, buffered: this.#buffer.length });
  }
}
