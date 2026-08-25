/**
 * TODO：
 * 
 */

console.clear()

const {
    ASCII_form,
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
    TrapBounds,
    BedPos,
    BanBlockZone,
    authors,
    TitleColor
} = require('./config.js')
const {
    calculatePlayer,
    calculateDamage,
    sjs,
    breakLadder,
    ball,
    inFluid,
    addTrap,
    trapOnEnter,
    bowTimeToDeg,
    sendMsg,
    levelUp,
    take,
} = require('./function.js')
require('./groupStorage.js')
require("./chat.js")
require("./remoteChannel.js")
const { RoomManager } = require("./RoomManager.js")

globalThis.roomManager = new RoomManager();
world.airFriction = 0;

/**碰撞过滤组 */
world.addCollisionFilter('player', 'player');
world.addCollisionFilter('.fly', 'player');
world.addCollisionFilter('.fly', '.fly');
world.addCollisionFilter('#tnt', 'player');
world.addCollisionFilter('#tnt', '.fly');
world.addCollisionFilter('#tnt', '#tnt');
world.addCollisionFilter('.showName', '.fly')
world.addCollisionFilter('.bed', '.fly')

/**绿宝石、钻石生成点 */
world.querySelectorAll('#EmeraldGenerator').forEach((entity) => {
    entity.showEntityName = true
    entity.nameRadius = 10
    entity.nameColor.set(1, 1, 0)
})
world.querySelectorAll('#DiamondGenerator').forEach((entity) => {
    entity.showEntityName = true
    entity.nameRadius = 10
    entity.nameColor.set(1, 1, 0)
})

/*商店、箱子、床 名称显示*/
world.querySelectorAll('.showName').forEach((e) => {
    e.showEntityName = true; // 允许展示实体名称
    e.nameRadius = 4.5;   // 实体名称的展示范围
    e.nameColor = new GameRGBColor(1, 1, 0);  // 互动提示的文字颜色
    e.customName = e.id; // 显示自定义的名称
})

/**摔落伤害 */
fall = new sjs
fall.initFallDamage()

/**陷阱 */
const redHome = addTrap(0)
trapOnEnter(redHome, 0)
const blueHome = addTrap(1)
trapOnEnter(blueHome, 1)
const greenHome = addTrap(2)
trapOnEnter(greenHome, 2)
const yellowHome = addTrap(3)
trapOnEnter(yellowHome, 3)
for (let i = 0; i < 4; i++) {
    world.addZone({
        selector: '.inTrap',
        bounds: {
            lo: TrapBounds[i][0],
            hi: TrapBounds[i][1]
        },
        fogEnabled: true,
        fogColor: new GameRGBColor(0, 0, 0),
        fogStartDistance: 1,
        fogHeightFalloff: 71,
        fogHeightOffset: 0,
        fogMax: 1,
        fogDensity: 0.96
    }).onLeave(({ entity }) => {
        if (entity.hasTag('inTrap')) entity.removeTag('inTrap')
    })
}

