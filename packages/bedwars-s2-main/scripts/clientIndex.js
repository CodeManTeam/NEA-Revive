import { SHOP, ShopTypes, UpgradesGoods, ArmorTypes, PickaxeGoods, AxeGoods, ColorList } from './cilentData.js'

const uiScale = UiScale.create()
var load = false;

/**背包按钮 */
const bagButton = ui.findChildByName("bagButton");
var ableOpenBag = true
bagButton.events.on('pointerdown', () => {
    if (ableOpenBag) {
        remoteChannel.sendServerEvent({ type: 'bag' });
        ableOpenBag = false
        setTimeout(() => {
            ableOpenBag = true
        }, 500);
    }
})

/**切换视角按钮 */
const cameraButton = ui.findChildByName("cameraButton");
cameraButton.events.on('pointerdown', () => {
    remoteChannel.sendServerEvent({ type: 'cameraMode' });
})

/**设置按钮 */
const settingsButton = ui.findChildByName("settingsButton");
var ableSet = true
settingsButton.events.on('pointerdown', () => {
    if (ableSet) {
        remoteChannel.sendServerEvent({ type: 'openSet' });
        ableSet = false;
        setTimeout(() => {
            ableSet = true;
        }, 500);
    }
})

/**侧边栏 */
const sidebar = ui.findChildByName("sidebar");

/**日期 */
const date = sidebar.findChildByName("date");

/**侧边栏玩家所在队伍UI */
const you = sidebar.findChildByName("YOU");
var setYou = function (team, v) {
    you.visible = v
    if (v) you.position.offset.y = sidebar.findChildByName(["RED", "BLUE", "GREEN", "YELLOW"][team]).position.offset.y
}

/**侧边栏床是否被摧毁UI */
const respawnableUI = [sidebar.findChildByName("RED").findChildByName("redbed"), sidebar.findChildByName("BLUE").findChildByName("bluebed"), sidebar.findChildByName("GREEN").findChildByName("greenbed"), sidebar.findChildByName("YELLOW").findChildByName("yellowbed")]
var changeBed = function (index, beds, single = false) {
    if (single) {
        respawnableUI[index].textContent = beds[index] ? '✔' : '✘'
        respawnableUI[index].textColor.copy(beds[index] ? Vec3.create(ColorList['Green']) : Vec3.create(ColorList['Red']));
    } else {
        for (let i = 0; i < 4; i++) {
            respawnableUI[i].textContent = beds[i] ? '✔' : '✘'
            respawnableUI[i].textColor.copy(beds[i] ? Vec3.create(ColorList['Green']) : Vec3.create(ColorList['Red']));
        }
    }
}

/**侧边栏队伍人数UI */
const playersUI = [sidebar.findChildByName("RED").findChildByName("redNum"), sidebar.findChildByName("BLUE").findChildByName("blueNum"), sidebar.findChildByName("GREEN").findChildByName("greenNum"), sidebar.findChildByName("YELLOW").findChildByName("yellowNum")]
var changePlayers = function (index, allplayers, single = true) {
    if (single) {
        playersUI[index].textContent = allplayers[index].toString()
    } else {
        for (let i = 0; i < 4; i++) {
            playersUI[i].textContent = allplayers[i].toString()
        }
    }
}

/**侧边栏玩家本局游戏数据UI */
const playerDatas = [sidebar.findChildByName("KILL").findChildByName("kills"), sidebar.findChildByName("FINALKILL").findChildByName("finalkills"), sidebar.findChildByName("BED").findChildByName("breakBeds")]
var changeData = function (index, datas, single = true) {
    if (single) {
        playerDatas[index].textContent = datas[index].toString()
    } else {
        for (let i = 0; i < 3; i++) {
            playerDatas[i].textContent = datas[i].toString()
        }
    }
}

/**快捷栏选择框UI */
const choosecase = ui.findChildByName("choosecase");

/**快捷栏 */
const quickItem = ui.findChildByName('quickItem')
var quickItemList = []
var quickNumList = []

/**物品栏*/
const invItem = ui.findChildByName('invItem')
const invQuickItem = ui.findChildByName('invQuickItem')
const inventoryImage = ui.findChildByName('inventoryImage')
var inventoryList = []
var numberList = []

const shadow = ui.findChildByName('shadow')
/**丢弃 */
shadow.events.on('pointerdown', () => {
    remoteChannel.sendServerEvent({ type: 'shadowDiscard' });
});

/**物品栏选择框 */
const inventorycase = ui.findChildByName('inventorycase')

