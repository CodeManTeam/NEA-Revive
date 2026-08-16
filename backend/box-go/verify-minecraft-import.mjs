// 验证 packages/minecraft 导入 + runtime 加载（地形解码/内存/方块）
import { importMapProject } from '../demo-map/src/import-project.mjs';
import { ScriptRuntime } from '../demo-map/src/runtime/script-runtime.mjs';
import { loadPreservedBlockCatalog } from '../local-player/src/block-info.mjs';

const sourceRoot = 'D:/Projects/Gaming/NEA-Revive/packages/minecraft';
const buildRoot = 'D:/Projects/Gaming/NEA-Revive/.build/minecraft-runtime-build';
const assetRoot = 'D:/Projects/Gaming/NEA-Revive/backend/local-player/archive';

console.log('[1] importMapProject...');
const t0 = Date.now();
const result = await importMapProject(sourceRoot, buildRoot);
console.log(`  voxelCount=${result.voxelCount} entityCount=${result.entityCount} assetCount=${result.assetCount} (${Date.now() - t0}ms)`);

console.log('[2] ScriptRuntime.load...');
const t1 = Date.now();
const blockCatalog = await loadPreservedBlockCatalog(assetRoot, 'world-bedwars.json');
const runtime = await ScriptRuntime.load(buildRoot, {
  blockCatalog,
  logger: { info() {}, warn() {}, error() {} },
});
console.log(`  shape=${JSON.stringify(runtime.voxels.shape)} (${Date.now() - t1}ms)`);

// 采样校验
const samples = [
  [0, 0, 0], [1, 0, 0], [64, 2, 48], [64, 3, 48], [128, 0, 64], [200, 20, 200],
];
console.log('[3] 采样 getVoxelId（blockId，含 rotation 高位则 & 0x3fff）:');
for (const [x, y, z] of samples) {
  const full = runtime.voxels.getVoxelId(x, y, z);
  console.log(`  [${x},${y},${z}] -> ${full & 0x3fff}`);
}
console.log('[4] 内存', Math.round(process.memoryUsage().heapUsed / 1024 / 1024), 'MB');
console.log('OK');
