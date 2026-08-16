// stub：原 Voxel.js 未导出；提供 FindBlockName 使 SetWart/SetGrass 不崩。
module.exports = {};
if (typeof globalThis.FindBlockName !== "function") {
  globalThis.FindBlockName = (name) => ({
    Function: (x, y, z, mesh) => { /* 占位：本地不放置装饰 */ },
    name: String(name),
  });
}
