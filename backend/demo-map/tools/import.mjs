import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { formatImportSummary, importMapProject } from "../src/import-project.mjs";

const projectRoot = resolve(fileURLToPath(new URL("../project", import.meta.url)));
const outputRoot = resolve(fileURLToPath(new URL("../build/project", import.meta.url)));
const result = await importMapProject(projectRoot, outputRoot);

console.log(`[import] ${formatImportSummary(result)}`);
if (!process.argv.includes("--check")) console.log(`[import] wrote ${result.outputRoot}`);
