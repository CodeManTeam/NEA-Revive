#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { decodeMeshAsset } from "./decode-engine-model.mjs";

const root = resolve(process.argv[2] ?? ".build/backroom-dump-20260819/GET-assets.box3.fun/engine/m");
const results = [];
for (const name of await readdir(root)) {
  const path = join(root, name);
  const bytes = await readFile(path);
  if (bytes[0] !== 7) continue;
  try {
    const decoded = decodeMeshAsset(bytes);
    results.push({
      name,
      bytes: bytes.length,
      bytesRead: decoded.bytesRead,
      trailingBytes: decoded.trailingBytes,
      nodeCount: decoded.value.nodes?.length ?? Object.keys(decoded.value.nodes ?? {}).length,
      meshCount: decoded.value.meshes?.length ?? 0,
      faceCount: decoded.value.meshes?.reduce((total, mesh) => total + (mesh?.length ?? 0), 0) ?? 0,
      textureWidth: decoded.value.texture?.width ?? 0,
    });
  } catch (error) {
    results.push({ name, bytes: bytes.length, error: String(error) });
  }
}
const complete = results.filter(item => item.trailingBytes === 0).length;
const partial = results.filter(item => item.trailingBytes > 0).length;
const failed = results.filter(item => item.error).length;
console.log(JSON.stringify({ root, total: results.length, complete, partial, failed, results }, null, 2));
