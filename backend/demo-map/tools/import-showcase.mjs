import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { formatImportSummary, importMapProject } from "../src/import-project.mjs";

const projectRoot = resolve(fileURLToPath(new URL("../showcase", import.meta.url)));
const outputRoot = resolve(fileURLToPath(new URL("../build/showcase", import.meta.url)));
const result = await importMapProject(projectRoot, outputRoot);

console.log(`[import:showcase] ${formatImportSummary(result)}`);
if (!process.argv.includes("--check")) console.log(`[import:showcase] wrote ${result.outputRoot}`);
