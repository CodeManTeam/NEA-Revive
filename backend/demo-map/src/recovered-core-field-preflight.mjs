const FIELD_SCHEMAS = Object.freeze({
  environment: Object.freeze({ bakedShadow: "object", drawDistance: "number", fog: "object", rain: "object", sky: "object", snow: "object" }),
  features: Object.freeze({ enableTriggerAPI: "boolean" }),
  physics: Object.freeze({ gravity: "number", useOBB: "boolean", velocityDamping: "number" }),
  player: Object.freeze({
    cameraType: "string", scale: "number", colorLUT: "string", initialPosition: "object", initialYaw: "number", movementBounds: "object",
    allowFlight: "boolean", allowMove: "boolean", allowAction0: "boolean", allowAction1: "boolean", allowJump: "boolean", allowDoubleJump: "boolean", allowCrouch: "boolean", noClip: "boolean",
    walkSpeed: "number", walkAcceleration: "number", runSpeed: "number", runAcceleration: "number", crouchSpeed: "number", crouchAcceleration: "number", swimSpeed: "number", swimAcceleration: "number", flySpeed: "number", flyAcceleration: "number", jumpSpeedFactor: "number", jumpAccelerationFactor: "number", jumpPower: "number", doubleJumpPower: "number", mass: "number", friction: "number", restitution: "number", color: "object", emissive: "number", shininess: "number", metalness: "number", invisible: "boolean", showName: "boolean", showIndicator: "boolean", damage: "object", sounds: "object", playerSounds: "object",
  }),
});

export function preflightRecoveredCoreField(name, value) {
  const schema = FIELD_SCHEMAS[name];
  if (!schema) throw new RangeError(`Unsupported recovered core field: ${name}`);
  if (!isRecord(value)) return result(name, "evidence-blocked", 0, diagnostic(name, "invalid-value-shape", "Recovered core field must be an object"));
  const keys = Object.keys(value).sort();
  const expectedKeys = Object.keys(schema).sort();
  if (keys.length !== expectedKeys.length || keys.some((key, index) => key !== expectedKeys[index])) {
    return result(name, "evidence-blocked", keys.length, diagnostic(name, "field-schema-mismatch", "Recovered core field does not match the observed public schema"));
  }
  for (const [key, expectedType] of Object.entries(schema)) {
    if (valueType(value[key]) !== expectedType) return result(name, "evidence-blocked", keys.length, diagnostic(name, "field-type-mismatch", `Recovered field ${key} does not match the observed base type`));
  }
  return result(name, "partial", keys.length, diagnostic(name, "value-semantics-unverified", "Top-level schema is observed, but value semantics remain unverified"));
}

function result(field, status, keyCount, diagnosticValue) {
  return Object.freeze({ format: "nea-recovered-core-field-preflight", version: 1, field, status, keyCount, conversion: "not-attempted", diagnostics: Object.freeze([diagnosticValue]) });
}

function diagnostic(field, code, message) {
  return Object.freeze({ field, code, message });
}

function valueType(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
