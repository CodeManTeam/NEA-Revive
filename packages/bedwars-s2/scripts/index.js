
console.clear();
const {
    RunSpeed,
    JumpPower,
    Friction,
    JumpSpeedFactor,
    ClothesList,
    WearDatas,
    ITEM,
    ShopList
} = require("./config.js");
require("./GroupStorage.js");
const {
    FISH_CONFIG,
    QualityNames,
    initFishMarket,
    resetDailyMarket,
    recordSale,
    getFishQuality
} = require("./fishingConfig.js");
const {
    sendMsg,
    updateRkl,
    randInt,
    searchData
} = require('./function.js')

world.airFriction = 0;

initFishMarket();

setInterval(async () => {
    const currentHour = new Date().getHours() + 8;
    if (currentHour == 21) {
        resetDailyMarket();
        sendMsg('鱼市已刷新')
    };
}, 60 * 60 * 1000);

let pig = world.querySelector('#CPS测试')
pig.trunRedCd = false

updateRkl();

setInterval(async () => {
    updateRkl();
    world.querySelectorAll('player').filter(e => e.player.loaded && !e.sqlError).forEach(async entity => {
        await savePlayer_group(entity);
    });
}, 5 * 60 * 1000);

setInterval(async () => {
    const blackList = await GroupStorage.get('BlackList');
    world.querySelectorAll('player').filter(e => e.player.loaded).forEach(async entity => {
        if (blackList.value.includes(entity.player.userId)) {
            entity.player.kick();
            return;
        }
        /**聊天频率限制 */
        if (second % 60 === 0) {
            entity.player.msgNumPerMin = 0;
        };
    });
}, 1000);

/**模型名称显示 */
world.querySelectorAll('.showName').forEach((e) => {
    e.showEntityName = true; // 允许展示实体名称
    e.nameRadius = 4.5;   // 实体名称的展示范围
    e.nameColor = new GameRGBColor(1, 1, 0);  // 互动提示的文字颜色
    e.customName = e.id; // 显示自定义的名称
});

world.addCollisionFilter('player', 'player');
world.addCollisionFilter('.fly', 'player');
world.addCollisionFilter('.fly', '.fly');
world.addCollisionFilter('.fly', '.showName');

