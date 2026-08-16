import assert from "node:assert/strict";
import test from "node:test";
import { readBooleanFlagEnv, readOptionalNonEmptyStringEnv, readPortEnv, readPositiveIntegerEnv, readUnsignedIdMapEnv } from "../src/environment.mjs";

test("environment reader uses defaults and accepts positive integers", () => {
  assert.equal(readPositiveIntegerEnv({}, "NEA_DEMO_CONTROL_REQUEST_TIMEOUT_MS", 2_000), 2_000);
  assert.equal(readPositiveIntegerEnv({ NEA_DEMO_CONTROL_REQUEST_TIMEOUT_MS: "750" }, "NEA_DEMO_CONTROL_REQUEST_TIMEOUT_MS", 2_000), 750);
  assert.equal(readPositiveIntegerEnv({ NEA_DEMO_STATE_SYNC_INTERVAL_MS: "100" }, "NEA_DEMO_STATE_SYNC_INTERVAL_MS", 50), 100);
  assert.equal(readPortEnv({ NEA_DEMO_PORT: "4322" }, "NEA_DEMO_PORT", 4_322), 4_322);
});

test("environment reader rejects invalid timeout and port values", () => {
  assert.throws(() => readPositiveIntegerEnv({ TIMEOUT: "0" }, "TIMEOUT", 1), /positive integer/);
  assert.throws(() => readPositiveIntegerEnv({ TIMEOUT: "1.5" }, "TIMEOUT", 1), /positive integer/);
  assert.throws(() => readPositiveIntegerEnv({ INTERVAL: "-5" }, "INTERVAL", 1), /positive integer/);
  assert.throws(() => readPortEnv({ PORT: "65536" }, "PORT", 1), /valid TCP port/);
});

test("environment reader validates explicit Player skin id configuration", () => {
  assert.deepEqual(readUnsignedIdMapEnv({}, "SKINS"), {});
  assert.deepEqual(readUnsignedIdMapEnv({ SKINS: '{"default":1,"alternate":23}' }, "SKINS"), { default: 1, alternate: 23 });
  assert.equal(readOptionalNonEmptyStringEnv({ DEFAULT_SKIN: "default" }, "DEFAULT_SKIN"), "default");
  assert.equal(readOptionalNonEmptyStringEnv({}, "DEFAULT_SKIN"), undefined);
  assert.throws(() => readUnsignedIdMapEnv({ SKINS: "[]" }, "SKINS"), /JSON object/);
  assert.throws(() => readUnsignedIdMapEnv({ SKINS: '{"default":0}' }, "SKINS"), /nonzero unsigned/);
  assert.throws(() => readOptionalNonEmptyStringEnv({ DEFAULT_SKIN: "" }, "DEFAULT_SKIN"), /must not be empty/);
});

test("environment reader requires explicit binary diagnostic flags", () => {
  assert.equal(readBooleanFlagEnv({}, "DIAGNOSTIC"), false);
  assert.equal(readBooleanFlagEnv({ DIAGNOSTIC: "1" }, "DIAGNOSTIC"), true);
  assert.equal(readBooleanFlagEnv({ DIAGNOSTIC: "0" }, "DIAGNOSTIC", true), false);
  assert.throws(() => readBooleanFlagEnv({ DIAGNOSTIC: "true" }, "DIAGNOSTIC"), /must be 0 or 1/);
});
