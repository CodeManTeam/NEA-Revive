export const gameQuaternionApiConformance = Object.freeze({
  canonicalType: "GameQuaternion",
  compatible: Object.freeze([
    "GameQuaternion", "w", "x", "y", "z", "fromAxisAngle", "fromEuler", "set", "copy",
    "rotateX", "rotateY", "rotateZ", "dot", "add", "sub", "angle", "mul", "div", "mag",
    "sqrMag", "normalize", "clone", "toString",
  ]),
  partial: Object.freeze(["rotationBetween", "getAxisAngle", "inv", "slerp", "equals"]),
  getAxisAngleContract: "Historical signature is instance.getAxisAngle(quaternion); it normalizes the argument and does not inspect this.",
  partialReason: "These five formulas depend on EPSILON$2, whose binding is absent from the extracted origin class. The local 1e-6 value has supporting archived Player evidence, not direct symbol linkage.",
  evidence: Object.freeze([
    "origin/origin/origin/api/GameQuaternion.js",
    "Frontend/demo-map/src/runtime/quaternion.mjs",
    "local-player/archive/project/bedwars/client-runtime/assets/_next/static/chunks/457.36bf26873ad51e54.js",
  ]),
});
