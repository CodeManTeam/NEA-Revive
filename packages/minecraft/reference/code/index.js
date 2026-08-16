//----------------------------正式版v2.0--------------------------------//
console.clear();
world.keepInventory = true;
global.playerGo = (entity, f = randa(5, 120), l = randa(5, 120)) => {
    var f = f
    var l = l
    console.log(world.canf[0], world.canf[1])
    for (var j = world.canf[0]; j >= world.canf[1]; j--) {
        if (worldBlock.getBlock(f, j, l) != 0 && worldBlock.getBlock(f, j + 1, l) == 0 && worldBlock.getBlock(f, j - 1, l) != voxels.id("stone")) {//voxels.name(worldBlock.getBlock(f,j,l))=="grass"||voxels.name(worldBlock.getBlock(f,j,l))=="sand"||voxels.name(worldBlock.getBlock(f,j,l))=="water"||voxels.name(worldBlock.getBlock(f,j,l))=="green_leaf"||voxels.name(worldBlock.getBlock(f,j,l)=="water")||voxels.name(worldBlock.getBlock(f,j,l))=="pumpkin"||voxels.name(worldBlock.getBlock(f,j,l))=="bamboo"
            entity.position.set(f, j + 2, l)
            entity.player.spawnPoint = new GameVector3(f, j + 2, l)
        }
    }
}

world.onTick(() => {
    for (const e of world.querySelectorAll`.entity`) {
        if (e.update) { e.update() }
    }
})
world.useOBB = false;
global.randa = (min, max) => {
    const minCeiled = Math.ceil(min);
    const maxFloored = Math.floor(max);
    return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled);
}