/**血条 */
const health_bar = ui.findChildByName('health_bar')
const extra_hp_bar = ui.findChildByName('extra_hp_bar')
var changeHp = function (hp) {
    health_bar.imageOpacity = hp > 20 ? 0 : 1
    extra_hp_bar.imageOpacity = hp > 20 ? 1 : 0
    if (hp > 20) {
        extra_hp_bar.image = 'picture/health_bar' + Math.ceil((Math.max(hp, 0)) + 1).toString() + '.png';
    } else {
        health_bar.image = 'picture/health_bar' + Math.ceil((Math.max(hp, 0)) + 1).toString() + '.png';
    }
}

/**商店 */
const shopImage = ui.findChildByName('shopImage')
const shopItem = ui.findChildByName('shopItem')
var shopList = []
var shopNumberList = []

/**箱 */
const chestItem = ui.findChildByName('chestItem')
const chestImage = ui.findChildByName('chestImage')//箱子
var chestList = []
var chestNumberList = []

/**玩家打开UI类型 */
var uiType = 'inventory'

/**玩家当前工具类型 */
var toolsType = ['', '', '']

/**玩家附魔 */
var upgrades = [0, 0, 0, 0, 0]//冶炼, 疯狂矿工，锋利，保护，治愈池

/**聊天栏 */
const scrollBox = ui.findChildByName('scrollBox');
const msgContent = scrollBox.findChildByName('msgContent');
const titleContent = scrollBox.findChildByName('titleContent');
var contentList = []
var titleList = []

/**消息列表 */
const MSGLength = 20;
var messages = []
var msgColors = []
var showMsgNum = 0;
var ableScroll = false;

/**是否显示聊天栏 */
var showMsg = true

/**指针事件行为 */
bagButton.pointerEventBehavior = PointerEventBehavior.BLOCK_PASS_THROUGH
settingsButton.pointerEventBehavior = PointerEventBehavior.BLOCK_PASS_THROUGH
cameraButton.pointerEventBehavior = PointerEventBehavior.BLOCK_PASS_THROUGH
inventoryImage.pointerEventBehavior = PointerEventBehavior.BLOCK_PASS_THROUGH
shopImage.pointerEventBehavior = PointerEventBehavior.BLOCK_PASS_THROUGH
chestImage.pointerEventBehavior = PointerEventBehavior.BLOCK_PASS_THROUGH
shadow.pointerEventBehavior = PointerEventBehavior.BLOCK_PASS_THROUGH

/**护甲 */
const armor = ui.findChildByName('armor')
var armorList = []
var setArmor = function (armorType, show) {
    for (let i = 0; i < 4; i++) {
        show && (armorList[i].image = `picture/${['LeatherCap', 'LeatherTunic'].concat(ArmorTypes[armorType])[i] += upgrades[3] > 0 ? 'Enchanted' : ''}.png`);
        armorList[i].visible = show
    }
}

/*屏幕中央文本UI*/
const text = ui.findChildByName('text')
var showText = async function (content, show) {
    text.textContent = content
    text.visible = show
}

/**设置快捷栏选择框 */
var setchoosecase = function (pos) {
    choosecase.position.offset.x = 40 * (pos - 1) - 184;
}

/**设置快捷栏UI */
var setSingleQI = function (index, image, number) {
    quickNumList[index].textFontSize = number == 1 ? 0 : 17;
    quickNumList[index].textContent = number.toString()
    quickItemList[index].imageOpacity = image == '' ? 0 : 1
    if (image != '') quickItemList[index].image = `picture/${image.includes('Sword') ? image + (upgrades[2] > 0 ? 'Enchanted' : '') : image}.png`;
}
var setAllQI = function (playerInventory) {
    for (let i = 0; i < quickItemList.length; i++) {
        setSingleQI(i, playerInventory[i][0], playerInventory[i][1])
    }
}

/**设置UI大小 */
var setUiScale = function (scale, auto = false) {
    if (auto) {
        remoteChannel.sendServerEvent({ type: 'autoUiScale', args: { sc: screenWidth / 1912 * 100 } });
        setUiScale(screenWidth / 1912, false)
    } else {
        uiScale.scale = scale;
        ui.uiScale = uiScale;
    }
}

