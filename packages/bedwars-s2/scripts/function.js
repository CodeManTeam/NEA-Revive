const {
    ClothesList,
    WearDatas,
    ITEM,
    TitleColor,
    authors
} = require("./config.js");
const {
    QualityNames,
    getRandomFish
} = require("./fishingConfig.js");
require("./GroupStorage.js");

/**随机数 */
function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**加入游戏 */
GamePlayer.prototype.joinGame = function () {
    this.link('https://dao3.fun/play/24576b13504b5ee91fb1', { isNewTab: false, isConfirm: false })
}

/**排行榜 */
GamePlayer.prototype.viewRkl = function (type) {
    const rkls = {
        'S2赛季积分排行榜': 'scoreS2',
        'S1赛季积分排行榜': 'score',
        '胜场排行榜': 'wins',
        '击杀排行榜': 'kills',
        '摧毁床排行榜': 'beds',
        '最终击杀排行榜': 'finalKills',
    }
    this.dialog({
        type: 'select',
        title: type,
        content: `你的${type.slice(0, -3)}：${this[rkls[type]]}\n${type}前100名：`,
        options: rankingLists[rkls[type]]
    })
}

/**CPS测试 */
GameEntity.prototype.startCpsTest = function () {
    if (this.player.cpsTest && this.player.cpsTest.isTesting) {
        this.player.directMessage('CPS测试正在进行中！');
        return;
    }

    Object.assign(this.player.cpsTest, {
        isTesting: true,
        startTime: Date.now(),
        clicks: 0,
        countdownInterval: null,
        testTimeout: null
    })

    this.player.directMessage(`测试开始，⏱️ 倒计时：${this.player.cpsTest.testTime}秒`);

    let remaining = this.player.cpsTest.testTime;
    this.player.cpsTest.countdownInterval = setInterval(() => {
        if (this.destroyed) {
            clearInterval(this.player.cpsTest.countdownInterval);
            return;
        }

        remaining--;
        if (remaining > 0) {
            if (remaining <= 3) {
                this.player.directMessage(`⏱️ 剩余时间：${remaining}秒！`);
            } else if (remaining % 2 === 0) {
                this.player.directMessage(`⏱️ 剩余时间：${remaining}秒`);
            }
        }
    }, 1000);

    this.player.cpsTest.testTimeout = setTimeout(() => {
        this.endCpsTest();
    }, this.player.cpsTest.testTime * 1000);
}

GameEntity.prototype.endCpsTest = function () {
    if (!this.player.cpsTest || !this.player.cpsTest.isTesting) {
        return;
    }

    if (this.player.cpsTest.countdownInterval) {
        clearInterval(this.player.cpsTest.countdownInterval);
    }
    if (this.player.cpsTest.testTimeout) {
        clearTimeout(this.player.cpsTest.testTimeout);
    }

    const { clicks, startTime } = this.player.cpsTest;
    const duration = (Date.now() - startTime) / 1000;
    const cps = (clicks / duration).toFixed(2);

    let resultMessage = `�� CPS测试结束！\n`;
    resultMessage += `�� 点击次数：${clicks}\n`;
    resultMessage += `⏱️ 测试时长：${this.player.cpsTest.testTime}秒\n`;
    resultMessage += `⚡ 最终CPS：${cps}\n`;
    resultMessage += `�� 评级：${getCPSTestRating(cps)}`;

    this.player.dialog({
        type: 'select',
        title: '测试结果',
        content: `${resultMessage}`,
        options: ['确定']
    })

    this.player.cpsTest = null;
}

function getCPSTestRating(cps) {
    const cpsNum = parseFloat(cps);
    if (cpsNum >= 16) return '吊！太强了！';
    if (cpsNum >= 13) return '啥？这么快';
    if (cpsNum >= 10) return '嘶，还不错';
    if (cpsNum >= 7) return '哎，一般般';
    if (cpsNum >= 4) return '嗯，睡着了？';
    return '哟，您贵庚？';
}

/**排行榜刷新 */
async function updateRkl() {
    for (const type in rankingLists) {
        rankingLists[type] = await leaderBoard_group(type)
    }
}

/**装扮 */
GameEntity.prototype.dressUp = function () {
    const dresses = this.player.clothes.slice(0, this.player.clothes.indexOf('无'));
    for (const dress of dresses) {
        this.wear(dress, ClothesList[dress].part);
    };
};

