import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

process.env.NEA_DEMO_SOURCE_ROOT = resolve(fileURLToPath(new URL("../showcase", import.meta.url)));
await import("../src/server.mjs");
