export const clickListenerSignatureContract = Object.freeze({
  onClick: Object.freeze({ parameters: Object.freeze(["handler"]), filterSupported: false }),
  nextClick: Object.freeze({ parameters: Object.freeze(["filter?"]), filterSupported: true }),
  evidence: Object.freeze([
    "origin/origin/origin/ScriptDispatcher.js",
    "origin/origin/origin/api/GameEntity.js",
    "Frontend/demo-map/src/runtime/script-runtime.mjs",
  ]),
  remainingGap: "Click delivery still requires an authoritative backend entity binding for the clicked target.",
});
