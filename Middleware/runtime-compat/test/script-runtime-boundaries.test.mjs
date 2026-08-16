import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const boundaries = JSON.parse(await readFile(new URL("../abi/script-runtime-boundaries.json", import.meta.url), "utf8"));
const architecture = JSON.parse(await readFile(new URL("../abi/runtime-contracts.json", import.meta.url), "utf8"));

test("client and server scripts remain separate execution realms", () => {
  assert.equal(boundaries.runtimes.length, 2);
  const client = boundaries.runtimes.find(runtime => runtime.side === "client");
  const server = boundaries.runtimes.find(runtime => runtime.side === "server");
  assert.equal(client.engine, "SES Compartment");
  assert.equal(client.entry, "clientIndex.js");
  assert.equal(server.engine, "Node vm.Context");
  assert.notEqual(client.provider, server.provider);
  assert.ok(client.forbiddenAuthority.includes("server world mutation"));
  assert.ok(server.forbiddenAuthority.includes("direct DOM/UI access"));
});

test("runtime crossings are explicit serialized bridges", () => {
  assert.deepEqual(boundaries.bridges.map(bridge => bridge.id), ["remote-channel", "authoritative-state"]);
  assert.equal(boundaries.sharedValues.transportForm, "serialized values only");
  assert.equal(architecture.scriptRuntimes.boundaries, "runtime-compat/abi/script-runtime-boundaries.json");
  assert.equal(architecture.contactEvents.forceStatus, "confirmed-historical-production-local-compatible");
});
