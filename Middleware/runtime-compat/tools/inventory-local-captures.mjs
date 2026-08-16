import { readdir, readFile, stat, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(root, "..", "..");
const captureRoot = resolve(process.env.NEA_REFERENCE_CAPTURE_ROOT ?? resolve(repositoryRoot, "evidence", "captures"));
const outputPath = resolve(root, "generated", "local-capture-inventory.json");
const captures = [];

try {
  for (const name of (await readdir(captureRoot)).filter(value => /^(?:reference|capture)-(?:browser-)?\d.*\.json$/.test(value)).sort()) {
    const path = resolve(captureRoot, name);
    const data = JSON.parse(await readFile(path, "utf8"));
    const messages = Array.isArray(data.messages) ? data.messages : [];
    const counts = {};
    for (const message of messages) {
      const key = `${message.direction ?? "unknown"}:${message.kind ?? "unknown"}`;
      counts[key] = (counts[key] ?? 0) + 1;
    }
    captures.push({
      name,
      bytes: (await stat(path)).size,
      format: data.format ?? "unknown",
      version: data.version ?? null,
      socketCount: Array.isArray(data.sockets) ? data.sockets.length : 0,
      messageCount: messages.length,
      messageCounts: counts,
      hasReceivedBinary: messages.some(message => message.direction === "receive" && message.kind === "binary"),
      hasSentBinary: messages.some(message => message.direction === "send" && message.kind === "binary"),
    });
  }
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

const inventory = {
  format: "nea-local-capture-inventory",
  version: 1,
  generatedAt: new Date().toISOString(),
  captureCount: captures.length,
  captures,
  conclusion: captures.some(capture => capture.hasReceivedBinary)
    ? "At least one local capture contains binary server-to-client frames."
    : "No inventoried capture contains binary server-to-client frames; player body dimensions cannot be decoded directly from these exports.",
};
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(inventory, null, 2)}\n`);
console.log(`Inventoried ${captures.length} local compatibility captures.`);
