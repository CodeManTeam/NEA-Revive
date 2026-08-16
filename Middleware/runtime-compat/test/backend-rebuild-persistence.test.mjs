import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const backendUrl = new URL("../../../Backend/local-player/backend/box3-server.cjs", import.meta.url);
const bundleToolUrl = new URL("../../../Backend/local-player/tools/bundle-backend.cjs", import.meta.url);
const applyToolUrl = new URL("../../../Backend/local-player/tools/apply-backend-compat-patch.cjs", import.meta.url);
const patchUrl = new URL("../../../Backend/local-player/tools/backend-compat.patch", import.meta.url);
const soundPatchUrl = new URL("../../../Backend/local-player/tools/backend-sound-compat.patch", import.meta.url);
const metadataPatchUrl = new URL("../../../Backend/local-player/tools/backend-project-metadata-compat.patch", import.meta.url);
const kickPatchUrl = new URL("../../../Backend/local-player/tools/backend-player-kick-compat.patch", import.meta.url);
const linkPatchUrl = new URL("../../../Backend/local-player/tools/backend-player-link-compat.patch", import.meta.url);
const keyboardPatchUrl = new URL("../../../Backend/local-player/tools/backend-keyboard-events-compat.patch", import.meta.url);
const runtimeMeshParserPatchUrl = new URL("../../../Backend/local-player/tools/backend-runtime-mesh-parser-compat.patch", import.meta.url);

const backend = await readFile(backendUrl, "utf8");
const bundleTool = await readFile(bundleToolUrl, "utf8");
const applyTool = await readFile(applyToolUrl, "utf8");
const patch = await readFile(patchUrl, "utf8");
const soundPatch = await readFile(soundPatchUrl, "utf8");
const metadataPatch = await readFile(metadataPatchUrl, "utf8");
const kickPatch = await readFile(kickPatchUrl, "utf8");
const linkPatch = await readFile(linkPatchUrl, "utf8");
const keyboardPatch = await readFile(keyboardPatchUrl, "utf8");
const runtimeMeshParserPatch = await readFile(runtimeMeshParserPatchUrl, "utf8");

test("backend rebuild applies the audited compatibility patch after generic RemoteChannel", () => {
  const genericIndex = bundleTool.indexOf("patchGenericRemoteChannelBundle(process.argv[4])");
  const compatIndex = bundleTool.indexOf("applyBackendCompatPatch(process.argv[4])");
  assert.notEqual(genericIndex, -1);
  assert.ok(compatIndex > genericIndex);
  assert.match(applyTool, /backend compatibility patch baseline/);
  assert.match(applyTool, /backend compatibility patch output/);
  assert.match(applyTool, /backend compatibility patch intermediate output/);
  assert.match(applyTool, /backend-project-metadata-compat\.patch/);
  assert.match(applyTool, /backend-player-kick-compat\.patch/);
  assert.match(applyTool, /backend-player-link-compat\.patch/);
  assert.match(applyTool, /backend-keyboard-events-compat\.patch/);
  assert.match(applyTool, /backend-runtime-mesh-parser-compat\.patch/);
});

test("audited backend sound patch persists the player.sound control chain", () => {
  assert.match(soundPatch, /sendSoundCommand\(command\)/);
  assert.match(soundPatch, /session\.sound\.message\.play\(payload\)/);
  assert.match(soundPatch, /__nea\/control\/sound-command/);
});

test("audited backend target hash matches the checked-in runtime bundle", () => {
  const expected = /const TARGET_SHA256 = "([0-9a-f]{64})";/.exec(applyTool)?.[1];
  assert.ok(expected);
  assert.equal(createHash("sha256").update(backend).digest("hex"), expected);
});

