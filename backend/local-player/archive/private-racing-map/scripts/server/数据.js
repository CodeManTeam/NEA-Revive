globalThis.Weapon = [//武器名称，伤害，击退距离，攻击距离，跳劈增加伤害，攻击间隔(毫秒)，冷却时伤害，最小伤害
    { name: '', damage: 1, repel_dis: 1, attack_dis: 4, jumping_dam: 0, attack_interval: 700, cold_damage: 0.1, min_damage: 1 },
    { name: '木剑', damage: 4, repel_dis: 1, attack_dis: 4, jumping_dam: 2, attack_interval: 500, cold_damage: 0.1, min_damage: 1 },
    { name: '石剑', damage: 4.5, repel_dis: 1, attack_dis: 4, jumping_dam: 2, attack_interval: 500, cold_damage: 0.2, min_damage: 1 },
    { name: '铁剑', damage: 5, repel_dis: 1, attack_dis: 4, jumping_dam: 2, attack_interval: 500, cold_damage: 0.3, min_damage: 1 },
    { name: '钻石剑', damage: 5.5, repel_dis: 1, attack_dis: 4, jumping_dam: 2.5, attack_interval: 480, cold_damage: 0.4, min_damage: 1.5 },
    { name: '下界合金剑', damage: 6, repel_dis: 1, attack_dis: 4, jumping_dam: 2.5, attack_interval: 480, cold_damage: 0.5, min_damage: 2 },
    { name: '击退棒', damage: 1, repel_dis: 1.5, attack_dis: 4, jumping_dam: 1, attack_interval: 500, cold_damage: 0.1, min_damage: 0 },
    { name: '木斧', damage: 3, repel_dis: 1, attack_dis: 4, jumping_dam: 2, attack_interval: 700, cold_damage: 0.2, min_damage: 0.5 },
    { name: '石斧', damage: 3.5, repel_dis: 1, attack_dis: 4, jumping_dam: 2, attack_interval: 700, cold_damage: 0.3, min_damage: 0.5 },
    { name: '铁斧', damage: 4, repel_dis: 1, attack_dis: 4, jumping_dam: 2.5, attack_interval: 700, cold_damage: 0.4, min_damage: 1 },
    { name: '钻石斧', damage: 4.5, repel_dis: 1, attack_dis: 4, jumping_dam: 2.5, attack_interval: 660, cold_damage: 0.5, min_damage: 1.5 },
    { name: '北斗七星剑', damage: 6.5, repel_dis: 1.1, attack_dis: 4, jumping_dam: 3, attack_interval: 480, cold_damage: 0.5, min_damage: 3 },
    { name: '木镐', damage: 2, repel_dis: 1, attack_dis: 4, jumping_dam: 2, attack_interval: 600, cold_damage: 0.2, min_damage: 0.5 },
    { name: '石镐', damage: 2.5, repel_dis: 1, attack_dis: 4, jumping_dam: 2, attack_interval: 600, cold_damage: 0.3, min_damage: 0.5 },
    { name: '铁镐', damage: 3, repel_dis: 1, attack_dis: 4, jumping_dam: 2.5, attack_interval: 600, cold_damage: 0.4, min_damage: 1 },
    { name: '钻石镐', damage: 3.5, repel_dis: 1, attack_dis: 4, jumping_dam: 2.5, attack_interval: 560, cold_damage: 0.5, min_damage: 1 },
];
globalThis.Armor = [//护甲名称，防御，击退抗性，跳劈抗性，免死概率，伤害吸收，小伤害抗性
    { name: '皮革套', defence: 1, def_repel: 0, def_plus: 0, living_rand: 0, damage_absorb: 1, little_damage_defence: 0 },
    { name: '锁链套', defence: 1.5, def_repel: 0, def_plus: 0, living_rand: 0, damage_absorb: 1, little_damage_defence: 0 },
    { name: '铁套', defence: 2, def_repel: 0, def_plus: 0.3, living_rand: 0, damage_absorb: 1, little_damage_defence: 0.1 },
    { name: '钻石套', defence: 2.5, def_repel: 0, def_plus: 0.5, living_rand: 0.02, damage_absorb: 1, little_damage_defence: 0.2 },
    { name: '下界合金套', defence: 3, def_repel: 0.2, def_plus: 1, living_rand: 0.05, damage_absorb: 1, little_damage_defence: 0.3 },
];
globalThis.Enchant_weapon = [//武器类附魔等级，伤害，击退距离，攻击距离，跳劈增加伤害，*攻击间隔，冷却时伤害，最小伤害
    { name: '无附魔', damage: 0, repel_dis: 0, attack_dis: 0, jumping_dam: 0, attack_interval: 1, cold_damage: 0, min_damage: 0 },
    { name: '锋利I', damage: 1, repel_dis: 0, attack_dis: 0.05, jumping_dam: 0.4, attack_interval: 0.96, cold_damage: 0.4, min_damage: 0.2 },
    { name: '锋利II', damage: 1.3, repel_dis: 0, attack_dis: 0.05, jumping_dam: 0.5, attack_interval: 0.94, cold_damage: 0.4, min_damage: 0.3 },
    { name: '锋利III', damage: 1.5, repel_dis: 0.1, attack_dis: 0.05, jumping_dam: 0.6, attack_interval: 0.92, cold_damage: 0.5, min_damage: 0.3 },
    { name: '锋利IV', damage: 1.7, repel_dis: 0.1, attack_dis: 0.05, jumping_dam: 0.7, attack_interval: 0.9, cold_damage: 0.5, min_damage: 0.4 },
    { name: '锋利V', damage: 2, repel_dis: 0.1, attack_dis: 0.05, jumping_dam: 0.8, attack_interval: 0.88, cold_damage: 0.6, min_damage: 0.5 },
];
globalThis.Enchant_armor = [//护甲类附魔等级，防御，击退抗性，跳劈抗性，免死概率，伤害吸收，小伤害抗性
    { name: '无附魔', defence: 0, def_repel: 0, def_plus: 0, living_rand: 0, damage_absorb: 1, little_damage_defence: 0 },
    { name: '保护I', defence: 0.5, def_repel: 0, def_plus: 0.3, living_rand: 0.1, damage_absorb: 1, little_damage_defence: 0.1 },
    { name: '保护II', defence: 1, def_repel: 0, def_plus: 0.6, living_rand: 0.1, damage_absorb: 1, little_damage_defence: 0.1 },
    { name: '保护III', defence: 1.5, def_repel: 0.02, def_plus: 1, living_rand: 0.15, damage_absorb: 1, little_damage_defence: 0.2 },
    { name: '保护IV', defence: 2, def_repel: 0.03, def_plus: 1.5, living_rand: 0.15, damage_absorb: 1, little_damage_defence: 0.2 },
    //{ name: '保护V', defence: 4, def_repel: 0.05, def_plus: 1.6, living_rand: 0.15, damage_absorb: 0.90, little_damage_defence: 0.3 },
];
globalThis.Tools = [//工具名称，挖掘类型，挖掘速度
    { name: "木镐", type: 1, speed: 0.5 },
    { name: "铁镐", type: 1, speed: 1.5 },
    { name: "金镐", type: 1, speed: 2.5 },
    { name: "钻石镐", type: 1, speed: 3.5 },
    { name: "木斧", type: 2, speed: 0.5 },
    { name: "石斧", type: 2, speed: 1.5 },
    { name: "铁斧", type: 2, speed: 2.5 },
    { name: "钻石斧", type: 2, speed: 3.5 },
    { name: "剪刀", type: 3, speed: 0.3 }
];
globalThis.Blocks = [//方块名称，方块挖掘类型（无，镐，斧，剪刀），方块爆炸硬度，方块挖掘硬度，方块name
    { name: "羊毛", type: 3, explosion_hardness: 0, hardness: 0.5, voxelName: 'white' },
    { name: "木板", type: 2, explosion_hardness: 0, hardness: 1, voxelName: 'plank_01' },
    { name: "沙石", type: 1, explosion_hardness: 1, hardness: 2, voxelName: 'sand' },
    { name: "末地石", type: 1, explosion_hardness: 1, hardness: 3, voxelName: 'lemon' },
    { name: "硬化木板", type: 2, explosion_hardness: 1, hardness: 3, voxelName: 'plank_04' },
    { name: "玻璃", type: 0, explosion_hardness: 2, hardness: 0.25, voxelName: 'glass' },
    { name: "合金玻璃", type: 0, explosion_hardness: 2, hardness: 2, voxelName: 'red_glass' },
    { name: "黑曜石", type: 1, explosion_hardness: 2, hardness: 40, voxelName: 'black' },
    { name: "粘液块", type: 0, explosion_hardness: 0, hardness: 0.5, voxelName: 'green_glass' },
    { name: "梯子", type: 2, explosion_hardness: 0, hardness: 0.25, voxelName: 'coy_sause' },
];
globalThis.dis = [
    [-1, -1], [-1, 0], [-1, 1], [0, 1],
    [1, 1], [1, 0], [1, -1], [0, -1]
];
globalThis.voxel_type = {
    0: "none", /* 空 */
    1: "fluid", /* 流体 */
    2: "unit", /* 具有GameVoxel类所直接对应的方块 */
    3: "model", /* 仅有模型实体的方块 */
    4: "texture", /* 使用屏障方块作为碰撞箱 以模型作为贴图的方块 */
    5: "fall", /* 可能掉落的方块 */
    6: "other", /* 其他类型 */
};
globalThis.tips = [
    "I", /* 在物品栏的物品拥有一个不同的ID */
    "D", /* 使用物品的损害值字段来定义它的耐久度 */
    "S", /* 需要从已保存的游戏数据数组中获取附加的数据来完全定义该方块 */
    "B", /* 需要从物品的损害值字段中获取附加的数据来完全定义该物品 */
    "N", /* 需要从物品的NBT数据中获取附加数据来完全定义该物品 */
    "E", /* 需要一个方块实体值来储存附加的数据 */
    "red", /* 不能通过合理的途径获得 只能够通过通过物品栏编辑器获得 */
    "light_blue", /* 无论如何都不能获得该方块 */
    "blue", /* 可以通过在创造模式中的物品列表里获得 */
    "green_blue", /* 可以通过与村民交易或在创造模式中获得 */
    "green", /* 只能够通过附魔工具或在创造模式里中获得 */
    "yellow_green", /* 只能够通过拥有附魔工具或通过使用物品栏编辑器获得 但不能在创造模式里的菜单中获得 */
    "grey", /* 未使用的数据 */
];
globalThis.treetype = {
    "minecraft:birch_forest": {
        type: "minecraft:tree",
        id: 27,
        wood_type_num: 2,
        leaf_type_num: 2,
        wood_type: [17, 162],
        leaf_type: [18, 161],
        under_type: 3
    }
};
globalThis.dmgTypeLable = {
    'default': {
        name: '',
        tags: [],
        attribute: 0,
        breakArm: 0,
    },
    'void': {
        deathMsg: '试图在虚空中遨游', /* 死亡提示, 如: "XXX掉出了这个世界" null自动填充为: "死了" */
        name: '虚空', /* 伤害提示, "你受到了X点name伤害" null自动填充为: 其key, 如:('void')*/
        attribute: 31, /* <011111> 除了不免疫伤害免疫, 其余全部绕过, null自动填充为: 全部不绕过(0), 即常规伤害 */
        tags: ['void'], /* 伤害类型标签, 免疫对应标签的实体可以绕过这个伤害, 或者对此有相应减伤 null自动填充为: 其key, 如:('void') */
        breakArm: 0, /* 不会对护甲、有效盾牌造成磨损。null自动填充为: 全部磨损(31) */
    },
    'lava': {
        deathMsg: '试图在岩浆里游泳',
        name: '熔岩',
        attribute: 1, /* 无视盾牌 */
        breakArm: 15, /* 不磨损盾牌 */
        tags: ['lava', 'fire'],
    },
    'fire': {
        deathMsg: '烤了',
        name: '燃烧',
        attribute: 1,
        breakArm: 15, /* 不磨损盾牌 */
    },
    'fall': {
        deathMesg: '从高处摔了下来',
        name: '摔落',
        attribute: 3, /* 000011,无视盾牌与护甲值 */
        breakArm: 0, /* 不磨损任何 */
    },
};
globalThis.Prices=[
    {type:0,name:'石剑',score:10,num:1},
    {type:0,name:'铁剑',score:70,num:1},
    {type:0,name:'钻石剑',score:250,num:1},
    {type:0,name:'下界合金剑',score:400,num:1},
    {type:0,name:'北斗七星剑',score:1200,num:1},
    {type:0,name:'击退棒',score:30,num:1},
    {type:0,name:'钓鱼竿',score:30,num:1},
    {type:1,name:'锁链靴子',score:100,num:1},
    {type:1,name:'铁靴子',score:250,num:1},
    {type:1,name:'钻石靴子',score:600,num:1},
    {type:1,name:'下界合金靴子',score:1000,num:1},
    {type:2,name:'木镐',score:10,num:1},
    {type:2,name:'铁镐',score:30,num:1},
    {type:2,name:'金镐',score:50,num:1},
    {type:2,name:'钻石镐',score:100,num:1},
    {type:2,name:'木斧',score:10,num:1},
    {type:2,name:'石斧',score:20,num:1},
    {type:2,name:'铁斧',score:50,num:1},
    {type:2,name:'钻石斧',score:100,num:1},
    {type:2,name:'剪刀',score:15,num:1},
    {type:3,name:'羊毛',score:4,num:16},
    {type:3,name:'砂石',score:16,num:16},
    {type:3,name:'末地石',score:24,num:12},
    {type:3,name:'木板',score:20,num:16},
    {type:3,name:'防爆玻璃',score:20,num:4},
    {type:3,name:'黑曜石',score:500,num:1},
    {type:4,name:'弓',score:100,num:1},
    {type:4,name:'力量I弓',score:300,num:1},
    {type:4,name:'力量II冲击I弓',score:600,num:1},
    {type:4,name:'力量III冲击II弓',score:1200,num:1},
    {type:4,name:'箭矢',score:8,num:8},
    {type:5,name:'水桶',score:50,num:1},
    {type:5,name:'TNT',score:80,num:1},
    {type:5,name:'火焰弹',score:60,num:1},
    {type:5,name:'金苹果',score:30,num:1},
    {type:5,name:'救援平台',score:200,num:1},
    {type:5,name:'搭路蛋',score:100,num:1},
    {type:5,name:'回城卷轴',score:200,num:1},
    {type:5,name:'末影珍珠',score:400,num:1},
    {type:5,name:'雪球',score:20,num:8},
    {type:5,name:'牛奶',score:60,num:1},
    {type:5,name:'指南针',score:100,num:1},
    {type:5,name:'防御塔',score:40,num:1},
    {type:5,name:'铁傀儡刷怪蛋',score:150,num:1},
    {type:6,name:'跳跃药水',score:100,num:1},
    {type:6,name:'迅捷药水',score:100,num:1},
    {type:6,name:'隐身药水',score:200,num:1},
    {type:6,name:'瞬间治疗药水',score:50,num:1},  
    {type:6,name:'力量药水',score:300,num:1},  
    {type:6,name:'生命恢复药水',score:100,num:1},  
];

