import assert from "node:assert/strict";
import test from "node:test";

import { createStateSyncWarningLogger } from "../src/state-sync-warnings.mjs";

test("state sync warning logger throttles repeated session failures", () => {
  let now = 0;
  const messages = [];
  const warningLogger = createStateSyncWarningLogger({
    intervalMS: 100,
    logger: { warn: message => messages.push(message) },
    now: () => now,
  });

  assert.equal(warningLogger.warn("session-1", new Error("backend unavailable")), true);
  assert.equal(warningLogger.warn("session-1", new Error("backend unavailable")), false);
  now = 99;
  assert.equal(warningLogger.warn("session-1", new Error("backend unavailable")), false);
  now = 100;
  assert.equal(warningLogger.warn("session-1", new Error("backend unavailable")), true);
  assert.equal(warningLogger.warn("session-1", new Error("different failure")), true);
  assert.deepEqual(messages, [
    "[demo] state sync failed for session-1: backend unavailable",
    "[demo] state sync failed for session-1: backend unavailable",
    "[demo] state sync failed for session-1: different failure",
  ]);
});

test("state sync warning logger validates configuration", () => {
  assert.throws(
    () => createStateSyncWarningLogger({ intervalMS: 0, logger: { warn() {} }, now: () => 0 }),
    /positive integer/,
  );
});
