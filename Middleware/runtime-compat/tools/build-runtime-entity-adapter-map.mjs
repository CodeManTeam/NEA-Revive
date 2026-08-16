import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const local = await readJson("generated/local-server-runtime-analysis.json");
const docs = await readJson("generated/docs-api-index.json");
const origin = await readJson("generated/origin-server-api.json");
const localEntries = new Map(local.entries.map(entry => [entry.id, entry]));
const docsEntries = new Map(docs.entries.map(entry => [entry.id, entry]));
const originEntries = new Map(origin.entries.map(entry => [entry.id, entry]));
const specs = [
  partial("server.RuntimeEntity.id", "server.GameEntity.id", {
    access: ["Local RuntimeEntity.id is getter-only so the host entity index cannot diverge; canonical GameEntity.id is documented writable."],
    signature: [],
    effect: ["Local identity has no historical entity lifecycle or replication binding."],
  }),
  extension("server.RuntimeEntity.kind", "kind is a local importer classification and has no canonical GameEntity member."),
  partial("server.RuntimeEntity.position", "server.GameEntity.position", {
    access: [],
    signature: ["Canonical position uses GameVector3; local RuntimeEntity exposes the smaller Vector3 compatibility type."],
    effect: ["Whole-value writes on captured-mesh runtime-created entities are queued to the authoritative backend projection. In-place Vector3 mutations and generic native physics simulation remain unverified."],
  }),
  partial("server.RuntimeEntity.collides", "server.GameEntity.collides", {
    access: [],
    signature: [],
    effect: ["Initial values and later whole-property writes are copied through the loopback entity-state bridge into authoritative replica.body.collides.", "The local authoritative runtime does not simulate generic RuntimeEntity bodies, so native collision response remains unavailable."],
  }),
  partial("server.RuntimeEntity.fixed", "server.GameEntity.fixed", {
    access: [],
    signature: [],
    effect: ["Initial values and later whole-property writes are copied through the loopback entity-state bridge into authoritative replica.body.fixed.", "The local authoritative runtime does not simulate generic RuntimeEntity bodies, so native fixed-body behavior remains unavailable."],
  }),
  partial("server.RuntimeEntity.gravity", "server.GameEntity.gravity", {
    access: [],
    signature: [],
    effect: ["Initial values and later whole-property writes are copied through the loopback entity-state bridge into authoritative replica.body.gravity.", "The local authoritative runtime does not simulate generic RuntimeEntity bodies, so native gravity integration remains unavailable."],
  }),
  partial("server.RuntimeEntity.mass", "server.GameEntity.mass", {
    access: [],
    signature: [],
    effect: ["Initial values and later whole-property writes are validated and copied through the loopback entity-state bridge into authoritative replica.body.mass.", "The local authoritative runtime does not simulate generic RuntimeEntity bodies, so native mass-dependent response remains unavailable."],
  }),
  partial("server.RuntimeEntity.friction", "server.GameEntity.friction", {
    access: [],
    signature: [],
    effect: ["Initial values and later whole-property writes are validated and copied through the loopback entity-state bridge into authoritative replica.body.friction.", "The local authoritative runtime does not simulate generic RuntimeEntity bodies, so native friction response remains unavailable."],
  }),
  partial("server.RuntimeEntity.restitution", "server.GameEntity.restitution", {
    access: [],
    signature: [],
    effect: ["Initial values and later whole-property writes are validated and copied through the loopback entity-state bridge into authoritative replica.body.restitution.", "The local authoritative runtime does not simulate generic RuntimeEntity bodies, so native restitution response remains unavailable."],
  }),
  partial("server.RuntimeEntity.onClick", "server.GameEntity.onClick", {
    access: [],
    signature: ["The recovered onClick(handler) listener signature and GameClickEvent fields are exposed."],
    effect: ["World and clicked-entity double dispatch is implemented when game-net supplies an authoritative entity binding."],
  }),
  partial("server.RuntimeEntity.onFluidEnter", "server.GameEntity.onFluidEnter", {
    access: [],
    signature: [],
    effect: ["The listener surface is present, but the local authoritative fluid producer currently covers RuntimePlayer bodies only."],
  }),
  originPartial("server.RuntimeEntity.nextFluidEnter", "server.GameEntity.nextFluidEnter", {
    access: [],
    signature: [],
    effect: ["The filtered future surface is present, but script-created RuntimeEntity bodies do not yet participate in local fluid overlap production."],
  }),
  partial("server.RuntimeEntity.onFluidLeave", "server.GameEntity.onFluidLeave", {
    access: [],
    signature: [],
    effect: ["The listener surface is present, but the local authoritative fluid producer currently covers RuntimePlayer bodies only."],
  }),
  originPartial("server.RuntimeEntity.nextFluidLeave", "server.GameEntity.nextFluidLeave", {
    access: [],
    signature: [],
    effect: ["The filtered future surface is present, but script-created RuntimeEntity bodies do not yet participate in local fluid overlap production."],
  }),
  partial("server.RuntimeEntity.onVoxelContact", "server.GameEntity.onVoxelContact", {
    access: [],
    signature: [],
    effect: ["The listener surface and typed event are present, but the local authoritative voxel-contact producer currently covers RuntimePlayer bodies only."],
  }),
  originPartial("server.RuntimeEntity.nextVoxelContact", "server.GameEntity.nextVoxelContact", {
    access: [],
    signature: [],
    effect: ["The filtered future surface is present, but script-created RuntimeEntity bodies do not yet participate in local voxel collision production."],
  }),
  partial("server.RuntimeEntity.onVoxelSeparate", "server.GameEntity.onVoxelSeparate", {
    access: [],
    signature: [],
    effect: ["The listener surface and typed event are present, but the local authoritative voxel-separation producer currently covers RuntimePlayer bodies only."],
  }),
  originPartial("server.RuntimeEntity.nextVoxelSeparate", "server.GameEntity.nextVoxelSeparate", {
    access: [],
    signature: [],
    effect: ["The filtered future surface is present, but script-created RuntimeEntity bodies do not yet participate in local voxel collision production."],
  }),
  partial("server.RuntimeEntity.enableInteract", "server.GameEntity.enableInteract", {
    access: [],
    signature: [],
    effect: ["The script-visible flag is stored and included in captured createEntity projection requests, but the local authoritative backend marks replica.interactive unused and therefore does not create Player prompts, radius selection, or interaction sounds."],
  }),
  partial("server.RuntimeEntity.interactHint", "server.GameEntity.interactHint", {
    access: [],
    signature: [],
    effect: ["The empty-string default and script writes are retained locally; the authoritative backend marks replica.interactive unused, so hint text is not projected to the Player browser."],
  }),
  compatible("server.RuntimeEntity.isPlayer", "server.GameEntity.isPlayer"),
  partial("server.RuntimeEntity.player", "server.GameEntity.player", {
    access: [],
    signature: [],
    effect: ["Non-player entities return undefined as declared. RuntimePlayer returns itself because the local Runtime merges the historical GameEntity shell and GamePlayer facade; historical object identity remains distinct in ScriptEntitySync."],
  }),
  partial("server.RuntimeEntity.bounds", "server.GameEntity.bounds", {
    access: [],
    signature: ["Canonical bounds uses GameVector3; local RuntimeEntity uses the compatible Vector3 implementation."],
    effect: ["Reads return a detached copy of the positive body-center half extents used by local geometry and the validated initial authoritative replica; complete native oriented-body bounds behavior remains unavailable."],
  }),
  partial("server.RuntimeEntity.mesh", "server.GameEntity.mesh", {
    access: [],
    signature: [],
    effect: ["The initial validated mesh name is exposed and drives authoritative replica creation; later writes remain script-local because no recovered Player protocol swaps an existing replica mesh binding."],
  }),
  partial("server.RuntimeEntity.meshInvisible", "server.GameEntity.meshInvisible", { access: [], signature: [], effect: ["Whole-property writes update authoritative replica.model.invisible.", "RuntimePlayer model binding remains unavailable."] }),
  partial("server.RuntimeEntity.meshScale", "server.GameEntity.meshScale", { access: [], signature: ["Canonical meshScale uses GameVector3; local RuntimeEntity uses the compatible Vector3 implementation."], effect: ["Whole-property writes update authoritative replica.model.scale; nested component mutation does not trigger the bridge.", "RuntimePlayer model binding remains unavailable."] }),
  partial("server.RuntimeEntity.meshOrientation", "server.GameEntity.meshOrientation", { access: [], signature: [], effect: ["Whole-property writes update authoritative replica.body.orientation; nested quaternion mutation does not trigger the bridge.", "Complete native normalization and RuntimePlayer model binding remain unavailable."] }),
  partial("server.RuntimeEntity.lookAt", "server.GameEntity.lookAt", { access: [], signature: ["The canonical optional meshFacing and up parameters, defaults, coercion, and invalid-facing fallback are preserved."], effect: ["The recovered matrix/quaternion algorithm and historical component order update RuntimeEntity meshOrientation through the authoritative body-orientation bridge.", "RuntimePlayer model orientation and nested quaternion mutation remain unavailable."] }),
  partial("server.RuntimeEntity.rotateLocal", "server.GameEntity.rotateLocal", { access: [], signature: ["The canonical localPosition, X/Y/Z axis, and radian angle parameters are preserved."], effect: ["The recovered scale/orientation transform and pivot compensation update RuntimeEntity meshOrientation and position through existing authoritative bridges.", "RuntimePlayer model orientation and nested quaternion/position mutation remain unavailable."] }),
  partial("server.RuntimeEntity.scaleLocal", "server.GameEntity.scaleLocal", { access: [], signature: ["The canonical localPosition and replacement GameVector3 scale parameters are preserved."], effect: ["The recovered scale replacement and transformed-pivot compensation update RuntimeEntity meshScale and position through existing authoritative bridges.", "RuntimePlayer model scale and nested scale/position mutation remain unavailable."] }),
  partial("server.RuntimeEntity.meshOffset", "server.GameEntity.meshOffset", { access: [], signature: ["Canonical meshOffset uses GameVector3; local RuntimeEntity uses the compatible Vector3 implementation."], effect: ["Whole-property writes update authoritative replica.model.offset; nested component mutation does not trigger the bridge.", "RuntimePlayer model binding remains unavailable."] }),
  partial("server.RuntimeEntity.meshColor", "server.GameEntity.meshColor", { access: [], signature: [], effect: ["Whole-property normalized RGBA writes are encoded as protocol bytes and update authoritative replica.model.color; nested component mutation does not trigger the bridge.", "RuntimePlayer model binding remains unavailable."] }),
  partial("server.RuntimeEntity.meshMetalness", "server.GameEntity.meshMetalness", { access: [], signature: [], effect: ["Validated 0..1 writes update authoritative replica.model.metalness.", "RuntimePlayer model binding remains unavailable."] }),
  partial("server.RuntimeEntity.meshEmissive", "server.GameEntity.meshEmissive", { access: [], signature: [], effect: ["Validated 0..1 writes update authoritative replica.model.emissive.", "RuntimePlayer model binding remains unavailable."] }),
  partial("server.RuntimeEntity.meshShininess", "server.GameEntity.meshShininess", { access: [], signature: [], effect: ["Validated 0..1 writes update authoritative replica.model.shininess.", "RuntimePlayer model binding remains unavailable."] }),
  partial("server.RuntimeEntity.showEntityName", "server.GameEntity.showEntityName", {
    access: [], signature: [], effect: ["The false default and authoritative replica.nameplate create/delete behavior are implemented for validated captured-mesh entities.", "RuntimePlayer EntityNameBinding behavior and complete historical synchronizer scheduling remain unavailable."],
  }),
  partial("server.RuntimeEntity.customName", "server.GameEntity.customName", {
    access: [], signature: [], effect: ["UTF-8 text is validated and projected to the authoritative nameplate component when showEntityName is true.", "RuntimePlayer EntityNameBinding behavior remains unavailable."],
  }),
  partial("server.RuntimeEntity.nameRadius", "server.GameEntity.nameRadius", {
    access: [], signature: [], effect: ["The recovered default 16 and finite 0..4096 validation are projected to the authoritative nameplate radius.", "RuntimePlayer EntityNameBinding behavior remains unavailable."],
  }),
  partial("server.RuntimeEntity.nameColor", "server.GameEntity.nameColor", {
    access: [], signature: ["Canonical nameColor uses GameRGBColor and the local RuntimeEntity uses the same class."], effect: ["Whole-property assignments project normalized RGB values to the authoritative nameplate component; nested component mutation does not trigger the bridge.", "RuntimePlayer EntityNameBinding behavior remains unavailable."],
  }),
  partial("server.RuntimeEntity.onInteract", "server.GameEntity.onInteract", {
    access: [],
    signature: [],
    effect: ["Real entity-interact protocol messages dispatch the recovered GameInteractEvent to a mapped authoritative target before the world listener. Script-local and unmapped targets cannot receive browser-originated interaction."],
  }),
  originPartial("server.RuntimeEntity.nextInteract", "server.GameEntity.nextInteract", {
    access: [],
    signature: [],
    effect: ["The optional filter is supported for mapped authoritative interaction targets; interaction component projection remains unavailable."],
  }),
  originPartial("server.RuntimeEntity.nextClick", "server.GameEntity.nextClick", {
    access: [],
    signature: ["The recovered nextClick(filter?) promise signature and optional filter are implemented."],
    effect: ["Resolution depends on an authoritative backend entity binding."],
  }),
  compatible("server.RuntimeEntity.addTag", "server.GameEntity.addTag"),
  compatible("server.RuntimeEntity.removeTag", "server.GameEntity.removeTag"),
  compatible("server.RuntimeEntity.hasTag", "server.GameEntity.hasTag"),
  partial("server.RuntimeEntity.tags", "server.GameEntity.tags", {
    access: ["Canonical tags is a method returning string[]; local tags is a readonly Set<string> property whose contents remain mutable."],
    signature: ["Property/method shape and collection type differ."],
    effect: ["Canonical addTag/removeTag/hasTag mutation and lookup behavior is implemented; only the canonical tags() array-returning accessor and native replication semantics remain unavailable."],
  }),
  partial("server.RuntimeEntity.say", "server.GameEntity.say", {
    access: [],
    signature: [],
    effect: ["Mapped live entities emit the recovered game-chat.log sender id, duration, and hideFloat fields to every connected Player session; destroyed senders are silently dropped.", "Entities without an authoritative backend id remain script-local and do not receive a fabricated sender id or floating bubble.", "The recovered FIFO prefix/overflow/tick-drain algorithm and ordered Runtime-to-backend overflow batch are implemented with an evidence-deferred nullable limit; the numeric MAX_CHATS_PER_TICK value and Player display acknowledgement remain unavailable."],
  }),
  partial("server.RuntimeEntity.sound", "server.GameEntity.sound", {
    access: [],
    signature: [],
    effect: ["Mapped entities emit the recovered entity-targeted sound packet with dictionary-backed sample id and historical defaults.", "Entities without an authoritative backend id are rejected instead of receiving a fabricated spatial target.", "Browser media decode, playback completion, and mediaError acknowledgement remain unavailable."],
  }),
  partial("server.RuntimeEntity.destroyed", "server.GameEntity.destroyed", {
    access: [],
    signature: [],
    effect: ["The readonly flag changes once, destroy listeners fire once, and mapped authoritative replicas are despawned. Captured-mesh runtime-created replicas follow the same destruction path; unknown mesh names remain deliberately unprojected."],
  }),
  partial("server.RuntimeEntity.destroy", "server.GameEntity.destroy", {
    access: [],
    signature: [],
    effect: ["Non-player entities are removed from selectors immediately and mapped backend replicas are despawned. Captured-mesh runtime-created entities receive the same backend teardown; unknown mesh names remain script-local."],
  }),
  partial("server.RuntimeEntity.onDestroy", "server.GameEntity.onDestroy", {
    access: [],
    signature: [],
    effect: ["The local destroy path emits one recovered GameEntityEvent; destroy events originating independently inside the historical engine are not bridged."],
  }),
  originPartial("server.RuntimeEntity.nextDestroy", "server.GameEntity.nextDestroy", {
    access: [],
    signature: [],
    effect: ["The optional filter and local destroy event are supported; independent engine-originated destroy events are not bridged."],
  }),
  partial("server.RuntimeEntity.enableDamage", "server.GameEntity.enableDamage", {
    access: [],
    signature: [],
    effect: ["The flag gates script-produced hurt calls; it is script-only in the recovered shell and is not part of the Player replica.damage schema."],
  }),
  partial("server.RuntimeEntity.showHealthBar", "server.GameEntity.showHealthBar", {
    access: [],
    signature: [],
    effect: ["Mapped players, static entities, and captured-mesh runtime-created entities propagate the value through the recovered replica.damage schema to native client health-bar rendering. Unknown mesh names remain deliberately script-local."],
  }),
  partial("server.RuntimeEntity.hp", "server.GameEntity.hp", {
    access: [],
    signature: [],
    effect: ["Script writes, hurt, and healing propagate through the recovered replica.damage schema for mapped players, static entities, and captured-mesh runtime-created entities. Unknown mesh names remain deliberately script-local."],
  }),
  partial("server.RuntimeEntity.maxHp", "server.GameEntity.maxHp", {
    access: [],
    signature: [],
    effect: ["The value caps healing and propagates through the recovered replica.damage schema for mapped players, static entities, and captured-mesh runtime-created entities. Unknown mesh names remain deliberately script-local."],
  }),
  partial("server.RuntimeEntity.onTakeDamage", "server.GameEntity.onTakeDamage", {
    access: [],
    signature: [],
    effect: ["Script-produced hurt dispatches the recovered GameDamageEvent; authoritative backend DamageBinding ingress remains unimplemented."],
  }),
  originPartial("server.RuntimeEntity.nextTakeDamage", "server.GameEntity.nextTakeDamage", {
    access: [],
    signature: [],
    effect: ["Script-produced events and optional filters are supported; authoritative backend DamageBinding ingress remains unimplemented."],
  }),
  partial("server.RuntimeEntity.onDie", "server.GameEntity.onDie", {
    access: [],
    signature: [],
    effect: ["Script-produced hurt emits one GameDieEvent when hp crosses to zero; authoritative backend death transitions remain unimplemented."],
  }),
  originPartial("server.RuntimeEntity.nextDie", "server.GameEntity.nextDie", {
    access: [],
    signature: [],
    effect: ["Script-produced death events and optional filters are supported; authoritative backend death transitions remain unimplemented."],
  }),
  partial("server.RuntimeEntity.hurt", "server.GameEntity.hurt", {
    access: [],
    signature: ["The canonical options object is supported; a historical BedWars string damageType form is additionally accepted."],
    effect: ["Recovered hp, healing, attacker, damageType, damage, and death semantics are implemented; mapped targets, including captured-mesh runtime-created entities, also emit native replica.damage state and game-net hurt/die effects. Unknown mesh names remain deliberately script-local."],
  }),
  extension("server.RuntimeEntity.snapshot", "snapshot is a local diagnostics helper with no documented canonical member."),
];

