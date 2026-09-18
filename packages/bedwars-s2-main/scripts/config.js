globalThis.tick = 0;
globalThis.timer = 0;
globalThis.allplayers = [0, 0, 0, 0];
globalThis.materials = [
    [0, 1, 0], //红
    [0, 1, 0], //蓝
    [0, 1, 0], //绿
    [0, 1, 0] //黄
    //铁，金，绿
]
globalThis.emeraldPoints = [[new GameVector3(127, 40, 127), 0], [new GameVector3(127, 50, 127), 0]]
globalThis.diamondPoints = [[new GameVector3(70, 40, 70), 0], [new GameVector3(70, 40, 182), 0], [new GameVector3(182, 40, 182), 0], [new GameVector3(182, 40, 70), 0]]
globalThis.respawnable = [true, true, true, true]
globalThis.deadplayers = []
globalThis.teamupgrades = [//冶炼, 疯狂矿工，锋利，保护，治愈池
    [0, 0, 0, 0, 0],//红，蓝，绿，黄
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0]
]
globalThis.teamTraps = [[], [], [], []]
globalThis.teamchests = [
    [['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1]],
    [['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1]],
    [['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1]],
    [['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1]]
]
globalThis.emeraldTime = 65
globalThis.diamondTime = 30
globalThis.emeralds = []
globalThis.diamonds = []
globalThis.restartAble = true
globalThis.gameStartTime = null

const ASCII_form = [
    ['B', 'E', 'F', 'G', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'Q', 'R', 'U', 'V', 'Y', 'Z', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'Tab', 'Caps Lock', 'Enter', '/?'],
    [66, 69, 70, 71, 73, 74, 75, 76, 77, 78, 79, 81, 82, 85, 86, 89, 90, 49, 50, 51, 52, 53, 54, 55, 56, 57, 9, 20, 13, 191]
]
const Keys = ['快捷栏1', '快捷栏2', '快捷栏3', '快捷栏4', '快捷栏5', '快捷栏6', '快捷栏7', '快捷栏8', '快捷栏9', '道具栏', '丢弃物品', '切换视角', '聊天']
const Axe = ['woodenAxe', 'stoneAxe', 'ironAxe', 'diamondAxe']
const Pickaxe = ['woodenPickaxe', 'ironPickaxe', 'goldenPickaxe', 'diamondPickaxe']

const SHOP = {
    //EnglishName：ChineseName，Price，sourceType，number，maxStack，damage
    'wool': ['羊毛', 4, 'iron', 16, 64, 0],
    'sand': ['沙石', 12, 'iron', 16, 64, 0],
    'enderStone': ['末地石', 24, 'iron', 12, 64, 0],
    'ladder': ['梯子', 4, 'iron', 8, 64, 0],
    'plank': ['木板', 4, 'gold', 16, 64, 0],
    'glass': ['玻璃', 12, 'iron', 4, 64, 0],
    'obdisian': ['黑曜石', 4, 'emerald', 4, 64, 0],
    'stoneSword': ['石剑', 10, 'iron', 1, 1, 5],
    'ironSword': ['铁剑', 7, 'gold', 1, 1, 6],
    'diamondSword': ['钻石剑', 3, 'emerald', 1, 1, 7],
    'knockbackStick': ['击退棒', 5, 'gold', 1, 1, 0],
    'ChainmailBoots': ['锁链套', 24, 'iron', 1, 1, 0],
    'IronBoots': ['铁套', 12, 'gold', 1, 1, 0],
    'DiamondBoots': ['钻石套', 6, 'emerald', 1, 1, 0],
    'scissors': ['剪刀', 20, 'iron', 1, 1, 0],
    'diamondPickaxe': ['钻石镐', 6, 'gold', 1, 1, 5],
    'goldenPickaxe': ['金镐', 3, 'gold', 1, 1, 2],
    'ironPickaxe': ['铁镐', 10, 'iron', 1, 1, 4],
    'woodenPickaxe': ['木镐', 10, 'iron', 1, 1, 2],
    'diamondAxe': ['钻石斧', 6, 'gold', 1, 1, 6],
    'ironAxe': ['铁斧', 3, 'gold', 1, 1, 5],
    'stoneAxe': ['石斧', 10, 'iron', 1, 1, 4],
    'woodenAxe': ['木斧', 10, 'iron', 1, 1, 3],
    'arrow': ['箭矢', 2, 'gold', 8, 64, 0],
    'bow': ['弓', 12, 'gold', 1, 1, 0],
    'bow1': ['弓[力量I]', 24, 'gold', 1, 1, 0],
    'bow2': ['弓[力量I][冲击I]', 6, 'emerald', 1, 1, 0],
    'invisiblePotion': ['隐身药水', 2, 'emerald', 1, 1, 0],
    'speedPotion': ['迅捷药水', 1, 'emerald', 1, 1, 0],
    'jumpPotion': ['跳跃药水', 1, 'emerald', 1, 1, 0],
    'goldenApple': ['金苹果', 3, 'gold', 1, 64, 0],
    'tnt': ['TNT', 8, 'gold', 1, 64, 0],
    'fireBall': ['火焰弹', 40, 'iron', 1, 64, 0],
    'enderPearl': ['末影珍珠', 4, 'emerald', 1, 16, 0],
    'egg': ['搭路蛋', 1, 'emerald', 1, 64, 0],
    'milk': ['牛奶', 4, 'gold', 1, 1, 0],
    'plate': ['救援平台', 2, 'emerald', 1, 64, 0],
    'waterBucket': ['水桶', 6, 'gold', 1, 1, 0],
    'iron': ['铁锭', 0, '', 0, 64, 0],
    'gold': ['金锭', 0, '', 0, 64, 0],
    'emerald': ['绿宝石', 0, '', 0, 64, 0],
    'diamond': ['钻石', 0, '', 0, 64, 0],
    'woodenSword': ['木剑', 0, '', 0, 1, 4],
    'bucket': ['桶', 0, '', 0, 1, 0],
    'compass': ['指南针', 0, '', 0, 1, 0],
    '': ['空手', 0, '', 0, 1, 0]
}
const RunSpeed = 0.1796875
const WalkSpeed = 0.1376953125
const JumpPower = 0.53
const JumpPowerV = 1.03
const JumpPowerII = 0.73
const Friction = 0.05
const JumpSpeedFactor = 1.5791015625
const TrapBounds = [
    [
        [206, 40, 121],//红
        [229, 48, 133]
    ], [
        [121, 40, 206],//蓝
        [133, 48, 229]
    ], [
        [25, 40, 121],//绿
        [48, 48, 133]
    ], [
        [121, 40, 25],//黄
        [133, 48, 48]
    ],
]

const BanBlockZone = [//y轴：41-47
    [[219, 120], [228, 134]],//红
    [[120, 219], [134, 228]],//蓝
    [[26, 120], [35, 134]],//绿
    [[120, 26], [134, 35]]//黄
]

const BedPos = [
    [new GameVector3(212, 41, 127), new GameVector3(213, 41, 127)],
    [new GameVector3(127, 41, 212), new GameVector3(127, 41, 213)],
    [new GameVector3(41, 41, 127), new GameVector3(42, 41, 127)],
    [new GameVector3(127, 41, 41), new GameVector3(127, 41, 42)]
]
const ResourceZones = [
    world.addZone({
        selector: 'player',
        bounds: new GameBounds3(
            new GameVector3(226, 40, 126),
            new GameVector3(229, 41.5, 129)
        )
    }),
    world.addZone({
        selector: 'player',
        bounds: new GameBounds3(
            new GameVector3(126, 40, 226),
            new GameVector3(129, 41.5, 229)
        )
    }),
    world.addZone({
        selector: 'player',
        bounds: new GameBounds3(
            new GameVector3(26, 40, 126),
            new GameVector3(29, 41.5, 129)
        )
    }),
    world.addZone({
        selector: 'player',
        bounds: new GameBounds3(
            new GameVector3(126, 40, 26),
            new GameVector3(129, 41.5, 29)
        )
    })
]
const WearDatas = {
    'head': {
        scale: new GameVector3(2.5, 2, 2.5),
        bodyPart: GameBodyPart.HEAD,
        orientation: new GameQuaternion(0, 1, 0, 0).rotateY(Math.PI / 2 * 3),
        offset: new GameVector3(0, 0.6, 0)
    },
    'torso': {
        scale: new GameVector3(1.5, 1.2, 2.4),
        bodyPart: GameBodyPart.TORSO,
        orientation: new GameQuaternion(0, 1, 0, 0).rotateY(Math.PI),
        offset: new GameVector3(0, -0.1, 0)
    },
    'right_upper_arm': {
        scale: new GameVector3(1, 1, 1),
        bodyPart: GameBodyPart.RIGHT_UPPER_ARM,
        scale: new GameVector3(1.5, 1.5, 1.5),
        orientation: new GameQuaternion(0, 1, 0, 0).rotateY(Math.PI)
    },
    'left_upper_arm': {
        scale: new GameVector3(1, 1, 1),
        bodyPart: GameBodyPart.LEFT_UPPER_ARM,
        scale: new GameVector3(1.5, 1.5, 1.5)
    },
    'left_foot': {
        scale: new GameVector3(1.6, 1.6, 1.6),
        bodyPart: GameBodyPart.LEFT_FOOT,
        offset: new GameVector3(0, 0.2, 0)
    },
    'right_foot': {
        scale: new GameVector3(1.6, 1.6, 1.6),
        bodyPart: GameBodyPart.RIGHT_FOOT,
        offset: new GameVector3(0, 0.2, 0)
    },
    'sword': {
        bodyPart: GameBodyPart.RIGHT_HAND,
        orientation: new GameQuaternion(0, 1, 0, 0).rotateZ(-45),
        offset: new GameVector3(0, -0.2, 0.5)
    },
    'block': {
        bodyPart: GameBodyPart.RIGHT_HAND,
        scale: new GameVector3(0.25, 0.25, 0.25),
        offset: new GameVector3(0, -0.2, 0.3)
    },
    'item': {
        bodyPart: GameBodyPart.RIGHT_HAND,
        orientation: new GameQuaternion(0, 1, 0, 0).rotateZ(-45),
        offset: new GameVector3(0, -0.2, 0.3),
        scale: new GameVector3(0.5, 0.5, 0.5)
    },
    'bow': {
        bodyPart: GameBodyPart.RIGHT_HAND,
        orientation: new GameQuaternion(0, 1, 0, 0).rotateZ(-45),
        offset: new GameVector3(0, -0.2, 0),
        color: new GameRGBColor(0.9, 0.4, 1.5)
    },
    'arrow': {
        bodyPart: GameBodyPart.RIGHT_HAND,
        orientation: new GameQuaternion(0, 1, 0, 0),
        offset: new GameVector3(0, -0.2, 0.3),
        scale: new GameVector3(0.5, 0.5, 0.5)
    },
    'cloak': {
        bodyPart: GameBodyPart.TORSO,
        orientation: new GameQuaternion(0, 1, 0, 0).rotateZ(-Math.PI / 12),
        offset: new GameVector3(0, -0.2, -0.5),
        scale: new GameVector3(0.6, 0.5, 0.6)
    },
    'candyCane': {
        bodyPart: GameBodyPart.TORSO,
        orientation: new GameQuaternion(0, 1, 0, 0),
        offset: new GameVector3(0, -0.2, -0.5),
        scale: new GameVector3(0.6, 0.6, 0.6)
    },
    'trident': {
        bodyPart: GameBodyPart.TORSO,
        orientation: new GameQuaternion(0, 1, 0, 0),
        offset: new GameVector3(0, -0.1, -0.4),
        scale: new GameVector3(1, 1, 1)
    },
    'wreath': {
        bodyPart: GameBodyPart.TORSO,
        orientation: new GameQuaternion(0, 1, 0, 0).rotateY(Math.PI / 4),
        offset: new GameVector3(0.3, -0.3, -0.3),
        scale: new GameVector3(0.2, 0.2, 0.2)
    },
    'leftHand': {
        bodyPart: GameBodyPart.LEFT_HAND,
        orientation: new GameQuaternion(0, 1, 0, 0).rotateZ(-45),
        offset: new GameVector3(0, -0.2, 0.5)
    },
    'shortSword': {
        bodyPart: GameBodyPart.TORSO,
        orientation: new GameQuaternion(0, 1, 0, 0),
        offset: new GameVector3(0.5, -0.3, 0),
        scale: new GameVector3(0.4, 0.4, 0.4)
    },
    'wing': {
        bodyPart: GameBodyPart.TORSO,
        orientation: new GameQuaternion(0, 1, 0, 0),
        offset: new GameVector3(0, -0.1, -0.5),
        scale: new GameVector3(0.3, 0.3, 0.3)
    },
    'headwear': {
        bodyPart: GameBodyPart.HEAD,
        orientation: new GameQuaternion(0, 1, 0, 0).rotateZ(Math.PI).rotateX(Math.PI),
        offset: new GameVector3(0, 1.25, 0),
        scale: new GameVector3(2, 2, 2)
    },
}
const BlockDatas = {
    177: {
        'scissors': 0.6,
        'others': 1.2,
        'fall': ['all']
    },
    135: {
        'woodenPickaxe': 0.3,
        'ironPickaxe': 0.15,
        'goldenPickaxe': 0.1,
        'diamondPickaxe': 0.15,
        'others': 4,
        'fall': Pickaxe
    },
    389: {
        'woodenPickaxe': 1.15,
        'ironPickaxe': 0.6,
        'goldenPickaxe': 0.35,
        'diamondPickaxe': 0.45,
        'others': 15,
        'fall': Pickaxe
    },
    141: {
        'woodenAxe': 0.75,
        'stoneAxe': 0.5,
        'ironAxe': 0.4,
        'diamondAxe': 0.3,
        'others': 3,
        'fall': ['all']
    },
    170: {
        'others': 0.45,
        'fall': []
    },
    175: {
        'woodenPickaxe': 62.5,
        'ironPickaxe': 31.25,
        'goldenPickaxe': 17.9,
        'diamondPickaxe': 7.5,
        'others': 250,
        'fall': ['diamondPickaxe']
    },
    426: {
        'woodenAxe': 0.3,
        'stoneAxe': 0.15,
        'ironAxe': 0.1,
        'diamondAxe': 0.1,
        'others': 0.6,
        'fall': ['all']
    }
}

const ClothesList = {
    'Migrator迁移者披风': {
        part: 'cloak',
        intro: '第一届达科斯杯奖励',
        type: 'back'
    },
    '冠军达科斯披风': {
        part: 'cloak',
        intro: '第一届达科斯杯奖励',
        type: 'back'
    },
    '轻雪披风': {
        part: 'cloak',
        intro: 'S1赛季积分前三名奖励',
        type: 'back'
    },
    '圣诞糖果棍': {
        part: 'candyCane',
        intro: 'S1赛季积分前十名奖励',
        type: 'back'
    },
    '圣诞花环': {
        part: 'wreath',
        intro: 'S1赛季积分前五十名奖励',
        type: 'waist'
    },
    '世界崩解之镐': {
        part: 'leftHand',
        intro: 'S1赛季拆床榜前五名奖励',
        type: 'leftHand'
    },
    '短剑': {
        part: 'shortSword',
        intro: 'S1赛季击杀榜、最终击杀榜前五名奖励',
        type: 'waist'
    },
    '末影龙翅膀': {
        part: 'wing',
        intro: 'S1赛季胜利榜前五名奖励',
        type: 'back'
    },
    '胡萝卜鱼竿': {
        part: 'leftHand',
        intro: '鹦鹉螺壳购买获得',
        type: 'leftHand'
    },
    '三叉戟': {
        part: 'trident',
        intro: '鹦鹉螺壳购买获得',
        type: 'back'
    },
    '小河豚': {
        part: 'headwear',
        intro: '鹦鹉螺壳购买获得',
        type: 'headwear'
    },
}

const authors = ['12782290', '2910', '13220606', '8585307', '12762268', '13020322']
const admin = ['7603353', '1858337', '10818325', '13006257']
const HELP = `在游戏内通过按下 数字键1-9 来切换主手，按E打开背包
聊天区教程：发送 /hub 返回大厅
发送 /fovy+视野数值 调整视野，示例：发送 /fovy70 可将视野调整为70
发送 /settings 打开设置面板
物品栏教程：（UI如不能正常运行请尝试重进）
点击物品选中，再点击另外一个物品可将选中物品与此物品交换位置
选中物品并按下 Q键 丢弃一个，按下 ctrl键+Q键 丢弃单格全部物品
按住shift并点击物品来将其快捷移动（打开背包时时令选中物品快捷移动到物品栏/快捷栏，打开箱子时则令选中物品放入/取出箱子）
选中物品并按下 数字键1-9 可将选中物品移动到快捷栏对应位置
组队教程：（人数小于15人时此功能不生效）
在 /settings 的 队伍 选项中可以查看自己的队伍id及队伍情况
在 /settings 的 查看 选项中可以查看其他人的队伍id
输入 /invite+空格+玩家名 可以向其他玩家发送邀请，受邀者会有左下角聊天区的提示
被邀请后，输入 /accept+空格+对方的队伍id 可以接受邀请并加入对方队伍
加入对方队伍后，身为队员可以输入 /quit 退出队伍
身为队长可以输入 /kick+空格+玩家名 来将指定玩家踢出队伍，也可以输入 /kickall 踢出所有队员
队员退出游戏时自动退出所在队伍，队长退出游戏时自动解散自己的队伍
再次说明，本功能可以在 (!!!)人数不小于15人时(!!!) 将同一队伍的玩家分到一个队`

const TitleColor = {
    '[跑酷大神]': ['Green', 18],
    '[达科斯杯冠军]': ['Red', 26],
    '[管理员]': ['Blue', 14],
    '[Master]': ['Yellow', 14],
    '[BWS1#1st]': ['Yellow', 20],
    '[BWS1#2nd]': ['Yellow', 20],
    '[BWS1#3rd]': ['Yellow', 20],
    '[BWS1#TOP10]': ['Purple', 27],
    '[>>起床#梦境守卫<<]': ['Purple', 37],
    '[>>起床#斩刀击浪<<]': ['Purple', 37],
    '[>>起床#守墓人<<]': ['Purple', 33],
    '[>>起床#梦境歼灭者<<]': ['Purple', 41],
    '[海之眷顾]': ['Blue', 18],
    '[海豚的恩惠]': ['SkyBlue', 22],
}

module.exports = {
    ASCII_form,
    Keys,
    Axe,
    Pickaxe,
    SHOP,
    RunSpeed,
    WalkSpeed,
    JumpPower,
    JumpPowerII,
    JumpPowerV,
    Friction,
    JumpSpeedFactor,
    ResourceZones,
    BlockDatas,
    WearDatas,
    TrapBounds,
    BedPos,
    BanBlockZone,
    ClothesList,
    authors,
    admin,
    HELP,
    TitleColor
}