/*全局*/
setInterval(() => {
    ++tick
    if (tick % 400 == 0) {
        allplayers = [world.querySelectorAll('player').filter(x => x.player.team == 'red').length, world.querySelectorAll('player').filter(x => x.player.team == 'blue').length, world.querySelectorAll('player').filter(x => x.player.team == 'green').length, world.querySelectorAll('player').filter(x => x.player.team == 'yellow').length]
    }
    if (tick % 20 == 0) {
        timer += 1
        if (timer == 300) {
            sendMsg('钻石生成点已升级至II级')
            diamondTime = 25
        } else if (timer == 600) {
            sendMsg('绿宝石生成点已升级至II级')
            emeraldTime = 50
        } else if (timer == 1200) {
            sendMsg('钻石生成点已升级至MAX')
            diamondTime = 20
        } else if (timer == 1500) {
            sendMsg('绿宝石生成点已升级至MAX')
            emeraldTime = 35
        } else if (timer == 2700) {
            sendMsg('全部床已自毁')
            respawnable = [false, false, false, false]
            world.querySelectorAll('.bed').forEach((x) => {
                x.meshInvisible = true;
                world.querySelectorAll('player').forEach((e) => {
                    deadplayers.push(e.player.userId)
                })
            })
        } else if (timer == 3600) {
            sendMsg('游戏结束！')
            gameRestart()
        }
    }
    world.querySelectorAll('player').filter(e => !e.player.spectator && e.player.loaded).forEach(async entity => {
        /**绿宝石、钻石的资源获取 */
        for (i in entity.voxelContacts) {
            const x = entity.voxelContacts[i].x
            const y = entity.voxelContacts[i].y
            const z = entity.voxelContacts[i].z
            const voxel = entity.voxelContacts[i].voxel
            if (voxel == voxels.id('mint_green_light')) {
                emeraldPoints.filter(p => { return p[0].equals(new GameVector3(x, y, z)) && p[1] > 0 }).forEach((p) => {
                    entity.give('emerald', p[1], 64)
                    p[1] = 0
                    for (let item = 0; item < emeralds.length; item++) {
                        if (emeralds[item].pPos.equals(p[0])) {
                            emeralds[item].destroy()
                            emeralds[item] = ''
                        }
                    }
                    emeralds = emeralds.filter(item => { return item != '' })
                })
            } else if (voxel == voxels.id('indigo_light')) {
                diamondPoints.filter(p => { return p[0].equals(new GameVector3(x, y, z)) && p[1] > 0 }).forEach((p) => {
                    entity.give('diamond', p[1], 64)
                    p[1] = 0
                    for (let item = 0; item < diamonds.length; item++) {
                        if (diamonds[item].pPos.equals(p[0])) {
                            diamonds[item].destroy()
                            diamonds[item] = ''
                        }
                    }
                    diamonds = diamonds.filter(item => { return item != '' })
                })
            }
        }
        /**聊天频率限制 */
        if (tick % 1200 === 0) {
            entity.player.msgNumPerMin = 0;
        };
        /*反挂机*/
        if (tick % 20 === 0) {
            entity.player.afkTime++;
            if (entity.player.afkTime >= 90) {
                entity.player.kick();
            }
        }
        /*疾跑机制*/
        if (entity.player.pressAction1 && entity.player.tool.includes('Sword') && entity.player.openInventoryType == '') {
            entity.player.fangkan = true
        } else {
            entity.player.fangkan = false
        }
        if (entity.player.pressAction1 && (entity.player.tool.includes('Sword') || entity.player.tool == 'goldenApple' || entity.player.tool.includes('Potion') || (entity.player.tool.includes('bow') && take(entity, 'arrow', 1, false)))) {
            entity.player.walkSpeed = entity.player.runSpeed = entity.player.crouchSpeed;
            entity.player.walkAcceleration = entity.player.runAcceleration = entity.player.crouchAcceleration;
            entity.player.enableRun = false;
        } else if (entity.player.tickDamage || entity.velocity.x * Math.cos(entity.player.cameraYaw) + entity.velocity.z * Math.sin(entity.player.cameraYaw) < 0 || entity.player.cameraMode == 'follow') {
            let v = RunSpeed
            if (entity.player.effectList[4]) {
                v = RunSpeed * 1.4
            }
            entity.player.walkSpeed = entity.player.runSpeed = v;
            entity.player.walkAcceleration = entity.player.runAcceleration = RunSpeed;
            entity.player.jumpSpeedFactor = JumpSpeedFactor;
            entity.player.enableRun = true;
        } else {
            entity.player.walkSpeed = entity.player.runSpeed = WalkSpeed;
            entity.player.walkAcceleration = entity.player.runAcceleration = WalkSpeed;
            entity.player.jumpSpeedFactor = 1;
            entity.player.enableRun = false;
        }
        /*虚空*/
        if (entity.position.y < -32 && entity.hp > 0) {
            if (entity.player.beAttackedPlayer == null) {
                entity.hurt(entity.hp + 1, { damageType: 'void' })
            } else {
                entity.hurt(entity.hp + 1, { attacker: entity.player.beAttackedPlayer, damageType: 'void' })
            }
        }
        /*回血*/
        entity.maxHp = Math.max(entity.hp, 20)
        if (tick % 20 == 0) {
            if (redHome.entities().includes(entity) && entity.player.team == 'red') {
                entity.hp = Math.min(entity.maxHp, entity.hp + teamupgrades[0][4])
            } else if (blueHome.entities().includes(entity) && entity.player.team == 'blue') {
                entity.hp = Math.min(entity.maxHp, entity.hp + teamupgrades[1][4])
            } else if (greenHome.entities().includes(entity) && entity.player.team == 'green') {
                entity.hp = Math.min(entity.maxHp, entity.hp + teamupgrades[2][4])
            } else if (yellowHome.entities().includes(entity) && entity.player.team == 'yellow') {
                entity.hp = Math.min(entity.maxHp, entity.hp + teamupgrades[3][4])
            }
            remoteChannel.sendClientEvent(entity, { type: 'changeHp', args: { hp: entity.hp } });
        }
        if (tick % 80 == 0) {
            entity.hp = Math.min(entity.maxHp, entity.hp + 1)
            remoteChannel.sendClientEvent(entity, { type: 'changeHp', args: { hp: entity.hp } });
        }
        if (tick % 25 == 0 && entity.player.effectList[2] > 0) {
            entity.hp = Math.min(entity.maxHp, entity.hp + 1)
            remoteChannel.sendClientEvent(entity, { type: 'changeHp', args: { hp: entity.hp } });
        }
        /*防卡方块*/
        entity.tPos ??= new GameVector3;
        entity.ttPos ??= new GameVector3;
        const v = entity.velocity;
        const a = entity.player.effectList[4] > 0 ? 2 : 1.8
        if (((v.y >= 0.7 && entity.player.effectList[3] == 0 && entity.player.effectList[7] == 0) || v.x > a || v.x < -a || v.z > a || v.z < -a) && entity.player.effectList[8] == 0) {
            entity.position.copy(entity.ttPos);
            v.x = v.y = v.z = 0;
        }
        entity.ttPos.copy(entity.tPos);
        entity.tPos.copy(entity.position);
        /*玩家效果*/
        if (tick % 20 == 0) {
            for (let i = 0; i < entity.player.effectList.length; i++) {
                if (entity.player.effectList[i] > 0) {
                    entity.player.effectList[i] -= 1
                    if (entity.player.effectList[i] == 0) {
                        if (i == 0) {
                            entity.visible()
                            entity.directMsg('[隐身]结束');
                        } else if (i == 1) {
                            entity.maxHp = 20
                            entity.hp = Math.min(entity.hp, entity.maxHp)
                            remoteChannel.sendClientEvent(entity, { type: 'changeHp', args: { hp: entity.hp } });
                            entity.directMsg('[伤害吸收I]结束');
                        } else if (i == 2) {
                            entity.directMsg('[生命恢复II]结束');
                        } else if (i == 3) {
                            if (entity.player.effectList[7]) {
                                entity.player.jumpPower = JumpPowerII
                            } else {
                                entity.player.jumpPower = JumpPower
                            }
                            entity.directMsg('[跳跃提升V]结束');
                        } else if (i == 4) {
                            entity.directMsg('[迅捷II]结束');
                            entity.player.cameraFovY = entity.player.fovy
                        } else if (i == 6) {
                            entity.directMsg('[挖掘疲劳I]结束');
                        } else if (i == 7) {
                            entity.directMsg('[跳跃提升II]结束');
                            entity.player.jumpPower = JumpPower
                        }
                    }
                }
            }
        }
        /*指南针*/
        if (tick % 20 == 0 && entity.player.tool == 'compass') {
            var players = []
            world.querySelectorAll('player').filter(e => e.player.team == entity.player.track && !e.player.spectator).forEach((a) => {
                players.push(a)
            })
            if (players.length > 0) {
                var dis = []
                players.forEach((b) => {
                    dis.push(entity.position.distance(b.position))
                })
                var min = Math.min.apply(null, dis)
                entity.player.directMessage(players[dis.indexOf(min)].player.name + ' 距离你 '/*'s about */ + Math.round(min) + ' 米'/* meters away from you*/)
            }
        }
    });
    /*投掷物*/
    world.querySelectorAll('.fly').forEach(async (entity) => {
        if (entity.position.y < -32) {
            entity.destroy()
            return;
        }
        if (entity.voxelContacts.length > 0) {
            if (entity.id == 'arrow') {
                entity.fixed = true
                entity.ablePicked = true
                entity.velocity.x = 0
                entity.velocity.y = 0
                entity.velocity.z = 0
                setTimeout(() => {
                    if (entity.destroyed) return;
                    entity.destroy()
                }, 60000);
            } else {
                entity.meshInvisible = true;
                entity.destroy();
                if (entity.id == 'fireBall') {
                    ball(entity.position.x + entity.delta.x, entity.position.y + entity.delta.y, entity.position.z + entity.delta.z, 2.5, 4.5, true, 'air', { damageType: 'fireBall', attacker: entity.shooter })
                } else if (entity.id == 'enderPearl' && !entity.shooter.player.spectator && !entity.shooter.destroyed) {
                    entity.shooter.position.set(entity.position.x, entity.position.y + 2, entity.position.z)
                    entity.shooter.fallStart = -999
                    entity.shooter.velocity.x = 0
                    entity.shooter.velocity.y = 0
                    entity.shooter.velocity.z = 0
                }
                return;
            }
        }
        if (entity.id == 'egg') {
            if (world.querySelectorAll('player').filter(x => x == entity.shooter)[0].position.distance(entity.position) >= 32) {
                entity.destroy()
                return;
            }
            var ex = entity.position.x
            var ey = Math.round(entity.position.y)
            var ez = entity.position.z
            setTimeout(() => {
                if (!entity.destroyed) {
                    const X = [Math.floor(ex), Math.floor(ex), Math.ceil(ex), Math.ceil(ex)]
                    const Z = [Math.floor(ez), Math.ceil(ez), Math.floor(ez), Math.ceil(ez)]
                    for (let i = 0; i < 4; i++) {
                        if (voxels.getVoxelId(X[i], ey, Z[i]) == 0 &&
                            (ey <= 40 || ey >= 48 || !BanBlockZone.some(z => X[i] >= z[0][0] && Z[i] >= z[0][1] && X[i] <= z[1][0] && Z[i] <= z[1][1]))) {
                            let voxelCollisionBox = new GameBounds3(new GameVector3(X[i], ey, Z[i]), new GameVector3(X[i], ey, Z[i]).add(new GameVector3(1, 1, 1)));
                            if (world.searchBox(voxelCollisionBox).length) {
                                return;
                            }
                        } else {
                            return;
                        }
                    }
                    for (let i = 0; i < 4; i++) {
                        voxels.setVoxelId(X[i], ey, Z[i], 177)
                    }
                }
            }, 200);
        }
        var arrowCollisionBox = new GameBounds3(entity.position.sub(entity.bounds), entity.position.add(entity.bounds));
        var hitEntity = world.querySelectorAll('player').filter(x => arrowCollisionBox.intersects(new GameBounds3(x.position.sub(x.bounds), x.position.add(x.bounds))))[0];
        if (hitEntity && !entity.destroyed && !entity.meshInvisible && (entity.id == 'fireBall' || entity.id == 'arrow')) {
            if ((((entity.id == 'arrow' && !entity.ablePicked) || entity.id == 'fireBall') &&
                entity.shooter.player.team == hitEntity.player.team) ||
                hitEntity.player.spectator) return;
            entity.meshInvisible = true;
            entity.destroy();
            if (entity.id == 'fireBall') {
                ball(entity.position.x, entity.position.y, entity.position.z, 2.5, 4.5, false, 'air', { damageType: 'fireBall', attacker: entity.shooter })
            } else if (entity.id == 'arrow') {
                if (entity.ablePicked) {
                    hitEntity.give('arrow', 1, 64)
                } else {
                    if (!hitEntity.player.tickDamage) {
                        let k = entity.kbpro == 1 ? 1.2 : 1
                        hitEntity.velocity.x += entity.direction.x * k;
                        hitEntity.velocity.y = 0.5 * k;
                        hitEntity.velocity.z += entity.direction.z * k;
                    }
                    let damage = Math.ceil(entity.damage * entity.velocity.mag());
                    damage = entity.full ? damage + Math.random() * (Math.floor(damage / 2) + 1) : damage
                    hitEntity.tickHurt(calculateDamage(damage, hitEntity.player.defence, teamupgrades[['red', 'blue', 'green', 'yellow'].indexOf(hitEntity.player.team)][3] * 4, 0, 0), { attacker: entity.shooter });
                }
            }
        }
        if (entity.id == 'enderPearl' || (entity.id == 'arrow' && !entity.ablePicked) || entity.id == 'egg') {
            entity.velocity.y *= 0.99;
            entity.velocity.y -= entity.id == 'enderPearl' ? 0.07 : 0.05;
            if (entity.id == 'arrow') {
                entity.meshOrientation = entity.velocity.toUnitVector().toQuaternion();
            }
        }
    });
    /*资源*/
    if (tick % (20 * emeraldTime) == 0) {
        emeraldPoints.forEach((p) => {
            if (p[1] < 5) {
                p[1] += 1
                let e = world.createEntity({
                    position: new GameVector3(p[0].x + 0.5, p[0].y + 1.4, p[0].z + 0.5),
                    collides: false,
                    gravity: false,
                    mesh: 'mesh/绿宝石.vb',
                    meshScale: new GameVector3(0.03125, 0.03125, 0.03125),
                    id: 'item'
                })
                e.pPos = p[0]
                e.rotateDirection = (Math.random() < 0.5 ? 1 : -1)
                emeralds.push(e)
            }
        })
    }
    if (tick % (20 * diamondTime) == 0) {
        diamondPoints.forEach((p) => {
            if (p[1] < 8) {
                p[1] += 1
                let e = world.createEntity({
                    position: new GameVector3(p[0].x + 0.5, p[0].y + 1.4, p[0].z + 0.5),
                    collides: false,
                    gravity: false,
                    mesh: 'mesh/钻石.vb',
                    meshScale: new GameVector3(0.03125, 0.03125, 0.03125),
                    id: 'item'
                })
                e.pPos = p[0]
                e.rotateDirection = (Math.random() < 0.5 ? 1 : -1)
                diamonds.push(e)
            }
        })
    }
    for (let i = 0; i < 4; i++) {
        let forgeLevel = teamupgrades[i][0]
        let ironTick = [10, 7, 5, 5, 3][forgeLevel]
        let goldTick = [90, 60, 45, 45, 23][forgeLevel]
        let emeraldTick = [0, 0, 0, 1300, 650][forgeLevel]
        if (tick % ironTick == 0) {
            materials[i][0] < 48 && (materials[i][0] += 1)
        }
        if (tick % goldTick == 0) {
            materials[i][1] < 12 && (materials[i][1] += 1)
        }
        if (forgeLevel >= 3 && tick % emeraldTick == 0) {
            materials[i][2] < 4 && (materials[i][2] += 1)
        }
        if (ResourceZones[i].entities().length > 0) {
            ResourceZones[i].entities().filter(x => x.isPlayer && !x.player.spectator && x.player.loaded).forEach((entity) => {
                materials[i][0] > 0 && entity.give('iron', materials[i][0], 64)
                materials[i][1] > 0 && entity.give('gold', materials[i][1], 64)
                materials[i][2] > 0 && entity.give('emerald', materials[i][2], 64)
            })
            materials[i] = [0, 0, 0]
        }
    }
    /**资源与生成点模型旋转 */
    world.querySelectorAll('#EmeraldGenerator').forEach((entity) => {
        entity.customName = '在' + Math.ceil(emeraldTime - (tick % (20 * emeraldTime)) / 20) + '秒后产出'/*资源 will be produced in 秒数 seconds*/
        entity.meshOrientation = entity.meshOrientation.rotateY(Math.PI / 180)
    })
    world.querySelectorAll('#DiamondGenerator').forEach((entity) => {
        entity.customName = '在' + Math.ceil(diamondTime - (tick % (20 * diamondTime)) / 20) + '秒后产出'
        entity.meshOrientation = entity.meshOrientation.rotateY(Math.PI / 180)
    })
    world.querySelectorAll('#item').forEach((e) => {
        e.meshOrientation = e.meshOrientation.rotateY(Math.PI / 180 * e.rotateDirection)
    })
}, 50);