globalThis.Team_Prices=[
    {type:0,name:'锋利',price:[8,16,32,64,128],pic:'picture/1045.png'},
    {type:0,name:'保护',price:[5,10,20,30],pic:'picture/1098.png'},
    {type:0,name:'冶炼',price:[4,8,12,16],pic:'picture/54.png'},
    {type:0,name:'治愈池',price:[3],pic:'picture/46.png'},
    {type:0,name:'疯狂矿工',price:[4,6],pic:'picture/1036.png'},
    {type:1,name:'这是个陷阱',price:[1],pic:'picture/62.png'},
    {type:1,name:'反击陷阱',price:[1],pic:'picture/970.png'},
    {type:1,name:'挖掘疲劳陷阱',price:[1],pic:'picture/1034.png'},
    {type:1,name:'警报陷阱',price:[1],pic:'picture/71.png'},
];
/**
 * 物品基础数据配置(独立配置)
 * 结构规范：
 * {
 *   "物品ID": {
 *     name: "内部标识符",
 *     usename: { chinese: "中文名", english: "英文名" },
 *     type: 物品类型编号(0-5),
 *     maxstack: 最大堆叠数,
 *     equipmentType: "装备类型(armor系)",
 *     durability: 基础耐久,
 *     effects: [特殊效果数组]
 *   }
 * }
 */