/**设置物品栏选择框 */
var setInventoryCase = function (index, s, type) {
    inventorycase.visible = s
    if (s) {
        if (type == 'inventory') {
            inventorycase.position.offset.x = inventoryList[index].position.offset.x
            inventorycase.position.offset.y = inventoryList[index].position.offset.y
        } else if (type == 'teamchest' || type == 'enderBag') {
            inventorycase.position.offset.x = chestList[index].position.offset.x
            inventorycase.position.offset.y = chestList[index].position.offset.y
        }
    }
}

/**设置背包UI */
var setSingleItem = function (index, image, number) {
    numberList[index].textFontSize = number == 1 ? 0 : 16;
    numberList[index].textContent = number.toString()
    inventoryList[index].imageOpacity = image == '' ? 0 : 1
    if (image != '') inventoryList[index].image = `picture/${image.includes('Sword') ? image + (upgrades[2] > 0 ? 'Enchanted' : '') : image}.png`;
}
var setinventory = function (playerInventory) {
    for (let i = 0; i < inventoryList.length; i++) {
        setSingleItem(i, playerInventory[i][0], playerInventory[i][1])
    }
}

/*设置箱UI*/
var setSingleCI = function (index, image, number) {
    chestNumberList[index].textFontSize = number == 1 ? 0 : 16;
    chestNumberList[index].textContent = number.toString()
    chestList[index].imageOpacity = image == '' ? 0 : 1
    if (image != '') chestList[index].image = `picture/${image.includes('Sword') ? image + (upgrades[2] > 0 ? 'Enchanted' : '') : image}.png`;
}
var setAllCI = function (items) {
    for (let i = 0; i < chestList.length; i++) {
        setSingleCI(i, items[i][0], items[i][1])
    }
}

/**打开背包 */
var showinventory = function (show, type) {
    if (show) input.unlockPointer();
    else input.lockPointer();
    if (type == 'inventory') {
        inventoryImage.visible = show
    } else if (type == 'shop') {
        shopImage.visible = show
        for (let i = 0; i < 7; i++) {
            shopList[i].visible = show
        }
        if (show == false) {
            for (let i = 7; i < shopList.length; i++) {
                shopList[i].visible = show
            }
            for (let i = 0; i < shopNumberList.length; i++) {
                shopNumberList[i].visible = show
            }
        }
    } else if (type == 'upgrade') {
        chestImage.visible = show
        for (let i = 9; i < 18; i++) {
            chestList[i].visible = show
            if (i < 14) {
                chestNumberList[i].visible = show
                chestNumberList[i].textFontSize = show ? 16 : 0
            }
            chestList[i].imageOpacity = show ? 1 : 0
            if (show) {
                chestList[i].image = 'picture/' + UpgradesGoods[i - 9] + '.png'
                if (i < 14) chestNumberList[i].textContent = upgrades[i - 9] == 0 ? '' : upgrades[i - 9].toString()
            }
        }
        if (show) remoteChannel.sendServerEvent({ type: 'directMessage', args: { word: '冶炼 | 疯狂矿工 | 锋利 | 保护 | 治愈池 | 这是个陷阱！| 警报陷阱 | 反击陷阱 | 挖掘疲劳陷阱' } });
    } else if (type == 'teamchest' || type == 'enderBag') {
        chestImage.visible = show
        for (let i = 0; i < chestList.length; i++) {
            chestList[i].visible = show
            chestNumberList[i].visible = show
        }
    }
    inventorycase.visible = false
    shadow.visible = show
    for (let i = 0; i < inventoryList.length; i++) {
        if (uiType != 'shop' && type == 'shop') {
            inventoryList[i].position.offset.y += i < 9 ? 46 : 46.9
        } else if (uiType == 'shop' && type != 'shop') {
            inventoryList[i].position.offset.y -= i < 9 ? 46 : 46.9
        }
        inventoryList[i].visible = show
        numberList[i].visible = show
    }
    uiType = type;
}

