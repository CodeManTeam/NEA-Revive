import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(root, "..", "..");
const localAnalysis = await readJson("generated/local-server-runtime-analysis.json");
const docs = await readJson("generated/docs-api-index.json");
const origin = await readJson("generated/origin-server-api.json");
const runtimeSourcePath = "Frontend/demo-map/src/runtime/script-runtime.mjs";
const runtimeSource = await readFile(resolve(repositoryRoot, runtimeSourcePath), "utf8");

for (const marker of [
  "_id: String(input.id)",
  "get id() { return this._id; }",
  "get userId() { return this._userId; }",
  "get userKey() { return this._userKey; }",
  "spectator: false,",
  "cameraYaw: 0,",
  "cameraPitch: 0,",
  "cameraMode: GameCameraMode.FOLLOW,",
  "cameraFovY: 0.25,",
  'moveState: "FALL",',
  "canFly: false,",
  "invisible: false,",
  "showName: true,",
  "showIndicator: false,",
  "wearables(bodyPart) { return this._wearables.filter(item => item.bodyPart === bodyPart); }",
  "addWearable(spec) { const wearable = { ...structuredClone(spec) }; this._wearables.push(wearable); return wearable; }",
  "removeWearable(wearable) { const index = this._wearables.indexOf(wearable); if (index >= 0) this._wearables.splice(index, 1); }",
  "kick() { runtime._kickPlayer(this); }",
  "link(href, options) { runtime._linkPlayer(this, href, options); }",
  "setSkinByName(skinName) { runtime._setPlayerSkin(this, skinName); }",
  "resetToDefaultSkin() { runtime._resetPlayerSkin(this); }",
  "clearSkin() { runtime._clearPlayerSkin(this); }",
  "return Object.freeze(new RuntimeEntityEvent(tick, entity));",
  "onTakeDamage(handler) { return this._signals.takeDamage.on(handler); }",
  "destroy() { return runtime._destroyEntity(this); }",
  "return Object.freeze(new RuntimeDamageEvent(tick, entity, damage, attacker, damageType));",
  "return Object.freeze(new RuntimeDieEvent(tick, entity, attacker, damageType));",
  "return Object.freeze(new RuntimeRespawnEvent(tick, entity));",
  "return Object.freeze(new RuntimeKeyBoardEvent(tick, keyCode));",
  "hurt(amount, options) { runtime._hurtEntity(this, amount, options); }",
  "const permissionMask = inputPermissionMask(player);",
  "enableAction0: true,",
]) {
  if (!runtimeSource.includes(marker)) throw new Error(`RuntimePlayer adapter evidence missing: ${marker}`);
}

const localEntries = new Map(localAnalysis.entries.map(entry => [entry.id, entry]));
const docsEntries = new Map(docs.entries.map(entry => [entry.id, entry]));
const originEntries = new Map(origin.entries.map(entry => [entry.id, entry]));

