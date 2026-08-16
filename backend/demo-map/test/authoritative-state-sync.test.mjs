import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_AUTHORITATIVE_STATE_SYNC_TIMEOUT_MS, syncAuthoritativePlayerStates } from "../src/authoritative-state-sync.mjs";

test("authoritative state sync reads and applies every connected player", async () => {
  const applied = [];
  await syncAuthoritativePlayerStates({
    applyState: (playerId, state) => applied.push({ playerId, state }),
    isMissingSessionError: () => false,
    logger: { warn() {} },
    readState: async ({ session }) => ({ session, tick: 7 }),
    sessionPlayers: new Map([["session-a", "player-1"], ["session-b", "player-2"]]),
    timeoutMS: DEFAULT_AUTHORITATIVE_STATE_SYNC_TIMEOUT_MS,
  });
  assert.deepEqual(applied.sort((left, right) => left.playerId.localeCompare(right.playerId)), [
    { playerId: "player-1", state: { session: "session-a", tick: 7 } },
    { playerId: "player-2", state: { session: "session-b", tick: 7 } },
  ]);
});

test("authoritative state sync suppresses missing-session errors", async () => {
  const warnings = [];
  await syncAuthoritativePlayerStates({
    applyState() { throw new Error("should not apply"); },
    isMissingSessionError: error => String(error).includes("player state not found"),
    logger: { warn: message => warnings.push(message) },
    readState: async () => { throw new Error("player state not found"); },
    sessionPlayers: new Map([["session-a", "player-1"]]),
    timeoutMS: 20,
  });
  assert.deepEqual(warnings, []);
});

test("authoritative state sync logs non-missing errors and timeouts", async () => {
  const warnings = [];
  await syncAuthoritativePlayerStates({
    applyState() {},
    isMissingSessionError: error => String(error).includes("player state not found"),
    logger: { warn: message => warnings.push(message) },
    readState: async ({ signal }) => {
      await new Promise((resolve, reject) => {
        signal.addEventListener("abort", () => reject(signal.reason), { once: true });
      });
    },
    sessionPlayers: new Map([["session-a", "player-1"]]),
    timeoutMS: 5,
  });
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /state sync failed for session-a/);
});

test("authoritative state sync cancels reads during parent shutdown without warning", async () => {
  const controller = new AbortController();
  const warnings = [];
  const pending = syncAuthoritativePlayerStates({
    applyState() { throw new Error("state should not apply after shutdown"); },
    isMissingSessionError: () => false,
    logger: { warn: message => warnings.push(message) },
    readState: ({ signal }) => new Promise((resolve, reject) => signal.addEventListener("abort", () => reject(signal.reason), { once: true })),
    sessionPlayers: new Map([["session-a", "player-1"]]),
    signal: controller.signal,
    timeoutMS: 1_000,
  });
  controller.abort(new Error("shutdown"));
  await pending;
  assert.deepEqual(warnings, []);
});

test("authoritative state sync delegates failures to warning logger", async () => {
  const warnings = [];
  await syncAuthoritativePlayerStates({
    applyState() {},
    isMissingSessionError: () => false,
    logger: { warn: () => assert.fail("fallback logger should not be used") },
    readState: async () => { throw new Error("backend unavailable"); },
    sessionPlayers: new Map([["session-1", "player-1"]]),
    timeoutMS: 20,
    warningLogger: { warn: (session, error) => warnings.push({ message: error.message, session }) },
  });

  assert.deepEqual(warnings, [{ message: "backend unavailable", session: "session-1" }]);
});