test("compatibility patch persists recovered UI, Dialog, chat, player-network, and runtime-entity projection behavior", () => {
  assert.match(patch, /loadClientUiState/);
  assert.match(patch, /BOX3_CLIENT_UI_MANIFEST/);
  assert.match(patch, /BOX3_CLIENT_RUNTIME_MANIFEST/);
  assert.match(patch, /BOX3_PROJECT_BOOTSTRAP_MANIFEST/);
  assert.match(patch, /describeManifestMismatch/);
  assert.match(patch, /expected bytes=\$\{fileBytes\} sha256=\$\{fileHash\}/);
  assert.match(patch, /matchesManifest/);
  assert.match(patch, /replace\(\/\\r\\n\/g, "\\n"\)/);
  assert.match(patch, /BOX3_PLAYER_BODY_PROFILE/);
  assert.match(patch, /normalizeDialogConfig/);
  assert.match(patch, /response\.catch\(\(\) =>/);
  assert.match(patch, /__nea\/control\/dialog-cancel-all/);
  assert.match(patch, /sessionBridgeLabel/);
  assert.match(patch, /matchesSessionLabel/);
  assert.match(patch, /BOX3_LOG_SCRIPT_INTERACT_EVENTS/);
  assert.match(patch, /\[entity-interact\]/);
  assert.match(patch, /GuiSessions/);
  assert.match(patch, /__nea\/control\/gui-command/);
  assert.match(patch, /broadcastLog/);
  assert.match(patch, /sendChatMessages/);
  assert.match(patch, /__nea\/control\/chat-message/);
  assert.match(patch, /resolveSessionLabel/);
  assert.match(patch, /MuQuantizedVec3/);
  assert.match(patch, /BOX3_LOG_SCRIPT_INPUT_EVENTS/);
  assert.match(patch, /\[game-net:input\]/);
  assert.match(patch, /\[game-net:entity-map\]/);
  assert.match(patch, /meshHashes\.length < 117/);
  assert.match(patch, /scale: requireVector\(record\.scale/);
  assert.match(patch, /model\.scale !== void 0\) requireVector2\(model\.scale/);
  assert.match(patch, /normalizeVector\(entity\.model\.scale \?\? \[1, 1, 1\], "entity model scale"\)/);
  assert.match(patch, /damage: DamageSetSchema/);
  assert.match(patch, /pendingDamageHurt/);
  assert.match(patch, /__nea\/control\/damage-state/);
  assert.match(patch, /destroyRuntimeEntity/);
  assert.match(patch, /__nea\/control\/entity-destroy/);
  assert.match(patch, /resolveRuntimeMesh/);
  assert.match(patch, /__nea\/control\/entity-create/);
  assert.match(patch, /__nea\/control\/entity-state/);
  assert.match(patch, /bounds: entity\.bounds \?\? mesh\.bounds/);
  assert.match(patch, /transform\.nameplate/);
  assert.match(patch, /entity\.nameplate === null/);
  assert.match(patch, /transform\.model/);
  assert.match(patch, /runtime entity model meshId cannot be changed/);
  assert.match(metadataPatch, /BOX3_PROJECT_BLOCK_INFO/);
  assert.match(kickPatch, /gameNetPublicSessions\.kick\(sessionLabel\)/);
  assert.match(kickPatch, /__nea\/control\/player-kick/);
  assert.match(linkPatch, /context\.refSessions\.connect\(client\)/);
  assert.match(linkPatch, /__nea\/control\/player-link/);
  assert.match(keyboardPatch, /\[game-net:keyboard\]/);
  assert.match(keyboardPatch, /prevKeyDownState/);
  assert.match(patch, /transform\.collides/);
  assert.match(patch, /transform\.fixed/);
  assert.match(patch, /transform\.gravity/);
  assert.match(patch, /transform\.mass/);
  assert.match(patch, /transform\.friction/);
  assert.match(patch, /transform\.restitution/);
});

test("runtime mesh parser validates only the mesh binding fields", () => {
  const bindingProjection = /parseMeshBinding\(\{[\s\S]*bootstrapMeshIndex: record\.bootstrapMeshIndex,[\s\S]*bootstrapMeshHash: record\.bootstrapMeshHash[\s\S]*\}, index\)/;
  assert.match(runtimeMeshParserPatch, bindingProjection);
  assert.match(backend, bindingProjection);
  assert.doesNotMatch(backend, /function parseRuntimeMesh[\s\S]{0,500}\.\.\.parseMeshBinding\(record, index\)/);
});

test("player movement fields survive authoritative snapshot and PUBLIC state projection", () => {
  for (const field of [
    "walkSpeed",
    "runSpeed",
    "runAcceleration",
    "jumpPower",
    "jumpSpeedFactor",
    "jumpAccelerationFactor",
    "doubleJumpPower",
    "crouchSpeed",
    "crouchAcceleration",
    "flySpeed",
    "flyAcceleration",
    "swimAcceleration",
    "swimSpeed",
    "walkAcceleration",
  ]) {
    assert.match(backend, new RegExp(`${field}: player\\.${field}`));
    assert.match(backend, new RegExp(`if \\(player\\.${field} !== void 0\\) playerState\\.${field} = player\\.${field};`));
  }
  assert.match(backend, /playerRuntimeState\(sessionLabel\)[\s\S]*\.\.\.neaPlayerPublicState\(player\)/);
  assert.match(backend, /queuePlayerRuntimeState\(sessionLabel, state\)[\s\S]*\.\.\.neaPlayerPublicState\(state\)/);
  assert.match(backend, /for \(const field of neaPlayerPublicNumberFields\)[\s\S]*state\[field\] !== void 0/);
});

test("authoritative client input keeps DAO3 Player movement values single-sourced in PUBLIC physics", () => {
  assert.doesNotMatch(backend, /scaleTemporaryLegacyPlayerMotion\(player, command\)/);
  assert.doesNotMatch(backend, /playerMovementSpeedScale\(player, command\.inputState\)/);
  assert.doesNotMatch(backend, /finiteOrDefault\(player\.runSpeed, 0\.4\) \/ 0\.4/);
  assert.match(backend, /if \(command\.runSpeed !== void 0\) player\.runSpeed = command\.runSpeed;/);
  assert.match(backend, /if \(player\.runSpeed !== void 0\) playerState\.runSpeed = player\.runSpeed;/);
});

test("runtime model projection accepts captured zero scale used by hidden entities", () => {
  assert.match(backend, /normalizeVector\(entity\.model\.scale \?\? \[1, 1, 1\], "entity model scale"\)/);
  assert.doesNotMatch(backend, /normalizePositiveVector\(entity\.model\.scale/);
});
