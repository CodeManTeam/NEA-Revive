export const Ease = {
    linear: (r) => r,
    sine: (r) => Math.sin(r * Math.PI / 2),
    easeInOut: (r) => 6 * r ** 5 - 15 * r ** 4 + 10 * r ** 3,
    easeIn: (r) => Math.sqrt(r),
    easeOut: (r) => r ** 3,
    easeLate: (r) => 1 - Math.sqrt(1 - Math.sqrt(r)),
    easeInQuad: (r) => r * r,
    easeOutQuad: (r) => 1 - (1 - r) * (1 - r),
    easeInOutQuad: (r) => r < 0.5 ? 2 * r * r : 1 - (-2 * r + 2) ** 2 / 2,
    easeInCubic: (r) => r ** 3,
    easeOutCubic: (r) => 1 - (1 - r) ** 3,
    easeInOutCubic: (r) => r < 0.5 ? 4 * r ** 3 : 1 - (-2 * r + 2) ** 3 / 2,
    easeInQuart: (r) => r ** 4,
    easeOutQuart: (r) => 1 - (1 - r) ** 4,
    easeInOutQuart: (r) => r < 0.5 ? 8 * r ** 4 : 1 - (-2 * r + 2) ** 4 / 2,
    easeInExpo: (r) => r === 0 ? 0 : 2 ** (10 * r - 10),
    easeOutExpo: (r) => r === 1 ? 1 : 1 - 2 ** (-10 * r),
    easeInOutExpo: (r) => r === 0 ? 0 : r === 1 ? 1 : r < 0.5 ? 2 ** (20 * r - 10) / 2 : (2 - 2 ** (-20 * r + 10)) / 2,
    easeInCirc: (r) => 1 - Math.sqrt(1 - r * r),
    easeOutCirc: (r) => Math.sqrt(1 - (r - 1) ** 2),
    easeInOutCirc: (r) => r < 0.5 ? (1 - Math.sqrt(1 - (2 * r) ** 2)) / 2 : (Math.sqrt(1 - (-2 * r + 2) ** 2) + 1) / 2,
    easeInBack: (r) => { const c = 1.70158; return c * r ** 3 - (c + 1) * r * r; },
    easeOutBack: (r) => { const c = 1.70158; return 1 + (c + 1) * (r - 1) ** 3 + c * (r - 1) ** 2; },
    easeInOutBack: (r) => { const c = 1.70158 * 1.525; return r < 0.5 ? (2 * r) ** 2 * ((c + 1) * 2 * r - c) / 2 : ((2 * r - 2) ** 2 * ((c + 1) * (r * 2 - 2) + c) + 2) / 2; },
    easeOutElastic: (r) => r === 0 ? 0 : r === 1 ? 1 : 2 ** (-10 * r) * Math.sin((r * 10 - 0.75) * (2 * Math.PI) / 3) + 1,
    easeInElastic: (r) => r === 0 ? 0 : r === 1 ? 1 : -(2 ** (10 * r - 10)) * Math.sin((r * 10 - 0.75) * (2 * Math.PI) / 3),
    easeOutBounce: (r) => {
        const n = 7.5625, d = 2.75;
        if (r < 1 / d) return n * r * r;
        if (r < 2 / d) return n * (r -= 1.5 / d) * r + 0.75;
        if (r < 2.5 / d) return n * (r -= 2.25 / d) * r + 0.9375;
        return n * (r -= 2.625 / d) * r + 0.984375;
    },
    easeInBounce: (r) => 1 - Ease.easeOutBounce(1 - r),
    spring: (r) => 1 - Math.cos(r * Math.PI * 2.5) * Math.exp(-6 * r),
};

export class Motion {
    obj; duration; from; to; ease; id; rate; vars; resolve; wait; _onUpdate; _onComplete;
    constructor(obj, duration, from, to, ease) {
        this.obj = obj;
        this.duration = duration;
        this.from = from;
        this.to = to;
        this.ease = ease;
        this.id = Symbol();
        this.rate = 0;
        this.vars = [];
        this.wait = new Promise(resolve => this.resolve = resolve);
        for (const key in this.from) {
            if (typeof this.from[key] !== typeof this.to[key]) continue;
            if (typeof this.to[key] !== "number") continue;
            this.vars.push(key);
        }
    }
    update(dt) {
        this.rate += dt;
        const rate = this.rate / this.duration;
        if (rate >= 1) {
            Motion.remove(this.id);
            for (const key in this.to) this.obj[key] = this.to[key];
            this._onUpdate?.(1);
            this._onComplete?.();
            this.resolve?.();
            return;
        }
        for (const key of this.vars) {
            const from = this.from[key];
            const delta = (this.to[key] - from) * this.ease(rate);
            this.obj[key] = from + delta;
        }
        this._onUpdate?.(rate);
    }
    onUpdate(fn) { this._onUpdate = fn; return this; }
    onComplete(fn) { this._onComplete = fn; return this; }
    resume() { Motion.add(this, this.id); }
    pause() { Motion.remove(this.id); }
    cancel() {
        Motion.remove(this.id);
        this.resolve?.();
    }
    reverse() {
        const { from, to } = this;
        this.from = to;
        this.to = from;
        this.rate = 0;
        this.wait = new Promise(resolve => this.resolve = resolve);
        return this;
    }
    static motions = new Map();
    static add(m, id) { this.motions.set(id, m); }
    static remove(id) { this.motions.delete(id); }
    static fromTo(obj, duration, from, to, ease = Ease.linear) {
        const m = new Motion(obj, duration, from, to, ease);
        Motion.add(m, m.id);
        return m;
    }
    static to(obj, duration, to, ease = Ease.linear) {
        const from = {};
        for (const key in to) from[key] = obj[key];
        return Motion.fromTo(obj, duration, from, to, ease);
    }
    static delay(ms) {
        return new Promise(resolve => {
            const id = Symbol();
            const m = { id, rate: 0, update(dt) { this.rate += dt; if (this.rate >= ms) { Motion.remove(id); resolve(); } } };
            Motion.add(m, id);
        });
    }
    static sequence(steps) {
        return steps.reduce((p, step) => p.then(step), Promise.resolve());
    }
    static parallel(steps) {
        return Promise.all(steps.map(step => step()));
    }
    static update(dt) {
        for (const [id, m] of this.motions) m.update(dt);
    }
    static killAll() {
        for (const [id, m] of this.motions) m.resolve?.();
        this.motions.clear();
    }
}
;
(function () {
    setInterval(() => { Motion.update(4); }, 4);
})();