/**加载UI */
async function draw(dateNum, beds, players) {
    inventoryImage.visible = false
    inventorycase.visible = false
    shadow.visible = false

    /**快捷栏 */
    for (let i = 0; i < 9; i++) {
        let invQuickItem_ = invQuickItem.clone()
        inventoryList.push(invQuickItem_)
        numberList.push(invQuickItem_.findChildByName('invQuickNum'))
        invQuickItem_.position.offset.x += 30.7375 * i
        invQuickItem_.pointerEventBehavior = PointerEventBehavior.BLOCK_PASS_THROUGH
        invQuickItem_.events.on('pointerdown', () => {
            remoteChannel.sendServerEvent({ type: 'choose', args: { index: inventoryList.indexOf(invQuickItem_), type: 'inventory' } });
        })
    }

    /**物品栏、箱 */
    for (let j = 0; j < 3; j++) {
        for (let i = 0; i < 9; i++) {
            let invItem_ = invItem.clone()
            inventoryList.push(invItem_)
            numberList.push(invItem_.findChildByName('invNum'))
            invItem_.position.offset.x += 30.7375 * i
            invItem_.position.offset.y += 30.5 * j
            invItem_.pointerEventBehavior = PointerEventBehavior.BLOCK_PASS_THROUGH
            invItem_.events.on('pointerdown', () => {
                remoteChannel.sendServerEvent({ type: 'choose', args: { index: inventoryList.indexOf(invItem_), type: 'inventory' } });
            })
            let chestItem_ = chestItem.clone()
            chestList.push(chestItem_)
            chestNumberList.push(chestItem_.findChildByName('chestNum'))
            chestItem_.position.offset.x += 30.7375 * i
            chestItem_.position.offset.y += 30.5 * j
            chestItem_.pointerEventBehavior = PointerEventBehavior.BLOCK_PASS_THROUGH
            chestItem_.events.on('pointerdown', () => {
                if (uiType == 'upgrade') {
                    remoteChannel.sendServerEvent({ type: 'upgrade', args: { index: chestList.indexOf(chestItem_) - 9 } });
                } else if (uiType == 'teamchest') {
                    remoteChannel.sendServerEvent({ type: 'choose', args: { index: chestList.indexOf(chestItem_), type: 'teamchest' } });
                } else if (uiType == 'enderBag') {
                    remoteChannel.sendServerEvent({ type: 'choose', args: { index: chestList.indexOf(chestItem_), type: 'enderBag' } });
                }
            })
        }
    }

    /**背包快捷栏 */
    for (let i = 0; i < 9; i++) {
        let quickItem_ = quickItem.clone()
        quickItemList.push(quickItem_)
        quickItem_.position.offset.x += 40 * i
        quickNumList.push(quickItem_.findChildByName('quickNum'))
        quickItem_.findChildByName('quickNum').pointerEventBehavior = PointerEventBehavior.BLOCK_PASS_THROUGH
        quickItem_.findChildByName('quickNum').events.on('pointerdown', () => {
            remoteChannel.sendServerEvent({ type: 'pressQIbyScreen', args: { index: quickNumList.indexOf(quickItem_.findChildByName('quickNum')) } });
        })
    }

    /**商店 */
    for (let j = 0; j < 3; j++) {
        shopItem.position.offset.y += j == 0 ? 0 : (j == 1 ? 61 : 30.5)
        for (let i = 0; i < 7; i++) {
            let shopItem_ = shopItem.clone()
            shopList.push(shopItem_)
            shopNumberList.push(shopItem_.findChildByName('shopNum'))
            shopItem_.position.offset.x += 30.7375 * i
            shopItem_.pointerEventBehavior = PointerEventBehavior.BLOCK_PASS_THROUGH
            shopItem_.events.on('pointerdown', () => {
                if (shopList.indexOf(shopItem_) < 7) {
                    if (shopList.indexOf(shopItem_) == 3) {
                        toolShop()
                    } else {
                        const fz = [
                            [0, 6],
                            [7, 10],
                            [11, 13],
                            [14, 22],
                            [23, 26],
                            [27, 29],
                            [30, 37]
                        ]
                        const items = SHOP.slice(fz[shopList.indexOf(shopItem_)][0], fz[shopList.indexOf(shopItem_)][1] + 1)
                        for (let i = 7; i < shopNumberList.length; i++) {
                            shopNumberList[i].visible = i - 7 < items.length
                            if (i - 7 < items.length) shopNumberList[i].textContent = items[i - 7][4] == 1 ? '' : items[i - 7][4].toString()
                        }
                        for (let i = 7; i < shopList.length; i++) {
                            shopList[i].visible = i - 7 < items.length
                            shopList[i].findChildByName('priceType').visible = shopList[i].visible
                            shopList[i].findChildByName('priceNum').visible = shopList[i].visible
                            if (shopList[i].visible) {
                                shopList[i].findChildByName('priceType').image = `picture/${items[i - 7][3]}.png`
                                shopList[i].findChildByName('priceNum').textContent = items[i - 7][2].toString()
                            }
                            if (i - 7 < items.length) shopList[i].image = 'picture/' + items[i - 7][1] + '.png'
                        }
                        var words = ''
                        for (let i = 0; i < items.length; i++) {
                            if (items[i][4] == 1) {
                                words += items[i][0] + '-' + ['铁锭', '金锭', '绿宝石'][['iron', 'gold', 'emerald'].indexOf(items[i][3])] + '*' + items[i][2].toString() + ' | '
                            } else {
                                words += items[i][0] + '*' + items[i][4].toString() + '-' + ['铁锭', '金锭', '绿宝石'][['iron', 'gold', 'emerald'].indexOf(items[i][3])] + '*' + items[i][2].toString() + ' | '
                            }
                        }
                        remoteChannel.sendServerEvent({ type: 'directMessage', args: { word: `| ${words}` } });
                    }
                } else {
                    remoteChannel.sendServerEvent({ type: 'buy', args: { thing: shopItem_.image.slice(shopItem_.image.indexOf('/') + 1, shopItem_.image.indexOf('.')) } });
                }
            })
        }
    }
    for (let i = 0; i < 7; i++) {
        shopList[i].image = 'picture/' + ShopTypes[i] + '.png'
    }

    /**聊天栏 */
    for (let i = 0; i < MSGLength; i++) {
        let msg = msgContent.clone();
        let title = titleContent.clone();
        contentList.push(msg);
        titleList.push(title);
        msg.position.offset.y -= i * 20;
        title.position.offset.y -= i * 20;
    }

    /**护甲 */
    for (let i = 0; i < 4; i++) {
        let a = armor.clone()
        armorList.push(a)
        a.position.offset.y += i * 31
    }
    changeBed(0, beds, false)
    date.textContent = dateNum
    changePlayers(0, players, false)
    changeData(0, [0, 0, 0], false)
}

