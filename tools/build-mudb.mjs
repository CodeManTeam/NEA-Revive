#!/usr/bin/env node

import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const mudbRoot = resolve(root, 'Shared', 'mudb');
const tsc = resolve(root, 'backend', 'box-go', 'node_modules', '.bin', process.platform === 'win32' ? 'tsc.cmd' : 'tsc');
const checkOnly = process.argv.includes('--check');
const force = process.argv.includes('--force');

function hasCompiledSurface() {
  return ['schema/index.js', 'stream/index.js'].every((entry) => existsSync(resolve(mudbRoot, entry)));
}

function sourcesAreNewer() {
  const output = statSync(resolve(mudbRoot, 'schema/index.js')).mtimeMs;
  return ['src/schema/index.ts', 'src/stream/index.ts'].some((entry) => statSync(resolve(mudbRoot, entry)).mtimeMs > output);
}

if (checkOnly) {
  if (!hasCompiledSurface() || sourcesAreNewer()) {
    console.error('MuDB compiled schema/stream output is missing or stale. Run npm run build:mudb.');
    process.exitCode = 1;
  }
  process.exit();
}

if (!force && hasCompiledSurface() && !sourcesAreNewer()) process.exit();
if (!existsSync(tsc)) {
  console.error(`TypeScript compiler not found at ${tsc}. Install backend/box-go dependencies first.`);
  process.exitCode = 1;
  process.exit();
}

const result = spawnSync(tsc, ['-p', resolve(mudbRoot, 'tsconfig.json')], { cwd: mudbRoot, stdio: 'inherit', shell: false });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
