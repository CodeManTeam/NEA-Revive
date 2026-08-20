#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { decodeModelV7 } from "./decode-engine-model.mjs";

const root = resolve(process.argv[2] ?? ".build/backroom-dump-20260819/GET-assets.box3.fun/engine/m");
const results = [];
for (const name of await readdir(root)) {
  const path = join(root, name);
  const bytes = await readFile(path);
  if (bytes[0] !== 7) continue;
  try {
    const decoded = decodeModelV7(bytes);
    results.push({ name, bytes: bytes.length, bytesRead: decoded.bytesRead, trailingBytes: decoded.trailingBytes, nodeCount: decoded.value.nodes.length, meshCount: decoded.value.meshes.length, textureWidth: decoded.value.texture.width });
  } catch (error) {
    results.push({ name, bytes: bytes.length, error: String(error) });
  }
}
const complete = results.filter(item => item.trailingBytes === 0).length;
const partial = results.filter(item => item.trailingBytes > 0).length;
const failed = results.filter(item => item.error).length;
console.log(JSON.stringify({ root, total: results.length, complete, partial, failed, results }, null, 2));