/**工具类商店 */
var toolShop = function () {
    for (let i = 7; i < shopList.length; i++) {
        shopList[i].visible = i < 10
        shopList[i].findChildByName('priceType').visible = shopList[i].visible
        shopList[i].findChildByName('priceNum').visible = shopList[i].visible
    }
    for (let i = 7; i < shopNumberList.length; i++) {
        shopNumberList[i].visible = false
    }
    shopList[7].visible = toolsType[2] == ''
    shopList[7].visible && (shopList[7].image = 'picture/scissors.png')
    shopList[8].visible = Object.keys(PickaxeGoods).includes(toolsType[0])
    shopList[8].visible && (shopList[8].image = PickaxeGoods[toolsType[0]])
    shopList[9].visible = Object.keys(AxeGoods).includes(toolsType[1])
    shopList[9].visible && (shopList[9].image = AxeGoods[toolsType[1]])
    for (let i = 7; i < 10; i++) {
        shopList[i].findChildByName('priceType').visible = shopList[i].visible
        shopList[i].findChildByName('priceNum').visible = shopList[i].visible
        if (!shopList[i].visible) continue;
        SHOP.forEach((item) => {
            if (item[1] == ['scissors', PickaxeGoods[toolsType[0]].slice(8, -4), AxeGoods[toolsType[1]].slice(8, -4)][i - 7]) {
                shopList[i].findChildByName('priceType').image = `picture/${item[3]}.png`
                shopList[i].findChildByName('priceNum').textContent = item[2].toString()
            }
        });
    }
}

/**聊天 */
var message = function (content, titleLength, titleColor) {
    const text = content.length > 43 ? [content.slice(0, 43), `   ${content.slice(43, Math.min(content.length, 86))}`] : [content]
    for (let i = 0; i < text.length; i++) {
        messages.unshift(text[i])
        msgColors.unshift(i == 0 ? [titleLength].concat(titleColor) : [0, 'White', 0])
    }
    showMsgNum += text.length;
    for (let i = 0; i < Math.min(messages.length, MSGLength); i++) {
        const vis = ableScroll || (!ableScroll && i < showMsgNum && i < 10)
        contentList[i].visible = vis;
        titleList[i].visible = vis;
        contentList[i].textContent = msgColors[i][0] > 0 ? `  ${' '.repeat(msgColors[i][2])}${messages[i].slice(msgColors[i][0])}` : messages[i];
        titleList[i].textContent = msgColors[i][0] > 0 ? messages[i].slice(0, msgColors[i][0]) : ''
        titleList[i].textColor.copy(titleList[i].textContent == '' ? Vec3.create(ColorList['White']) : Vec3.create(ColorList[msgColors[i][1]]))
    }
    setTimeout(() => {
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i] == text[0] && showMsgNum == i + 1) {
                if (ableScroll === undefined || !ableScroll) {
                    for (let j = 0; j < text.length; j++) {
                        if (i - j >= 10) continue;
                        contentList[i - j].visible = false;
                        titleList[i - j].visible = false;
                    };
                    messages = messages.slice(0, Math.max(showMsgNum, MSGLength));
                };
                showMsgNum -= text.length;
                break;
            }
        }
    }, 10000);
}

