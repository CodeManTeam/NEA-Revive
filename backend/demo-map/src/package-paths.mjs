import { lstat } from "node:fs/promises";
import { relative, resolve } from "node:path";

export async function assertRealDirectory(path, label) {
  const directory = resolve(path);
  let info;
  try {
    info = await lstat(directory);
  } catch (error) {
    throw new Error(`Unable to access ${label}: ${formatError(error)}`, { cause: error });
  }
  if (!info.isDirectory() || info.isSymbolicLink()) throw new Error(`${label} must be a real directory`);
  return directory;
}

export async function assertRegularFile(path, label) {
  const file = resolve(path);
  let info;
  try {
    info = await lstat(file);
  } catch (error) {
    throw new Error(`Unable to access ${label}: ${formatError(error)}`, { cause: error });
  }
  if (!info.isFile() || info.isSymbolicLink()) throw new Error(`${label} must be a regular file`);
  return file;
}

export function resolveWithin(rootPath, relativePath, label) {
  if (typeof relativePath !== "string" || relativePath.length === 0) throw new Error(`Invalid ${label} path`);
  const root = resolve(rootPath);
  const candidate = resolve(root, relativePath);
  const pathFromRoot = relative(root, candidate);
  if (pathFromRoot === ".." || pathFromRoot.startsWith("..\\") || pathFromRoot.startsWith("../") || resolve(pathFromRoot) === pathFromRoot) {
    throw new Error(`${label} escapes its package root`);
  }
  return candidate;
}

export async function resolveRegularFileWithin(rootPath, relativePath, label) {
  return assertRegularFile(resolveWithin(rootPath, relativePath, label), label);
}

function formatError(error) {
  return error instanceof Error ? error.message : String(error);
}
