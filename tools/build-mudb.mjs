#!/usr/bin/env node

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const mudbRoot = resolve(root, 'Shared', 'mudb');
const require = createRequire(import.meta.url);
const typescript = require(resolve(root, 'backend', 'box-go', 'node_modules', 'typescript'));
const checkOnly = process.argv.includes('--check');
const force = process.argv.includes('--force');
const sourceRoot = resolve(mudbRoot, 'src');
const sourceFiles = [
  ...readdirSync(resolve(mudbRoot, 'src', 'schema'))
    .filter((entry) => entry.endsWith('.ts'))
    .map((entry) => resolve(mudbRoot, 'src', 'schema', entry)),
  resolve(mudbRoot, 'src', 'stream', 'codec.ts'),
  resolve(mudbRoot, 'src', 'stream', 'index.ts'),
];
const outputFiles = sourceFiles.map((source) =>
  resolve(mudbRoot, source.slice(sourceRoot.length + 1).slice(0, -3) + '.js'),
);

function hasCompiledSurface() {
  return outputFiles.every((entry) => existsSync(entry));
}

function sourcesAreNewer() {
  const output = Math.min(...outputFiles.map((entry) => statSync(entry).mtimeMs));
  return sourceFiles.some((entry) => statSync(entry).mtimeMs > output);
}

if (checkOnly) {
  if (!hasCompiledSurface() || sourcesAreNewer()) {
    console.error('MuDB compiled schema/stream output is missing or stale. Run node tools/build-mudb.mjs.');
    process.exitCode = 1;
  }
  process.exit();
}

if (!force && hasCompiledSurface() && !sourcesAreNewer()) process.exit();

for (const source of sourceFiles) {
  const relative = source.slice(sourceRoot.length + 1);
  const output = resolve(mudbRoot, relative.slice(0, -3) + '.js');
  mkdirSync(resolve(output, '..'), { recursive: true });
  const result = typescript.transpileModule(readFileSync(source, 'utf8'), {
    compilerOptions: {
      module: typescript.ModuleKind.CommonJS,
      target: typescript.ScriptTarget.ES2017,
      removeComments: true,
      sourceMap: true,
    },
    fileName: source,
  });
  writeFileSync(output, result.outputText);
  if (result.sourceMapText) writeFileSync(`${output}.map`, result.sourceMapText);
}
