import { EventSignal } from "./event-signal.mjs";

export class GameAnimation {
  #frames;
  #playback;
  #ready = new EventSignal();
  #finish = new EventSignal();
  #started = false;

  constructor(target, keyframes, playback = {}, startTick = 0) {
    if (!Array.isArray(keyframes) || keyframes.length === 0) throw new TypeError("Animation keyframes must be a non-empty array");
    this.target = target;
    this.#frames = structuredClone(keyframes);
    this.#playback = normalizePlayback(playback, keyframes);
    this.currentTime = 0;
    this.playbackRate = 1;
    this.startTime = Number(playback.startTick ?? startTick) || 0;
    this.playState = "pending";
  }

  play(playback) {
    if (playback) this.#playback = normalizePlayback({ ...this.#playback, ...playback }, this.#frames);
    this.playState = "running";
  }

  cancel() {
    if (["finished", "cancelled"].includes(this.playState)) return;
    this.playState = "cancelled";
    this.#finish.emit(Object.freeze({ animation: this, target: this.target, cancelled: true, tick: this.currentTime }));
  }

  keyframes() { return structuredClone(this.#frames); }
  onReady(handler) { return this.#ready.on(handler); }
  onFinish(handler) { return this.#finish.on(handler); }

  advance(tick) {
    if (["cancelled", "finished"].includes(this.playState) || tick < this.startTime + this.#playback.delay) return;
    if (!this.#started) {
      this.#started = true;
      this.playState = "running";
      this.#ready.emit(Object.freeze({ animation: this, target: this.target, cancelled: false, tick }));
    }
    this.currentTime += this.playbackRate;
    const iteration = Math.floor(this.currentTime / this.#playback.duration);
    if (Number.isFinite(this.#playback.iterations) && iteration >= this.#playback.iterations) {
      applyFrame(this.target, this.#frames.at(-1));
      this.playState = "finished";
      this.#finish.emit(Object.freeze({ animation: this, target: this.target, cancelled: false, tick }));
      return;
    }
    let progress = (this.currentTime % this.#playback.duration) / this.#playback.duration;
    if (isReverse(this.#playback.direction, iteration)) progress = 1 - progress;
    applyProgress(this.target, this.#frames, progress);
  }
}

function normalizePlayback(value, frames) {
  const frameDuration = frames.reduce((sum, frame) => sum + positive(frame.duration, 0), 0);
  return {
    delay: Math.max(0, Number(value.delay) || 0),
    direction: String(value.direction ?? "normal").toLowerCase(),
    duration: positive(value.duration, frameDuration || Math.max(1, frames.length - 1)),
    iterations: value.iterations === Infinity ? Infinity : positive(value.iterations, 1),
  };
}

function positive(value, fallback) { const number = Number(value); return Number.isFinite(number) && number > 0 ? number : fallback; }
function isReverse(direction, iteration) { return direction.includes("reverse") !== (direction.includes("alternate") && iteration % 2 === 1); }

function applyProgress(target, frames, progress) {
  if (frames.length === 1) return applyFrame(target, frames[0]);
  const scaled = Math.max(0, Math.min(1, progress)) * (frames.length - 1);
  const index = Math.min(frames.length - 2, Math.floor(scaled));
  const amount = scaled - index;
  const from = frames[index];
  const to = frames[index + 1];
  for (const key of new Set([...Object.keys(from), ...Object.keys(to)])) {
    if (["duration", "easeIn", "easeOut"].includes(key)) continue;
    const value = interpolate(from[key], to[key], amount);
    if (value !== undefined) assign(target, key, value);
  }
}

function applyFrame(target, frame) {
  for (const [key, value] of Object.entries(frame)) if (!["duration", "easeIn", "easeOut"].includes(key)) assign(target, key, value);
}

function interpolate(a, b, t) {
  if (a === undefined) return structuredClone(b);
  if (b === undefined) return structuredClone(a);
  if (typeof a === "number" && typeof b === "number") return a + (b - a) * t;
  if (Array.isArray(a) && Array.isArray(b)) return a.map((value, index) => interpolate(value, b[index], t));
  if (a && b && typeof a === "object" && typeof b === "object") {
    const result = {};
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) result[key] = interpolate(a[key], b[key], t);
    return result;
  }
  return structuredClone(t < 1 ? a : b);
}

function assign(target, key, value) {
  const current = target[key];
  if (current && typeof current.copy === "function" && Array.isArray(value)) current.copy({ x: value[0], y: value[1], z: value[2], w: value[3] });
  else if (current && typeof current.copy === "function" && value && typeof value === "object") current.copy(value);
  else target[key] = value;
}
