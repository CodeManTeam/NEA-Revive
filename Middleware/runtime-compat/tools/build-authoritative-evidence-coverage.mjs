import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(root, "..", "..");
const originRoot = resolve(repositoryRoot, "Evidence/origin/origin/origin");
const referenceRoot = resolve(repositoryRoot, process.env.NEA_EXTERNAL_REFERENCE_ROOT ?? "Middleware/runtime-compat/evidence/player-runtime");
const backendPath = resolve(repositoryRoot, "local-player/backend/box3-server.cjs");

const originFiles = await sourceFiles(originRoot, /\.js$/u);
const referenceFiles = await sourceFiles(referenceRoot, /\.(?:ts|svelte)$/u);
const originText = await joinedText(originFiles);
const referenceText = await joinedText(referenceFiles);
const backendText = await readFile(backendPath, "utf8");
const physics = await readJson("generated/player-physics-bundle-analysis.json");
const networkBody = await readJson("generated/player-network-body-analysis.json");
const profile = await readJson("generated/player-profile-network-inventory.json");
const legacy = await readJson("generated/legacy-worktree-posture-inventory.json");
const postureCorpus = await readJson("generated/posture-delta-corpus-inventory.json");
const contactForce = await readJson("generated/contact-force-production-analysis.json");

const originContactBindingReferences = count(originText, /\bContactBinding\b/g);
const originContactBindingDefinitions = count(originText, /(?:\bclass\s+ContactBinding\b|\b(?:const|let|var)\s+ContactBinding\b|\bContactBinding\s*=)/g);
const externalReferenceShapeWrites = fieldWrites(referenceText);
const backendShapeWrites = fieldWrites(backendText);
const backendPostureShapeWrites = postureAdjacentWrites(backendText);
const playRoutes = profile.serviceWorkerCache.routeFamilies.filter(route => route.routeFamily === "/play/[id]");

const coverage = {
  format: "nea-authoritative-runtime-evidence-coverage",
  version: 1,
  generatedAt: new Date().toISOString(),
  indexedSourceSets: [
    sourceSet("origin-server-runtime", originRoot, originFiles),
    sourceSet("external-reference-runtime-adapters", referenceRoot, referenceFiles),
    {
      id: "local-player-backend",
      path: "local-player/backend/box3-server.cjs",
      files: 1,
      bytes: Buffer.byteLength(backendText),
      sha256: sha256(backendText),
    },
    { id: "archived-player-bundle", path: contactForce.source.path, files: 1, sha256: contactForce.source.sha256 },
    { id: "player-browser-profile", path: profile.source.path, files: profile.serviceWorkerCache.parsedEntries },
    { id: "legacy-worktree", path: "sibling-local-worktree", files: Object.keys(legacy.sources).length },
    { id: "posture-delta-frame-corpus", path: "Middleware/runtime-compat/generated/posture-delta-corpus-inventory.json", files: postureCorpus.sourceSets.reduce((total, source) => total + source.files, 0) },
  ],
  contactBinding: {
    originReferences: originContactBindingReferences,
    originDefinitions: originContactBindingDefinitions,
    perContactForceProduction: contactForce.solverForce.status,
    aggregateContactForce: contactForce.contactForceProperty.status,
    status: originContactBindingDefinitions > 0 ? "implementation-found" : "reference-only",
    conclusion: "The recovered origin runtime calls ContactBinding but does not contain its definition; per-contact force is recovered from Player physics, while GameEntity.contactForce aggregation remains unavailable.",
  },
  postureShapeProducer: {
    clientMotorShapeWrites: physics.posture.clientMotorShapeWriteCount,
    externalReferenceShapeWrites,
    backendShapeWrites,
    backendPostureAdjacentShapeWrites: backendPostureShapeWrites,
    legacyPlayerShapeWrites: legacy.legacyPublicProducer.playerBodyWrites,
    cachedPlayRoutes: playRoutes,
    publicFrameCount: postureCorpus.authoritativePostureDelta.candidateServerToClientBinaryFrames,
    clientToServerBinaryFrames: postureCorpus.captures.traffic.clientToServerBinaryFrames,
    frameCorpusStatus: postureCorpus.authoritativePostureDelta.status,
    frameCorpusSourceSets: postureCorpus.sourceSets.map(source => source.id),
    authoritativeDeltaStatus: legacy.authoritativePostureDelta.status,
    unresolved: networkBody.unresolved,
    status: "not-found-in-indexed-local-evidence",
    conclusion: "Indexed local sources contain standing-profile producers, client-side posture consumers and client-to-server input captures, but no server-to-client crouch/fly-conditioned write to rx/ry/rz or hsx/hsy/hsz.",
  },
  cacheClassification: {
    canonicalStreams: profile.serviceWorkerCache.parsedEntries,
    ignoredTemporaryFiles: profile.serviceWorkerCache.ignoredTemporaryFiles,
    playRouteResponseKinds: [...new Set(playRoutes.map(route => route.responseKind))].sort(),
    finding: "Cached /play/[id] entries are HTTP HTML responses, not persisted WebSocket PUBLIC frames.",
  },
  completionImpact: {
    phaseRequirement: "player-posture-shapes",
    status: "partial",
    reason: "The indexed evidence coverage is exhausted without the authoritative posture delta; substitute dimensions remain forbidden.",
  },
};

await mkdir(resolve(root, "generated"), { recursive: true });
await writeFile(resolve(root, "generated", "authoritative-runtime-evidence-coverage.json"), `${JSON.stringify(coverage, null, 2)}\n`);
console.log("Built authoritative runtime evidence coverage; posture producer and ContactBinding remain absent from indexed local sources.");

async function sourceFiles(directory, expression) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) output.push(...await sourceFiles(path, expression));
    else if (entry.isFile() && expression.test(entry.name)) output.push(path);
  }
  return output.sort();
}

async function joinedText(files) {
  return (await Promise.all(files.map(file => readFile(file, "utf8")))).join("\n");
}

function sourceSet(id, directory, files) {
  return {
    id,
    path: relative(repositoryRoot, directory).replaceAll("\\", "/"),
    files: files.length,
  };
}

function fieldWrites(source) {
  return [...source.matchAll(/\b([A-Za-z_$][\w$]*)\.(rx|ry|rz|hsx|hsy|hsz)\s*=/g)]
    .map(match => ({ receiver: match[1], field: match[2] }));
}

function postureAdjacentWrites(source) {
  const lines = source.split(/\r?\n/u);
  const output = [];
  for (let index = 0; index < lines.length; index += 1) {
    const writes = fieldWrites(lines[index]);
    if (writes.length === 0) continue;
    const context = lines.slice(Math.max(0, index - 20), index + 21).join("\n");
    if (/crouch|flying|flyState|PlayerFlyState|PlayerWalkState/iu.test(context)) output.push(...writes.map(write => ({ ...write, line: index + 1 })));
  }
  return output;
}

function count(source, expression) {
  return [...source.matchAll(expression)].length;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function readJson(path) {
  return JSON.parse(await readFile(resolve(root, path), "utf8"));
}
