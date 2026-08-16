const { createHash } = require("node:crypto");
const { readFileSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");
const { patchPlayerPublicStateSource } = require("./patch-player-public-state-bundle.cjs");

const BASE_SHA256 = "d35b3db79e93c03021fcb0ad62bf20d89e4bef470553bff17be6c9e3a61cc097";
const COMPAT_SHA256 = "71bbbbf0492e54b5dc5ed6f228b0bae295179ebad54196ef7306dad808ec8d59";
const PUBLIC_STATE_SHA256 = "59ba4641254e49782d111c32f7d94b7888cbbe5cdcdbe1ec8648f129fa4a89de";
const PROJECT_METADATA_SHA256 = "fa1f65ff3cb0757f1d3a2b2da47cec381ca1402cfde45cb70ca575526d4aad92";
const PLAYER_KICK_SHA256 = "19955e2c17216d2daf537b93257a345e54986e8a3216bf99459c3ef6d3583d9d";
const PLAYER_LINK_SHA256 = "921efd756851bd21bb1d2973d8f35e0b1832223307dca27546d7176f4f355d8e";
const KEYBOARD_EVENTS_SHA256 = "e6c216bb730eb016afb5d20bcbf596937cf3bb5cbbfc3d669c11fce9b5a44920";
const PLAYER_SKIN_SHA256 = "e6d9b0f8f99184db0a27ba78456fe7119cb858dbc7e14290f411f9f1f225a546";
const TARGET_SHA256 = "4354a2c6a7e577ff7bf4a7d89adc00fa033d61278b04556dfa5675a6201d5ece";

function applyBackendCompatPatch(bundlePath) {
  const source = readFileSync(bundlePath, "utf8");
  assertHash(source, BASE_SHA256, "backend compatibility patch baseline");
  const patch = readFileSync(join(__dirname, "backend-compat.patch"), "utf8");
  const compatOutput = applyUnifiedPatch(source, patch);
  assertHash(compatOutput, COMPAT_SHA256, "backend compatibility patch intermediate output");
  const soundPatch = readFileSync(join(__dirname, "backend-sound-compat.patch"), "utf8");
  const soundOutput = applyUnifiedPatch(compatOutput, soundPatch);
  const validationPatch = readFileSync(join(__dirname, "backend-validation-compat.patch"), "utf8");
  const validationOutput = applyUnifiedPatch(soundOutput, validationPatch);
  const publicStateOutput = patchPlayerPublicStateSource(validationOutput);
  assertHash(publicStateOutput, PUBLIC_STATE_SHA256, "backend public-state patch output");
  const projectMetadataPatch = readFileSync(join(__dirname, "backend-project-metadata-compat.patch"), "utf8");
  const projectMetadataOutput = applyUnifiedPatch(publicStateOutput, projectMetadataPatch);
  assertHash(projectMetadataOutput, PROJECT_METADATA_SHA256, "backend project-metadata patch output");
  const playerKickPatch = readFileSync(join(__dirname, "backend-player-kick-compat.patch"), "utf8");
  const playerKickOutput = applyUnifiedPatch(projectMetadataOutput, playerKickPatch);
  assertHash(playerKickOutput, PLAYER_KICK_SHA256, "backend player-kick patch output");
  const playerLinkPatch = readFileSync(join(__dirname, "backend-player-link-compat.patch"), "utf8");
  const playerLinkOutput = applyUnifiedPatch(playerKickOutput, playerLinkPatch);
  assertHash(playerLinkOutput, PLAYER_LINK_SHA256, "backend player-link patch output");
  const keyboardEventsPatch = readFileSync(join(__dirname, "backend-keyboard-events-compat.patch"), "utf8");
  const keyboardEventsOutput = applyUnifiedPatch(playerLinkOutput, keyboardEventsPatch);
  assertHash(keyboardEventsOutput, KEYBOARD_EVENTS_SHA256, "backend keyboard-events patch output");
  const playerSkinPatch = readFileSync(join(__dirname, "backend-player-skin-compat.patch"), "utf8");
  const playerSkinOutput = applyUnifiedPatch(keyboardEventsOutput, playerSkinPatch);
  assertHash(playerSkinOutput, PLAYER_SKIN_SHA256, "backend player-skin patch output");
  const runtimeMeshParserPatch = readFileSync(join(__dirname, "backend-runtime-mesh-parser-compat.patch"), "utf8");
  const output = applyUnifiedPatch(playerSkinOutput, runtimeMeshParserPatch);
  assertHash(output, TARGET_SHA256, "backend compatibility patch output");
  writeFileSync(bundlePath, output);
}

function applyUnifiedPatch(source, patch) {
  const sourceLines = source.split("\n");
  const patchLines = patch.replace(/\r\n/g, "\n").split("\n");
  const output = [];
  let sourceIndex = 0;
  let patchIndex = 0;
  while (patchIndex < patchLines.length && !patchLines[patchIndex].startsWith("@@ ")) patchIndex += 1;
  while (patchIndex < patchLines.length) {
    const header = patchLines[patchIndex++];
    const match = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(header);
    if (!match) throw new Error(`Invalid backend compatibility hunk: ${header}`);
    const oldCount = Number(match[2] ?? 1);
    const oldStart = oldCount === 0 ? Number(match[1]) : Number(match[1]) - 1;
    while (sourceIndex < oldStart) output.push(sourceLines[sourceIndex++]);
    let consumed = 0;
    while (patchIndex < patchLines.length && !patchLines[patchIndex].startsWith("@@ ")) {
      const line = patchLines[patchIndex++];
      if (line.startsWith("diff --git ") || line.startsWith("--- ") || line.startsWith("+++ ")) continue;
      if (line === "\\ No newline at end of file") continue;
      const marker = line[0];
      const value = line.slice(1);
      if (marker === " ") {
        assertLine(sourceLines, sourceIndex, value);
        output.push(sourceLines[sourceIndex++]);
        consumed += 1;
      } else if (marker === "-") {
        assertLine(sourceLines, sourceIndex, value);
        sourceIndex += 1;
        consumed += 1;
      } else if (marker === "+") {
        output.push(value);
      } else if (line !== "") {
        throw new Error(`Invalid backend compatibility patch line: ${line}`);
      }
    }
    if (consumed !== oldCount) throw new Error(`Backend compatibility hunk consumed ${consumed} lines, expected ${oldCount}`);
  }
  output.push(...sourceLines.slice(sourceIndex));
  return output.join("\n");
}

function assertLine(lines, index, expected) {
  if (lines[index] !== expected) {
    throw new Error(`Backend compatibility patch mismatch at line ${index + 1}`);
  }
}

function assertHash(value, expected, label) {
  const actual = createHash("sha256").update(value).digest("hex");
  if (actual !== expected) throw new Error(`${label} hash mismatch: expected ${expected}, received ${actual}`);
}

module.exports = { applyBackendCompatPatch, applyUnifiedPatch };
