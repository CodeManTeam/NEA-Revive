import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertRealDirectory, assertRegularFile, resolveRegularFileWithin, resolveWithin } from "../src/package-paths.mjs";

test("package path resolver accepts real directories", async () => {
  const root = await mkdtemp(join(tmpdir(), "nea-package-root-"));
  assert.equal(await assertRealDirectory(root, "runtime package projectRoot"), root);
});

test("package path resolver classifies missing roots and non-directories", async () => {
  const root = await mkdtemp(join(tmpdir(), "nea-package-root-"));
  const file = join(root, "package.json");
  await writeFile(file, "{}", "utf8");
  await assert.rejects(assertRealDirectory(join(root, "missing"), "runtime package archiveRoot"), /Unable to access runtime package archiveRoot/);
  await assert.rejects(assertRealDirectory(file, "runtime package archiveRoot"), /must be a real directory/);
});

test("package path resolver accepts regular files and rejects directories", async () => {
  const root = await mkdtemp(join(tmpdir(), "nea-package-file-"));
  const file = join(root, "manifest.json");
  const directory = join(root, "nested");
  await writeFile(file, "{}", "utf8");
  await mkdir(directory);
  assert.equal(await assertRegularFile(file, "manifest"), file);
  assert.equal(await resolveRegularFileWithin(root, "manifest.json", "manifest"), file);
  await assert.rejects(assertRegularFile(directory, "manifest"), /must be a regular file/);
  await assert.rejects(resolveRegularFileWithin(root, "missing.json", "manifest"), /Unable to access manifest/);
});

test("package path resolver accepts nested relative paths", () => {
  assert.equal(resolveWithin("C:/runtime/project", "scripts/server.js", "script"), "C:\\runtime\\project\\scripts\\server.js");
});

test("package path resolver rejects traversal and absolute paths", () => {
  assert.throws(() => resolveWithin("C:/runtime/project", "../outside.json", "manifest"), /escapes its package root/);
  assert.throws(() => resolveWithin("C:/runtime/project", "C:/outside.json", "manifest"), /escapes its package root/);
  assert.throws(() => resolveWithin("C:/runtime/project", "", "manifest"), /Invalid manifest path/);
});
