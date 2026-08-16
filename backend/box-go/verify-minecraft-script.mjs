// 验证 minecraft 包 + index.js（真实脚本 + 20 个 stub 模块）加载与运行
import { importMapProject } from '../demo-map/src/import-project.mjs';
import { ScriptRuntime } from '../demo-map/src/runtime/script-runtime.mjs';
import { loadPreservedBlockCatalog } from '../local-player/src/block-info.mjs';

const sourceRoot = 'D:/Projects/Gaming/NEA-Revive/packages/minecraft';
const buildRoot = 'D:/Projects/Gaming/NEA-Revive/.build/minecraft-script-test';
const assetRoot = 'D:/Projects/Gaming/NEA-Revive/backend/local-player/archive';

console.log('[1] importMapProject...');
await importMapProject(sourceRoot, buildRoot);

console.log('[2] ScriptRuntime.load + start...');
const blockCatalog = await loadPreservedBlockCatalog(assetRoot, 'world-bedwars.json');
const runtime = await ScriptRuntime.load(buildRoot, {
  blockCatalog,
  logger: { info: m => console.log('[script]', m), warn: m => console.log('[warn]', m), error: m => console.log('[error]', m) },
});
await runtime.start();
console.log('  moduleSummary:', JSON.stringify(runtime.moduleExecutionSummary()));

// 检查关键全局是否存在
console.log('[3] 顶层脚本副作用检查完成');

// onPlayerJoin 触发（模拟玩家加入）
console.log('[4] addPlayer 触发 onPlayerJoin...');
runtime.addPlayer({ id: 'p-test', name: 'Steve', position: [64, 3, 48] });
await new Promise(r => setTimeout(r, 500));

console.log('[5] tick 推进（world.onTick）...');
for (let i = 0; i < 5; i++) { runtime.tick(); await new Promise(r => setTimeout(r, 50)); }
console.log('  当前 tick:', runtime.currentTick);

// index.js async IIFE 含 `await sleep(6000)`；等它完成再查最终状态
console.log('[6] 等待 async IIFE 完成（含 sleep 6000）...');
await new Promise(r => setTimeout(r, 7000));
console.log('  moduleSummary:', JSON.stringify(runtime.moduleExecutionSummary()));
for (let i = 0; i < 5; i++) { runtime.tick(); await new Promise(r => setTimeout(r, 50)); }
console.log('  tick after sleep:', runtime.currentTick);
console.log('OK');
runtime.stop();