world.onTakeDamage(({ entity, attacker, damage, damageType }) => {
    remoteChannel.sendClientEvent(entity, { type: 'changeHp', args: { hp: entity.hp } });
    if (damageType != 'void') {
        if (attacker && damageType == 'hit') {
            entity.player.directMessage('你受到了来自 ' + attacker.player.titleList[0].replace('玩家名', attacker.player.name) + ' 的 ' + Math.round(damage * 10) / 10 + ' 点伤害\n剩余' + Math.round(entity.hp * 10) / 10 + '点血')
        } else if (damageType == 'fall') {
            entity.player.directMessage('你受到了 ' + Math.round(damage * 10) / 10 + ' 点摔落伤害\n剩余' + Math.round(entity.hp * 10) / 10 + '点血')
        }
    }
    if (damageType != 'fall' && entity.player.effectList[0] > 0) {
        if (damageType == 'fireBall' && attacker == entity) return;
        entity.player.effectList[0] = 0
        entity.visible()
    }
});

world.onPlayerLeave(async ({ entity }) => {
    if (entity.player.roomId) {
        const ownRoom = roomManager.getRoomMembers(entity.player.roomId)
        if (ownRoom[0].player.userId == entity.player.userId) {
            ownRoom.slice(1).forEach(async e => {
                roomManager.logout(entity.player.roomId, e, false);
                e.player.roomId = roomManager.newr(e)
                e.directMsg('队伍已解散')
            });
            roomManager.logout(entity.player.roomId, entity, true)
        } else {
            roomManager.logout(entity.player.roomId, entity, false);
            roomManager.getRoomMembers(entity.player.roomId).forEach(async e => {
                e.directMsg(`${entity.player.name} 退出队伍`)
            });
        }
        world.querySelectorAll('player').forEach(async e => {
            if (e.player.inviters.includes(entity.player.roomId)) {
                e.player.inviters = e.player.inviters.filter(i => i !== entity.player.roomId)
            }
        });
    };
    if (entity.player.cpsInterval) clearInterval(entity.player.cpsInterval)
    if (entity.player.team != '') {
        /*计算剩余队伍以决定是否重开*/
        allplayers[['red', 'blue', 'green', 'yellow'].indexOf(entity.player.team)] -= 1;
        remoteChannel.broadcastClientEvent({ type: 'changePlayers', args: { index: ['red', 'blue', 'green', 'yellow'].indexOf(entity.player.team), allplayers: allplayers, single: true } });
    }
    calculatePlayer()
    if (!entity.player.loaded || entity.sqlError) return;
    if (entity.player.keydownEvent) {
        entity.player.keydownEvent.cancel();
        entity.player.keyupEvent.cancel();
        entity.player.pressEvent.cancel()
        entity.player.releaseEvent.cancel()
    }
    await savePlayer_group(entity)
});

