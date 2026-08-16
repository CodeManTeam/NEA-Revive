import { createHash } from "node:crypto";

export function digestCapabilityJson(value) {
  if (value === null || value === undefined) return Object.freeze({ present: false, bytes: 0, sha256: null });
  const bytes = Buffer.from(JSON.stringify(canonicalize(value)), "utf8");
  return Object.freeze({ present: true, bytes: bytes.byteLength, sha256: createHash("sha256").update(bytes).digest("hex") });
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]));
  return value;
}
