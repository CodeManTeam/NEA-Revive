// 用 block-info 解码全局方块目录，查 Minecraft 地图的 blockId → name
import { readFileSync } from 'fs';
import { decodeBlockCatalog } from '../local-player/src/block-info.mjs';

const bytes = readFileSync('D:/Projects/Gaming/NEA-Revive/backend/local-player/archive/block/QmW2E9E8ipYUifsCfkMj5SULYMYbFQvP6BQxo52atXw7Zj');
const catalog = decodeBlockCatalog(bytes);
console.log('catalog 方块数:', catalog.length);

const byId = new Map(catalog.map(e => [e.id, e]));

const mcIds = [107, 389, 650, 149, 412, 275, 129, 125, 175, 428, 357, 667, 483, 121, 671, 105, 544, 302, 420, 235, 159, 659, 364, 63, 53, 61, 351, 23, 679, 19, 21, 391];
console.log('\n---- Minecraft 地图 blockId → name ----');
for (const id of mcIds) {
  const e = byId.get(id);
  console.log(`  id=${id} -> ${e ? e.name : '?? (未在目录中)'}${e && e.fluid ? ' [流体]' : ''}`);
}

console.log('\n---- 目录中前 40 个方块 ----');
catalog.slice(0, 40).forEach(e => console.log(`  id=${e.id} name=${e.name}`));
