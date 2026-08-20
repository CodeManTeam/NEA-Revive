#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

function readVarint(bytes, state) {
  let value = 0;
  let shift = 0;
  while (state.offset < bytes.length) {
    const byte = bytes[state.offset++];
    value += (byte & 0x7f) * 2 ** shift;
    if (!(byte & 0x80)) return value;
    shift += 7;
  }
  throw new Error("truncated varint");
}

const path = resolve(process.argv[2]);
const bytes = await readFile(path);
const state = { offset: 0 };
const version = readVarint(bytes, state);
console.log(JSON.stringify({ path, bytes: bytes.length, version, payloadOffset: state.offset }));
