import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import { typedEventFutures, typedEventSignatures } from "../conformance/typed-event-signatures.mjs";

const currentRuntime = JSON.parse(await readFile(new URL("../abi/current-runtime.json", import.meta.url), "utf8"));
const entries = new Map(currentRuntime.entries.map(entry => [entry.id, entry]));

test("typed event channels do not regress to anonymous structural signatures", () => {
  for (const [id, type] of Object.entries(typedEventSignatures)) {
    assert.equal(entries.get(id)?.signature?.parameters?.[0]?.type, type, id);
  }
  for (const [id, type] of Object.entries(typedEventFutures)) {
    assert.equal(entries.get(id)?.signature?.returns, type, id);
  }
});