world.onDie(async ({ entity, attacker, damageType }) => {
    if (attacker && !attacker.destroyed && attacker.isPlayer && attacker != entity) {
        sendMsg(attacker.player.titleList[0].replace('玩家名', attacker.player.name) + ' 击杀了 ' + entity.player.titleList[0].replace('玩家名', entity.player.name),
            attacker.player.titleList[0].length - 3,
            TitleColor[attacker.player.titleList[0].slice(0, -3)]
        );
        entity.player.deathNum++;
        let scoreAdd = world.querySelectorAll('player').length > 10 ? Math.round(Math.random() * 2 + 1) : Math.round((Math.random() * 2 + 1) * 0.4)
        const currentHour = new Date().getHours() + 8;
        if (attacker.player.url.searchParams.get('serverId') !== null || (currentHour >= 22 && currentHour < 8)) scoreAdd = 0;
        else attacker.player.kills++;
        const xpAdd = Math.round(Math.random() * 35 + 15)
        attacker.player.scoreS2 += scoreAdd
        attacker.directMsg(`你获得了${xpAdd}点经验、${scoreAdd}点赛季积分`)
        attacker.player.xp += xpAdd
        levelUp(attacker)
        if (attacker.player.team != '') {
            attacker.player.singleGameData[0]++
            remoteChannel.sendClientEvent(attacker, { type: 'changeData', args: { index: 0, datas: attacker.player.singleGameData, single: true } });
            if (!attacker.player.spectator) {
                for (let i = 0; i < entity.player.inventory.length; i++) {
                    if (['iron', 'gold', 'emerald', 'diamond'].includes(entity.player.inventory[i][0])) {
                        attacker.give(entity.player.inventory[i][0], entity.player.inventory[i][1], 64)
                    }
                }
            }
        }
    } else if (damageType == 'fall') {
        sendMsg(entity.player.titleList[0].replace('玩家名', entity.player.name) + ' 摔死了！',
            entity.player.titleList[0].length - 3,
            TitleColor[entity.player.titleList[0].slice(0, -3)]
        );
    } else if (damageType == 'void') {
        sendMsg(entity.player.titleList[0].replace('玩家名', entity.player.name) + ' 拥抱了虚空娘！',
            entity.player.titleList[0].length - 3,
            TitleColor[entity.player.titleList[0].slice(0, -3)]
        );
    } else {
        sendMsg(entity.player.titleList[0].replace('玩家名', entity.player.name) + ' 爆炸了！',
            entity.player.titleList[0].length - 3,
            TitleColor[entity.player.titleList[0].slice(0, -3)]
        );
    }
    entity.player.forceRespawn();
    entity.player.cameraFovY = entity.player.fovy
    entity.maxHp = 20;
    entity.hp = 20;
    remoteChannel.sendClientEvent(entity, { type: 'changeHp', args: { hp: entity.hp } });
    entity.player.spectator = true
    entity.player.invisible = true
    entity.player.showName = false
    entity.player.jumpPower = JumpPower;
    entity.player.fangkan = false;
    entity.player.beAttackedPlayer = null
    entity.player.tickDamage = 0
    entity.player.tool = 'woodenSword';
    entity.player.rightHandPos = 0
    entity.player.track = entity.player.team
    entity.player.inventory = [['woodenSword', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['compass', 1]];//总背包
    remoteChannel.sendClientEvent(entity, { type: 'setchoosecase', args: { pos: entity.player.rightHandPos + 1 } });
    if (Pickaxe.includes(entity.player.toolsType[0])) {
        let t = Pickaxe[Math.max(Pickaxe.indexOf(entity.player.toolsType[0]) - 1, 0)]
        entity.give(t, 1, 1)
        entity.player.toolsType[0] = t
    }
    if (Axe.includes(entity.player.toolsType[1])) {
        let t = Axe[Math.max(Axe.indexOf(entity.player.toolsType[1]) - 1, 0)]
        entity.give(t, 1, 1)
        entity.player.toolsType[1] = t
    }
    if (entity.player.toolsType[2] == 'scissors') entity.give('scissors', 1, 1)
    remoteChannel.sendClientEvent(entity, { type: 'changeToolsType', args: { t: entity.player.toolsType } });
    if (entity.player.effectList[0] > 0) entity.visible();
    entity.player.effectList = new Array(9).fill(0)
    entity.player.ableplate = true
    if (entity.player.openInventoryType != '') entity.openBag(false, entity.player.openInventoryType);
    entity.player.openInventoryType = ''
    entity.player.itemCD = [false, false]
    entity.fallStart = -999
    entity.setQuickInvUI(0, true)
    if (entity.hasTag('inTrap')) entity.removeTag('inTrap');
    if (!respawnable[['red', 'blue', 'green', 'yellow'].indexOf(entity.player.team)] || deadplayers.includes(entity.player.userId)) {
        const currentHour = new Date().getHours() + 8;
        sendMsg(entity.player.titleList[0].replace('玩家名', entity.player.name) + '最终击杀！',
            entity.player.titleList[0].length - 3,
            TitleColor[entity.player.titleList[0].slice(0, -3)]
        );
        if (attacker && attacker.player.team != '' && !attacker.destroyed) {
            attacker.player.singleGameData[1]++
            remoteChannel.sendClientEvent(attacker, { type: 'changeData', args: { index: 1, datas: attacker.player.singleGameData, single: true } });
            if (attacker.player.url.searchParams.get('serverId') === null && currentHour < 22 && currentHour >= 8) {
                attacker.player.finalKills++;
                attacker.player.scoreS2 += 3;
                attacker.directMsg(`你获得了3点赛季积分`);
            }
        }
        allplayers[['red', 'blue', 'green', 'yellow'].indexOf(entity.player.team)] -= 1
        remoteChannel.broadcastClientEvent({ type: 'changePlayers', args: { index: ['red', 'blue', 'green', 'yellow'].indexOf(entity.player.team), allplayers: allplayers, single: true } });
        var aliveTeamNum = 0
        for (const t of respawnable) {
            if (t) aliveTeamNum++
        }
        let sAdd = world.querySelectorAll('player').length > 10 ? (5 - aliveTeamNum) * 10 : (5 - aliveTeamNum) * 4;
        if (entity.player.url.searchParams.get('serverId') !== null || (currentHour >= 22 && currentHour < 8)) sAdd = 0;
        if (entity.player.singleGameData[0] < 2 && entity.player.deathNum < 2) sAdd = 0;
        entity.directMsg(`你获得了${(5 - aliveTeamNum) * 8}点经验、${sAdd}点赛季积分`)
        entity.player.scoreS2 += sAdd
        entity.player.xp += (5 - aliveTeamNum) * 8
        levelUp(entity)
        remoteChannel.sendClientEvent(entity, { type: 'setYou', args: { team: 0, v: false } });
        entity.player.team = ''
        entity.player.track = ''
        entity.position.set(127, 64, 127)
        entity.player.spawnPoint.copy(entity.position)
        calculatePlayer()
    } else {
        for (let i = 5; i > 0; i--) {
            if (entity.destroyed || !entity.player.spectator) return;
            entity.directMsg(i + ' 秒后复活');
            await sleep(1000)
        }
        entity.player.spectator = false
        entity.player.invisible = false
        entity.player.showName = true
        entity.addRightHandWear()
        entity.player.forceRespawn();
        entity.player.setCameraPitch(0);
        entity.player.setCameraYaw({ 'red': 0, 'blue': Math.PI / 2, 'green': Math.PI, 'yellow': Math.PI * 3 / 2 }[entity.player.team]);
    }
})


world.onPlayerJoin(async ({ entity }) => {
    entity.player.loaded = false;
    let blackList = await GroupStorage.get('BlackList')
    if (blackList.value.includes(entity.player.userId)) {
        entity.player.kick()
        return;
    }
    let d = new Date();
    let mm = d.getMonth();
    let dd = d.getDate();
    let yy = d.getFullYear() % 100;
    mm = mm < 9 ? '0' + (mm + 1) : mm + 1;
    dd = dd < 10 ? '0' + dd : dd;
    let date = mm + '/' + dd + '/' + yy;
    await loadPlayer_group(entity)
    if (entity.player.keys.length == 12) entity.player.keys.push(13);
    remoteChannel.sendClientEvent(entity, { type: 'draw', args: { dateNum: date, beds: respawnable, players: allplayers } });
    entity.player.cps = 0;
    entity.fallStart = -999
    entity.player.scale = 0.8;
    entity.player.cameraMode = 'fps';
    entity.player.cameraFovY = entity.player.fovy;
    entity.player.enable3DCursor = true;
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
    entity.player.swimSpeed = entity.player.swimAcceleration = 0.08
    entity.player.firstAttack = false;
    entity.player.tickDamage = 0
    entity.player.beAttackedPlayer = null
    entity.player.fangkan = false;
    entity.player.tool = 'woodenSword';
    entity.player.rightHandPos = 0
    entity.player.inventory = [['woodenSword', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['compass', 1]];//总背包
    entity.player.enderBag = [['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1]]
    entity.player.chestType = false//打开箱子所属队伍
    entity.player.toolsType = ['', '', '']//镐、斧、剪刀
    entity.player.team = ''
    entity.player.defence = 7;//玩家护甲值
    entity.player.effectList = new Array(9).fill(0)//隐身，伤害吸收，生命恢复，跳跃提升V，速度，牛奶，挖掘疲劳，跳跃提升II，防卡方块
    entity.player.ableplate = true//救援平台
    entity.player.openInventoryType = ''//gui类型
    entity.player.ctrlButton = false//ctrl键是否按下
    entity.player.changeKey = null; //当值不为null时说明玩家正在改键，值为正在更改的快捷栏序数（1~9）
    entity.player.roadHelper = false;
    entity.addTag(entity.player.userId);
    entity.player.afkTime = 0;//挂机时间
    entity.player.singleGameData = [0, 0, 0]; //击杀，最终击杀，拆床数
    entity.player.deathNum = 0;
    entity.player.uiScale = 100;
    entity.player.itemCD = [false, false]; //火焰弹，末影珍珠
    entity.player.track = '';
    entity.player.roomId = roomManager.newr(entity);
    entity.player.inviters = []
    entity.player.startPlayeringTime = Date.now();
    entity.player.isChatting = false;
    entity.player.msgNumPerMin = 0;
    entity.player.loaded = true;
    entity.setTeam();
    entity.setQuickInvUI(0, true);
    entity.dressUp();
    remoteChannel.broadcastClientEvent({ type: 'changePlayers', args: { index: 0, allplayers: allplayers, single: false } });
    entity.player.keydownEvent = entity.player.onKeyDown(async ({ keyCode, tick }) => {
        if (entity.player.isChatting) return;

        if (keyCode == 17) {
            entity.player.ctrlButton = true;
        }

        // 自定义按键
        if (entity.player.changeKey != null) {
            if (entity.player.keys.includes(keyCode)) {
                entity.player.directMessage('此按键已被占用！请重新选择');
                return;
            } else if (!ASCII_form[1].includes(keyCode)) {
                entity.player.directMessage('此按键不支持更改！请重新选择');
                return;
            }
            entity.player.keys[entity.player.changeKey] = keyCode;
            entity.player.changeKey = null;
            entity.player.directMessage('更改成功！');
            entity.player.cancelDialogs();
            return;
        }

        if (keyCode == entity.player.keys[12] && entity.player.openInventoryType == '' && entity.player.msgNumPerMin < 10) {//Enter
            entity.player.cancelDialogs();
            entity.player.isChatting = true;
            remoteChannel.sendClientEvent(entity, { type: 'input' });
            return;
        }

        if (entity.player.spectator) { return; }

        if (entity.player.keys.includes(keyCode)) {
            if (entity.player.keys.indexOf(keyCode) < 9) {
                if (entity.player.openInventoryType != '') {
                    if (entity.player.chooseInventory[0] != '') {
                        /*gui中数字快捷键*/
                        if (entity.player.chooseInventory[0] == 'inventory') {
                            var a = entity.player.inventory
                        } else if (entity.player.chooseInventory[0] == 'teamchest') {
                            var i = entity.player.chestType
                            var a = teamchests[i]
                        } else if (entity.player.chooseInventory[0] == 'enderBag') {
                            var a = entity.player.enderBag
                        }
                        var maxStack = SHOP[a[entity.player.chooseInventory[1]][0]][4]
                        var aa = entity.player.inventory[entity.player.keys.indexOf(keyCode)]
                        if (a[entity.player.chooseInventory[1]][0] == aa[0] && maxStack > 1 && entity.player.chooseInventory[1] != entity.player.keys.indexOf(keyCode)) {
                            if (a[entity.player.chooseInventory[1]][1] + aa[1] <= maxStack) {
                                aa[1] += a[entity.player.chooseInventory[1]][1]
                                a[entity.player.chooseInventory[1]] = ['', 1]
                            } else {
                                a[entity.player.chooseInventory[1]][1] -= maxStack - aa[1]
                                aa[1] = maxStack
                            }
                        } else {
                            var aaa = aa
                            aa = a[entity.player.chooseInventory[1]]
                            a[entity.player.chooseInventory[1]] = aaa
                        }
                        entity.player.inventory[entity.player.keys.indexOf(keyCode)] = aa
                        remoteChannel.sendClientEvent(entity, { type: 'setSingleItem', args: { index: entity.player.keys.indexOf(keyCode), image: entity.player.inventory[entity.player.keys.indexOf(keyCode)][0], number: entity.player.inventory[entity.player.keys.indexOf(keyCode)][1] } });
                        if (entity.player.chooseInventory[0] == 'inventory') {
                            entity.player.inventory[entity.player.chooseInventory[1]] = a[entity.player.chooseInventory[1]]
                            remoteChannel.sendClientEvent(entity, { type: 'setSingleItem', args: { index: entity.player.chooseInventory[1], image: entity.player.inventory[entity.player.chooseInventory[1]][0], number: entity.player.inventory[entity.player.chooseInventory[1]][1] } });
                        } else if (entity.player.chooseInventory[0] == 'teamchest') {
                            teamchests[i][entity.player.chooseInventory[1]] = a[entity.player.chooseInventory[1]]
                            remoteChannel.sendClientEvent(entity, { type: 'setSingleCI', args: { index: entity.player.chooseInventory[1], image: teamchests[i][entity.player.chooseInventory[1]][0], number: teamchests[i][entity.player.chooseInventory[1]][1] } });
                            world.querySelectorAll('player').forEach(async e => {
                                if (e.player.chestType == entity.player.chestType && e.player.chestType != false) {
                                    remoteChannel.sendClientEvent(e, { type: 'setSingleCI', args: { index: entity.player.chooseInventory[1], image: teamchests[i][entity.player.chooseInventory[1]][0], number: teamchests[i][entity.player.chooseInventory[1]][1] } });
                                }
                            })
                        } else if (entity.player.chooseInventory[0] == 'enderBag') {
                            entity.player.enderBag[entity.player.chooseInventory[1]] = a[entity.player.chooseInventory[1]]
                            remoteChannel.sendClientEvent(entity, { type: 'setSingleCI', args: { index: entity.player.chooseInventory[1], image: entity.player.enderBag[entity.player.chooseInventory[1]][0], number: entity.player.enderBag[entity.player.chooseInventory[1]][1] } });
                        }
                        entity.setQuickInvUI(0, true)
                        remoteChannel.sendClientEvent(entity, { type: 'setInventoryCase', args: { index: entity.player.chooseInventory[1], s: false, type: 'inventory' } });
                        entity.player.chooseInventory = ['', 0]
                        entity.player.tool = entity.player.inventory[entity.player.rightHandPos][0]
                        entity.addRightHandWear()
                    }
                } else {
                    /*切换主手*/
                    entity.player.tool = entity.player.inventory[entity.player.keys.indexOf(keyCode)][0]
                    entity.player.rightHandPos = entity.player.keys.indexOf(keyCode)
                    remoteChannel.sendClientEvent(entity, { type: 'setchoosecase', args: { pos: entity.player.rightHandPos + 1 } });
                    entity.addRightHandWear()
                }
            } else if (keyCode == entity.player.keys[9]) {//E键
                if (entity.player.openInventoryType == '') {
                    entity.openBag(true, 'inventory')
                } else {
                    entity.openBag(false, entity.player.openInventoryType)
                }
            } else if (keyCode == entity.player.keys[11]) {//Tab
                entity.player.cameraMode = entity.player.cameraMode == 'fps' ? 'follow' : 'fps'
            } else if (keyCode == entity.player.keys[10]) {//丢弃
                if (entity.player.openInventoryType != '' && entity.player.chooseInventory[0] != '') {
                    if (!entity.player.ctrlButton) {
                        let no = false
                        if (entity.player.chooseInventory[0] == 'inventory') {
                            var a = entity.player.inventory
                        } else if (entity.player.chooseInventory[0] == 'teamchest') {
                            var i = entity.player.chestType
                            var a = teamchests[i]
                        } else if (entity.player.chooseInventory[0] == 'enderBag') {
                            var a = entity.player.enderBag
                        }
                        a[entity.player.chooseInventory[1]][1] -= 1
                        if (a[entity.player.chooseInventory[1]][1] == 0) {
                            a[entity.player.chooseInventory[1]] = ['', 1]
                            remoteChannel.sendClientEvent(entity, { type: 'setInventoryCase', args: { index: entity.player.chooseInventory[1], s: false, type: 'inventory' } });
                            no = true
                        }
                        if (entity.player.chooseInventory[0] == 'inventory') {
                            entity.player.inventory[entity.player.chooseInventory[1]] = a[entity.player.chooseInventory[1]]
                            remoteChannel.sendClientEvent(entity, { type: 'setSingleItem', args: { index: entity.player.chooseInventory[1], image: entity.player.inventory[entity.player.chooseInventory[1]][0], number: entity.player.inventory[entity.player.chooseInventory[1]][1] } });
                        } else if (entity.player.chooseInventory[0] == 'teamchest') {
                            teamchests[i][entity.player.chooseInventory[1]] = a[entity.player.chooseInventory[1]]
                            remoteChannel.sendClientEvent(entity, { type: 'setSingleCI', args: { index: entity.player.chooseInventory[1], image: teamchests[i][entity.player.chooseInventory[1]][0], number: teamchests[i][entity.player.chooseInventory[1]][1] } });
                            world.querySelectorAll('player').forEach(async e => {
                                if (e.player.chestType == entity.player.chestType && e.player.chestType != false) {
                                    remoteChannel.sendClientEvent(e, { type: 'setSingleCI', args: { index: entity.player.chooseInventory[1], image: teamchests[i][entity.player.chooseInventory[1]][0], number: teamchests[i][entity.player.chooseInventory[1]][1] } });
                                }
                            })
                        } else if (entity.player.chooseInventory[0] == 'enderBag') {
                            entity.player.enderBag[entity.player.chooseInventory[1]] = a[entity.player.chooseInventory[1]]
                            remoteChannel.sendClientEvent(entity, { type: 'setSingleCI', args: { index: entity.player.chooseInventory[1], image: entity.player.enderBag[entity.player.chooseInventory[1]][0], number: entity.player.enderBag[entity.player.chooseInventory[1]][1] } });
                        }
                        if (entity.player.chooseInventory[1] < 9) {
                            entity.setQuickInvUI(entity.player.chooseInventory[1], false)
                        }
                        if (no) {
                            entity.player.chooseInventory = ['', 0]
                        }
                        entity.player.tool = entity.player.inventory[entity.player.rightHandPos][0]
                        entity.addRightHandWear()
                    } else {
                        entity.throwAll()
                    }
                }
            }
        }
    })
    entity.player.keyupEvent = entity.player.onKeyUp(({ keyCode, tick }) => {
        if (keyCode == 17) {
            entity.player.ctrlButton = false
        }
    })
    entity.player.pressEvent = entity.player.onPress(async ({ button, raycast: { distance, voxelIndex, normal, hitEntity, hitVoxel, hitPosition, origin, direction } }) => {
        if (button !== 'action0' && button !== 'action1') {
            entity.player.afkTime = 0;
        };

        if (button === 'action0') {
            entity.player.cps++;
            if (entity.player.cps >= 16) {
                let whiteList = await GroupStorage.get('WhiteList')
                if (!whiteList.value.includes(entity.player.userId)) {
                    entity.player.kick();
                    sendMsg(`${entity.player.name} 因cps异常被踢出游戏`)
                    return;
                }
            }
            let clickEvent = setTimeout(() => {
                if (entity.destroyed) {
                    return;
                }
                entity.player.cps--;
                clearTimeout(clickEvent);
            }, 1000);
        }

        if (entity.player.spectator) {
            return;
        }

        if (button === 'crouch' && entity.player.effectList[0] == 0) {
            entity.player.showName = false;
            return;
        } else if (button === 'action1') {
            entity.player.pressAction1 = true;

            if (hitEntity && !hitEntity.isPlayer && distance <= 4.5 && entity.player.cameraMode == 'fps') {
                if (hitEntity.id == '商店') {
                    entity.openBag(true, 'shop')
                    return;
                } else if (hitEntity.id == '团队升级') {
                    entity.openBag(true, 'upgrade')
                    return;
                } else if (hitEntity.id.includes('团队箱') && entity.player.team == ['red', 'blue', 'green', 'yellow'][['红', '蓝', '绿', '黄'].indexOf(hitEntity.id.charAt(hitEntity.id.length - 1))]) {
                    entity.player.chestType = ['红', '蓝', '绿', '黄'].indexOf(hitEntity.id.charAt(hitEntity.id.length - 1))
                    entity.openBag(true, 'teamchest')
                    entity.player.sound('audio/openChest.mp3')
                    return;
                } else if (hitEntity.id.includes('末影')) {
                    entity.openBag(true, 'enderBag')
                    entity.player.sound('audio/openChest.mp3')
                    return;
                }
            }

            if (hitVoxel && hitVoxel == 364 && entity.player.tool == 'bucket' && distance <= 4.5 && entity.player.cameraMode == 'fps') {
                voxels.setVoxelId(voxelIndex.x, voxelIndex.y, voxelIndex.z, 0);
                entity.player.inventory[entity.player.rightHandPos][0] = 'waterBucket'
                entity.player.tool = 'waterBucket'
                entity.setQuickInvUI(entity.player.rightHandPos, false)
                entity.addRightHandWear()
                entity.player.sound('audio/fillWater.mp3')
                return;
            }

            // raycast reset
            if (hitVoxel != 426) {
                raycast_ = world.raycast(origin, direction, { ignoreEntities: true, ignoreFluid: true });
                [distance, voxelIndex, normal, hitVoxel] = [raycast_.distance, raycast_.voxelIndex, raycast_.normal, raycast_.hitVoxel];
            } else {
                raycast_ = world.raycast(origin, direction, { ignoreEntities: true });
                [distance, voxelIndex, normal, hitVoxel] = [raycast_.distance, raycast_.voxelIndex, raycast_.normal, raycast_.hitVoxel];
            }

            if (['wool', 'sand', 'enderStone', 'plank', 'glass', 'obdisian', 'tnt', 'waterBucket', 'ladder'].includes(entity.player.tool) && distance <= 4.5 && hitVoxel && entity.player.cameraMode == 'fps') {
                let v;

                // 辅助搭路
                if (entity.player.roadHelper) {
                    v = voxelIndex.add(normal).add(new GameVector3(0.5, 0.5, 0.5));
                    let n1 = new GameVector3(0, 0, 0);
                    let xP = Math.abs(v.x - hitPosition.x);//x和z方向上偏移
                    let zP = Math.abs(v.z - hitPosition.z);
                    n1.copy(normal);
                    if (normal.y == 1) {
                        if (xP > zP) {
                            if (hitPosition.x - v.x > 0.4) {
                                n1.x = 1;
                                n1.y = 0
                            }
                            if (hitPosition.x - v.x < - 0.4) {
                                n1.x = -1;
                                n1.y = 0

                            }
                        } else {
                            if (hitPosition.z - v.z > 0.4) {
                                n1.z = 1;
                                n1.y = 0

                            }
                            if (hitPosition.z - v.z < - 0.4) {
                                n1.z = -1;
                                n1.y = 0

                            }

                        }
                    }
                    if (voxels.getVoxel(v.x, v.y, v.z) == 0) {
                        v = voxelIndex.add(n1);
                    }
                } else {
                    v = voxelIndex.add(normal);
                }

                if (v.y > 62 || (
                    voxels.getVoxelId(v.x, v.y, v.z) !== 0 && voxels.getVoxelId(v.x, v.y, v.z) !== 364 ||
                    voxels.getVoxelId(v.x - 1, v.y, v.z) === 0 &&
                    voxels.getVoxelId(v.x + 1, v.y, v.z) === 0 &&
                    voxels.getVoxelId(v.x, v.y - 1, v.z) === 0 &&
                    voxels.getVoxelId(v.x, v.y + 1, v.z) === 0 &&
                    voxels.getVoxelId(v.x, v.y, v.z - 1) === 0 &&
                    voxels.getVoxelId(v.x, v.y, v.z + 1) === 0
                ) || (v.y >= 41 && v.y <= 47 && BanBlockZone.some(z => v.x >= z[0][0] && v.z >= z[0][1] && v.x <= z[1][0] && v.z <= z[1][1]))) {
                    return;
                }

                if (entity.player.tool == 'tnt') {
                    var e = world.createEntity({
                        mesh: 'mesh/TNT.vb',
                        meshScale: new GameVector3(0.0625, 0.0625, 0.0625),
                        velocity: new GameVector3(0, 0.4, 0),
                        collides: true,
                        fixed: false,
                        gravity: true,
                        friction: 1,
                        position: new GameVector3(voxelIndex.x + normal.x + 0.5, voxelIndex.y + normal.y + 0.5, voxelIndex.z + normal.z + 0.5)
                    })
                    e.id = 'tnt';
                    entity.consume(entity.player.rightHandPos);
                    await sleep(2872);
                    ball(e.position.x, e.position.y, e.position.z, 3, 4, true, 'air', { damageType: 'tnt' });
                    e.destroy();
                } else if (entity.player.tool == 'waterBucket') {
                    voxels.setVoxelId(v.x, v.y, v.z, 364);
                    entity.player.inventory[entity.player.rightHandPos][0] = 'bucket'
                    entity.player.tool = 'bucket'
                    entity.setQuickInvUI(entity.player.rightHandPos, false)
                    entity.addRightHandWear()
                    entity.player.sound('audio/pourWater.mp3')
                } else if (entity.player.tool == 'ladder') {
                    v = voxelIndex.add(normal);
                    for (let [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
                        let v_ = voxels.getVoxelId(v.x + dx, v.y, v.z + dz);
                        if (![0, 364, 426, 650].includes(v_)) {
                            voxels.setVoxelId(v.x, v.y, v.z, 426);
                            entity.consume(entity.player.rightHandPos);
                            return;
                        }
                    }
                } else {
                    let voxelCollisionBox = new GameBounds3(v, v.add(new GameVector3(1, 1, 1)));
                    if (world.searchBox(voxelCollisionBox).length) {
                        return;
                    }

                    let estPos = entity.position.add(new GameVector3(entity.velocity.x * 2, (entity.velocity.y ? entity.velocity.y * 2 - 0.33 : 0), entity.velocity.z * 2));
                    let estPlayerCollisionBox = new GameBounds3(estPos.sub(entity.bounds), estPos.add(entity.bounds));
                    if (voxelCollisionBox.intersects(estPlayerCollisionBox)) {
                        entity.position.copy(entity.ttPos.add({ x: 0, y: 1, z: 0 }));
                    }

                    voxels.setVoxelId(v.x, v.y, v.z, [177, 135, 389, 141, 170, 175][['wool', 'sand', 'enderStone', 'plank', 'glass', 'obdisian'].indexOf(entity.player.tool)]);
                    entity.consume(entity.player.rightHandPos);
                }
            } else if (entity.player.tool == 'goldenApple') {
                let toolnow = entity.player.rightHandPos;
                let released = false;
                setTimeout(() => {
                    if (released || entity.player.spectator || entity.destroyed) return;
                    entity.consume(toolnow)
                    entity.player.directMessage('已食用金苹果')
                    entity.player.effectList[1] += 120
                    entity.maxHp = 24;
                    if (entity.hp > 0) {
                        entity.hp = Math.min(entity.maxHp, entity.hp + 4)
                        remoteChannel.sendClientEvent(entity, { type: 'changeHp', args: { hp: entity.hp } });
                    }
                    entity.player.effectList[2] += 5
                    return;
                }, 1500)
                do {
                    await world.nextTick()
                } while (entity.player.action1Button && entity.player.rightHandPos == toolnow && entity.player.openInventoryType == '');
                released = true
                return;
            } else if (entity.player.tool == 'fireBall' && entity.player.cameraMode == 'fps' && !entity.player.itemCD[0]) {
                var e = world.createEntity({
                    position: entity.position.add(new GameVector3(0, 0.52734375, 0)),
                    mesh: 'mesh/火焰弹.vb',
                    gravity: false,
                    collides: true,
                    meshScale: new GameVector3(0.05, 0.05, 0.05),
                    meshOrientation: new GameQuaternion(0, 0, 0, 1).rotateY(Math.atan2(direction.z, direction.x)),//.rotateY(Math.PI / 2),
                    velocity: direction.mul(new GameVector3(1.5, 1.5, 1.5)),
                    fixed: false,
                })
                e.id = 'fireBall'
                e.shooter = entity
                e.addTag('fly')
                e.friction = 1//512
                e.mass = 1
                e.delta = direction.mul(new GameVector3(0.3, 0.3, 0.3))
                entity.consume(entity.player.rightHandPos)
                entity.player.itemCD[0] = true
                setTimeout(() => {
                    entity.player.itemCD[0] = false
                }, 500)
                return;
            } else if (entity.player.tool == 'enderPearl' && entity.player.cameraMode == 'fps' && !entity.player.itemCD[1]) {
                var e = world.createEntity({
                    position: entity.position.add(new GameVector3(0, 0.52734375, 0)),
                    mesh: 'mesh/末影珍珠.vb',
                    gravity: false,
                    collides: true,
                    meshScale: new GameVector3(0.05, 0.05, 0.05),
                    meshOrientation: new GameQuaternion(0, 0, 0, 1).rotateY(Math.atan2(direction.z, direction.x)).rotateY(Math.PI / 2),
                    velocity: direction.mul(new GameVector3(3, 3, 3)),
                    fixed: false,
                })
                e.id = 'enderPearl'
                e.addTag('fly')
                e.shooter = entity
                e.friction = 1
                e.mass = 0
                entity.consume(entity.player.rightHandPos)
                entity.player.itemCD[1] = true
                setTimeout(() => {
                    entity.player.itemCD[1] = false
                }, 1000)
                return;
            } else if (entity.player.tool == 'egg' && entity.player.cameraMode == 'fps') {
                var e = world.createEntity({
                    //position: entity.position.add(new GameVector3(direction.x * 1.75 + entity.velocity.x * 3, direction.y * 0 + entity.velocity.y * 2.45 - 1.75, direction.z * 1.75 + entity.velocity.z * 3)),
                    position: new GameVector3(entity.position.x + direction.x + entity.velocity.x * 2, entity.position.y + direction.y - 1, entity.position.z + direction.z + entity.velocity.z * 2),
                    mesh: 'mesh/搭路蛋.vb',
                    gravity: false,
                    collides: true,
                    meshScale: new GameVector3(0.05, 0.05, 0.05),
                    meshOrientation: new GameQuaternion(0, 0, 0, 1).rotateY(Math.atan2(direction.z, direction.x)).rotateY(Math.PI / 2),
                    velocity: direction.mul(new GameVector3(1.5, 1.5, 1.5)),
                    fixed: false,
                })
                e.id = 'egg'
                e.addTag('fly')
                e.shooter = entity
                e.friction = 1
                e.mass = 0
                entity.consume(entity.player.rightHandPos)
                return;
            } else if (entity.player.tool == 'milk') {
                entity.player.effectList[5] += 30
                entity.consume(entity.player.rightHandPos)
                return;
            } else if (entity.player.tool == 'compass') {
                if (!take(entity, 'emerald', 1, false)) return entity.player.directMessage('你没有足够的绿宝石！'/*You don't have enough emeralds!*/);
                let trackOp = []
                for (let i = 0; i < 4; i++) {
                    if (allplayers[i] > 0) trackOp.push(`${['红', '蓝', '绿', '黄'][i]}队`)
                }
                var trackResult = await entity.player.dialog({
                    type: GameDialogType.SELECT,
                    title: '追踪队伍',
                    content: '请选择要追踪的队伍',
                    options: trackOp
                })
                if (!trackResult || trackResult == null) return
                if (trackResult) {
                    take(entity, 'emerald', 1, true)
                    entity.player.track = ['red', 'blue', 'green', 'yellow'][['红队', '蓝队', '绿队', '黄队'].indexOf(trackResult.value)]
                    entity.player.directMessage('已追踪' + trackResult.value)
                }
                return;
            } else if (['invisiblePotion', 'jumpPotion', 'speedPotion'].includes(entity.player.tool)) {
                var toolnow = entity.player.rightHandPos
                let index = ['invisiblePotion', 'jumpPotion', 'speedPotion'].indexOf(entity.player.tool)
                let released = false
                setTimeout(() => {
                    if (released || entity.player.spectator || entity.destroyed) return;
                    entity.consume(toolnow);
                    if (index == 0) {
                        if (entity.player.effectList[0] == 0) {
                            entity.invisible();
                        }
                        entity.player.effectList[0] += 30
                    } else if (index == 1) {
                        entity.player.jumpPower = JumpPowerV
                        entity.player.effectList[3] += 45
                    } else if (index == 2) {
                        entity.player.cameraFovY = entity.player.fovy * 1.2
                        entity.player.effectList[4] += 45
                        entity.player.walkSpeed = entity.player.runSpeed = RunSpeed * 1.4
                    }
                    return;
                }, 1600)
                do {
                    await world.nextTick();
                } while (entity.player.action1Button && entity.player.rightHandPos == toolnow && entity.player.openInventoryType == '');
                released = true;
                return;
            } else if (entity.player.tool == 'plate' && entity.position.y > 0) {
                if (!entity.player.ableplate) {
                    entity.directMsg('救援平台仍在冷却中！');
                    return;
                }
                if (entity.position.y > 32) {
                    entity.directMsg('你太高了！');
                    return;
                }
                entity.fallStart = -999
                entity.velocity.y = 0
                var plateVoxels = []
                for (x = Math.round(entity.position.x - 2); x <= Math.round(entity.position.x + 2); x++) {
                    for (z = Math.round(entity.position.z - 2); z <= Math.round(entity.position.z + 2); z++) {
                        var y = Math.floor(entity.position.y - entity.bounds.y - 1)
                        if (voxels.getVoxelId(x, y, z) == 0) {
                            voxels.setVoxelId(x, y, z, 278)
                            plateVoxels.push(new GameVector3(x, y, z))
                        }
                    }
                }
                entity.consume(entity.player.rightHandPos)
                entity.player.ableplate = false
                setTimeout(() => {
                    plateVoxels.forEach((pv) => {
                        if (voxels.getVoxelId(pv.x, pv.y, pv.z) == 278) {
                            voxels.setVoxelId(pv.x, pv.y, pv.z, 0)
                            breakLadder(pv.x, pv.y, pv.z)
                        }
                    });
                }, 15000);
                setTimeout(() => {
                    entity.player.ableplate = true
                }, 30000);
                return;
            } else if (entity.player.tool.includes('bow') && entity.player.cameraMode == 'fps') {
                if (!take(entity, 'arrow', 1, false)) {
                    return;
                }
                let toolnow = entity.player.rightHandPos
                let startShoot = tick;
                do {
                    await world.nextTick();
                } while (entity.player.action1Button && entity.player.rightHandPos == toolnow);
                let endShoot = tick;
                let bowTime = Math.min(20, endShoot - startShoot);
                let arrowSpeed = bowTimeToDeg(bowTime) * 3.75;
                if (arrowSpeed < 1) {
                    return;
                }
                take(entity, 'arrow', 1, true)
                let eArrow = world.createEntity({
                    position: entity.position.add(new GameVector3(0, 0.52734375, 0)),
                    mesh: 'mesh/arrow.vb',
                    gravity: false,
                    collides: true,
                    meshScale: new GameVector3(0.01, 0.01, 0.01),//(0.0039065, 0.0039065, 0.0039065)
                    meshOrientation: entity.player.direction.toQuaternion(),
                    velocity: entity.player.direction.mul(new GameVector3(arrowSpeed, arrowSpeed, arrowSpeed)),
                    fixed: false,
                    id: 'arrow',
                    friction: 1,
                    mass: 0
                });
                eArrow.addTag('fly')
                if (entity.player.tool == 'bow') {
                    eArrow.damage = 2
                } else {
                    eArrow.damage = 3
                }
                if (entity.player.tool == 'bow2') {
                    eArrow.kbpro = 1;
                } else {
                    eArrow.kbpro = 0;
                }
                eArrow.shooter = entity;
                eArrow.direction = entity.player.direction;
                eArrow.full = bowTime == 20 ? true : false
                eArrow.ablePicked = false
                return;
            }
        } else if (button === 'action0') {
            if (entity.player.cameraMode == 'follow') return;
            if (hitVoxel && (hitVoxel == 364 || hitVoxel == 426)) {
                let raycast_ = world.raycast(origin, direction, { ignoreFluid: true, ignoreSelector: `.${entity.player.userId}` });
                hitEntity = raycast_.hitEntity;
                distance = raycast_.distance;
                hitPosition = raycast_.hitPosition;
                origin = raycast_.origin;
            }
            if (hitEntity) {
                if (hitEntity.isPlayer) {
                    /*近战攻击*/
                    if (entity.player.team === hitEntity.player.team ||
                        hitEntity.player.dead || entity.player.dead ||
                        entity.player.fangkan || hitEntity.player.spectator) return;
                    let pos_ = origin.add(new GameVector3(entity.velocity.x * 2, entity.velocity.y * 2 - 0.36, entity.velocity.z * 2));
                    let distance_ = pos_.distance(hitPosition);
                    if (distance_ > 3) return;
                    let direction = hitEntity.position.sub(pos_);
                    direction.y = 0;
                    let dist = direction.mag();
                    let noKb = Boolean(hitEntity.player.tickDamage);
                    let damage = entity.player.moveState === 'fall' && !entity.hasTag('inTrap') ? (SHOP[entity.player.tool][5] + 1) * 1.5 : SHOP[entity.player.tool][5] + 1
                    let sharp = entity.player.tool.includes('Sword') ? teamupgrades[['red', 'blue', 'green', 'yellow'].indexOf(entity.player.team)][2] : 0//锋利
                    damage = calculateDamage(damage, hitEntity.player.defence, teamupgrades[['red', 'blue', 'green', 'yellow'].indexOf(hitEntity.player.team)][3] * 4, 0, sharp)
                    damage = hitEntity.player.fangkan ? damage / 2 : damage
                    hitEntity.tickHurt(damage, { attacker: entity, damageType: 'hit' });
                    if (noKb) return;
                    hitEntity.player.color = new GameRGBColor(1, 0, 0);
                    setTimeout(() => {
                        if (entity.destroyed) {
                            return;
                        }
                        hitEntity.player.color = new GameRGBColor(1, 1, 1)
                    }, 500);
                    if (hitEntity.player.crouchButton) {
                        hitEntity.velocity.y = 0.49;
                        let kbFactor = hitEntity.player.walkState ?
                            entity.player.firstAttack ? 0.52 : 0.4 :
                            entity.player.firstAttack ? 0.48 : 0.37;
                        kbFactor = inFluid(hitEntity, 426) ? kbFactor * 0.3 : kbFactor
                        kbFactor = entity.player.tool == 'knockbackStick' ? kbFactor * 1.25 : kbFactor
                        for (let i = 0; i < 8; i++, await sleep(16)) {
                            hitEntity.position.x += hitEntity.velocity.x + direction.x / dist * kbFactor;
                            hitEntity.position.z += hitEntity.velocity.z + direction.z / dist * kbFactor;
                        }
                    } else {
                        let kbFactor = hitEntity.player.walkState ?
                            entity.player.firstAttack ? 0.9 : 0.7 :
                            entity.player.firstAttack ? 0.7 : 0.5;
                        kbFactor = inFluid(hitEntity, 426) ? kbFactor * 0.3 : kbFactor
                        kbFactor = entity.player.tool == 'knockbackStick' ? kbFactor * 1.5 : kbFactor
                        hitEntity.velocity.x += direction.x / dist * kbFactor;
                        hitEntity.velocity.y = 0.49;
                        hitEntity.velocity.z += direction.z / dist * kbFactor;
                    }
                    if (entity.player.firstAttack) {
                        entity.player.firstAttack = false;
                    }
                } else if (hitEntity.id == 'fireBall' && distance <= 3) {
                    hitEntity.velocity.copy(direction)
                    hitEntity.shooter = entity
                }
            } else {
                /*射线重构*/
                let raycast_;
                if (hitVoxel && hitVoxel == 426) {
                    raycast_ = world.raycast(origin, direction, { ignoreEntities: true });
                } else {
                    raycast_ = world.raycast(origin, direction, { ignoreEntities: true, ignoreFluid: true });
                }
                [distance, voxelIndex, hitVoxel] = [raycast_.distance, raycast_.voxelIndex, raycast_.hitVoxel];
                if (hitVoxel && distance <= 4.5 && !entity.player.fangkan) {
                    if ([177, 135, 389, 141, 170, 175, 426].includes(hitVoxel)) {
                        const index = [177, 135, 389, 141, 170, 175, 426].indexOf(hitVoxel)
                        let time = (Object.keys(BlockDatas[hitVoxel]).includes(entity.player.tool) ?
                            BlockDatas[hitVoxel][entity.player.tool] : BlockDatas[hitVoxel]['others'])
                            * (1 - 0.2 * teamupgrades[['red', 'blue', 'green', 'yellow'].indexOf(entity.player.team)][1])
                        if (entity.player.effectList[6]) time *= 3
                        const startTool = entity.player.rightHandPos;
                        let released = false;
                        setTimeout(() => {
                            if (entity.destroyed || released || !voxels.getVoxelId(voxelIndex.x, voxelIndex.y, voxelIndex.z)) {
                                return;
                            }
                            voxels.setVoxelId(voxelIndex.x, voxelIndex.y, voxelIndex.z, 0);
                            if (hitVoxel != 426) {
                                breakLadder(voxelIndex.x, voxelIndex.y, voxelIndex.z)
                            }
                            if (BlockDatas[hitVoxel]['fall'].includes(entity.player.tool) || BlockDatas[hitVoxel]['fall'][0] == 'all') {
                                entity.give(['wool', 'sand', 'enderStone', 'plank', 'glass', 'obdisian', 'ladder'][index], 1, 64)
                            }
                            return;
                        }, time * 1000);
                        do {
                            await world.nextTick();
                        } while (entity.player.action0Button && entity.player.rightHandPos == startTool && voxels.getVoxelId(voxelIndex.x, voxelIndex.y, voxelIndex.z));
                        released = true;
                        return;
                    } else if (hitVoxel == 650 && timer > 10) {
                        let index = 0;
                        let isBed = false
                        for (let i = 0; i < 4; i++) {
                            if (BedPos[i].some(p => { return p.equals(voxelIndex) })) {
                                index = i
                                isBed = true
                                break;
                            }
                        }
                        if (!isBed || entity.player.team == ['red', 'blue', 'green', 'yellow'][index] || !respawnable[index]) return;
                        let released = false;
                        const startTool = entity.player.rightHandPos;
                        const time = entity.player.effectList[6] ? 900 : 300;
                        setTimeout(() => {
                            if (entity.destroyed || released || !voxels.getVoxelId(voxelIndex.x, voxelIndex.y, voxelIndex.z)) {
                                return;
                            }
                            world.querySelectorAll('.bed').forEach(async bed => {
                                if (bed.id[0] == ['红', '蓝', '绿', '黄'][index]) {
                                    bed.meshInvisible = true;
                                }
                            });
                            for (let i = 0; i < 2; i++) {
                                voxels.setVoxelId(BedPos[index][i].x, BedPos[index][i].y, BedPos[index][i].z, 0)
                            }
                            sendMsg(entity.player.titleList[0].replace('玩家名', entity.player.name) + '摧毁了' + ['红', '蓝', '绿', '黄'][index] + '队的床！',
                                entity.player.titleList[0].length - 3,
                                TitleColor[entity.player.titleList[0].slice(0, -3)]
                            );
                            entity.player.singleGameData[2]++;
                            let scoreAdd = Math.round(Math.random() * 5 + 15);
                            scoreAdd = world.querySelectorAll('player').length > 10 ? scoreAdd : Math.round(scoreAdd * 0.4);
                            const currentHour = new Date().getHours() + 8;
                            if (entity.player.url.searchParams.get('serverId') !== null || (currentHour >= 22 && currentHour < 8)) scoreAdd = 0;
                            else entity.player.beds++;
                            const xpAdd = Math.round(Math.random() * 100 + 150);
                            entity.player.scoreS2 += scoreAdd;
                            entity.directMsg(`你获得了${xpAdd}点经验、${scoreAdd}点赛季积分`);
                            entity.player.xp += xpAdd;
                            levelUp(entity);
                            remoteChannel.sendClientEvent(entity, { type: 'changeData', args: { index: 2, datas: entity.player.singleGameData, single: true } });
                            respawnable[index] = false
                            world.querySelectorAll('player').forEach(async e => {
                                remoteChannel.sendClientEvent(e, { type: 'changeBed', args: { index: index, beds: respawnable, single: true } });
                                if (e.player.team == ['red', 'blue', 'green', 'yellow'][index]) {
                                    deadplayers.push(e.player.userId)
                                    remoteChannel.sendClientEvent(e, { type: 'showText', args: { content: '床被摧毁！', show: true } });
                                    setTimeout(() => {
                                        if (e.destroyed) return;
                                        remoteChannel.sendClientEvent(e, { type: 'showText', args: { content: '床被摧毁！', show: false } });
                                    }, 2000);
                                }
                            });
                            calculatePlayer();
                            return;
                        }, time);
                        do {
                            await world.nextTick();
                        } while (entity.player.action0Button && entity.player.rightHandPos == startTool && voxels.getVoxelId(voxelIndex.x, voxelIndex.y, voxelIndex.z));
                        released = true;
                        return;
                    }
                }
            }
        } else if (entity.player.enableRun && (button === 'walk' || button === 'run')) {
            entity.player.firstAttack = true;
        }
    });
    entity.player.releaseEvent = entity.player.onRelease(({ button, raycast }) => {
        if (button !== 'action0' && button !== 'action1') {
            entity.player.afkTime = 0;
        };
        if (entity.player.spectator) { return; }
        if (button === 'action1') {
            entity.player.pressAction1 = false
            entity.player.direction = raycast.direction;
            if (entity.player.walkButton) {
                entity.player.firstAttack = true
            }
        } else if (button === 'crouch') {
            if (!entity.player.spectator) {
                entity.player.effectList[0] == 0 && (entity.player.showName = true);
                if (entity.player.walkButton) {
                    entity.player.firstAttack = true
                }
            }
        } else if (button === 'run' || button === 'walk') {
            entity.player.firstAttack = false;
        }
    });
});


