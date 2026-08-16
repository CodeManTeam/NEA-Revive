// 从 DAO3「[Minecraft]我的世界正式版」项目包的 voxel-sparse.gz 提取地形，
// 转换为 nea-terrain/v1 boxes（from/to 为**排他**上界），并计算出生点。
// 方块 ID 直接映射全局 block-info 目录（已在 lookup-block-ids.mjs 验证）。
import fs from 'fs';
import zlib from 'zlib';

const REF = 'D:/Projects/Gaming/NEA-Revive/reference/[Minecraft]我的世界正式版-master-export';
const OUT_DIR = 'D:/Projects/Gaming/NEA-Revive/packages/minecraft';

// ---- 1. 解压 + 解析 ----
const gz = fs.readFileSync(REF + '/build/voxel-sparse.gz');
const raw = zlib.gunzipSync(gz);
const obj = JSON.parse(raw.toString('utf8'));
const { shape, stride, indices, data } = obj;
const [NX, NY, NZ] = shape;
const [sx, sy, sz] = stride;
console.log(`shape=${shape} indices=${indices.length}`);

// ---- 2. 填稠密网格（blockId，0=air）----
const N = NX * NY * NZ;
const grid = new Uint16Array(N);
// 线性索引：idx = x*sx + y*sy + z*sz（sx=1, sy=256, sz=32768）
const lin = (x, y, z) => x * sx + y * sy + z * sz;
for (let i = 0; i < indices.length; i++) {
  grid[indices[i]] = data[i];
}

// ---- 3. 贪婪 RLE 合并为 boxes（排他 to）----
const boxes = [];
let cellScanned = 0;
for (let z = 0; z < NZ; z++) {
  for (let y = 0; y < NY; y++) {
    for (let x = 0; x < NX; x++) {
      const bid = grid[lin(x, y, z)];
      if (bid === 0) continue;
      // 沿 x 扩展
      let x2 = x + 1;
      while (x2 < NX && grid[lin(x2, y, z)] === bid) x2++;
      // 沿 y 扩展
      let y2 = y + 1;
      outerY: while (y2 < NY) {
        for (let xx = x; xx < x2; xx++) if (grid[lin(xx, y2, z)] !== bid) break outerY;
        y2++;
      }
      // 沿 z 扩展
      let z2 = z + 1;
      outerZ: while (z2 < NZ) {
        for (let yy = y; yy < y2; yy++) {
          for (let xx = x; xx < x2; xx++) {
            if (grid[lin(xx, yy, z2)] !== bid) break outerZ;
          }
        }
        z2++;
      }
      // 标记已消费（置 0）
      for (let zz = z; zz < z2; zz++) {
        for (let yy = y; yy < y2; yy++) {
          for (let xx = x; xx < x2; xx++) {
            grid[lin(xx, yy, zz)] = 0;
            cellScanned++;
          }
        }
      }
      boxes.push({ from: [x, y, z], to: [x2, y2, z2], blockId: bid });
    }
  }
}
console.log(`boxes=${boxes.length} cellsScanned=${cellScanned}`);

// ---- 4. 出生点：在 overworld（x<128）找一块能站人的实体表面 ----
// 从若干候选列找「最高实体方块」，取其中地形较平整的一处。
function surfaceAt(cx, cz) {
  for (let y = NY - 1; y >= 0; y--) {
    const rawBid = cellAt(cx, y, cz);
    if (rawBid !== 0) return { y, bid: rawBid };
  }
  return { y: -1, bid: 0 };
}
const cellLookup = new Map();
for (let i = 0; i < indices.length; i++) cellLookup.set(indices[i], data[i]);
function cellAt(x, y, z) { return cellLookup.get(lin(x, y, z)) ?? 0; }

// 自然地形块（优先在这些块上出生）
const NATURAL = new Set([129, 125, 107, 389, 149, 667, 671, 659, 679, 391, 357]);
let best = null;
for (const cx of [40, 64, 96, 48, 80, 32, 112]) {
  for (const cz of [40, 64, 96, 48, 80, 32, 112]) {
    const { y, bid } = surfaceAt(cx, cz);
    if (y < 0) continue;
    // 头顶至少 2 格空
    if (cellAt(cx, y + 1, cz) !== 0 || cellAt(cx, y + 2, cz) !== 0) continue;
    const score = (NATURAL.has(bid) ? 1000 : 0) + y - Math.abs(cx - 64) * 0.1 - Math.abs(cz - 64) * 0.1;
    if (best === null || score > best.score) best = { x: cx, y: y + 1, z: cz, score, groundBid: bid, groundY: y };
  }
}
const spawn = best ? [best.x, best.y, best.z] : [64, 40, 64];
console.log(`spawn=${spawn} (地面 y=${best ? best.groundY : '?'} block=${best ? best.groundBid : '?'})`);

// ---- 5. 写 terrain.json ----
fs.mkdirSync(OUT_DIR + '/world', { recursive: true });
const terrainOut = { formatVersion: 'nea-terrain/v1', boxes };
fs.writeFileSync(OUT_DIR + '/world/terrain.json', JSON.stringify(terrainOut));
console.log(`terrain.json: ${(JSON.stringify(terrainOut).length / 1024 / 1024).toFixed(2)} MB`);

// 输出供后续脚本使用的元信息
fs.writeFileSync(OUT_DIR + '/.extract-meta.json', JSON.stringify({ shape, spawn, boxes: boxes.length }, null, 2));
