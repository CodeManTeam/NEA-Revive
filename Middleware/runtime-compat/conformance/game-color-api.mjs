export const gameColorApiConformance = Object.freeze({
  types: Object.freeze({
    GameRGBColor: Object.freeze({
      compatible: Object.freeze(["GameRGBColor", "r", "g", "b", "random", "set", "copy", "add", "sub", "mul", "div", "addEq", "subEq", "mulEq", "divEq", "lerp", "clone", "toRGBA", "toString"]),
      partial: Object.freeze(["equals"]),
    }),
    GameRGBAColor: Object.freeze({
      compatible: Object.freeze(["GameRGBAColor", "r", "g", "b", "a", "set", "copy", "add", "sub", "mul", "div", "addEq", "subEq", "mulEq", "divEq", "lerp", "blendEq", "clone", "toString"]),
      partial: Object.freeze(["equals"]),
    }),
  }),
  zeroDivisorPolicy: "Each zero divisor component produces zero, matching the recovered source.",
  blendEqPolicy: "Despite its name, blendEq returns a new GameRGBColor and does not mutate either operand.",
  partialReason: "Both equality formulas depend on EPSILON$2, whose binding is absent from the extracted origin classes. The local 1e-6 value has supporting archived Player evidence only.",
  evidence: Object.freeze([
    "origin/origin/origin/api/GameRGBColor.js",
    "origin/origin/origin/api/GameRGBAColor.js",
    "Frontend/demo-map/src/runtime/colors.mjs",
    "local-player/archive/project/bedwars/client-runtime/assets/_next/static/chunks/457.36bf26873ad51e54.js",
  ]),
});