globalThis.ITEM_DATA = {
    length:64,
    0: {
        name: "none",
        usename: { chinese: "空", english: "None" },
        type: 0,
        maxstack: 1,
        block: 0,
    },
    1: {
        name: "diamond_legging",
        usename: { chinese: "钻石护腿", english: "Diamond Legging" },
        type: 3,
        maxstack: 1,
        equipmentType: "leggings",
        durability: 528,
    },
    2: {
        name: "diamond_boot",
        usename: { chinese: "钻石靴子", english: "Diamond Boot" },
        type: 3,
        maxstack: 1,
        equipmentType: "boots",
        durability: 528,
    },
    3: {
        name: "health_potion",
        usename: { chinese: "瞬间治疗药水", english: "Health Potion" },
        type: 0,
        maxstack: 1,
    },
    4: {
        name: "ladder",
        usename: { chinese: "梯子", english: "Ladder" },
        type: 1,
        maxstack: 64,
        block: 65,
    },
    5: {
        name: "oak_planks",
        usename: { chinese: "木板", english: "Oak planks" },
        type: 1,
        maxstack: 64,
        block: 5,
    },
    6: {
        name: "stick",
        usename: { chinese: "击退棒", english: "Stick" },
        type: 0,
        maxstack: 1,
    },
    7: {
        name: "gravel",
        usename: { chinese: "砂石", english: "gravel" },
        type: 1,
        maxstack: 64,
        block: 13,
    },
    8: {
        name: "glass",
        usename: { chinese: "防爆玻璃", english: "glass" },
        type: 1,
        maxstack: 64,
        block: 20,
    },
    9: {
        name: "white_wool",
        usename: { chinese: "羊毛", english: "white_wool" },
        type: 1,
        maxstack: 64,
        block: 35,
    },
    10: {
        name: "tnt",
        usename: { chinese: "TNT", english: "tnt" },
        type: 0,
        maxstack: 64,
    },
    11: {
        name: "obsidian",
        usename: { chinese: "黑曜石", english: "obsidian" },
        type: 1,
        maxstack: 64,
        block: 49,
    },
    12: {
        name: "chest",
        usename: { chinese: "箱子", english: "chest" },
        type: 1,
        maxstack: 64,
        block: 54,
    },
    13: {
        name: "Slime Block",
        usename: { chinese: "黏液块", english: "Slime Block" },
        type: 1,
        maxstack: 64,
        block: 165,
    },
    14: {
        name: "end_bricks",
        usename: { chinese: "末地石", english: "end_bricks" },
        type: 1,
        maxstack: 64,
        block: 121,
    },
    15: {
        name: "barrier",
        usename: { chinese: "屏障", english: "barrier" },
        type: 1,
        maxstack: 64,
        block: -185,
    },
    16: {
        name: "air",
        usename: { chinese: "空气", english: "air" },
        type: 1,
        maxstack: 64,
        block: -158,
    },
    17: {
        name: "error",
        usename: { chinese: "错误", english: "error" },
        type: 0,
        maxstack: Infinity,
    },
    18: {
        name: "diamond",
        usename: { chinese: "钻石", english: "diamond" },
        type: 0,
        maxstack: 64,
    },
    19: {
        name: "wooden_sword",
        usename: { chinese: "木剑", english: "wooden_sword" },
        type: 0,
        maxstack: 1,
    },
    20: {
        name: "stone_sword",
        usename: { chinese: "石剑", english: "stone_sword" },
        type: 0,
        maxstack: 1,
    },
    21: {
        name: "iron_sword",
        usename: { chinese: "铁剑", english: "iron_sword" },
        type: 0,
        maxstack: 1,
    },
    22: {
        name: "diamond_sword",
        usename: { chinese: "钻石剑", english: "diamond_sword" },
        type: 0,
        maxstack: 1,
    },
    23: {
        name: "alloy_sword",
        usename: { chinese: "下界合金剑", english: "alloy_sword" },
        type: 0,
        maxstack: 1,
    },
    24: {
        name: "big_dipper_seven_star_sword",
        usename: { chinese: "北斗七星剑", english: "big_dipper_seven_star_sword" },
        type: 0,
        maxstack: 1,
    },
    25: {
        name: "chain_legging",
        usename: { chinese: "锁链护腿", english: "chain_legging" },
        type: 3,
        maxstack: 1,
        equipmentType: "leggings",
        durability: 528,
    },
    26: {
        name: "chain_boot",
        usename: { chinese: "锁链靴子", english: "chain_boot" },
        type: 3,
        maxstack: 1,
        equipmentType: "boots",
        durability: 528,
    },
    27: {
        name: "iron_legging",
        usename: { chinese: "铁护腿", english: "iron_legging" },
        type: 3,
        maxstack: 1,
        equipmentType: "leggings",
        durability: 528,
    },
    28: {
        name: "iron_boot",
        usename: { chinese: "铁靴子", english: "iron_boot" },
        type: 3,
        maxstack: 1,
        equipmentType: "boots",
        durability: 528,
    },
    29: {
        name: "alloy_legging",
        usename: { chinese: "下界合金护腿", english: "alloy_legging" },
        type: 3,
        maxstack: 1,
        equipmentType: "leggings",
        durability: 528,
    },
    30: {
        name: "alloy_boot",
        usename: { chinese: "下界合金靴子", english: "alloy_boot" },
        type: 3,
        maxstack: 1,
        equipmentType: "boots",
        durability: 528,
    },
    31: {
        name: "wooden_pickaxe",
        usename: { chinese: "木镐", english: "wooden_pickaxe" },
        type: 0,
        maxstack: 1,
    },
    32: {
        name: "golden_pickaxe",
        usename: { chinese: "铁镐", english: "golden_pickaxe" },
        type: 0,
        maxstack: 1,
    },
    33: {
        name: "iron_pickaxe",
        usename: { chinese: "金镐", english: "iron_pickaxe" },
        type: 0,
        maxstack: 1,
    },
    34: {
        name: "diamond_pickaxe",
        usename: { chinese: "钻石镐", english: "diamond_pickaxe" },
        type: 0,
        maxstack: 1,
    },
    35: {
        name: "wooden_axe",
        usename: { chinese: "木斧", english: "wooden_axe" },
        type: 0,
        maxstack: 1,
    },
    36: {
        name: "stone_axe",
        usename: { chinese: "石斧", english: "stone_axe" },
        type: 0,
        maxstack: 1,
    },
    37: {
        name: "iron_axe",
        usename: { chinese: "铁斧", english: "iron_axe" },
        type: 0,
        maxstack: 1,
    },
    38: {
        name: "diamond_axe",
        usename: { chinese: "钻石斧", english: "diamond_axe" },
        type: 0,
        maxstack: 1,
    },
    39: {
        name: "tyys",
        usename: { chinese: "跳跃药水", english: "" },
        type: 0,
        maxstack: 1,
    },
    40: {
        name: "sdys",
        usename: { chinese: "迅捷药水", english: "" },
        type: 0,
        maxstack: 1,
    },
    41: {
        name: "llys",
        usename: { chinese: "力量药水", english: "" },
        type: 0,
        maxstack: 1,
    },
    42: {
        name: "dld",
        usename: { chinese: "搭路蛋", english: "" },
        type: 0,
        maxstack: 114514,
    },
    43: {
        name: "jpg",
        usename: { chinese: "金苹果", english: "" },
        type: 0,
        maxstack: 64,
    },
    44: {
        name: "hyd",
        usename: { chinese: "火焰弹", english: "" },
        type: 0,
        maxstack: 256,
    },
    45: {
        name: "hvjz",
        usename: { chinese: "回城卷轴", english: "" },
        type: 0,
        maxstack: 64,
    },
    46: {
        name: "jypt",
        usename: { chinese: "救援平台", english: "" },
        type: 0,
        maxstack: 64,
    },
    47: {
        name: "myzz",
        usename: { chinese: "末影珍珠", english: "" },
        type: 0,
        maxstack: 16,
    },
    48: {
        name: "dyg",
        usename: { chinese: "钓鱼竿", english: "" },
        type: 0,
        maxstack: 1,
    },
    49: {
        name: "ysys",
        usename: { chinese: "隐身药水", english: "" },
        type: 0,
        maxstack: 1,
    },
    50: {
        name: "dyg",
        usename: { chinese: "剪刀", english: "" },
        type: 0,
        maxstack: 1,
    },
    51: {
        name: "st",
        usename: { chinese: "水桶", english: "" },
        type: 0,
        maxstack: 1,
    },
    52: {
        name: "xq",
        usename: { chinese: "雪球", english: "" },
        type: 0,
        maxstack: 16,
    },
    53: {
        name: "js",
        usename: { chinese: "箭矢", english: "" },
        type: 0,
        maxstack: 64,
    },
    54: {
        name: "g",
        usename: { chinese: "弓", english: "" },
        type: 0,
        maxstack: 1,
    },
    55: {
        name: "ll1g",
        usename: { chinese: "力量I弓", english: "" },
        type: 0,
        maxstack: 1,
    },
    56: {
        name: "ll2cj1g",
        usename: { chinese: "力量II冲击I弓", english: "" },
        type: 0,
        maxstack: 1,
    },
    57: {
        name: "ll3cj2g",
        usename: { chinese: "力量III冲击II弓", english: "" },
        type: 0,
        maxstack: 1,
    },
    58: {
        name: "kt",
        usename: { chinese: "桶", english: "" },
        type: 0,
        maxstack: 1,
    },
    59: {
        name: "nn",
        usename: { chinese: "牛奶", english: "" },
        type: 0,
        maxstack: 1,
    },
    60: {
        name: "fyt",
        usename: { chinese: "防御塔", english: "" },
        type: 0,
        maxstack: 64,
    },
    61: {
        name: "znz",
        usename: { chinese: "指南针", english: "" },
        type: 0,
        maxstack: 1,
    },
    62: {
        name: "tkl",
        usename: { chinese: "铁傀儡刷怪蛋", english: "" },
        type: 0,
        maxstack: 64,
    },
    63: {
        name: "tz",
        usename: { chinese: "梯子", english: "" },
        type: 0,
        maxstack: 1,
    },
    64: {
        name: "tkl",
        usename: { chinese: "生命恢复药水", english: "" },
        type: 0,
        maxstack: 1,
    },
};
globalThis.block = {
    "0": {
        type: 0, /* 方块类型 对应上文的voxel_type数组 */
        id: (0), /* 方块id 详情参见 MinecraftWiki-基岩版数据值 */
        dec: (0), /* 方块dec 详情参见 MinecraftWiki-基岩版数据值 */
        name: "none", /* 方块名称 */
        gravity: false, /* 方块是否受重力影响 */
        namespace: "minecraft", /* 方块命名空间[默认miecraft::] */
        tips: [], /* 方块标签 参见 <let:tips> 详情参见MinecraftWiki-基岩版数据值 */
        hex: `0`, /* 方块hex 详情参见 MinecraftWiki-基岩版数据值 */
        box: { x: 0, y: 0, z: 0 }, /* 方块碰撞箱[默认{x: 1, y: 1, z: 1}] */
        redstone: { conduction: 0, }, /* 方块红石参数[conduction:红石传导性<0~9>] */
        usename: { chinese: "none", english: "none" }, /* 方块展示名称 */
        boxid: 0, /* 若方块 <type> 为 <let:voxel_type>{0, 1, 2, (5),} 则方块所对应的BOX3Voxel的voxelId */
        space: { x: 1, y: 1, z: 1 }, /* 方块在 <global:map> 中所占的体积 [其中{x, y, z}皆为正整数值] */
        model: "mesh/None.vb", /* 若方块 <type> 为 <let:voxel_type>{0, 3, 4, (5),} 则方块所对应的模型路径 */
    },
    "5": {
        type: 2,
        id: (5),
        dec: (5),
        name: "oak_planks",
        gravity: false,
        namespace: "minecraft",
        tips: [],
        hex: `5`,
        box: { x: 1, y: 1, z: 1 },
        redstone: { conduction: 0, },
        usename: { chinese: "橡木木板", english: "oak_planks" },
        boxid: 143,
        space: { x: 1, y: 1, z: 1 },
        dropped: {
            id: 17,
        },
    },
    "8": {
        type: 1,
        id: (8),
        dec: (8),
        name: "flowing_water",
        gravity: true,
        namespace: "minecraft",
        tips: ["S", "red"],
        hex: `8`,
        box: { x: 0, y: 0, z: 0 },
        redstone: { conduction: 0, },
        usename: { chinese: "水", english: "flowing_water" },
        boxid: 364,
        space: { x: 1, y: 1, z: 1 },
    },
    "13": {
        type: 5,
        id: (13),
        dec: (13),
        name: "gravel",
        gravity: true,
        namespace: "minecraft",
        tips: [],
        hex: `D`,
        box: { x: 1, y: 1, z: 1 },
        redstone: { conduction: 0, },
        usename: { chinese: "砂石", english: "gravel" },
        boxid: 135,
        space: { x: 1, y: 1, z: 1 },
        model: "mesh/sand.vb",
        dropped: {
            mesh: "mesh/VOXEL_sand.vb",
        },
    },
    "20": {
        type: 2,
        id: (20),
        dec: (20),
        name: "glass",
        gravity: false,
        namespace: "minecraft",
        tips: [],
        hex: `14`,
        box: { x: 1, y: 1, z: 1 },
        redstone: { conduction: 0, },
        usename: { chinese: "玻璃", english: "glass" },
        boxid: 170,
        space: { x: 1, y: 1, z: 1 },
        hardness: {
            usual: 0.3,
        },
    },
    "35": {
        type: 2,
        id: (35),
        dec: (35),
        name: "white_wool",
        gravity: false,
        namespace: "minecraft",
        tips: [],
        hex: `23`,
        box: { x: 1, y: 1, z: 1 },
        redstone: { conduction: 0, },
        usename: { chinese: "羊毛", english: "white_wool" },
        boxid: 177,
        space: { x: 1, y: 1, z: 1 },
    },
    "46": {
        type: 3,
        id: (46),
        dec: (46),
        name: "tnt",
        gravity: false,
        namespace: "minecraft",
        tips: ["S"],
        hex: `2E`,
        box: { x: 1, y: 1, z: 1 },
        redstone: { conduction: 0, },
        usename: { chinese: "TNT", english: "tnt" },
        space: { x: 1, y: 1, z: 1 },
    },
    "49": {
        type: 2,
        id: (49),
        dec: (49),
        name: "obsidian",
        gravity: false,
        namespace: "minecraft",
        tips: [],
        hex: `31`,
        box: { x: 1, y: 1, z: 1 },
        redstone: { conduction: 0, },
        usename: { chinese: "黑曜石", english: "obsidian" },
        boxid: 175,
        space: { x: 1, y: 1, z: 1 },
    },
    "54": {
        type: 4,
        id: (54),
        dec: (54),
        name: "chest",
        gravity: false,
        namespace: "minecraft",
        tips: ["S", "E"],
        hex: `36`,
        box: { x: 0.8, y: 0.8, z: 0.8 },
        redstone: { conduction: 0, },
        usename: { chinese: "箱子", english: "chest" },
        space: { x: 1, y: 1, z: 1 },
    },
    "57": {
        type: 2,
        id: (57),
        dec: (57),
        name: "diamond_block",
        gravity: false,
        namespace: "minecraft",
        tips: [],
        hex: `39`,
        box: { x: 1, y: 1, z: 1 },
        redstone: { conduction: 0, },
        usename: { chinese: "钻石块", english: "diamond_block" },
        boxid: 289,
        space: { x: 1, y: 1, z: 1 },
    },
    "65": {
        type: 3,
        id: (65),
        dec: (65),
        name: "ladder",
        gravity: false,
        namespace: "minecraft",
        tips: ["S"],
        hex: `41`,
        box: { x: 0, y: 0, z: 0 },
        redstone: { conduction: 0, },
        usename: { chinese: "梯子", english: "ladder" },
        space: { x: 1, y: 1, z: 1 },
        model: "mesh/VOXEL_ladder.vb",
        dropped: {
            mesh: "mesh/VOXEL_ladder.vb",
            id: 14,
        },
        hardness: {
            usual: 0.4,
        },
    },
    "165": {
        type: 2,
        id: (165),
        dec: (165),
        name: "slime",
        gravity: false,
        namespace: "minecraft",
        tips: [],
        hex: `A5`,
        box: { x: 1, y: 1, z: 1 },
        redstone: { conduction: 0, },
        usename: { chinese: "粘液块", english: "slime" },
        boxid: 707,
        space: { x: 1, y: 1, z: 1 },
    },
    "-161": {
        type: 2,
        id: (-161),
        dec: (-161),
        name: "barrier",
        gravity: false,
        namespace: "minecraft",
        tips: ["red"],
        hex: `FFFFFFFFFFFFFF5F`,
        box: { x: 1, y: 1, z: 1 },
        redstone: { conduction: 0, },
        usename: { chinese: "屏障", english: "barrier" },
        boxid: 650,
        space: { x: 1, y: 1, z: 1 },
    },
    "-183": {
        type: 2,
        id: (-183),
        dec: (-183),
        name: "smooth_stone",
        gravity: false,
        namespace: "minecraft",
        tips: [],
        hex: `FFFFFFFFFFFFFF49`,
        box: { x: 1, y: 1, z: 1 },
        redstone: { conduction: 0, },
        usename: { chinese: "屏障", english: "smooth_stone" },
        boxid: 273,
        space: { x: 1, y: 1, z: 1 },
    },
    "-158": {
        type: 0,
        id: (-158),
        dec: (-158),
        name: "air",
        gravity: false,
        namespace: "minecraft",
        tips: ["light_blue"],
        hex: `FFFFFFFFFFFFFF0`,
        box: { x: 1, y: 1, z: 1 },
        redstone: { conduction: 0, },
        usename: { chinese: "空气", english: "air" },
        space: { x: 1, y: 1, z: 1 },
    },
    "121": {
        type: 2,
        id: (-183),
        dec: (-183),
        name: "end_bricks",
        gravity: false,
        namespace: "minecraft",
        tips: [],
        hex: `1`,
        box: { x: 1, y: 1, z: 1 },
        redstone: { conduction: 0, },
        usename: { chinese: "末地石", english: "end_bricks" },
        boxid: voxels.id('lemon'),
        space: { x: 1, y: 1, z: 1 },
    },
};
/*
字母和数字键的键码值

按键	键码		按键	键码		按键	键码		按键	键码
A	65		J	74		S	83		1	49
B	66		K	75		T	84		2	50
C	67		L	76		U	85		3	51
D	68		M	77		V	86		4	52
E	69		N	78		W	87		5	53
F	70		O	79		X	88		6	54
G	71		P	80		Y	89		7	55
H	72		Q	81		Z	90		8	56
I	73		R	82		0	48		9	57
数字键盘上的键的键码值 | 功能键键码值

按键	键码		按键	键码		按键	键码		按键	键码
0	96		8	104		F1	112		F7	118
1	97		9	105		F2	113		F8	119
2	98		*	106		F3	114		F9	120
3	99		+	107		F4	115		F10	121
4	100		Enter	108		F5	116		F11	122
5	101		-	109		F6	117		F12	123
6	102		.	110						
7	103		/	111						
控制键键码值

按键	键码		按键	键码		按键	键码		按键	键码
BackSpace	8		Esc	27		Right Arrow	39		-_	189
Tab	9		Spacebar	32		Dw Arrow	40		.>	190
Clear	12		Page Up	33		Insert	45		/?	191
Enter	13		Page Down	34		Delete	46		`~	192
Shift	16		End	35		Num Lock	144		[{	219
Control	17		Home	36		;:	186		\|	220
Alt	18		Left Arrow	37		=+	187		]}	221
Caps Lock	20		Up Arrow	38		,<	188		'"	222
*/
globalThis.keys={
    'A':65,
    'B':66,
    'C':67,
    'D':68,
    'E':69,
    'F':70,
    'G':71,
    'H':72,
    'I':73,
    'J':74,
    'K':75,
    'L':76,
    'M':77,
    'N':78,
    'O':79,
    'P':80,
    'Q':81,
    'R':82,
    'S':83,
    'T':84,
    'U':85,
    'V':86,
    'W':87,
    'X':88,
    'Y':89,
    'Z':90,
    '0':48,
    '1':49,
    '2':50,
    '3':51,
    '4':52,
    '5':53,
    '6':54,
    '7':55,
    '8':56,
    '9':57,
    'Tab':9,
};

