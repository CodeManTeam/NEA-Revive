import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import test from "node:test";
import { decodeMeshAsset } from "./decode-engine-model.mjs";

const root = "D:/Projects/Gaming/NEA-Revive";
const archive = `${root}/backend/local-player/archive/engine/m`;

const fixtures = [
  ["mesh/卷闸门.vb", "DZ_TDsKY2vzj7XOOVgIa1rIgtP8VpUiufzus6Y2t8fk", "C3fzE6chRMAcvPGUbwyszixltSXMnqajV7U2EoS6o5k", [2, 32, 32], 513],
  ["mesh/鲤鱼的桌子.vb", "BTL6qc76dAvg_HgUstApoapCOwl6RoXZ4yS8hNZjp_U", "S1Pss1ouzZtU_nMwcKc_Knsxuf7x5I3MwReTUBnMmhQ", [80, 50, 70], 1180],
  ["mesh/单元方块-白.vb", "FGkH8GXgAsaw7JpIFJbYvaRUY8Yli_oYkSNychBO7BY", "lj3MMhFcD-1cJn3d5WA8-AXfGAls1gc4cKKY31nqAwc", [32, 32, 32], 237],
];

for (const [meshName, metadataHash, dataHash, expectedBounds, expectedBytes] of fixtures) {
  test(`decodes authoritative ${meshName} v7 asset`, () => {
    const metadata = JSON.parse(readFileSync(`${archive}/${metadataHash}`, "utf8"));
    assert.equal(metadata.version, 7);
    assert.equal(metadata.dataHash, dataHash);
    assert.deepEqual(metadata.bounds, expectedBounds);

    const decoded = decodeMeshAsset(new Uint8Array(readFileSync(`${archive}/${dataHash}`)));
    assert.equal(decoded.format, "dao3-mesh/v7");
    assert.equal(decoded.version, 7);
    assert.deepEqual(Array.from(decoded.value.nodes).length, 2);
    assert.equal(decoded.value.meshes.length, 1);
    assert.equal(decoded.value.meshes[0].length, 6);
    assert.equal(decoded.bytesRead, expectedBytes);
    assert.equal(decoded.trailingBytes, 0);
    assert.ok(decoded.value.texture.width > 0);
  });
}
