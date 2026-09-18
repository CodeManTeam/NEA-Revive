const RunSpeed = 0.1796875
const JumpPower = 0.53
const Friction = 0.05
const JumpSpeedFactor = 1.5791015625

const WearDatas = {
    'sword': {
        bodyPart: GameBodyPart.RIGHT_HAND,
        orientation: new GameQuaternion(0, 1, 0, 0).rotateZ(-45),
        offset: new GameVector3(0, -0.2, 0.5)
    },
    'item': {
        bodyPart: GameBodyPart.RIGHT_HAND,
        orientation: new GameQuaternion(0, 1, 0, 0).rotateZ(-45),
        offset: new GameVector3(0, -0.2, 0.3),
        scale: new GameVector3(0.5, 0.5, 0.5)
    },
    'cloak': {
        bodyPart: GameBodyPart.TORSO,
        orientation: new GameQuaternion(0, 1, 0, 0).rotateZ(-Math.PI / 12),
        offset: new GameVector3(0, -0.2, -0.4),
        scale: new GameVector3(0.6, 0.5, 0.6)
    },
    'candyCane': {
        bodyPart: GameBodyPart.TORSO,
        orientation: new GameQuaternion(0, 1, 0, 0),
        offset: new GameVector3(0, -0.2, -0.4),
        scale: new GameVector3(0.6, 0.6, 0.6)
    },
    'trident': {
        bodyPart: GameBodyPart.TORSO,
        orientation: new GameQuaternion(0, 1, 0, 0),
        offset: new GameVector3(0, -0.1, -0.3),
        scale: new GameVector3(1, 1, 1)
    },
    'wreath': {
        bodyPart: GameBodyPart.TORSO,
        orientation: new GameQuaternion(0, 1, 0, 0).rotateY(Math.PI / 4),
        offset: new GameVector3(0.3, -0.3, -0.2),
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
        offset: new GameVector3(0.4, -0.3, 0),
        scale: new GameVector3(0.4, 0.4, 0.4)
    },
    'wing': {
        bodyPart: GameBodyPart.TORSO,
        orientation: new GameQuaternion(0, 1, 0, 0),
        offset: new GameVector3(0, -0.1, -0.4),
        scale: new GameVector3(0.3, 0.3, 0.3)
    },
    'headwear': {
        bodyPart: GameBodyPart.HEAD,
        orientation: new GameQuaternion(0, 1, 0, 0).rotateZ(Math.PI).rotateX(Math.PI),
        offset: new GameVector3(0, 1.2, 0),
        scale: new GameVector3(2, 2, 2)
    },
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
};

const ITEM = {
    'fishingRod': ['钓鱼竿'],
    'fishingRodCasting': ['抛竿'],
    'clock': ['时钟'],
    '': ['空手']
};

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
    '[海豚的恩惠]': ['SkyBlue', 22]
}

const ShopList = {
    '装扮 小河豚': 17777,
    '装扮 三叉戟': 57777,
    '装扮 胡萝卜鱼竿': 107777,
    '称号 [海之眷顾]': 114514
}

const authors = ['12782290', '13020322', '2910', '8585307', '13220606', '7603353', '12764309']

global.second = 0;
global.find = n => world.querySelectorAll('player').find(e => e.player.name == n) ? world.querySelectorAll('player').find(e => e.player.name == n) : false
global.findById = n => world.querySelectorAll('player').find(e => e.player.userId == n) ? world.querySelectorAll('player').find(e => e.player.userId == n) : false

globalThis.rankingLists = {
    'scoreS2': [],
    'score': [],
    'wins': [],
    'kills': [],
    'finalKills': [],
    'beds': []
};

module.exports = {
    RunSpeed,
    JumpPower,
    Friction,
    JumpSpeedFactor,
    ClothesList,
    WearDatas,
    ITEM,
    TitleColor,
    ShopList,
    authors
};