/**输入框 */
const inputBox = ui.findChildByName('inputBox');
inputBox.events.add('blur', () => {
    remoteChannel.sendServerEvent({ type: 'chat', args: { text: inputBox.textContent } });
    inputBox.textContent = '';
    inputBox.visible = false;
    input.lockPointer();
})

/**滚动框 */
input.pointerLockEvents.add("pointerlockchange", ({ isLocked }) => {
    if (isLocked) {
        ableScroll = false;
        scrollBox.scrollPosition.y = 200;
        scrollBox.size.offset.y = 400;
        for (let i = Math.min(messages.length, MSGLength) - 1; i >= 10; i--) {
            contentList[i].visible = false;
            titleList[i].visible = false;
        }
        for (let i = 10; i >= 0; i--) {
            if (showMsgNum < i + 1) {
                contentList[i].visible = false;
                titleList[i].visible = false;
            }
        }
    } else if (!isLocked) {
        if (messages.length > 10) {
            ableScroll = true;
            scrollBox.size.offset.y = 200;
            scrollBox.scrollPosition.y = 200;
        }
        for (let i = 0; i < Math.min(messages.length, MSGLength); i++) {
            contentList[i].visible = true;
            titleList[i].visible = true;
        }
    }
});

remoteChannel.events.on('client', event => {// 客户端监听
    if (!load && event.type !== 'draw') return;
    switch (event.type) {
        case 'ui scale': // 事件[初始化UI大小]
            setUiScale(...Object.values(event.args));// 调用相应函数setUiScale(sale:var)[enven.args的值为[Object Object]需用...Object.values()取值,即...Object.values(event.args)]
            break;
        case 'setchoosecase':
            setchoosecase(...Object.values(event.args));
            break;
        case 'setSingleQI':
            setSingleQI(...Object.values(event.args));
            break;
        case 'setAllQI':
            setAllQI(...Object.values(event.args));
            break;
        case 'setinventory':
            setinventory(...Object.values(event.args));
            break;
        case 'showinventory':
            showinventory(...Object.values(event.args));
            break;
        case 'setInventoryCase':
            setInventoryCase(...Object.values(event.args));
            break;
        case 'setSingleItem':
            setSingleItem(...Object.values(event.args));
            break;
        case 'changeHp':
            changeHp(...Object.values(event.args));
            break;
        case 'changeToolsType':
            toolsType = event.args.t
            break;
        case 'toolShop':
            toolShop()
            break;
        case 'setAllCI':
            setAllCI(...Object.values(event.args))
            break;
        case 'setSingleCI':
            setSingleCI(...Object.values(event.args))
            break;
        case 'draw':
            draw(...Object.values(event.args));
            load = true;
            break;
        case 'showText':
            showText(...Object.values(event.args))
            break;
        case 'changeBed':
            changeBed(...Object.values(event.args))
            break;
        case 'changePlayers':
            changePlayers(...Object.values(event.args))
            break;
        case 'changeData':
            changeData(...Object.values(event.args))
            break;
        case 'setYou':
            setYou(...Object.values(event.args))
            break;
        case 'showUI':
            if (event.args.type == 'sidebar') {
                sidebar.visible = sidebar.visible ? false : true;
            } else if (event.args.type == 'msg') {
                showMsg = !showMsg
                scrollBox.visible = showMsg;
            } else if (event.args.type == 'msgbox') {
                for (let i = 0; i < MSGLength; i++) {
                    contentList[i].backgroundOpacity = contentList[i].backgroundOpacity == 0 ? 0.5 : 0;
                }
            }
            break;
        case 'message':
            message(...Object.values(event.args))
            break;
        case 'changeUpgrade':
            upgrades = event.args.upg
            break;
        case 'setArmor':
            setArmor(...Object.values(event.args))
            break;
        case 'resetUpgrades':
            chestNumberList[event.args.index + 9].textContent = upgrades[event.args.index] == 0 ? '' : upgrades[event.args.index].toString()
            break;
        case 'input':
            inputBox.visible = true;
            input.unlockPointer();
            inputBox.focus();
            break;
        default:
            break;
    }
});
