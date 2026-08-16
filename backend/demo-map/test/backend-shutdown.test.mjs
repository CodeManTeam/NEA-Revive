import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";

import { stopBackendProcess } from "../src/backend-shutdown.mjs";

test("backend shutdown completes after graceful termination", async () => {
  const child = createChild(signal => {
    if (signal === "SIGTERM") setTimeout(() => child.emit("exit", 0, signal), 1);
  });
  const warnings = [];

  const outcome = await stopBackendProcess({ child, logger: { warn: message => warnings.push(message) }, timeoutMS: 20 });

  assert.equal(outcome, "graceful");
  assert.deepEqual(child.signals, ["SIGTERM"]);
  assert.deepEqual(warnings, []);
});

test("backend shutdown escalates after its grace period", async () => {
  const child = createChild(signal => {
    if (signal === "SIGKILL") setTimeout(() => child.emit("exit", null, signal), 1);
  });
  const warnings = [];

  const outcome = await stopBackendProcess({ child, logger: { warn: message => warnings.push(message) }, timeoutMS: 5 });

  assert.equal(outcome, "forced");
  assert.deepEqual(child.signals, ["SIGTERM", "SIGKILL"]);
  assert.match(warnings[0], /did not exit within 5ms/);
});

test("backend shutdown does not signal an exited child", async () => {
  const child = createChild();
  child.exitCode = 0;

  const outcome = await stopBackendProcess({ child, logger: { warn() {} }, timeoutMS: 5 });

  assert.equal(outcome, "exited");
  assert.deepEqual(child.signals, []);
});

function createChild(onKill = () => {}) {
  const child = new EventEmitter();
  child.exitCode = null;
  child.signalCode = null;
  child.signals = [];
  child.kill = signal => {
    child.signals.push(signal);
    onKill(signal);
    return true;
  };
  return child;
}