const memberSpecs = [
  partial("server.RuntimePlayer.id", ["server.GameEntity.id"], {
    access: ["Local RuntimePlayer makes id getter-only, while the documentation and origin shell expose a writable GameEntity.id property."],
    signature: [],
    effect: ["RuntimePlayer.id identifies the local player wrapper; full GameEntity identity and lifecycle semantics are not implemented."],
  }),
  partial("server.RuntimePlayer.name", ["server.GamePlayerEntity.name"], {
    access: ["Documentation declares GamePlayerEntity.name readonly; local RuntimePlayer permits writes. The origin GamePlayer shell also exposes a writable name property."],
    signature: [],
    effect: ["Local writes update the compatibility runtime state and may queue an authoritative write; historical player-profile propagation is not proven."],
  }, ["server.GamePlayer.name"]),
  partial("server.RuntimePlayer.userId", ["server.GamePlayerEntity.userId"], {
    access: [],
    signature: [],
    effect: ["The readonly local value uses a backend-provided user id when available and otherwise a stable RuntimePlayer id; historical account identity ingress remains unavailable."],
  }, []),
  partial("server.RuntimePlayer.userKey", ["server.GamePlayerEntity.userKey"], {
    access: [],
    signature: [],
    effect: ["The readonly value preserves a backend-provided key or a deterministic local fallback; historical account key ingress remains unavailable."],
  }, ["server.GamePlayer.userKey"]),
  partial("server.RuntimePlayer.position", ["server.GameEntity.position"], {
    access: [],
    signature: ["Canonical position uses GameVector3; local RuntimePlayer exposes the smaller compatibility Vector3 surface."],
    effect: ["Local assignment writes the compatibility physics body and may queue backend state; complete GameEntity transform semantics are not implemented."],
  }),
  partial("server.RuntimePlayer.velocity", ["server.GameEntity.velocity"], {
    access: [],
    signature: ["Canonical velocity uses GameVector3; local RuntimePlayer exposes the smaller compatibility Vector3 surface."],
    effect: ["Local assignment updates the compatibility physics body; complete historical rigid-body behavior remains transport- and backend-dependent."],
  }),
  partial("server.RuntimePlayer.destroyed", ["server.GameEntity.destroyed"], {
    access: [],
    signature: [],
    effect: ["The flag is readonly and player.destroy follows the recovered non-player guard; disconnect-driven wrapper destruction is not exposed on retained script references."],
  }),
  compatible("server.RuntimePlayer.isPlayer", ["server.GameEntity.isPlayer"]),
  partial("server.RuntimePlayer.bounds", ["server.GameEntity.bounds"], {
    access: ["The current authoritative Player boundsHalfExtents are exposed through a readonly copy."],
    signature: ["Canonical and local bounds are readonly; local RuntimePlayer uses the compatible Vector3 implementation."],
    effect: ["Complete native posture producer coverage remains evidence-deferred."],
  }),
  partial("server.RuntimePlayer.fluidContacts", ["server.GameEntity.fluidContacts"], {
    access: [],
    signature: [],
    effect: ["Active fluid voxel ids and a local body-AABB overlap fraction are exposed; the native producer's exact volume-fraction formula remains unrecovered."],
  }),
  partial("server.RuntimePlayer.onFluidEnter", ["server.GameEntity.onFluidEnter"], {
    access: [],
    signature: [],
    effect: ["BlockInfo fluid overlap transitions emit the recovered event to world before entity; native fluid solver timing, buoyancy, and drag remain unrecovered."],
  }),
  originPartial("server.RuntimePlayer.nextFluidEnter", ["server.GameEntity.nextFluidEnter"], {
    access: [],
    signature: [],
    effect: ["The optional filter resolves locally produced fluid-enter events; native producer timing remains unrecovered."],
  }),
  partial("server.RuntimePlayer.onFluidLeave", ["server.GameEntity.onFluidLeave"], {
    access: [],
    signature: [],
    effect: ["BlockInfo fluid overlap transitions emit the recovered event to world before entity; native fluid solver timing remains unrecovered."],
  }),
  originPartial("server.RuntimePlayer.nextFluidLeave", ["server.GameEntity.nextFluidLeave"], {
    access: [],
    signature: [],
    effect: ["The optional filter resolves locally produced fluid-leave events; native producer timing remains unrecovered."],
  }),
  partial("server.RuntimePlayer.onVoxelContact", ["server.GameEntity.onVoxelContact"], {
    access: [],
    signature: [],
    effect: ["The local fixed-step Player body produces the typed event after world dispatch; native rigid-body collision equivalence remains unverified."],
  }),
  originPartial("server.RuntimePlayer.nextVoxelContact", ["server.GameEntity.nextVoxelContact"], {
    access: [],
    signature: [],
    effect: ["The filtered future resolves locally produced Player voxel contacts; native rigid-body collision equivalence remains unverified."],
  }),
  partial("server.RuntimePlayer.onVoxelSeparate", ["server.GameEntity.onVoxelSeparate"], {
    access: [],
    signature: [],
    effect: ["The local fixed-step Player body produces the typed event after world dispatch; native rigid-body separation equivalence remains unverified."],
  }),
  originPartial("server.RuntimePlayer.nextVoxelSeparate", ["server.GameEntity.nextVoxelSeparate"], {
    access: [],
    signature: [],
    effect: ["The filtered future resolves locally produced Player voxel separations; native rigid-body separation equivalence remains unverified."],
  }),
  partial("server.RuntimePlayer.destroy", ["server.GameEntity.destroy"], {
    access: [],
    signature: [],
    effect: ["The call is a no-op for players, matching the recovered ScriptEntitySync non-player destroy guard."],
  }),
  partial("server.RuntimePlayer.sound", ["server.GameEntity.sound"], {
    access: [],
    signature: [],
    effect: ["Authoritative players emit the recovered player-targeted sound packet with dictionary-backed sample id and historical defaults.", "Players without an authoritative backend id are rejected instead of receiving a fabricated target.", "Browser media decode, playback completion, and mediaError acknowledgement remain unavailable."],
  }),
  partial("server.RuntimePlayer.onDestroy", ["server.GameEntity.onDestroy"], {
    access: [],
    signature: [],
    effect: ["Player.destroy() remains a recovered no-op, while MuDB disconnect removes the wrapper and emits world.onPlayerLeave, player.onDestroy, then world.onEntityDestroy with one shared GameEntityEvent. Other independent engine destruction sources remain unverified."],
  }),
  originPartial("server.RuntimePlayer.nextDestroy", ["server.GameEntity.nextDestroy"], {
    access: [],
    signature: [],
    effect: ["The optional filter resolves the disconnect-driven player destroy event; other independent engine destruction sources remain unverified."],
  }),
  partial("server.RuntimePlayer.enableDamage", ["server.GameEntity.enableDamage"], {
    access: [],
    signature: [],
    effect: ["The flag gates script-produced hurt calls; it is script-only in the recovered shell and is not part of replica.damage."],
  }),
  partial("server.RuntimePlayer.showHealthBar", ["server.GameEntity.showHealthBar"], {
    access: [],
    signature: [],
    effect: ["The value propagates through the recovered replica.damage schema to native client health-bar rendering."],
  }),
  partial("server.RuntimePlayer.hp", ["server.GameEntity.hp"], {
    access: [],
    signature: [],
    effect: ["Script writes, hurt, and healing propagate through the recovered replica.damage schema."],
  }),
  partial("server.RuntimePlayer.maxHp", ["server.GameEntity.maxHp"], {
    access: [],
    signature: [],
    effect: ["The value caps healing and propagates through the recovered replica.damage schema."],
  }),
  compatible("server.RuntimePlayer.walkButton", ["server.GamePlayerEntity.walkButton"], ["server.GamePlayer.walkButton"]),
  originPartial("server.RuntimePlayer.crouchButton", ["server.GamePlayer.crouchButton"], { access: [], signature: [], effect: ["The value is updated from masked game-net input events; current documentation extraction does not contain this origin-declared member."] }),
  compatible("server.RuntimePlayer.jumpButton", ["server.GamePlayerEntity.jumpButton"], ["server.GamePlayer.jumpButton"]),
  compatible("server.RuntimePlayer.action0Button", ["server.GamePlayerEntity.action0Button"], ["server.GamePlayer.action0Button"]),
  compatible("server.RuntimePlayer.action1Button", ["server.GamePlayerEntity.action1Button"], ["server.GamePlayer.action1Button"]),
  inputPermission("server.RuntimePlayer.enableAction0", "server.GamePlayerEntity.enableAction0", "server.GamePlayer.enableAction0"),
  inputPermission("server.RuntimePlayer.enableAction1", "server.GamePlayerEntity.enableAction1", "server.GamePlayer.enableAction1"),
  inputPermission("server.RuntimePlayer.enableJump", "server.GamePlayerEntity.enableJump", "server.GamePlayer.enableJump"),
  inputPermission("server.RuntimePlayer.enableDoubleJump", "server.GamePlayerEntity.enableDoubleJump", "server.GamePlayer.enableDoubleJump"),
  originPartial("server.RuntimePlayer.enableCrouch", ["server.GamePlayer.enableCrouch"], { access: [], signature: [], effect: ["The server input bridge applies the recovered crouch mask, but authoritative Player Public flags are not yet written back to the client."] }),
  localPlayerState("spectator", "a boolean script-local state value"),
  localPlayerState("cameraYaw", "a numeric script-local state value"),
  localPlayerState("cameraPitch", "a numeric script-local state value"),
  localPlayerState("cameraMode", "a GameCameraMode script-local state value", ["server.GamePlayer.cameraMode"]),
  localPlayerState("cameraFovY", "a numeric script-local state value", ["server.GamePlayer.cameraFovY"]),
  localPlayerState("moveState", "a string script-local state value"),
  partial("server.RuntimePlayer.walkState", ["server.GamePlayerEntity.walkState"], {
    access: ["Canonical walkState is readonly, while the local script value remains writable."],
    signature: ["The local value is not yet constrained to the complete recovered GamePlayerWalkState vocabulary."],
    effect: ["The value is readable and writable by server scripts, but the preserved Player input producer does not currently update it."],
  }, ["server.GamePlayer.walkState"]),
  localPlayerState("canFly", "a boolean script-local state value"),
  localPlayerState("invisible", "a boolean script-local state value", ["server.GamePlayer.invisible"]),
  localPlayerState("showName", "a boolean script-local state value", ["server.GamePlayer.showName"]),
  localPlayerState("showIndicator", "a boolean script-local state value", ["server.GamePlayer.showIndicator"]),
  playerPublicNumber("walkSpeed"),
  playerPublicNumber("runSpeed"),
  playerPublicNumber("runAcceleration"),
  playerPublicNumber("jumpPower"),
  playerPublicNumber("jumpSpeedFactor"),
  playerPublicNumber("jumpAccelerationFactor"),
  playerPublicNumber("doubleJumpPower"),
  playerPublicNumber("crouchSpeed"),
  playerPublicNumber("crouchAcceleration"),
  playerPublicNumber("flySpeed"),
  playerPublicNumber("flyAcceleration"),
  playerPublicNumber("swimAcceleration"),
  playerPublicNumber("swimSpeed"),
  playerPublicNumber("walkAcceleration"),
  partial("server.RuntimePlayer.color", ["server.GamePlayerEntity.color"], {
    access: [],
    signature: [],
    effect: ["The local Script Runtime value and mutation API are present; authoritative client rendering propagation remains unverified."],
  }, ["server.GamePlayer.color"]),
  partial("server.RuntimePlayer.spawnPoint", ["server.GamePlayerEntity.spawnPoint"], {
    access: [],
    signature: ["Canonical spawnPoint uses GameVector3; the local value uses the compatible Vector3 implementation."],
    effect: ["The value drives local forceRespawn; native validation and automatic engine respawn integration remain unverified."],
  }, ["server.GamePlayer.spawnPoint"]),
  partial("server.RuntimePlayer.onRespawn", ["server.GamePlayerEntity.onRespawn"], {
    access: [],
    signature: ["The local listener token is structurally compatible, while the complete native event scheduling contract is not recovered."],
    effect: ["Local forceRespawn emits the recovered GameEntityEvent shape; automatic engine respawn triggers remain unverified."],
  }, ["server.GamePlayer.onRespawn"]),
  originPartial("server.RuntimePlayer.nextRespawn", ["server.GamePlayer.nextRespawn"], {
    access: [],
    signature: ["The historical optional filter remains unimplemented."],
    effect: ["Automatic engine respawn triggers remain unverified."],
  }),
  partial("server.RuntimePlayer.onClick", ["server.GameEntity.onClick"], {
    access: [],
    signature: ["The recovered onClick(handler) listener signature and GameClickEvent fields are exposed."],
    effect: ["A clicked player receives the same event object after world.onClick when its backend entity id is authoritative."],
  }),
  originPartial("server.RuntimePlayer.nextClick", ["server.GameEntity.nextClick"], {
    access: [],
    signature: ["The recovered nextClick(filter?) promise signature and optional filter are implemented."],
    effect: ["Resolution depends on an authoritative backend player id."],
  }),
  partial("server.RuntimePlayer.onPress", ["server.GamePlayerEntity.onPress"], {
    access: [],
    signature: ["The recovered GameInputEvent fields and GameButtonType values are exposed."],
    effect: ["The game-net bridge dispatches real Player input events after applying the recovered PlayerFlags mask; complete client-side Public flag propagation remains separate."],
  }, ["server.GamePlayer.onPress"]),
  originPartial("server.RuntimePlayer.nextPress", ["server.GamePlayer.nextPress"], {
    access: [],
    signature: ["The historical optional filter remains unimplemented."],
    effect: ["The recovered PlayerFlags mask is applied; the historical optional filter remains the only known gap."],
  }),
  partial("server.RuntimePlayer.onRelease", ["server.GamePlayerEntity.onRelease"], {
    access: [],
    signature: ["The recovered GameInputEvent fields and GameButtonType values are exposed."],
    effect: ["The game-net bridge dispatches real Player input events after applying the recovered PlayerFlags mask; complete client-side Public flag propagation remains separate."],
  }, ["server.GamePlayer.onRelease"]),
  originPartial("server.RuntimePlayer.nextRelease", ["server.GamePlayer.nextRelease"], {
    access: [],
    signature: ["The historical optional filter remains unimplemented."],
    effect: ["The recovered PlayerFlags mask is applied; the historical optional filter remains the only known gap."],
  }),
  partial("server.RuntimePlayer.onKeyDown", ["server.GamePlayerEntity.onKeyDown"], {
    access: [],
    signature: [],
    effect: ["The recovered game-net.sendKeyBoardEvent keyDownState transition is delivered through the authoritative backend event bridge."],
  }, []),
  partial("server.RuntimePlayer.onKeyUp", ["server.GamePlayerEntity.onKeyUp"], {
    access: [],
    signature: [],
    effect: ["The recovered game-net.sendKeyBoardEvent prevKeyDownState transition is delivered through the authoritative backend event bridge."],
  }, []),
  partial("server.RuntimePlayer.onTakeDamage", ["server.GameEntity.onTakeDamage"], {
    access: [],
    signature: [],
    effect: ["Script-produced hurt dispatches entity and world GameDamageEvent values; authoritative backend DamageBinding ingress remains unimplemented."],
  }),
  originPartial("server.RuntimePlayer.nextTakeDamage", ["server.GameEntity.nextTakeDamage"], {
    access: [],
    signature: [],
    effect: ["Script-produced events and optional filters are supported; authoritative backend DamageBinding ingress remains unimplemented."],
  }),
  partial("server.RuntimePlayer.onDie", ["server.GameEntity.onDie"], {
    access: [],
    signature: [],
    effect: ["Script-produced hurt emits one GameDieEvent when hp crosses to zero; authoritative backend death transitions remain unimplemented."],
  }),
  originPartial("server.RuntimePlayer.nextDie", ["server.GameEntity.nextDie"], {
    access: [],
    signature: [],
    effect: ["Script-produced death events and optional filters are supported; authoritative backend death transitions remain unimplemented."],
  }),
  partial("server.RuntimePlayer.forceRespawn", ["server.GamePlayerEntity.forceRespawn"], {
    access: [],
    signature: [],
    effect: ["Position, velocity, contacts, triggers, backend state, script events, and the native game-net respawn effect are updated; automatic hp restoration remains script-controlled as in the recovered shell."],
  }, ["server.GamePlayer.forceRespawn"]),
  partial("server.RuntimePlayer.kick", ["server.GamePlayerEntity.kick"], {
    access: [],
    signature: [],
    effect: ["The targeted MuDB session closes and the established disconnect lifecycle removes the player; the historical kickSessionReason value remains evidence-blocked."],
  }, []),
  partial("server.RuntimePlayer.link", ["server.GamePlayerEntity.link"], {
    access: [],
    signature: [],
    effect: ["The ref.openLink packet preserves recovered href coercion and option defaults; its Player-only warning field is fixed false because no Script Runtime source was recovered."],
  }, ["server.GamePlayer.link"]),
  partial("server.RuntimePlayer.setSkinByName", ["server.GamePlayerEntity.setSkinByName"], {
    access: [],
    signature: [],
    effect: ["All script-visible parts and preserved Player avatarSkin ids update when an explicit validated name-to-id catalog is configured; recovering that catalog from the package remains evidence-deferred."],
  }, ["server.GamePlayer.setSkinByName"]),
  partial("server.RuntimePlayer.resetToDefaultSkin", ["server.GamePlayerEntity.resetToDefaultSkin"], {
    access: [],
    signature: [],
    effect: ["All script-visible parts and preserved Player avatarSkin ids update when an explicit validated default mapping is configured; the recovered package currently classifies that mapping as evidence-deferred."],
  }, ["server.GamePlayer.resetToDefaultSkin"]),
  partial("server.RuntimePlayer.clearSkin", ["server.GamePlayerEntity.clearSkin"], {
    access: [],
    signature: [],
    effect: ["All script-visible skin parts are cleared to null and the preserved Player avatarSkin ids are projected as zero, matching the recovered resource conversion."],
  }, ["server.GamePlayer.clearSkin"]),
  extension("server.RuntimePlayer.grounded", "Grounded is a local derived physics state and has no direct documented GameEntity or GamePlayerEntity member."),
  partial("server.RuntimePlayer.health", ["server.GameEntity.hp"], {
    access: ["Local health is getter-only, while canonical GameEntity.hp is writable."],
    signature: ["The local member is named health rather than hp."],
    effect: ["health aliases hp, which propagates through the recovered replica.damage schema."],
  }),
  partial("server.RuntimePlayer.hurt", ["server.GameEntity.hurt"], {
    access: [],
    signature: ["The canonical options object is supported; a historical BedWars string damageType form is additionally accepted."],
    effect: ["Recovered hp, healing, attacker, damageType, damage, and death semantics are implemented together with native replica.damage state and game-net hurt/die effects."],
  }),
  compatible("server.RuntimePlayer.addTag", ["server.GameEntity.addTag"]),
  compatible("server.RuntimePlayer.removeTag", ["server.GameEntity.removeTag"]),
  compatible("server.RuntimePlayer.hasTag", ["server.GameEntity.hasTag"]),
  extension("server.RuntimePlayer.applyImpulse", "No direct documented GameEntity or GamePlayerEntity applyImpulse member exists; this is a compatibility physics helper."),
  extension("server.RuntimePlayer.damage", "The local helper is retained as a non-native compatibility alias that delegates to the recovered hurt pipeline while temporarily bypassing enableDamage."),
  partial("server.RuntimePlayer.sendMessage", ["server.GamePlayerEntity.directMessage"], {
    access: [],
    signature: ["Canonical directMessage accepts a string; local sendMessage accepts an unknown value and formats it for logging."],
    effect: ["Targeted delivery now uses the recovered Player game-chat.log packet with private=true through the bound MuDB session; removed/destroyed receivers are silently dropped.", "Player removal marks the RuntimePlayer destroyed and dispatches world.onPlayerLeave, player.onDestroy, then world.onEntityDestroy in recovered order.", "The recovered FIFO prefix/overflow/tick-drain algorithm and ordered Runtime-to-backend overflow batch are implemented with an evidence-deferred nullable limit; the numeric MAX_CHATS_PER_TICK value and Player display acknowledgement remain unavailable."],
  }, ["server.GamePlayer.directMessage"]),
  partial("server.RuntimePlayer.wearables", ["server.GamePlayerEntity.wearables"], {
    access: [],
    signature: [],
    effect: ["The local collection is script-owned and filtered by bodyPart; preserved Player avatar rendering projection remains unavailable."],
  }, ["server.GamePlayer.wearables"]),
  partial("server.RuntimePlayer.addWearable", ["server.GamePlayerEntity.addWearable"], {
    access: [],
    signature: ["The local method clones the supplied partial record without complete GameWearable validation."],
    effect: ["The wearable is retained in Script Runtime memory; preserved Player avatar rendering projection remains unavailable."],
  }, ["server.GamePlayer.addWearable"]),
  partial("server.RuntimePlayer.removeWearable", ["server.GamePlayerEntity.removeWearable"], {
    access: [],
    signature: [],
    effect: ["The local method removes the matching script-owned object; preserved Player avatar rendering projection remains unavailable."],
  }, ["server.GamePlayer.removeWearable"]),
  partial("server.RuntimePlayer.dialog", ["server.GamePlayerEntity.dialog"], {
    access: [],
    signature: ["The local promise resolves to the recovered protocol result union; complete GameDialogCall optional fields remain only partially normalized."],
    effect: ["The call opens a native Player dialog through the recovered dialog.open RPC and resolves when dialog.close returns the matching rpcId."],
  }, []),
  partial("server.RuntimePlayer.cancelDialogs", ["server.GamePlayerEntity.cancelDialogs"], {
    access: [],
    signature: ["The canonical method returns void; the local backend reports a cancellation count internally but the script facade does not expose it."],
    effect: ["Every pending dialog for the bound Player session is rejected and the recovered dialog.cancelDialogs packet is delivered."],
  }, []),
  extension("server.RuntimePlayer.snapshot", "snapshot is a local diagnostics and synchronization helper with no documented canonical member."),
];

