import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const widgetIds = [
  "client.UiBox.create",
  "client.UiImage.complete",
  "client.UiImage.create",
  "client.UiImage.image",
  "client.UiImage.imageDisplayMode",
  "client.UiImage.imageOpacity",
  "client.UiImage.load",
  "client.UiScrollBox.create",
  "client.UiScrollBox.scrollPosition",
  "client.UiText.autoWordWrap",
  "client.UiText.create",
  "client.UiText.richText",
  "client.UiText.textColor",
  "client.UiText.textContent",
  "client.UiText.textFontFamily",
  "client.UiText.textFontSize",
  "client.UiText.textLineHeight",
  "client.UiText.textStrokeColor",
  "client.UiText.textStrokeOpacity",
  "client.UiText.textStrokeThickness",
  "client.UiText.textXAlignment",
  "client.UiText.textYAlignment",
];

test("archived Player confirms documented client UI widget wrappers", async () => {
  const analysis = await readJson("generated/player-client-script-runtime-analysis.json");
  const entries = new Map(analysis.entries.map(entry => [entry.id, entry]));
  for (const id of widgetIds) {
    const entry = entries.get(id);
    assert.ok(entry, `${id} missing from client runtime analysis`);
    assert.equal(entry.side, "client");
    assert.equal(entry.availability, "confirmed");
    assert.equal(entry.compatibility, "native");
    assert.equal(entry.capability, "client.ui");
    assert.ok(entry.evidence.some(item => item.symbol === "modules 20162 / 9583 / 37672 / 84941 client UI wrappers"));
  }
});

test("UiScale remains sourced from the client SES module", async () => {
  const analysis = await readJson("generated/player-client-script-runtime-analysis.json");
  const entries = new Map(analysis.entries.map(entry => [entry.id, entry]));
  for (const id of ["client.UiScale.create", "client.UiScale.scale"]) {
    const entry = entries.get(id);
    assert.equal(entry?.capability, "client.ui");
    assert.ok(entry?.evidence.some(item => item.symbol === "module 93474 UiScale wrapper"));
  }
  assert.equal(entries.get("client.UiScale.scale")?.signature.readonly, false);
});

test("UI wrapper access modes retain the documented contract", async () => {
  const analysis = await readJson("generated/player-client-script-runtime-analysis.json");
  const entries = new Map(analysis.entries.map(entry => [entry.id, entry]));
  for (const id of ["client.UiImage.complete", "client.UiScrollBox.scrollPosition", "client.UiText.textColor", "client.UiText.textStrokeColor"]) {
    assert.equal(entries.get(id)?.signature.readonly, true, `${id} should remain readonly`);
  }
  for (const id of ["client.UiImage.image", "client.UiImage.imageOpacity", "client.UiText.textContent", "client.UiText.richText"]) {
    assert.equal(entries.get(id)?.signature.readonly, false, `${id} should remain writable`);
  }
  assert.equal(entries.get("client.UiImage.load")?.kind, "event");
});

async function readJson(path) {
  return JSON.parse(await readFile(resolve(root, path), "utf8"));
}
