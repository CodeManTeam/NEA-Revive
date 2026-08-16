export class GameEventHandlerToken {
  constructor(cancel, resume, active) {
    this.cancel = cancel;
    this.resume = resume;
    this.active = active;
  }
}

export class EventSignal {
  #records = [];
  #futures = new Set();
  #destroyed = false;

  get size() {
    return this.#records.length;
  }

  on(handler) {
    if (typeof handler !== "function") throw new TypeError("Event handler must be a function");
    const record = { handler, finished: this.#destroyed, inQueue: !this.#destroyed };
    if (record.inQueue) this.#records.push(record);
    return new GameEventHandlerToken(
      () => {
        record.finished = true;
      },
      () => {
        if (this.#destroyed) return;
        record.finished = false;
        if (!record.inQueue) {
          record.inQueue = true;
          this.#records.push(record);
        }
      },
      () => !record.finished,
    );
  }

  once(handler) {
    const token = this.on(event => {
      token.cancel();
      handler(event);
    });
    return token;
  }

  next(filter) {
    if (this.#destroyed) return Promise.reject(new Error("dispatcher destroyed"));
    return new Promise((resolve, reject) => {
      if (this.#destroyed) {
        reject(new Error("dispatcher destroyed"));
        return;
      }
      this.#futures.add({ filter, resolve, reject });
    });
  }

  emit(event, onError = error => { throw error; }) {
    for (let index = 0; index < this.#records.length; index += 1) {
      if (this.#destroyed) break;
      const record = this.#records[index];
      if (record.finished) continue;
      try {
        Promise.resolve(record.handler(event)).catch(onError);
      } catch (error) {
        onError(error);
      }
    }
    let writeIndex = 0;
    for (const record of this.#records) {
      if (record.finished) {
        record.inQueue = false;
      } else {
        this.#records[writeIndex++] = record;
      }
    }
    this.#records.length = writeIndex;
    for (const future of [...this.#futures]) {
      if (!this.#futures.has(future)) continue;
      if (future.filter) {
        try {
          if (!future.filter.call(null, event)) continue;
        } catch (error) {
          onError(error);
        }
      }
      this.#futures.delete(future);
      future.resolve(event);
    }
  }

  clear(reason = "dispatcher destroyed") {
    this.#destroyed = true;
    for (const record of this.#records) {
      record.finished = true;
      record.inQueue = false;
    }
    this.#records.length = 0;
    const error = new Error(String(reason));
    for (const future of this.#futures) future.reject(error);
    this.#futures.clear();
  }
}