const members = memberSpecs.map(buildMember);
const localMemberIds = localAnalysis.entries
  .filter(entry => entry.owner === "RuntimePlayer")
  .map(entry => entry.id)
  .sort();
const mappedMemberIds = members.map(entry => entry.local.id).sort();
if (JSON.stringify(localMemberIds) !== JSON.stringify(mappedMemberIds)) {
  throw new Error(`RuntimePlayer adapter map is incomplete: local=${localMemberIds.join(",")} mapped=${mappedMemberIds.join(",")}`);
}

const output = {
  format: "nea-runtime-player-adapter-map",
  version: 1,
  generatedAt: new Date().toISOString(),
  contract: localAnalysis.contract,
  localObject: {
    id: "server.object.RuntimePlayer",
    status: "extension",
    composition: ["server.GameEntity", "server.GamePlayerEntity"],
    notes: [
      "RuntimePlayer is a local composite wrapper, not a direct implementation of either canonical object.",
      "Canonical mappings are member-level and partial unless conformance proves exact access, signature, and effects.",
    ],
  },
  members,
  events: [{
    localFactory: "createGameEntityEvent",
    canonicalObject: "server.GameEntityEvent",
    status: "partial",
    canonicalFields: ["tick", "entity"],
    localAliases: [{ name: "player", target: "entity" }],
    gaps: ["The entity value is a RuntimePlayer composite subset, not a complete GameEntity/GamePlayerEntity object."],
    evidence: [{ type: "local-source", path: runtimeSourcePath, symbol: "createGameEntityEvent", confidence: "direct" }],
  }, {
    localFactory: "createGameRespawnEvent",
    canonicalObject: "server.GameRespawnEvent",
    status: "partial",
    canonicalFields: ["tick", "entity"],
    localAliases: [],
    gaps: ["Local forceRespawn and projected respawn state produce the recovered payload; automatic native respawn production remains unimplemented."],
    evidence: [{ type: "local-source", path: runtimeSourcePath, symbol: "createGameRespawnEvent", confidence: "direct" }],
  }, {
    localFactory: "createGameKeyBoardEvent",
    canonicalObject: "server.GameKeyBoardEvent",
    status: "partial",
    canonicalFields: ["tick", "keyCode"],
    localAliases: [],
    gaps: ["The recovered uint8 keyCode and protocol tick are preserved; browser-specific key layout semantics remain Player-owned."],
    evidence: [{ type: "local-source", path: runtimeSourcePath, symbol: "createGameKeyBoardEvent", confidence: "direct" }],
  }, {
    localFactory: "createGameDamageEvent",
    canonicalObject: "server.GameDamageEvent",
    status: "partial",
    canonicalFields: ["tick", "entity", "attacker", "damage", "damageType"],
    localAliases: [],
    gaps: ["Fields and historical null/empty defaults are recovered for script-produced hurt; authoritative backend DamageBinding ingress remains unimplemented."],
    evidence: [{ type: "local-source", path: runtimeSourcePath, symbol: "createGameDamageEvent", confidence: "direct" }],
  }, {
    localFactory: "createGameDieEvent",
    canonicalObject: "server.GameDieEvent",
    status: "partial",
    canonicalFields: ["tick", "entity", "attacker", "damageType"],
    localAliases: [],
    gaps: ["Script-produced hp transitions emit the recovered event; authoritative backend death transitions remain unimplemented."],
    evidence: [{ type: "local-source", path: runtimeSourcePath, symbol: "createGameDieEvent", confidence: "direct" }],
  }],
  summary: {
    memberCount: members.length,
    compatible: members.filter(entry => entry.status === "compatible").length,
    partial: members.filter(entry => entry.status === "partial").length,
    extensions: members.filter(entry => entry.status === "extension").length,
  },
};