const members = specs.map(spec => {
  const localEntry = requireEntry(localEntries, spec.localId, "local runtime");
  const canonicalEntries = spec.canonicalSource === "origin" ? originEntries : docsEntries;
  const canonicalSource = spec.canonicalSource === "origin" ? "origin declaration" : "documentation";
  const canonical = spec.canonicalId ? requireEntry(canonicalEntries, spec.canonicalId, canonicalSource) : null;
  return {
    local: { id: localEntry.id, kind: localEntry.kind, signature: localEntry.signature, capability: localEntry.capability },
    canonicalTargets: canonical ? [{ id: canonical.id, kind: canonical.kind, signature: canonical.signature }] : [],
    status: spec.status,
    implements: spec.status === "compatible" && canonical ? [canonical.id] : [],
    gaps: spec.gaps,
    evidence: [...(localEntry.evidence ?? []), ...(canonical?.evidence ?? [])],
  };
});

const localIds = local.entries.filter(entry => entry.owner === "RuntimeEntity").map(entry => entry.id).sort();
const mappedIds = members.map(entry => entry.local.id).sort();
if (JSON.stringify(localIds) !== JSON.stringify(mappedIds)) throw new Error("RuntimeEntity adapter map does not cover every local member");

const output = {
  format: "nea-runtime-entity-adapter-map",
  version: 1,
  generatedAt: new Date().toISOString(),
  contract: local.contract,
  localObject: {
    id: "server.object.RuntimeEntity",
    status: "extension",
    canonicalTarget: "server.object.GameEntity",
    notes: ["RuntimeEntity implements the recovered script-side damage subset, but does not implement the complete canonical lifecycle, physics, animation, audio, or authoritative replication surface."],
  },
  members,
  summary: {
    memberCount: members.length,
    compatible: members.filter(entry => entry.status === "compatible").length,
    partial: members.filter(entry => entry.status === "partial").length,
    extensions: members.filter(entry => entry.status === "extension").length,
  },
};

const outputPath = resolve(root, "abi", "runtime-entity-adapter-map.json");
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`RuntimeEntity adapter map: ${output.summary.compatible} compatible, ${output.summary.partial} partial, ${output.summary.extensions} extensions.`);

function partial(localId, canonicalId, gaps) {
  return { localId, canonicalId, canonicalSource: "docs", status: "partial", gaps };
}

function compatible(localId, canonicalId) {
  return { localId, canonicalId, canonicalSource: "docs", status: "compatible", gaps: { access: [], signature: [], effect: [] } };
}

function originPartial(localId, canonicalId, gaps) {
  return { localId, canonicalId, canonicalSource: "origin", status: "partial", gaps };
}

function extension(localId, reason) {
  return { localId, canonicalId: null, status: "extension", gaps: { access: [], signature: [], effect: [reason] } };
}

function requireEntry(entries, id, source) {
  const entry = entries.get(id);
  if (!entry) throw new Error(`${id} missing from ${source} catalog`);
  return entry;
}

async function readJson(path) {
  return JSON.parse(await readFile(resolve(root, path), "utf8"));
}
