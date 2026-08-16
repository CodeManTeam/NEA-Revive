export const serverEntityHurtEvidence = Object.freeze([
  Object.freeze({ path: "dao3-docs-mirror/markdown/api/GameEntity/fight.md", symbol: "GameEntity.hurt" }),
  Object.freeze({ path: "origin/third-party/ArenaPro-CLI/server/types/GameAPI.d.ts", symbol: "GameHurtOptions" }),
  Object.freeze({ path: "origin/origin/origin/sync/ScriptEntitySync.js", symbol: "ScriptEntityWrapper.hurt" }),
  Object.freeze({ path: "origin/origin/origin/shell/ScriptShell.js", symbol: "hurtEntity" }),
  Object.freeze({ path: "private-script-corpus/redacted", symbol: "GameEntity.hurt usage" }),
]);

export function applyRecoveredEntityHurt(state, amount, options) {
  const damage = Number(amount);
  const current = { ...state };
  if (current.destroyed || Number.isNaN(damage) || !current.enableDamage || Number(current.hp) <= 0) {
    return Object.freeze({ state: Object.freeze(current), damageEvent: null, dieEvent: null });
  }
  const normalized = normalizeOptions(options);
  const previousHp = Number(current.hp);
  const attacker = damage < 0 ? null : normalized.attacker;
  const damageType = damage < 0 ? "" : normalized.damageType;
  if (damage < 0) {
    if (Number(current.hp) < Number(current.maxHp)) current.hp = Math.min(Number(current.maxHp), Number(current.hp) - damage);
  } else {
    current.hp = Math.max(0, Number(current.hp) - damage);
  }
  const damageEvent = Object.freeze({ entity: current.id, damage, attacker, damageType });
  const dieEvent = previousHp > 0 && Number(current.hp) <= 0
    ? Object.freeze({ entity: current.id, attacker, damageType })
    : null;
  return Object.freeze({ state: Object.freeze(current), damageEvent, dieEvent });
}

function normalizeOptions(options) {
  if (options === undefined || options === null) return { attacker: null, damageType: "" };
  if (typeof options === "string") return { attacker: null, damageType: options };
  if (typeof options !== "object" || Array.isArray(options)) throw new TypeError("GameHurtOptions must be an object");
  return { attacker: options.attacker ?? null, damageType: String(options.damageType ?? "") };
}