/**穿戴 */
GameEntity.prototype.wear = function (meshname, part, enchantment = false) {
    const config = Object.assign(
        {},
        WearDatas[part],
        { mesh: `mesh/${meshname}.vb` },
        enchantment ?
            { color: new GameRGBColor(0.9, 0.4, 1.5), metalness: 1 } :
            { color: new GameRGBColor(1, 1, 1), metalness: 0 }
    );

    this.player.addWearable(config);
};

GameEntity.prototype.addRightHandWear = function () {
    this.player.wearables(GameBodyPart.RIGHT_HAND).forEach((item) => {
        item.remove();
    });
    const tool = this.player.quickInventory[this.player.rightHandPos][0];
    const item = ITEM[tool];
    if (!item) return;
    if (tool.includes('fishingRod')) {
        this.wear(item[0], 'sword');
    } else if (['clock'].includes(tool)) {
        this.wear(item[0], 'item')
    }
};

/**更新玩家快捷栏UI*/
GameEntity.prototype.setQuickInvUI = function (index = 0, all = true) {
    if (all) {
        remoteChannel.sendClientEvent(this, { type: 'setAllQI', args: { playerInventory: this.player.quickInventory } });
    } else {
        remoteChannel.sendClientEvent(this, { type: 'setSingleQI', args: { index: index, image: this.player.quickInventory[index][0], number: this.player.quickInventory[index][1] } });
    }
}

/**广播 */
function sendMsg(content, titleLength = 0, titleColor = ['White', 0]) {
    remoteChannel.broadcastClientEvent({ type: 'message', args: { content: content, titleLength: titleLength, titleColor: titleColor } });
}
GameEntity.prototype.directMsg = function (content, titleLength = 0, titleColor = ['White', 0]) {
    remoteChannel.sendClientEvent(this, { type: 'message', args: { content: content, titleLength: titleLength, titleColor: titleColor } });
}

async function searchData(id, type, change = false, target = '') {
    let data = await GroupStorage.get(id)
    if (change) {
        data.value[type] = target
        world.say(data.value[type])
        await GroupStorage.update(id, () => {  // 更新玩家数据存档
            return data.value;
        });
    } else {
        world.say(data.value[type])
    }
}

GameEntity.prototype.getFish = function (fish, amount = 1) {
    for (let i = 0; i < this.player.fishBag.length; i++) {
        const playerFish = this.player.fishBag[i];
        const index = playerFish.indexOf('*');
        if (playerFish.slice(0, index) == fish) {
            let fishNum = Number(playerFish.slice(index + 1)) + amount;
            if (fishNum > 0) {
                this.player.fishBag[i] = `${fish}*${fishNum.toString()}`;
            } else {
                this.player.fishBag.splice(i, 1);
            }
            return;
        }
    };
    if (amount > 0) this.player.fishBag.push(`${fish}*${amount}`);
}

GameEntity.prototype.reelInRod = function () {
    world.querySelectorAll('#hook').filter(h => h.shooter == this).forEach(async (e) => {
        e.destroy();
        if (e.reel) {
            const fish = getRandomFish();
            this.getFish(fish.name, 1);
            this.player.directMessage(`你获得了[${QualityNames[fish.quality]}]${fish.name}*1`);
            if (['EPIC', 'LEGENDARY', 'MYTHIC'].includes(fish.quality)) {
                sendMsg(`恭喜${this.player.name}钓上了[${QualityNames[fish.quality]}]${fish.name}！`);
            }
        }
    })
    this.player.quickInventory[this.player.rightHandPos][0] = 'fishingRod';
    this.setQuickInvUI(this.player.rightHandPos, false);
    this.addRightHandWear();
}

GameEntity.prototype.chat = async function (message) {
    //使用if语句检测玩家身份以及检查玩家目的是否为执行代码。
    if (authors.includes(this.player.userId) && message.indexOf("$") == 0) {
        world.say(eval(message.slice(1, message.length)));//使用eval函数执行代码，并使用world.say函数输出结果。
    } else {
        sendMsg(this.player.titleList[0].replace('玩家名', this.player.name) + '：' + message, this.player.titleList[0].length - 3, TitleColor[this.player.titleList[0].slice(0, -3)])
    }
}

module.exports = {
    sendMsg,
    updateRkl,
    randInt,
    searchData
};

