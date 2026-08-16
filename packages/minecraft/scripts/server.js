// [Minecraft] 我的世界正式版 —— 本地部署入口脚本
// 原 reference/code/index.js 依赖 20+ 未随导出的子模块（water.js / world.js /
// bag.js / player.js / crafting.js / sql.js / 末影龙.js …），无法直接执行。
// 本入口只保留 index.js 顶层可独立运行的配置与基础交互，地形/出生点由
// packages/minecraft/world 提供；完整逻辑见 reference/code/index.js。

world.keepInventory = true;
world.useOBB = false;

(async function () {
  world.addCollisionFilter("player", "player");
  world.addCollisionFilter("player", ".掉落物");
  world.addCollisionFilter("player", ".动物");
  world.addCollisionFilter(".掉落物", ".掉落物");
  world.addCollisionFilter(".生物", ".生物");
  world.sunPhase = 0;
  world.isInit = true;
})();

world.onPlayerJoin(({ entity }) => {
  world.say(`${entity.player.name} 进入了我的世界`);
});

world.onChat(async ({ entity, message }) => {
  if (!entity.isPlayer) return;
  if (message === "帮助") {
    await entity.player.dialog({
      type: Box3DialogType.TEXT,
      title: "游戏帮助",
      content: "这是从 DAO3 导出的 [Minecraft] 我的世界正式版地图（256×128×256）。地形已完整还原，完整生存/合成玩法依赖未导出的脚本模块。",
    });
  }
  if (message === "还原") {
    entity.player.canFly = false;
    entity.player.invisible = false;
    entity.player.spectator = false;
    entity.hp = 100;
  }
});
