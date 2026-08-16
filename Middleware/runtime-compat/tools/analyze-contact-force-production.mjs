import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(root, "..", "..");
const bundlePath = "local-player/archive/project/bedwars/client-runtime/assets/_next/static/chunks/734.8dcb480d99773395.js";
const bundle = await readFile(resolve(repositoryRoot, bundlePath), "utf8");
const solver = webpackModule(bundle, 64781);
const indexWriter = webpackModule(bundle, 20351);
const recordHelpers = webpackModule(bundle, 20747);

requireMarkers("contact solver", solver, [
  "r.fx=0,r.fy=0,r.fz=0",
  "r.fx+=w.nor[0]*l*o.INV_DT",
  "r.fy+=w.nor[1]*l*o.INV_DT",
  "r.fz+=w.nor[2]*l*o.INV_DT",
  "r.fx+=(w.tan[0]*h+w.bin[0]*f)*o.INV_DT",
]);
requireMarkers("contact index writer", indexWriter, [
  "addBodiesContactRecord",
  "c,h,-a.nx,-a.ny,-a.nz,a.fx,a.fy,a.fz",
  "u,l,a.nx,a.ny,a.nz,-a.fx,-a.fy,-a.fz",
  "A.fx=a.fx,A.fy=a.fy,A.fz=a.fz",
]);
requireMarkers("contact record helpers", recordHelpers, [
  "t.addBodyContactRecord=function",
  "u.fx=i,u.fy=s,u.fz=c",
  "var r=n(2534),a=n(85282),o=.001",
  "c+=d.fx,u+=d.fy,l+=d.fz",
  "c/=p,u/=p,l/=p",
  "v.fx=c,v.fy=u,v.fz=l",
]);

const analysis = {
  format: "nea-contact-force-production-analysis",
  version: 1,
  generatedAt: new Date().toISOString(),
  source: { path: bundlePath, sha256: sha256(bundle) },
  modules: {
    solver: evidence(64781, solver),
    contactIndexWriter: evidence(20351, indexWriter),
    contactRecordHelpers: evidence(20747, recordHelpers),
  },
  solverForce: {
    reset: "Each solver pass resets contact fx/fy/fz before processing its contact points.",
    perPointFormula: "force += (normal * normalImpulse + tangent * tangentImpulse + binormal * binormalImpulse) * INV_DT",
    units: "impulse-per-fixed-step converted to force by INV_DT",
    includesFriction: true,
    status: "confirmed",
  },
  bodyContactProjection: {
    firstBody: { axis: "negative solver normal", force: "solver force" },
    secondBody: { axis: "solver normal", force: "negative solver force" },
    status: "confirmed",
  },
  voxelContactProjection: {
    initialForce: [0, 0, 0],
    solverForceAssignedToFirstGeneratedVoxelContact: true,
    compactGrouping: "same packed axis and same coordinate along that axis",
    cutoff: 0.001,
    cutoffRule: "retain a group when any absolute summed force component exceeds the cutoff",
    retainedForce: "component-wise group sum divided by group contact count, copied to each retained contact",
    status: "confirmed",
  },
  contactForceProperty: {
    status: "unresolved",
    reason: "ContactBinding implementation is absent; the rule that aggregates active contact records into GameEntity.contactForce is still unavailable.",
  },
};

await mkdir(resolve(root, "generated"), { recursive: true });
await writeFile(resolve(root, "generated", "contact-force-production-analysis.json"), `${JSON.stringify(analysis, null, 2)}\n`);
console.log("Analyzed historical contact force production; per-contact force confirmed, aggregate contactForce unresolved.");

function webpackModule(source, id) {
  const headers = [...source.matchAll(/(?:^|,)(\d+):function\(/g)].map(match => ({ id: Number(match[1]), start: match.index }));
  const index = headers.findIndex(header => header.id === id);
  if (index < 0) throw new Error(`Webpack module ${id} not found`);
  return source.slice(headers[index].start, headers[index + 1]?.start ?? source.length);
}

function requireMarkers(label, source, markers) {
  for (const marker of markers) if (!source.includes(marker)) throw new Error(`${label} marker missing: ${marker}`);
}

function evidence(id, source) {
  return { id, sha256: sha256(source), bytes: Buffer.byteLength(source) };
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