(async function () {
    world.addCollisionFilter("player", "player")
    world.addCollisionFilter("player", ".末影珍珠")
    world.addCollisionFilter(".末影珍珠", ".末影珍珠")
    world.addCollisionFilter("player", ".掉落物")
    world.addCollisionFilter("player", ".动物")
    world.addCollisionFilter("player", ".末影龙")
    world.addCollisionFilter(".掉落物", ".掉落物")
    world.addCollisionFilter(".生物", ".生物")
    world.sunPhase = 0
    world.isInit = true;
    world.isLIT = false;
    world.canf = [30, 0]
    world.isLLO = false;//矿透模式
    world.isLIT = true;//调试时注释
    await require('./water.js')
    await require("./TerrainCopy.js")
    await require("./data.js")
    await require("./_server_bundle.js")
    await require("./teleport.js")
    await require("./Hearts.js")
    await require('./ban.js')
    await require('./chat.js')
    if (world.isLIT) {
        await require('./Voxel.js')
        world.querySelectorAll("player").forEach((e) => {
            playerGo(e)
        })
        world.canf = [128, 70]
    } else {
        SetGrass();
        Setsbarrier();
    }
    SetWart();
    await require("./world.js")
    await require("./bag.js")
    await require("./player.js")
    await require("./PlayerOpTool.js")
    await require("./biology.js")
    await require("./gui.js")
    await require("./admin.js")
    await require("./crafting.js")
    await require("./sql.js")
    await require('./月神版兑换码.js')
    globalThis.Mstr = await require('./末影龙.js')
    //Mstr[0].summon();
    await sleep(6000);
    world.isInit = false;

    DoNotVo = ["plank_02", "rock", "lantern_02", "stone_wall", "bookshelf", "spiderweb", "stone_wall_01"]
})();
world.onPlayerPurchaseSuccess(({ userId, productId }) => {
    console.log("购买了东西")
    const entity = world.querySelectorAll('player').find(e => e.player.userId === userId);
    if (entity) {
        if (productId === 383027972747974) {
            entity.player.directMessage("Hello 这是个测试！！！")
        } else if (productId === 383027972748007) {
            entity.player.dialog({
                type:'text',
                content:'购买成功!--血量*100'
            })
            entity.maxHp = 100;
            entity.hp = 100;
        } else if (productId === 383033668613422) {
            entity.player.dialog({
                type:'text',
                content:'购买成功!--飞行药水*6'
            })
            entity.Give("飞行药水", 6)
        } else if (productId === 383033668613441) {
            entity.player.dialog({
                type:'text',
                content:'购买成功!--奶桶*64'
            })
            entity.Give("奶桶", 64)
        } else if (productId === 383028006302623) {
            entity.player.dialog({
                type:'text',
                content:'购买成功!--经验球*128'
            })
            entity.Give("经验球", 128)
        } else if (productId === 383033697973685) {
            entity.player.dialog({
                type:'text',
                content:'购买成功!--书架*64'
            })
            entity.Give("书架", 64)
        }
    }
});
globalThis.proId = [383027972747974, 383027972748007, 383033668613422, 383033668613441, 383028006302623, 383033697973685]
globalThis.Setsbarrier = async () => {
    for (let i = 0; i < 128; i++) {
        for (let j = 1; j < 128; j++) {
            for (let k = 1; k < 15; k++) {
                if (worldBlock.getBlock(i, k, j) == voxels.id("barrier")) {
                    worldBlock.setBlock(i, k, j, "air");
                }
            }
        }
        await sleep(1)
    }

}
globalThis.SetGrass = async () => {
    for (let i = 0; i < 128; i++) {
        for (let j = 0; j < 128; j++) {
            for (let k = 0; k < 100; k++) {
                if (worldBlock.getBlock(i, k, j) == voxels.id("dirt")) {
                    if (Math.random(`${world.seed}`) < 0.001) {
                        FindBlockName("草").Function(i, k, j, "mesh/植物草.vb")
                    }
                }
            }
        }
        await sleep(1)
    }
}
globalThis.SetWart = async () => {
    for (let i = 128; i < 256; i++) {
        for (let j = 0; j < 128; j++) {
            for (let k = 0; k < 100; k++) {
                if (worldBlock.getBlock(i, k, j) == voxels.id("dark_red") && worldBlock.getBlock(i, k + 1, j) == 0) {
                    if (Math.random(`${world.seed}`) < 0.001) {
                        FindBlockName("下界疣").Function(i, k, j, "mesh/下界疣.vb")
                        worldBlock.setBlock(i, k, j, "light_sand")
                    }
                }
            }
        }
        await sleep(1)
    }
    for (let i = 128; i < 256; i++) {
        for (let j = 0; j < 128; j++) {
            for (let k = 0; k < 100; k++) {
                if (worldBlock.getBlock(i, k, j) == voxels.id("dark_red") && worldBlock.getBlock(i, k + 1, j) == 0) {
                    if (Math.random(`${world.seed}`) < 0.0003) {
                        FindBlockName("凋零骷髅头").Function(i, k, j, "mesh/凋零骷髅头.vb")
                        worldBlock.setBlock(i, k, j, "light_sand")
                    }
                }
            }
        }
        await sleep(1)
    }
}
(async () => {
    await sleep(100)
    const relsut = world.addZone({
        selector: 'player', // 选择器，这里选择玩家
        bounds: {
            lo: [130, 0, 0],
            hi: [256, 128, 128]
        },
        fogEnabled: true, // 开启雾效
        fogColor: { r: 1, g: 0.1, b: 0 }, // 设置雾的颜色为灰色
        fogDensity: 0.7, // 设置雾的密度
        fogStartDistance: 16, // 雾开始的距离
        fogHeightOffset: 5, // 雾的高度偏移
        fogHeightFalloff: 2, // 雾的高度衰减
        fogMax: 1, // 雾的最大浓度
        skyMod: "manual",
        skySunLight: 0,
    })
    const relsut3 = world.addZone({
        selector: '*', // 选择器，这里选择玩家
        bounds: {
            lo: [0, 0, 130],
            hi: [100, 128, 256]
        },
        fogEnabled: true, // 开启雾效
        fogColor: { r: 0, g: 0, b: 0 }, // 设置雾的颜色为灰色
        fogDensity: 0.7, // 设置雾的密度
        fogStartDistance: 57, // 雾开始的距离
        fogHeightOffset: 5, // 雾的高度偏移
        fogHeightFalloff: 2, // 雾的高度衰减
        fogMax: 0, // 雾的最大浓度
        skyMode: "manual",
    })
    const relsut2 = world.addZone({
        selector: 'player', // 选择器，这里选择玩家
        bounds: {
            lo: [100, 0, 130],
            hi: [256, 128, 256]
        },
        fogEnabled: true, // 开启雾效
        fogColor: { r: 0, g: 0, b: 0 }, // 设置雾的颜色为灰色
        fogDensity: 0.7, // 设置雾的密度
        fogStartDistance: 57, // 雾开始的距离
        fogHeightOffset: 5, // 雾的高度偏移
        fogHeightFalloff: 2, // 雾的高度衰减
        fogMax: 1, // 雾的最大浓度
        skyMode: "manual",
    })
    relsut.onEnter(({ entity }) => {
        if (!entity.isPlayer) { return; }
        entity.zone.selector = "null";
        entity.addTag("InHell")
    })
    relsut.onLeave(({ entity }) => {
        if (!entity.isPlayer) { return; }
        entity.zone.selector = entity.player.userId;
        entity.removeTag("InHell")
    })
    relsut2.onEnter(({ entity }) => {
        if (!entity.isPlayer) { return; }
        entity.zone.selector = "null";
        entity.addTag("InEndPlace")
    })
    relsut2.onLeave(({ entity }) => {
        if (!entity.isPlayer) { return; }
        entity.zone.selector = entity.player.userId;
        entity.removeTag("InEndPlace")
    })
    relsut3.onEnter(({ entity }) => {
        if (!entity.isPlayer) { if (entity.hasTag("末影珍珠")) { entity.destroy; }; return; }
        entity.addTag("InPok")
        entity.BuffClear();
        entity.gamemode.gamemode(2)
    })
    relsut3.onLeave(({ entity }) => {
        if (!entity.isPlayer) { return; }
        entity.gamemode.gamemode(2)
        entity.BuffClear();
        entity.removeTag("InPok")
    })
    var is = ["/setsspawn", "/setsspawn", "/setsspawn", "/entity.position.copy(entity.player.spawnPoint)", "/entity.position.copy(entity.player.spawnPoint)", "/setsspawn", "/setsspawn", "/setsspawn", "/setsspawn", "/setsspawn", "/setsspawn", "/kill @p", "/setsL1", "/setsL2", "/setsL3", "/setsL4"]
    //is = ["","","",""]
    for (let i in is) {
        world.querySelectorAll(`*`).forEach((e) => {
            if (!e.hasTag("doNotDel") && world.isLIT) {
                e.destroy()
            } else {
                world.querySelector(`.${(parseInt(i) + 1)}`).command = is[i];
                world.querySelector(`.${(parseInt(i) + 1)}`).addTag("红石装置")
                world.querySelector(`.${(parseInt(i) + 1)}`).level = 0;
                world.querySelector(`.${(parseInt(i) + 1)}`).showEntityName = true;
                world.querySelector(`.${(parseInt(i) + 1)}`).nameColor = new GameRGBColor(0, 0, 0)
                world.querySelector(`.${(parseInt(i) + 1)}`).customName = "0"
                world.querySelector(`.${(parseInt(i) + 1)}`).nameRadius = 5;
                world.querySelector(`.${(parseInt(i) + 1)}`).updates = (level) => {
                    world.querySelector(`.${(parseInt(i) + 1)}`).level = level;
                    world.querySelector(`.${(parseInt(i) + 1)}`).customName = level;
                    /*if(world.querySelector(`.${(parseInt(i)+1)}`).level == 0){return}  
                    if(world.querySelector(`.${(parseInt(i)+1)}`).command == "/setsspawn"){
                        world.findNearestPlayer(world.querySelector(`.${(parseInt(i)+1)}`)).player.spawnPoint.copy(world.findNearestPlayer(world.querySelector(`.${(parseInt(i)+1)}`)).position)
                        world.findNearestPlayer(world.querySelector(`.${(parseInt(i)+1)}`)).player.directMessage("已设置重生点")
                        return;
                    }
                    comeend(world.findNearestPlayer(world.querySelector(`.${(parseInt(i)+1)}`)), world.querySelector(`.${(parseInt(i)+1)}`).command == null ? "错误":world.querySelector(`.${(parseInt(i)+1)}`).command,true)
                    */
                }
                world.querySelector(`.${(parseInt(i) + 1)}`).parent = [];
                allRedstoneEntities.push(world.querySelector(`.${(parseInt(i) + 1)}`));
                world.querySelector(`.${(parseInt(i) + 1)}`).onDestroy(({ entity }) => {
                    const index = allRedstoneEntities.indexOf(world.querySelector(`.${(parseInt(i) + 1)}`));
                    if (index != -1) {
                        allRedstoneEntities.splice(index, 1);
                    }
                })
                world.querySelector(`.${(parseInt(i) + 1)}`).lp = [world.querySelector(`.${(parseInt(i) + 1)}`).position.x - 0.5, world.querySelector(`.${(parseInt(i) + 1)}`).position.y - 1.5, world.querySelector(`.${(parseInt(i) + 1)}`).position.z - 0.5]
            }
        })
    }
    world.findNearestPlayer = (entity) => {
        const players = world.querySelectorAll("player");
        if (!players.length) return null;

        return players.reduce((nearest, player) => {
            const dx = player.position.x - entity.position.x;
            const dy = player.position.y - entity.position.y;
            const dz = player.position.z - entity.position.z;
            const distance = dx * dx + dy * dy + dz * dz; // 不需要开平方，直接比较平方值即可

            return !nearest || distance < nearest.distance
                ? { player, distance }
                : nearest;
        }, null)?.player; // 取出最终的player对象
    }

    world.querySelectorAll(`.压力板`).forEach((e) => {
        e.addTag("红石装置")
        e.lp = [e.position.x - 0.5, e.position.y - 1.5, e.position.z - 0.5]
        allRedstoneEntities.push(e);
        e.parent = [];
        e.onDestroy(({ entity }) => {
            const index = allRedstoneEntities.indexOf(e);
            if (index != -1) {
                allRedstoneEntities.splice(index, 1);
            }
        })
        e.level = 0;
    })
    const a = world.querySelectorAll(".告示牌")
    a.showEntityName = true;
    a.nameColor = "恭喜发现彩蛋 请点击兑换码 并输入以下兑换码:PossIus87"
    globalThis.mo = function () {
        Mstr[0].summon()
    }
})();