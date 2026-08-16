const { join, resolve } = require("node:path");
const { pathToFileURL } = require("node:url");
const { spawnSync } = require("node:child_process");

const configuredLegacyRoot = process.argv[2] ?? process.env.NEA_LEGACY_ROOT;
if (!configuredLegacyRoot) throw new Error("Pass the local research project root as the first argument or NEA_LEGACY_ROOT");
const legacyRoot = resolve(configuredLegacyRoot);
const loader = pathToFileURL(join(legacyRoot, "node_modules/tsx/dist/loader.mjs")).href;
const probe = join(__dirname, "probe-remote-channel.mjs");
const result = spawnSync(process.execPath, ["--import", loader, probe, legacyRoot], {
  cwd: resolve(__dirname, ".."),
  env: process.env,
  stdio: "inherit",
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
