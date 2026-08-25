const {
    take,
    openSettings
} = require('./function.js')
const {
    SHOP,
    TitleColor
} = require('./config.js')
const {
    chat
} = require("./chat.js")

/*GUI原理
局部变量[a] = 交换的列表
局部变量[b] = 被交换的列表
将a的某一项与b的某一项互换
再将交换的列表设置为a。被交换的列表设置为b
args.args.type存储点击的物品所在UI类型，index为位置
chooseInventory[0]为已选中物品所在UI类型，[1]为位置
*/
remoteChannel.onServerEvent(({ entity, args }) => {
    switch (args.type) {
        case "choose":
            if (entity.player.chooseInventory[0] != '') {
                if (entity.player.chooseInventory[0] == args.args.type && entity.player.chooseInventory[1] == args.args.index) {
                    entity.player.chooseInventory = ['', 0]
                    remoteChannel.sendClientEvent(entity, { type: 'setInventoryCase', args: { index: args.args.index, s: false, type: 'inventory' } });
                } else {
                    if (args.args.type == 'inventory') {
                        var a = entity.player.inventory
                    } else if (args.args.type == 'teamchest') {
                        var i = entity.player.chestType
                        var a = teamchests[i]
                    } else if (args.args.type == 'enderBag') {
                        var a = entity.player.enderBag
                    }
                    if (entity.player.chooseInventory[0] == 'inventory') {
                        var b = entity.player.inventory
                    } else if (entity.player.chooseInventory[0] == 'teamchest') {
                        var i = entity.player.chestType
                        var b = teamchests[i]
                    } else if (entity.player.chooseInventory[0] == 'enderBag') {
                        var b = entity.player.enderBag
                    }
                    var maxStack = SHOP[a[args.args.index][0]][4]
                    if (a[args.args.index][0] == b[entity.player.chooseInventory[1]][0] && maxStack > 1) {
                        if (a[args.args.index][1] + b[entity.player.chooseInventory[1]][1] <= maxStack) {
                            a[args.args.index][1] += b[entity.player.chooseInventory[1]][1]
                            b[entity.player.chooseInventory[1]] = ['', 1]
                        } else {
                            b[entity.player.chooseInventory[1]][1] -= maxStack - a[args.args.index][1]
                            a[args.args.index][1] = maxStack
                        }
                    } else {
                        var aa = a[args.args.index]
                        a[args.args.index] = b[entity.player.chooseInventory[1]]
                        b[entity.player.chooseInventory[1]] = aa
                    }
                    if (args.args.type == 'inventory') {
                        entity.player.inventory[args.args.index] = a[args.args.index]
                        remoteChannel.sendClientEvent(entity, { type: 'setSingleItem', args: { index: args.args.index, image: entity.player.inventory[args.args.index][0], number: entity.player.inventory[args.args.index][1] } });
                    } else if (args.args.type == 'teamchest') {
                        teamchests[i][args.args.index] = a[args.args.index]
                        remoteChannel.sendClientEvent(entity, { type: 'setSingleCI', args: { index: args.args.index, image: teamchests[i][args.args.index][0], number: teamchests[i][args.args.index][1] } });
                        world.querySelectorAll('player').forEach(async e => {
                            if (e.player.chestType == entity.player.chestType && e.player.chestType != false) {
                                remoteChannel.sendClientEvent(e, { type: 'setSingleCI', args: { index: args.args.index, image: teamchests[i][args.args.index][0], number: teamchests[i][args.args.index][1] } });
                            }
                        })
                    } else if (args.args.type == 'enderBag') {
                        entity.player.enderBag[args.args.index] = a[args.args.index]
                        remoteChannel.sendClientEvent(entity, { type: 'setSingleCI', args: { index: args.args.index, image: entity.player.enderBag[args.args.index][0], number: entity.player.enderBag[args.args.index][1] } });
                    }
                    if (entity.player.chooseInventory[0] == 'inventory') {
                        entity.player.inventory[entity.player.chooseInventory[1]] = b[entity.player.chooseInventory[1]]
                        remoteChannel.sendClientEvent(entity, { type: 'setSingleItem', args: { index: entity.player.chooseInventory[1], image: entity.player.inventory[entity.player.chooseInventory[1]][0], number: entity.player.inventory[entity.player.chooseInventory[1]][1] } });
                    } else if (entity.player.chooseInventory[0] == 'teamchest') {
                        teamchests[i][entity.player.chooseInventory[1]] = b[entity.player.chooseInventory[1]]
                        remoteChannel.sendClientEvent(entity, { type: 'setSingleCI', args: { index: entity.player.chooseInventory[1], image: teamchests[i][entity.player.chooseInventory[1]][0], number: teamchests[i][entity.player.chooseInventory[1]][1] } });
                        world.querySelectorAll('player').forEach(async e => {
                            if (e.player.chestType == entity.player.chestType && e.player.chestType != false) {
                                remoteChannel.sendClientEvent(e, { type: 'setSingleCI', args: { index: entity.player.chooseInventory[1], image: teamchests[i][entity.player.chooseInventory[1]][0], number: teamchests[i][entity.player.chooseInventory[1]][1] } });
                            }
                        })
                    } else if (entity.player.chooseInventory[0] == 'enderBag') {
                        entity.player.enderBag[entity.player.chooseInventory[1]] = b[entity.player.chooseInventory[1]]
                        remoteChannel.sendClientEvent(entity, { type: 'setSingleCI', args: { index: entity.player.chooseInventory[1], image: entity.player.enderBag[entity.player.chooseInventory[1]][0], number: entity.player.enderBag[entity.player.chooseInventory[1]][1] } });
                    }
                    entity.player.chooseInventory = ['', 0]
                    entity.setQuickInvUI(0, true)
                    remoteChannel.sendClientEvent(entity, { type: 'setInventoryCase', args: { index: args.args.index, s: false, type: 'inventory' } });
                    entity.player.tool = entity.player.inventory[entity.player.rightHandPos][0]
                    entity.addRightHandWear()
                }
            } else {
                if ((args.args.type == 'inventory' && entity.player.inventory[args.args.index][0] != '') || (args.args.type == 'teamchest' && teamchests[entity.player.chestType][args.args.index][0] != '') || (args.args.type == 'enderBag' && entity.player.enderBag[args.args.index][0] != '')) {
                    if (entity.player.crouchButton) {
                        if (args.args.type == 'inventory') {
                            var a = entity.player.inventory
                        } else if (args.args.type == 'teamchest') {
                            var i = entity.player.chestType
                            var a = teamchests[i]
                        } else if (args.args.type == 'enderBag') {
                            var a = entity.player.enderBag
                        }
                        if (args.args.type == 'inventory' && entity.player.openInventoryType == 'teamchest') {
                            var i = entity.player.chestType
                            var b = teamchests[i]
                        } else if (entity.player.openInventoryType == 'enderBag' && args.args.type == 'inventory') {
                            var b = entity.player.enderBag
                        } else {
                            var b = entity.player.inventory
                        }
                        let id = 0
                        let ms = SHOP[a[args.args.index][0]][4]
                        let g = false
                        if (ms > 1) {
                            for (const item of b) {
                                if (!(args.args.type == 'inventory' && entity.player.openInventoryType != 'teamchest' && entity.player.openInventoryType != 'enderBag' && !((id > 8 && args.args.index < 9) || (id < 9 && args.args.index > 8))) && item[0] == a[args.args.index][0] && item[1] + a[args.args.index][1] <= ms) {
                                    b[id][1] += a[args.args.index][1]
                                    a[args.args.index] = ['', 1]
                                    g = true
                                    break;
                                }
                                id += 1
                            }
                        }
                        if (!g) {
                            id = 0
                            for (const item of b) {
                                if (!(args.args.type == 'inventory' && entity.player.openInventoryType != 'teamchest' && entity.player.openInventoryType != 'enderBag' && !((id > 8 && args.args.index < 9) || (id < 9 && args.args.index > 8))) && item[0] == '') {
                                    b[id] = a[args.args.index]
                                    a[args.args.index] = ['', 1]
                                    g = true
                                    break;
                                }
                                id += 1
                            }
                            if (!g) break;
                        }
                        if (args.args.type == 'inventory') {
                            entity.player.inventory[args.args.index] = a[args.args.index]
                            remoteChannel.sendClientEvent(entity, { type: 'setSingleItem', args: { index: args.args.index, image: entity.player.inventory[args.args.index][0], number: entity.player.inventory[args.args.index][1] } });
                        } else if (args.args.type == 'teamchest') {
                            teamchests[i][args.args.index] = a[args.args.index]
                            remoteChannel.sendClientEvent(entity, { type: 'setSingleCI', args: { index: args.args.index, image: teamchests[i][args.args.index][0], number: teamchests[i][args.args.index][1] } });
                            world.querySelectorAll('player').forEach(async e => {
                                if (e.player.chestType == entity.player.chestType && e.player.chestType != false) {
                                    remoteChannel.sendClientEvent(e, { type: 'setSingleCI', args: { index: args.args.index, image: teamchests[i][args.args.index][0], number: teamchests[i][args.args.index][1] } });
                                }
                            })
                        } else if (args.args.type == 'enderBag') {
                            entity.player.enderBag[args.args.index] = a[args.args.index]
                            remoteChannel.sendClientEvent(entity, { type: 'setSingleCI', args: { index: args.args.index, image: entity.player.enderBag[args.args.index][0], number: entity.player.enderBag[args.args.index][1] } });
                        }
                        if (args.args.type == 'inventory' && entity.player.openInventoryType == 'teamchest') {
                            teamchests[i][id] = b[id]
                            remoteChannel.sendClientEvent(entity, { type: 'setSingleCI', args: { index: id, image: teamchests[i][id][0], number: teamchests[i][id][1] } });
                            world.querySelectorAll('player').forEach(async e => {
                                if (e.player.chestType == entity.player.chestType && e.player.chestType != false) {
                                    remoteChannel.sendClientEvent(e, { type: 'setSingleCI', args: { index: id, image: teamchests[i][id][0], number: teamchests[i][id][1] } });
                                }
                            })
                        } else if (entity.player.openInventoryType == 'enderBag' && args.args.type == 'inventory') {
                            entity.player.enderBag[id] = b[id]
                            remoteChannel.sendClientEvent(entity, { type: 'setSingleCI', args: { index: id, image: entity.player.enderBag[id][0], number: entity.player.enderBag[id][1] } });
                        } else {
                            entity.player.inventory[id] = b[id]
                            remoteChannel.sendClientEvent(entity, { type: 'setSingleItem', args: { index: id, image: entity.player.inventory[id][0], number: entity.player.inventory[id][1] } });
                        }
                        entity.setQuickInvUI(0, true)
                        entity.player.tool = entity.player.inventory[entity.player.rightHandPos][0]
                        entity.addRightHandWear()
                    } else {
                        entity.player.chooseInventory = [args.args.type, args.args.index]
                        remoteChannel.sendClientEvent(entity, { type: 'setInventoryCase', args: { index: args.args.index, s: true, type: args.args.type } });
                        if (args.args.type == 'inventory') {
                            var a = entity.player.inventory
                        } else if (args.args.type == 'teamchest') {
                            var i = entity.player.chestType
                            var a = teamchests[i]
                        } else if (args.args.type == 'enderBag') {
                            var a = entity.player.enderBag
                        }
                        entity.player.directMessage(SHOP[a[args.args.index][0]][0])
                    }
                }
            }
            break;
        case "buy":
            const item = SHOP[args.args.thing]
            if (!take(entity, item[2], item[1], false)) {
                entity.player.directMessage('购买失败')
            } else {
                if (item[0].includes('套')) {
                    var armorType = item[0].slice(0, -1)
                    if ([7, 9, 11, 13].indexOf(entity.player.defence) < ['锁链', '铁', '钻石'].indexOf(armorType) + 1) {
                        entity.player.defence = [9, 11, 13][['锁链', '铁', '钻石'].indexOf(armorType)]
                        entity.player.wearables(GameBodyPart.RIGHT_FOOT).forEach((item) => {
                            item.remove()
                        })
                        entity.player.wearables(GameBodyPart.LEFT_FOOT).forEach((item) => {
                            item.remove()
                        })
                        entity.wear(armorType + '靴子', 'left_foot', teamupgrades[['red', 'blue', 'green', 'yellow'].indexOf(entity.player.team)][3] > 0)
                        entity.wear(armorType + '靴子', 'right_foot', teamupgrades[['red', 'blue', 'green', 'yellow'].indexOf(entity.player.team)][3] > 0)
                        take(entity, item[2], item[1], true)
                        entity.player.directMessage('购买成功')
                        entity.player.sound('audio/successful_hit.mp3')
                    } else {
                        entity.player.directMessage('请购买更高级的护甲！')
                    }
                } else {
                    take(entity, item[2], item[1], true)
                    if (item[0] == '剪刀') {
                        entity.player.toolsType[2] = 'scissors'
                        remoteChannel.sendClientEvent(entity, { type: 'changeToolsType', args: { t: entity.player.toolsType } });
                        remoteChannel.sendClientEvent(entity, { type: 'toolShop' });
                    } else if (item[0].includes('镐')) {
                        take(entity, entity.player.toolsType[0], 1, true)
                        entity.player.toolsType[0] = args.args.thing
                        remoteChannel.sendClientEvent(entity, { type: 'changeToolsType', args: { t: entity.player.toolsType } });
                        remoteChannel.sendClientEvent(entity, { type: 'toolShop' });
                    } else if (item[0].includes('斧')) {
                        take(entity, entity.player.toolsType[1], 1, true)
                        entity.player.toolsType[1] = args.args.thing
                        remoteChannel.sendClientEvent(entity, { type: 'changeToolsType', args: { t: entity.player.toolsType } });
                        remoteChannel.sendClientEvent(entity, { type: 'toolShop' });
                    }
                    entity.give(args.args.thing, item[3], item[4])
                    entity.player.directMessage('购买成功')
                    entity.player.sound('audio/successful_hit.mp3')
                }
                entity.setQuickInvUI(0, true)
                entity.player.tool = entity.player.inventory[entity.player.rightHandPos][0]
                entity.addRightHandWear()
            }
            break;
        case "shadowDiscard":
            if (entity.player.openInventoryType != '' && entity.player.chooseInventory[0] != '') {
                entity.throwAll()
            }
            break;
        case "upgrade":
            var ug = teamupgrades[['red', 'blue', 'green', 'yellow'].indexOf(entity.player.team)]
            const types = ['冶炼', '疯狂矿工', '锋利', '保护', '治愈池', '这是个陷阱！', '警报陷阱', '反击陷阱', '挖掘疲劳陷阱']
            var cond = [
                [4 + ug[0] * 4, ug[0] < 4],
                [2 + (ug[1] + 1) * 2, ug[1] < 2],
                [8, ug[2] < 1],
                [[5, 10, 20, 30][ug[3]], ug[3] < 4],
                [3, ug[4] < 1],
            ]
            if (types[args.args.index].includes('陷阱')) {
                if (teamTraps[['red', 'blue', 'green', 'yellow'].indexOf(entity.player.team)].includes(types[args.args.index])) {
                    entity.player.directMessage('该团队升级已满级')
                } else if (teamTraps[['red', 'blue', 'green', 'yellow'].indexOf(entity.player.team)].length >= 3) {
                    entity.player.directMessage('陷阱数量已达上限！')
                } else if (take(entity, 'diamond', [1, 2, 4][teamTraps[['red', 'blue', 'green', 'yellow'].indexOf(entity.player.team)].length], true)) {
                    teamTraps[['red', 'blue', 'green', 'yellow'].indexOf(entity.player.team)].push(types[args.args.index])
                    entity.player.sound('audio/successful_hit.mp3')
                    world.querySelectorAll('player').filter(e => e.player.team == entity.player.team).forEach(async x => {
                        x.directMsg(`${entity.player.titleList[0].replace('玩家名', entity.player.name)}已解锁${types[args.args.index]}`,
                            entity.player.titleList[0].length - 3,
                            TitleColor[entity.player.titleList[0].slice(0, -3)]
                        );
                    })
                } else {
                    entity.player.directMessage('你的钻石不够，解锁失败！')
                }
            } else if (!cond[args.args.index][1]) {
                entity.player.directMessage('该团队升级已满级')
            } else if (take(entity, 'diamond', cond[args.args.index][0], true)) {
                teamupgrades[['red', 'blue', 'green', 'yellow'].indexOf(entity.player.team)][args.args.index] += 1
                entity.player.sound('audio/successful_hit.mp3')
                world.querySelectorAll('player').filter(e => e.player.team == entity.player.team).forEach((x) => {
                    x.directMsg(entity.player.titleList[0].replace('玩家名', entity.player.name) + '已解锁' + types[args.args.index] + ['I', 'II', 'III', 'IV'][teamupgrades[['red', 'blue', 'green', 'yellow'].indexOf(entity.player.team)][args.args.index] - 1],
                        entity.player.titleList[0].length - 3,
                        TitleColor[entity.player.titleList[0].slice(0, -3)]
                    );
                    remoteChannel.sendClientEvent(x, { type: 'changeUpgrade', args: { upg: teamupgrades[['red', 'blue', 'green', 'yellow'].indexOf(entity.player.team)] } })
                    if (types[args.args.index] == '保护') {
                        x.player.wearables(GameBodyPart.RIGHT_FOOT)[0].color = new GameRGBColor(0.9, 0.4, 1.5)
                        x.player.wearables(GameBodyPart.LEFT_FOOT)[0].color = new GameRGBColor(0.9, 0.4, 1.5)
                    } else if (types[args.args.index] == '锋利') {
                        x.addRightHandWear();
                        x.setQuickInvUI(0, true)
                    } else if (types[args.args.index] == '疯狂矿工') {
                        x.setQuickInvUI(0, true)
                    }
                })
                remoteChannel.sendClientEvent(entity, { type: 'resetUpgrades', args: { index: args.args.index } })
                remoteChannel.sendClientEvent(entity, { type: 'setinventory', args: { playerInventory: entity.player.inventory } });
            } else {
                entity.player.directMessage('你的钻石不够，解锁失败！')
            }
            break;
        case "directMessage":  //私信
            entity.player.directMessage(args.args.word)
            break;
        case "bag":  //背包
            if (entity.player.openInventoryType == '') {
                entity.openBag(true, 'inventory')
            } else {
                entity.openBag(false, entity.player.openInventoryType)
            }
            break;
        case "cameraMode":
            entity.player.cameraMode = entity.player.cameraMode == 'fps' ? 'follow' : 'fps';
            break;
        case "openSet":
            openSettings(entity);
            break;
        case "pressQIbyScreen":
            entity.player.tool = entity.player.inventory[args.args.index][0]
            entity.player.rightHandPos = args.args.index
            remoteChannel.sendClientEvent(entity, { type: 'setchoosecase', args: { pos: entity.player.rightHandPos + 1 } });
            entity.addRightHandWear()
            break;
        case "autoUiScale":
            entity.player.uiScale = args.args.sc
            break;
        case "chat":
            if (args.args.text !== '') {
                chat(entity, args.args.text);
                entity.player.msgNumPerMin++;
            }
            setTimeout(() => {
                entity.player.isChatting = false;
            }, 100);
            break;
        default:
            break;
    }
});