import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, extname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const toolRoot = dirname(fileURLToPath(import.meta.url));
const compatRoot = resolve(toolRoot, "..");
const repositoryRoot = resolve(compatRoot, "..", "..");
const docsRoot = resolve(repositoryRoot, "Evidence", "dao3-docs-mirror", "markdown", "api");
const outputPath = resolve(compatRoot, "generated", "docs-api-index.json");
const unresolvedPath = resolve(compatRoot, "generated", "docs-api-unresolved.json");

const files = (await walk(docsRoot)).filter(path => extname(path).toLowerCase() === ".md").sort();
const entriesById = new Map();
const unresolved = [];

for (const file of files) {
  const source = await readFile(file, "utf8");
  const documentPath = relative(repositoryRoot, file).split(sep).join("/");
  const relativeParts = relative(docsRoot, file).split(sep);
  const side = inferSide(relativeParts);
  const owner = inferOwner(relativeParts);
  const title = source.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? owner;
  for (const match of source.matchAll(/\bdeclare\s+const\s+([A-Za-z_$][\w$]*)\s*:\s*([^;\n]+)/g)) {
    pushEntry({
      id: `${side}.global.${match[1]}`,
      side,
      kind: "global",
      owner: "global",
      name: match[1],
      signature: { type: cleanMarkdown(match[2]) },
      availability: "declared",
      compatibility: "missing",
      capability: null,
      since: null,
      notes: [`Declared by documentation page: ${title}`],
      evidence: [{ type: "docs", path: documentPath, symbol: `declare const ${match[1]}`, confidence: "direct" }],
    });
  }
  for (const match of source.matchAll(/\bdeclare\s+(?:class|interface)\s+([A-Za-z_$][\w$]*)/g)) {
    pushEntry({
      id: `${side}.object.${match[1]}`,
      side,
      kind: "object",
      owner: "object",
      name: match[1],
      signature: { declaration: match[0].startsWith("declare class") ? "class" : "interface" },
      availability: "declared",
      compatibility: "missing",
      capability: null,
      since: null,
      notes: [`Declared by documentation page: ${title}`],
      evidence: [{ type: "docs", path: documentPath, symbol: match[0], confidence: "direct" }],
    });
  }
  const headings = [...source.matchAll(/^####\s+(.+)$/gm)];
  const sections = [...source.matchAll(/^##\s+(.+)$/gm)];
  for (let headingIndex = 0; headingIndex < headings.length; headingIndex += 1) {
    const match = headings[headingIndex];
    const raw = cleanMarkdown(match[1]);
    const section = sections.filter(value => value.index < match.index).at(-1);
    const sectionTitle = section ? cleanMarkdown(section[1]) : "";
    const parsed = parseMember(raw, sectionTitle);
    if (!parsed) {
      unresolved.push({ path: documentPath, owner, heading: raw, reason: "not-an-api-signature" });
      continue;
    }
    const regionStart = match.index + match[0].length;
    const regionEnd = headings[headingIndex + 1]?.index ?? source.length;
    parsed.signature = enrichSignature(parsed.signature, source.slice(regionStart, regionEnd));
    pushEntry({
      id: `${side}.${owner}.${parsed.name}`,
      side,
      kind: parsed.kind,
      owner,
      name: parsed.name,
      signature: parsed.signature,
      availability: "declared",
      compatibility: "missing",
      capability: null,
      since: null,
      notes: [`Declared by documentation page: ${title}`],
      evidence: [{ type: "docs", path: documentPath, symbol: raw, confidence: "direct" }],
    });
  }
}

const entries = [...entriesById.values()].sort((left, right) => left.id.localeCompare(right.id));
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify({
  format: "nea-runtime-abi",
  version: 2,
  signatureModel: "member-variants-v1",
  generatedAt: new Date().toISOString(),
  source: "dao3-docs-mirror/markdown/api",
  documentCount: files.length,
  entries,
}, null, 2)}\n`);
await writeFile(unresolvedPath, `${JSON.stringify({
  format: "nea-doc-api-unresolved",
  version: 1,
  generatedAt: new Date().toISOString(),
  entries: unresolved,
}, null, 2)}\n`);

console.log(`Extracted ${entries.length} API declarations from ${files.length} Markdown files.`);
console.log(`Recorded ${unresolved.length} non-signature level-4 headings for review.`);

function pushEntry(entry) {
  entry = withMemberVariants(entry);
  const previous = entriesById.get(entry.id);
  if (!previous) {
    entriesById.set(entry.id, entry);
    return;
  }
  const signatures = signatureVariants(previous.signature, entry.signature);
  const memberVariants = mergeMemberVariants(previous.memberVariants, entry.memberVariants);
  const kinds = [...new Set(memberVariants.map(variant => variant.kind))];
  entriesById.set(entry.id, {
    ...previous,
    signature: signatures.length === 1 ? signatures[0] : { variants: signatures },
    kinds,
    kindCollision: kinds.length > 1,
    memberVariants,
    notes: [...new Set([...(previous.notes ?? []), ...(entry.notes ?? [])])],
    evidence: deduplicateEvidence([...(previous.evidence ?? []), ...(entry.evidence ?? [])]),
  });
}

function withMemberVariants(entry) {
  return {
    ...entry,
    kinds: [entry.kind],
    kindCollision: false,
    memberVariants: [{
      kind: entry.kind,
      signature: structuredClone(entry.signature),
      evidence: structuredClone(entry.evidence ?? []),
    }],
  };
}

function mergeMemberVariants(...groups) {
  const output = new Map();
  for (const variant of groups.flat()) {
    const key = `${variant.kind}\u0000${JSON.stringify(variant.signature)}`;
    const previous = output.get(key);
    output.set(key, previous ? {
      ...previous,
      evidence: deduplicateEvidence([...(previous.evidence ?? []), ...(variant.evidence ?? [])]),
    } : structuredClone(variant));
  }
  return [...output.values()];
}

async function walk(directory) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) output.push(...await walk(path));
    else output.push(path);
  }
  return output;
}

function inferSide(parts) {
  if (parts[0] === "RemoteChannel") return parts[1] === "Client" ? "client" : "server";
  if (parts[0].startsWith("Client")) return "client";
  if (["GameVector3", "GameQuaternion", "GameBounds3", "GameRGBColor", "GameRGBAColor", "GameAnimation", "GameEventHandlerToken", "Sound"].includes(parts[0])) return "shared";
  return "server";
}

function inferOwner(parts) {
  if (parts[0] === "RemoteChannel") return "remoteChannel";
  if (parts[0] === "GameDataStorage" && parts.at(-1).toLowerCase() === "getspace.md") return "GameStorage";
  if (parts[0] === "GameDataStorage" && parts.at(-1).toLowerCase() === "getspace.md") return "GameStorage";
  if (parts[0] === "ClientUI") {
    const filename = parts.at(-1).replace(/\.md$/i, "");
    if (filename.toLowerCase() === "input") return "input";
    if (filename === "UiEvent") return "EventEmitter";
    return filename;
  }
  if (parts[0] === "ClientAudio") {
    const filename = parts.at(-1).replace(/\.md$/i, "");
    return filename.toLowerCase() === "mediaerror" ? "MediaError" : "Audio";
  }
  if (parts.length >= 2) return parts[0];
  const filename = parts.at(-1).replace(/\.md$/i, "");
  return filename;
}

function signatureVariants(...values) {
  const output = [];
  const seen = new Set();
  for (const value of values) {
    for (const signature of value?.variants ?? [value]) {
      const key = JSON.stringify(signature);
      if (seen.has(key)) continue;
      seen.add(key);
      output.push(signature);
    }
  }
  return output;
}

function deduplicateEvidence(values) {
  const seen = new Set();
  return values.filter(value => {
    const key = `${value.type}\u0000${value.path}\u0000${value.symbol ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function cleanMarkdown(value) {
  return value
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .trim();
}

function parseMember(raw, sectionTitle = "") {
  const normalized = raw
    .replace(/^\u53ea\u8bfb\s*/, "readonly ")
    .replace(/^\u4e8b\u4ef6\s*/, "")
    .trim();
  const method = normalized.match(/^(?:async\s+)?([A-Za-z_$][\w$]*)\s*\((.*)\)\s*(?::\s*(.+))?$/);
  if (method) {
    return {
      kind: isEventSection(sectionTitle) || /^on[A-Z_]|^next[A-Z_]/.test(method[1]) ? "event" : "method",
      name: method[1],
      signature: { parameters: parseParameters(method[2]), returns: method[3]?.trim() || "unknown" },
    };
  }
  const property = normalized.match(/^(readonly\s+)?([A-Za-z_$][\w$]*)\s*:\s*(.+)$/);
  if (property) {
    return {
      kind: isEventSection(sectionTitle) ? "event" : "property",
      name: property[2],
      signature: { type: property[3].trim(), readonly: Boolean(property[1]) },
    };
  }
  return null;
}

function isEventSection(value) {
  return /\u4e8b\u4ef6|event/iu.test(value);
}

function parseParameters(source) {
  if (!source.trim()) return [];
  return splitTopLevel(source).map((parameter, index) => {
    const match = parameter.trim().match(/^(\.\.\.)?([A-Za-z_$][\w$]*)(\?)?\s*:\s*(.+)$/);
    if (!match) return { name: `arg${index}`, optional: false, type: parameter.trim() || "unknown" };
    return {
      name: match[2],
      optional: Boolean(match[3]),
      type: match[4].trim(),
      ...(match[1] ? { rest: true } : {}),
    };
  });
}

function enrichSignature(signature, region) {
  if (!Array.isArray(signature.parameters) || signature.parameters.length === 0) return signature;
  const rows = region.split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.startsWith("|") && line.endsWith("|"))
    .map(line => line.slice(1, -1).split("|").map(cell => cleanMarkdown(cell.trim())))
    .filter(cells => cells.length >= 2 && !cells.every(cell => /^:?-{3,}:?$/.test(cell)));
  const parameters = signature.parameters.map(parameter => {
    const row = rows.find(cells => cells[0] === parameter.name);
    if (!row) return parameter;
    return {
      ...parameter,
      documentation: {
        required: row[1] || null,
        default: row[2] || null,
        type: row[3] || parameter.type,
        description: row.slice(4).join(" | ") || null,
      },
    };
  });
  return { ...signature, parameters };
}

function splitTopLevel(source) {
  const values = [];
  let start = 0;
  let depth = 0;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if ("([{<".includes(character)) depth += 1;
    else if (")]}>".includes(character)) depth = Math.max(0, depth - 1);
    else if (character === "," && depth === 0) {
      values.push(source.slice(start, index));
      start = index + 1;
    }
  }
  values.push(source.slice(start));
  return values;
}
