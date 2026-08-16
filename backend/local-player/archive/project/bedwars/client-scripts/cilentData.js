/**物品数据 */
const SHOP = [
    ['羊毛', 'wool', 4, 'iron', 16],
    ['沙石', 'sand', 12, 'iron', 16],
    ['末地石', 'enderStone', 24, 'iron', 12],
    ['梯子', 'ladder', 4, 'iron', 8],
    ['木板', 'plank', 4, 'gold', 16],
    ['玻璃', 'glass', 12, 'iron', 4],
    ['黑曜石', 'obdisian', 4, 'emerald', 4],
    ['石剑', 'stoneSword', 10, 'iron', 1],
    ['铁剑', 'ironSword', 7, 'gold', 1],
    ['钻石剑', 'diamondSword', 3, 'emerald', 1],
    ['击退棒', 'knockbackStick', 5, 'gold', 1],
    ['锁链套', 'ChainmailBoots', 24, 'iron', 1],
    ['铁套', 'IronBoots', 12, 'gold', 1],
    ['钻石套', 'DiamondBoots', 6, 'emerald', 1],
    ['剪刀', 'scissors', 20, 'iron', 1],
    ['钻石镐', 'diamondPickaxe', 6, 'gold', 1],
    ['金镐', 'goldenPickaxe', 3, 'gold', 1],
    ['铁镐', 'ironPickaxe', 10, 'iron', 1],
    ['木镐', 'woodenPickaxe', 10, 'iron', 1],
    ['钻石斧', 'diamondAxe', 6, 'gold', 1],
    ['铁斧', 'ironAxe', 3, 'gold', 1],
    ['石斧', 'stoneAxe', 10, 'iron', 1],
    ['木斧', 'woodenAxe', 10, 'iron', 1],
    ['箭矢', 'arrow', 2, 'gold', 8],
    ['弓', 'bow', 12, 'gold', 1],
    ['弓[力量I]', 'bow1', 24, 'gold', 1],
    ['弓[力量I][冲击I]', 'bow2', 6, 'emerald', 1],
    ['隐身药水', 'invisiblePotion', 2, 'emerald', 1],
    ['迅捷药水', 'speedPotion', 1, 'emerald', 1],
    ['跳跃药水', 'jumpPotion', 1, 'emerald', 1],
    ['金苹果', 'goldenApple', 3, 'gold', 1],
    ['TNT', 'tnt', 8, 'gold', 1],
    ['火焰弹', 'fireBall', 40, 'iron', 1],
    ['末影珍珠', 'enderPearl', 4, 'emerald', 1],
    ['搭路蛋', 'egg', 1, 'emerald', 1],
    ['牛奶', 'milk', 4, 'gold', 1],
    ['救援平台', 'plate', 2, 'emerald', 1],
    ['水桶', 'waterBucket', 6, 'gold', 1]
];
/**颜色 */
const ColorList = {
    'Black': { r: 0, g: 0, b: 0 },
    'White': { r: 255, g: 255, b: 255 },
    'Grey': { r: 170, g: 170, b: 170 },
    'Yellow': { r: 255, g: 255, b: 85 },
    'Red': { r: 255, g: 85, b: 85 },
    'Green': { r: 85, g: 255, b: 85 },
    'Blue': { r: 0, g: 127, b: 255 },
    'Purple': { r: 175, g: 0, b: 255 },
    'SkyBlue': { r: 0, g: 255, b: 255 }
}

/**团队升级图标 */
const ShopTypes = ['wool', 'ironSword', 'IronBoots', 'IronPickaxe', 'bow', 'jumpPotion', 'chest']
const UpgradesGoods = ['furnace', 'GoldenPickaxe', 'ironSword', 'defencePlus', 'xinbiao', 'trap', 'redTorch', 'feather', 'IronPickaxe']//团队升级商品图片
const ArmorTypes = {
    '红色皮革靴子': ['LeatherPants', 'LeatherBoots'],
    '蓝色皮革靴子': ['LeatherPants', 'LeatherBoots'],
    '绿色皮革靴子': ['LeatherPants', 'LeatherBoots'],
    '黄色皮革靴子': ['LeatherPants', 'LeatherBoots'],
    '锁链靴子': ['ChainmailLeggings', 'ChainmailBoots'],
    '铁靴子': ['IronLeggings', 'IronBoots'],
    '钻石靴子': ['DiamondLeggings', 'DiamondBoots']
}
const PickaxeGoods = {
    '': 'picture/woodenPickaxe.png',
    'woodenPickaxe': 'picture/ironPickaxe.png',
    'ironPickaxe': 'picture/goldenPickaxe.png',
    'goldenPickaxe': 'picture/diamondPickaxe.png',
}
const AxeGoods = {
    '': 'picture/woodenAxe.png',
    'woodenAxe': 'picture/stoneAxe.png',
    'stoneAxe': 'picture/ironAxe.png',
    'ironAxe': 'picture/diamondAxe.png',
}
export { SHOP, ShopTypes, UpgradesGoods, ArmorTypes, PickaxeGoods, AxeGoods, ColorList }