globalThis.words={
    65:'A',
    66:'B',
    67:'C',
    68:'D',
    69:'E',
    70:'F',
    71:'G',
    72:'H',
    73:'I',
    74:'J',
    75:'K',
    76:'L',
    77:'M',
    78:'N',
    79:'O',
    80:'P',
    81:'Q',
    82:'R',
    83:'S',
    84:'T',
    85:'U',
    86:'V',
    87:'W',
    88:'X',
    89:'Y',
    90:'Z',
    48:'0',
    49:'1',
    50:'2',
    51:'3',
    52:'4',
    53:'5',
    54:'6',
    55:'7',
    56:'8',
    57:'9',
    9:'Tab',
};

globalThis.title=[
    {name:'假·萌新',spe:0,lv:0,sc:5},
    {name:'这是个称号',spe:0,lv:0,sc:5},
    {name:'一个小萌新',spe:0,lv:0,sc:5},
    {name:'V+',spe:0,lv:0,sc:5}, 
    {name:'',spe:1,lv:1,sc:15},
    {name:'牢玩家',spe:0,lv:1,sc:10},
    {name:'VIP',spe:0,lv:1,sc:10},
    {name:'VIP+',spe:0,lv:1,sc:15}, 
    {name:'起床高手',spe:0,lv:2,sc:20},
    {name:'Elite',spe:0,lv:2,sc:20},
    {name:'起床高手',spe:1,lv:2,sc:25},
    {name:'VIP++',spe:0,lv:2,sc:20},
    {name:'CVIP',spe:0,lv:2,sc:25}, 
    {name:'假·大神之神',spe:0,lv:3,sc:30},
    {name:'大神',spe:0,lv:3,sc:28},
    {name:'大蛇',spe:0,lv:3,sc:26},
    {name:'Expert',spe:0,lv:3,sc:28},
    {name:'起床小蛇',spe:1,lv:3,sc:30}, 
    {name:'CVIP+',spe:0,lv:3,sc:28},
    {name:'CVIP++',spe:0,lv:3,sc:32},
    {name:'SVIP',spe:0,lv:3,sc:35},
    {name:'起床大蛇',spe:0,lv:4,sc:36},
    {name:'超级大蛇',spe:0,lv:4,sc:36},
    {name:'RichMaster',spe:0,lv:4,sc:36},
    {name:'大神之神',spe:0,lv:4,sc:40},
    {name:'SVIP+',spe:0,lv:4,sc:38},
    {name:'SVIP',spe:1,lv:4,sc:40},
    {name:'SVIP++',spe:0,lv:0,sc:42},
    {name:'起床大蛇',spe:1,lv:5,sc:41},
    {name:'超级大蛇',spe:1,lv:5,sc:41}, 
    {name:'RichMaster',spe:1,lv:5,sc:41},
    {name:'大神之神',spe:1,lv:5,sc:43},
    {name:'SVIP++',spe:1,lv:5,sc:47},
    {name:'无敌战神',spe:0,lv:5,sc:50},
    {name:'无敌战神+',spe:0,lv:5,sc:52}, 
    {name:'无敌战神++',spe:0,lv:5,sc:55},
    {name:'起床概念神',spe:0,lv:5,sc:52},
    {name:'无敌技术大师',spe:0,lv:5,sc:48},
    {name:'RichMaster+',spe:0,lv:5,sc:42},
    {name:'RichMaster++',spe:0,lv:5,sc:45},
    {name:'大神之神之神神神神神',spe:0,lv:5,sc:55},
    {name:'起床大蛇+',spe:0,lv:5,sc:42}, 
    {name:'起床大蛇++',spe:0,lv:5,sc:45},
    {name:'自定义称号（需管理员审核）',spe:2,lv:5,sc:60},
    {name:'InvincibleMaster',spe:0,lv:5,sc:58},
    {name:'WD++',spe:0,lv:5,sc:42},//{name:'',spe:0,lv:0,sc:0},
];01110101