const outputPath = resolve(root, "abi", "runtime-player-adapter-map.json");
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`RuntimePlayer adapter map: ${output.summary.partial} partial, ${output.summary.extensions} extensions.`);

function compatible(localId, canonicalIds, supportingOriginIds = canonicalIds) {
  return { localId, canonicalIds, supportingOriginIds, status: "compatible", gaps: { access: [], signature: [], effect: [] } };
}

function inputPermission(localId, canonicalId, originId) {
  return partial(localId, [canonicalId], { access: [], signature: [], effect: ["The server input bridge applies the recovered flag mask, but authoritative Player Public flags are not yet written back to the client."] }, [originId]);
}

function playerPublicNumber(name) {
  return partial(`server.RuntimePlayer.${name}`, [`server.GamePlayerEntity.${name}`], {
    access: [],
    signature: ["The local member is a finite non-negative number and uses the recovered Player PUBLIC schema field."],
    effect: ["Script writes are queued through the authenticated player-state control bridge and projected into the authoritative player.game-net.PUBLIC PlayerSchema."],
  }, [`server.GamePlayer.${name}`]);
}

function localPlayerState(name, localSignature, supportingOriginIds = []) {
  return partial(`server.RuntimePlayer.${name}`, [`server.GamePlayerEntity.${name}`], {
    access: [],
    signature: [`The local member is ${localSignature}; exact historical validation and enum constraints remain unrecovered.`],
    effect: ["The value is readable and writable by server scripts, but the preserved Player PUBLIC schema has no recovered field or projection for it."],
  }, supportingOriginIds);
}