world.onPlayerJoin(async ({ entity }) => {
    entity.player.loaded = false;
    let blackList = await GroupStorage.get('BlackList')
    if (blackList.value.includes(entity.player.userId)) {
        entity.player.kick()
        return;
    }
    await loadPlayer_group(entity)
    if (entity.player.keys.length == 12) entity.player.keys.push(13);
    remoteChannel.sendClientEvent(entity, { type: 'draw' });
    entity.player.forceRespawn()
    entity.player.scale = 0.8;
    entity.player.cameraMode = 'fps';
    entity.player.cameraFovY = entity.player.fovy
    entity.player.enable3DCursor = true
    entity.friction = Friction;
    entity.showHealthBar = true;
    entity.enableDamage = true;
    entity.maxHp = 20;
    entity.hp = 20;
    entity.player.jumpPower = JumpPower;
    entity.player.enableDoubleJump = false;
    entity.player.jumpSpeedFactor = JumpSpeedFactor;
    entity.player.jumpAccelerationFactor = 0.6
    entity.player.walkSpeed = entity.player.runSpeed = RunSpeed;
    entity.player.walkAcceleration = entity.player.runAcceleration = RunSpeed;
    entity.player.crouchSpeed = 0;
    entity.player.crouchAcceleration = 0.088;
    entity.player.flySpeed = entity.player.flyAcceleration = 1.9560546875;
    entity.player.cpsTest = null;
    entity.player.rightHandPos = 0;
    entity.player.isChatting = false;
    entity.player.msgNumPerMin = 0;
    entity.player.quickInventory = [['clock', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['fishingRod', 1]];
    entity.dressUp();
    entity.setQuickInvUI();
    entity.player.pressEvent = entity.player.onPress(async ({ button, raycast: { distance, voxelIndex, normal, hitEntity, hitVoxel, hitPosition, origin, direction } }) => {
        if (button === 'action1') {
            if (hitEntity && distance <= 4.5) {
                if (hitEntity.id == '加入游戏') {
                    entity.player.joinGame();
                    return;
                } else if (hitEntity.id == '排行榜') {
                    const leaderBoard = await entity.player.dialog({
                        type: 'select',
                        title: '排行榜',
                        content: '',
                        options: ['S2赛季积分排行榜', '胜场排行榜', '击杀排行榜', '摧毁床排行榜', '最终击杀排行榜', 'S1赛季积分排行榜', '返回']
                    });
                    if (!leaderBoard || leaderBoard === null) return;
                    if (leaderBoard) {
                        if (leaderBoard.value == '返回') return;
                        entity.player.viewRkl(leaderBoard.value);
                    }
                    return;
                } else if (hitEntity.id == '美西螈') {
                    entity.player.cancelDialogs();
                    let priceContent = '今日鱼市：\n'
                    for (const quality in FISH_MARKET.prices) {
                        priceContent += `\n${QualityNames[quality]}：
    价格：鹦鹉螺壳*${FISH_MARKET.prices[quality]}
    今日售卖：${FISH_MARKET.dailySales[quality]}条`
                    }
                    const fishMarket = await entity.player.dialog({
                        type: 'select',
                        title: '鱼市',
                        content: priceContent,
                        options: entity.player.fishBag.concat(['返回'])
                    });
                    if (!fishMarket || fishMarket === null) return;
                    if (fishMarket) {
                        if (fishMarket.value == '返回') return;
                        const fish = fishMarket.value.slice(0, fishMarket.value.indexOf('*'))
                        const ownNum = fishMarket.value.slice(fishMarket.value.indexOf('*') + 1)
                        const fishInfo = getFishQuality(fish);
                        const sale = await entity.player.dialog({
                            type: 'input',
                            title: '鱼市',
                            content: `你拥有 ${fishMarket.value}
品质：${QualityNames[fishInfo.quality]}
今日价格：鹦鹉螺壳*${fishInfo.price}
请输入你要售卖${fish}的数量`,
                            confirmText: '售卖',
                        })
                        if (!sale || sale === null) return;
                        if (sale) {
                            if (sale.includes('.')) return entity.player.directMessage('请输入整数！');
                            const sellNum = Number(sale);
                            if (Number.isNaN(sellNum)) return entity.player.directMessage('请输入正确的数值');
                            if (sellNum < 1 || sellNum > ownNum) return entity.player.directMessage('请输入正确的数值');
                            entity.getFish(fish, -sellNum);
                            entity.player.coins += getFishQuality(fish).price * sellNum;
                            recordSale(fishInfo.quality, sellNum);
                            entity.player.directMessage('售卖成功！');
                        };
                    };
                    return;
                } else if (hitEntity.id == '海龟') {
                    entity.player.cancelDialogs();
                    const shop = await entity.player.dialog({
                        title: '商城',
                        type: 'select',
                        options: Object.keys(ShopList).concat(['返回']),
                        content: ''
                    })
                    if (!shop || shop === null) return;
                    if (shop) {
                        if (shop.value == '返回') return;
                        const price = ShopList[shop.value]
                        let item = shop.value.slice(3);
                        const buy = await entity.player.dialog({
                            title: shop.value,
                            content: `价格：鹦鹉螺壳*${price}\n你拥有 鹦鹉螺壳*${entity.player.coins}`,
                            type: 'select',
                            options: ['购买', '返回']
                        })
                        if (!buy || buy === null) return;
                        if (buy) {
                            if (buy.value == '返回') return;
                            if (buy.value == '购买') {
                                if (entity.player.coins < price) return entity.player.directMessage('你没有足够的鹦鹉螺壳！');
                                if (shop.value.startsWith('装扮')) {
                                    if (entity.player.clothes.includes(item)) return entity.player.directMessage('你已获得该装扮！');
                                    entity.player.coins -= price;
                                    entity.player.clothes.push(item);
                                    entity.player.directMessage('购买成功！');
                                } else if (shop.value.startsWith('称号')) {
                                    item += '玩家名';
                                    if (entity.player.titleList.includes(item)) return entity.player.directMessage('你已获得该装扮！');
                                    entity.player.coins -= price;
                                    entity.player.titleList.push(item);
                                    entity.player.directMessage('购买成功！');
                                }
                            };
                        };
                    };
                    return;
                } else if (hitEntity.id == "CPS测试") {
                    if (entity.player.cpsTest && !entity.player.cpsTest.isTesting) {
                        const waiting = await entity.player.dialog({
                            type: 'select',
                            title: 'CPS测试',
                            content: '点击你面前的这头猪开始测试',
                            options: ['退出CPS测试', '返回']
                        })
                        if (!waiting || waiting === null) return;
                        if (waiting) {
                            if (waiting.value == '返回') return;
                            if (waiting.value == '退出CPS测试') {
                                entity.player.cpsTest = null;
                                entity.player.directMessage('已退出CPS测试')
                            }
                        }
                    } else if (entity.player.cpsTest === null) {
                        const test = await entity.player.dialog({
                            type: 'select',
                            title: 'CPS测试',
                            content: `借助点击速度测试，测试自己的鼠标点击速度有多快。`,
                            options: ["5s", "10s", "30s", "返回"],
                        });
                        if (!test || test === null) return;
                        if (test) {
                            if (test.value == '返回') return;
                            entity.player.cpsTest = {
                                isTesting: false,
                                testTime: [5, 10, 30][test.index]
                            };
                            entity.player.directMessage('点击左键开始测试')
                        }
                    }
                    return;
                }
            }
            if (entity.player.quickInventory[entity.player.rightHandPos][0] == 'clock') {
                const menu = await entity.player.dialog({
                    type: 'select',
                    title: '菜单',
                    content: `你拥有 鹦鹉螺壳*${entity.player.coins}`,
                    options: ['装扮', '称号', '帮助', '返回']
                })
                if (!menu || menu === null) return;
                if (menu) {
                    if (menu.value == '返回') return;
                    if (menu.value == '装扮') {
                        const clothing = await entity.player.dialog({
                            title: '装扮',
                            type: 'select',
                            content: `当前穿戴：${JSON.stringify(entity.player.clothes.slice(0, entity.player.clothes.indexOf('无')))}`,
                            options: entity.player.clothes.filter(c => c !== '无').concat(['返回'])
                        });
                        if (!clothing || clothing === null) return;
                        if (clothing) {
                            if (clothing.value == '返回') return;
                            else {
                                const dressUp = await entity.player.dialog({
                                    title: clothing.value,
                                    type: 'select',
                                    content: ClothesList[clothing.value].intro,
                                    options: ['穿戴', '卸下', '返回']
                                });
                                if (!dressUp || dressUp === null) return;
                                if (dressUp) {
                                    if (dressUp.value == '返回') return;
                                    if (dressUp.value == '卸下') {
                                        entity.player.wearables(WearDatas[ClothesList[clothing.value].part].bodyPart).forEach((item) => {
                                            if (item.mesh == `mesh/${clothing.value}.vb`) {
                                                item.remove();
                                            }
                                        });
                                        entity.player.clothes = entity.player.clothes.filter(c => c !== clothing.value);
                                        entity.player.clothes.push(clothing.value);
                                        entity.player.directMessage(`已卸下 ${clothing.value}`);
                                    } else if (dressUp.value == '穿戴') {
                                        entity.player.wearables().forEach((item) => {
                                            const meshName = item.mesh.slice(5, -3);
                                            if (Object.keys(ClothesList).includes(meshName)) {
                                                if (ClothesList[meshName].type == ClothesList[clothing.value].type) {
                                                    entity.player.clothes = entity.player.clothes.filter(c => c !== meshName);
                                                    entity.player.clothes.push(meshName);
                                                    item.remove();
                                                };
                                            };
                                        });
                                        entity.player.clothes = entity.player.clothes.filter(c => c !== clothing.value);
                                        entity.player.clothes.unshift(clothing.value);
                                        entity.wear(clothing.value, ClothesList[clothing.value].part);
                                        entity.player.directMessage(`已穿戴 ${clothing.value}`);
                                    };
                                };
                            };
                        };
                    } else if (menu.value == '称号') {
                        const title = await entity.player.dialog({
                            type: 'select',
                            content: `当前称号：${entity.player.titleList[0]}`,
                            title: '称号',
                            options: entity.player.titleList.concat(['返回'])
                        })
                        if (!title || title === null) return;
                        if (title) {
                            if (title.value == '返回') return;
                            let target = entity.player.titleList.splice(entity.player.titleList.indexOf(title.value), 1)[0];
                            entity.player.titleList.unshift(target);
                            entity.player.directMessage(`佩戴成功！当前称号：${title.value}`);
                        }
                    } else if (menu.value == '帮助') {
                        await entity.player.dialog({
                            type: 'text',
                            title: '帮助',
                            content: '钓鱼教程：大厅按数字键9可以切换主手为钓鱼竿。主手为钓鱼竿时右键抛竿，再右键收杆。将浮漂抛入大厅2楼的水池中，随即等待，十几秒后会出现“鱼上钩了！”的提示。提示出现后1秒内按右键收杆即可成功钓上一条鱼。钓到的鱼可以找美西螈卖，卖鱼得到的鹦鹉螺壳可以找海龟兑换装扮或称号等。'
                        })
                    }
                };
            } else if (entity.player.quickInventory[entity.player.rightHandPos][0] == 'fishingRod') {
                var hook = world.createEntity({
                    position: entity.position.add(new GameVector3(0, 0.52734375, 0)),
                    mesh: 'mesh/浮漂.vb',
                    gravity: false,
                    collides: true,
                    meshScale: new GameVector3(0.0625, 0.0625, 0.0625),
                    meshOrientation: new GameQuaternion(0, 0, 0, 1).rotateY(Math.atan2(direction.z, direction.x)).rotateY(Math.PI / 2),
                    velocity: direction.mul(new GameVector3(1, 1.5, 1)),
                    fixed: false,
                })
                hook.id = 'hook'
                hook.shooter = entity
                hook.addTag('fly')
                hook.friction = 1
                hook.mass = 1
                hook.environment = 'air';
                hook.reel = false;
                entity.player.quickInventory[entity.player.rightHandPos][0] = 'fishingRodCasting'
                entity.setQuickInvUI(entity.player.rightHandPos, false)
                entity.addRightHandWear();
            } else if (entity.player.quickInventory[entity.player.rightHandPos][0] == 'fishingRodCasting') {
                entity.reelInRod();
            }
        } else if (button === 'action0') {
            if (entity.player.cpsTest) {
                if (entity.player.cpsTest.isTesting) {
                    entity.player.cpsTest.clicks++;
                    if (pig.trunRedCd) return;
                    pig.trunRedCd = true
                    pig.meshColor.set(1, 0, 0, 1)
                    pig.position.y += Math.random();
                    pig.position.x += Math.random() * 2 - 1;
                    pig.position.z += Math.random() * 2 - 1;
                    setTimeout(() => {
                        pig.meshColor.set(1, 1, 1, 1)
                        pig.position.set(58.5, 59, 58.5);
                    }, 100)
                    setTimeout(() => {
                        pig.trunRedCd = false
                    }, 50)
                } else {
                    entity.startCpsTest();
                }
            }
        }
    });
    entity.player.keydownEvent = entity.player.onKeyDown(async ({ keyCode, tick }) => {
        if (entity.player.isChatting) return;
        if (entity.player.keys.includes(keyCode)) {
            const index = entity.player.keys.indexOf(keyCode);
            if (index == entity.player.rightHandPos) return;
            if (index == 12 && entity.player.msgNumPerMin < 10) {
                entity.player.cancelDialogs();
                entity.player.isChatting = true;
                remoteChannel.sendClientEvent(entity, { type: 'input' });
                return;
            }
            if (index < 9) {
                if (entity.player.quickInventory[entity.player.rightHandPos][0] == 'fishingRodCasting') {
                    entity.reelInRod();
                };
                entity.player.rightHandPos = index;
                entity.addRightHandWear();
                remoteChannel.sendClientEvent(entity, { type: 'setChooseCase', args: { pos: index } });
            } else if (index == 11) {
                entity.player.cameraMode = entity.player.cameraMode == 'fps' ? 'follow' : 'fps'
            }
        };
    });
});

world.onPlayerLeave(async ({ entity }) => {
    if (entity.player.pressEvent) {
        entity.player.pressEvent.cancel();
        entity.player.keydownEvent.cancel();
    }
    if (!entity.player.loaded || entity.sqlError) return;
    await savePlayer_group(entity)
});

const pond = world.addZone({
    selector: '#hook',
    bounds: {
        lo: [60, 66, 60],
        hi: [67, 68.5, 67],
    },
})

pond.onEnter(async ({ entity }) => {
    if (entity.id !== 'hook' || entity.destroyed || entity.environment !== 'air') return;
    entity.environment = 'water';
    entity.velocity.x = 0;
    entity.velocity.z = 0;
    entity.velocity.y = 0;
    entity.position.y = 68
    while (!entity.destroyed && !entity.shooter.destroyed) {
        await sleep(randInt(FISH_CONFIG.FISHING_PARAMS.BITE_TIME_MIN, FISH_CONFIG.FISHING_PARAMS.BITE_TIME_MAX) * 1000);
        if (entity.destroyed || entity.shooter.destroyed) break;
        entity.velocity.y = -0.5;
        entity.shooter.player.directMessage('鱼咬钩了！');
        entity.reel = true;
        await sleep(FISH_CONFIG.FISHING_PARAMS.REEL_TIME * 1000);
        if (entity.destroyed || entity.shooter.destroyed) break;
        entity.reel = false;
        entity.shooter.player.directMessage("鱼脱钩了！")
        entity.position.y = 68;
    }

});

var orcount = 0
var mutiple = 1
setInterval(() => {
    world.querySelector('#排行榜').position.y += 0.005 * mutiple
    if (orcount > 25) {
        orcount = 0
        mutiple *= -1
    }
    orcount += 1
    world.querySelectorAll('.fly').forEach(async (entity) => {
        if (entity.position.y < 0 || entity.shooter.destroyed) {
            entity.destroy();
            return;
        };
        if (entity.id == 'hook') {
            if (entity.voxelContacts.length > 0 && entity.environment == 'air') {
                entity.environment = 'ground';
                entity.velocity.x = 0;
                entity.velocity.z = 0;
            }
            if (entity.environment !== 'water') {
                entity.velocity.y *= 0.99;
                entity.velocity.y -= 0.03;
            }
        }
    });
}, 50)

world.onChat(({ entity, message }) => {
    this.chat(message);
})

remoteChannel.onServerEvent(({ entity, args }) => {
    switch (args.type) {
        case "pressQIbyScreen":
            if (args.args.index == entity.player.rightHandPos) return;
            if (entity.player.quickInventory[entity.player.rightHandPos][0] == 'fishingRodCasting') {
                entity.reelInRod();
            };
            entity.player.rightHandPos = args.args.index
            remoteChannel.sendClientEvent(entity, { type: 'setChooseCase', args: { pos: args.args.index } });
            entity.addRightHandWear()
            break;
        case "chat":
            if (args.args.text !== '') {
                entity.chat(args.args.text);
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




