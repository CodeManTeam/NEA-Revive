import { readFile } from "node:fs/promises";

export async function readJsonFile(path, label) {
  let source;
  try {
    source = await readFile(path, "utf8");
  } catch (error) {
    throw new Error(`Unable to read ${label}: ${formatError(error)}`, { cause: error });
  }
  try {
    return JSON.parse(source);
  } catch (error) {
    throw new Error(`Invalid JSON in ${label}: ${formatError(error)}`, { cause: error });
  }
}

function formatError(error) {
  return error instanceof Error ? error.message : String(error);
}
