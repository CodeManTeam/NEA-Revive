// Headless runner for the REAL parkour map script through the demo-map runtime.
// Loads .workspace/parkour-demo, reports which APIs work and which are missing.
import { mkdtemp, cp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadPreservedBlockCatalog } from "../../Backend/local-player/src/block-info.mjs";
import { importMapProject } from "./src/import-project.mjs";
import { ScriptRuntime } from "./src/runtime/script-runtime.mjs";

const source = resolve(fileURLToPath(new URL("../../.workspace/parkour-demo/project", import.meta.url)));
const archiveRoot = resolve(fileURLToPath(new URL("../../Backend/local-player/archive", import.meta.url)));
const blockCatalog = await loadPreservedBlockCatalog(archiveRoot, "world-bedwars.json");

const output = join(await mkdtemp(join(tmpdir(), "nea-parkour-real-")), "project");
await cp(source, output, { recursive: true });
const compiled = join(await mkdtemp(join(tmpdir(), "nea-parkour-real-built-")), "project");
await importMapProject(output, compiled);

const msgs = [];
const errors = [];
const runtime = await ScriptRuntime.load(compiled, {
  blockCatalog,
  logger: { info() {}, warn() {}, error(m) { errors.push(String(m)); } },
  sendChatMessage: (_s, m) => msgs.push(m),
  sendChatMessages: (b) => b.forEach((e) => msgs.push(e.message)),
});
await runtime.start();

const player = runtime.addPlayer({ id: "player-1", name: "测试玩家", position: [16, 12, 32] });
runtime.tick();
runtime.tick();
console.log("=== join 后消息 ===");
console.log(msgs.map((m) => m.text).join(" | ") || "(none)");

console.log("=== 聊天命令: 帮助 (dialog) ===");
runtime.dispatchChat(player.id, "帮助");
runtime.tick();
console.log("errors after 帮助:", errors.length ? errors.slice(0, 5) : "(none)");

console.log("=== 聊天命令: 加速 (player.write fields) ===");
runtime.dispatchChat(player.id, "加速");
runtime.tick();
console.log("errors after 加速:", errors.length ? errors.slice(0, 5) : "(none)");

console.log("=== 检查点实体: 脚本顶层 querySelectorAll('*') ===");
const snap = runtime.snapshot();
console.log("entities:", snap.entities.map((e) => e.id).join(", ") || "(none)");

console.log("=== 玩家落点 (把玩家放到终点触发 onEntityContact) ===");
const finish = snap.entities.find((e) => e.id === "存档点_终点");
if (finish) {
  player.position = { x: finish.position[0], y: finish.position[1] + 3, z: finish.position[2] };
  player.velocity = { x: 0, y: -30, z: 0 };
  for (let i = 0; i < 30; i++) runtime.tick();
  console.log("errors after finish contact:", errors.length ? errors.slice(0, 8) : "(none)");
  console.log("messages:", msgs.slice(-5).map((m) => m.text).join(" | ") || "(none)");
}

console.log("=== 方块操作: 水淹没循环 (脚本顶层) ===");
// 检查地面是否为 dirt 且脚本在水位 y=8 放了水
const { GameVoxelsRuntime } = await import("./src/runtime/game-voxels.mjs");
console.log("total errors:", errors.length);
for (const e of errors.slice(0, 10)) console.log("ERR:", e);
runtime.stop();