function partial(localId, canonicalIds, gaps, supportingOriginIds = canonicalIds) {
  return { localId, canonicalIds, supportingOriginIds, status: "partial", gaps };
}

function originPartial(localId, supportingOriginIds, gaps) {
  return { localId, canonicalIds: [], supportingOriginIds, status: "partial", gaps };
}

function extension(localId, reason) {
  return { localId, canonicalIds: [], supportingOriginIds: [], status: "extension", gaps: { access: [], signature: [], effect: [reason] } };
}

function buildMember(spec) {
  const local = requireEntry(localEntries, spec.localId, "local runtime");
  const canonicalTargets = spec.canonicalIds.map(id => requireEntry(docsEntries, id, "documentation"));
  const originSupport = spec.supportingOriginIds.map(id => requireEntry(originEntries, id, "origin"));
  return {
    local: {
      id: local.id,
      kind: local.kind,
      signature: local.signature,
      capability: local.capability,
    },
    canonicalTargets: canonicalTargets.map(entry => ({ id: entry.id, kind: entry.kind, signature: entry.signature })),
    status: spec.status,
    implements: spec.status === "compatible" ? spec.canonicalIds : [],
    gaps: spec.gaps,
    evidence: uniqueEvidence([...(local.evidence ?? []), ...canonicalTargets.flatMap(entry => entry.evidence ?? []), ...originSupport.flatMap(entry => entry.evidence ?? [])]),
  };
}

function requireEntry(entries, id, source) {
  const entry = entries.get(id);
  if (!entry) throw new Error(`${id} missing from ${source} catalog`);
  return entry;
}

function uniqueEvidence(evidence) {
  const seen = new Set();
  return evidence.filter(item => {
    const key = `${item.type}:${item.path}:${item.symbol}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function readJson(path) {
  return JSON.parse(await readFile(resolve(root, path), "utf8"));
}
