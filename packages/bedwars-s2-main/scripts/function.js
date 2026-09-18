const {
    SHOP,
    JumpPower,
    JumpPowerII,
    Friction,
    WearDatas,
    TrapBounds,
    BedPos,
    ClothesList,
    TitleColor,
    HELP,
    ASCII_form,
    Keys
} = require("./config.js")

globalThis.find = n => world.querySelectorAll('player').find(e => e.player.name == n) ? world.querySelectorAll('player').find(e => e.player.name == n) : false
globalThis.findById = n => world.querySelectorAll('player').find(e => e.player.userId == n) ? world.querySelectorAll('player').find(e => e.player.userId == n) : false

// 计算游戏内人数
function calculatePlayer() {
    var zeronum = 0
    for (const p of allplayers) {
        if (p <= 0) zeronum++
    }
    if (zeronum >= 3) gameRestart()
}

/**计算伤害*/
function calculateDamage(damage, defence, protect, strength, sharpness) {
    return (damage * (1 - defence / 25) + 3 * strength + 1.25 * sharpness) * (1 - (protect * (Math.random() / 2 + 0.5) / 25))
}

/**分配队伍*/
GameEntity.prototype.setTeam = function () {
    if (deadplayers.includes(this.player.userId)) {
        this.player.spectator = true
        this.player.invisible = true
        this.player.showName = false
        this.position.set(127, 64, 127)
        this.player.spawnPoint.copy(this.position)
        this.player.directMessage('您已最终击杀！')
    } else {
        var aliveTeams = ['红', '绿', '蓝', '黄']
        for (let i = 0; i < 4; i++) {
            if (!respawnable[i]) {
                aliveTeams = aliveTeams.filter(t => t !== ['红', '蓝', '绿', '黄'][i])
            }
        }
        if (aliveTeams.length == 0) {
            this.player.spectator = true
            this.player.invisible = true
            this.player.showName = false
            this.position.set(127, 64, 127)
            this.player.spawnPoint.copy(this.position)
            this.player.directMessage('全部床已被摧毁！')
        } else if (this.player.team == '') {
            separateTeam([this], aliveTeams)
        }
    }
}

function joinTeam(entities, team) {
    entities.forEach(async (entity) => {
        const i = ['红', '蓝', '绿', '黄'].indexOf(team)
        allplayers[i] += 1
        sendMsg(entity.player.titleList[0].replace('玩家名', entity.player.name) + ' 加入了' + team + '队',
            entity.player.titleList[0].length - 3,
            TitleColor[entity.player.titleList[0].slice(0, -3)]
        );
        entity.position = [new GameVector3(224.5, 43, 127.5), new GameVector3(127.5, 43, 224.5), new GameVector3(30.5, 43, 127.5), new GameVector3(127.5, 43, 30.5)][i]
        entity.player.spawnPoint.copy(entity.position);
        entity.player.team = ['red', 'blue', 'green', 'yellow'][i]
        entity.player.track = entity.player.team
        entity.player.wearables().forEach((item) => {
            item.remove();
        });
        remoteChannel.sendClientEvent(entity, { type: 'setYou', args: { team: i, v: true } });
        remoteChannel.sendClientEvent(entity, { type: 'changeUpgrade', args: { upg: teamupgrades[['red', 'blue', 'green', 'yellow'].indexOf(entity.player.team)] } })
        entity.wear(team + '色皮革头盔', 'head')
        entity.wear(team + '色皮革胸甲', 'torso')
        entity.wear(team + '色皮革护肩', 'right_upper_arm')
        entity.wear(team + '色皮革靴子', 'right_foot')
        entity.wear(team + '色皮革护肩', 'left_upper_arm')
        entity.wear(team + '色皮革靴子', 'left_foot')
        entity.wear('木剑', 'sword', teamupgrades[i][2])
        entity.player.setCameraPitch(0);
        entity.player.setCameraYaw([0, Math.PI / 2, Math.PI, Math.PI * 3 / 2][i]);
    });
}

function separateTeam(entities, aliveTeams) {
    var teamMembers = []
    for (const team of aliveTeams) {
        teamMembers.push(allplayers[['红', '蓝', '绿', '黄'].indexOf(team)])
    }
    const min = Math.min.apply(null, teamMembers)
    for (let i = 0; i < teamMembers.length; i++) {
        if (teamMembers[i] == min) {
            joinTeam(entities, aliveTeams[i])
            break;
        }
    }
}

/**伤害 */
GameEntity.prototype.tickHurt = function (amount, options = {}) {
    if (amount <= this.player.tickDamage) {
        return;
    }
    if (!this.player.tickDamage) {
        this.player.effectList[8] += 2
        if (options.attacker) this.player.beAttackedPlayer = options.attacker
        setTimeout(() => {
            if (this.destroyed) {
                return;
            }
            this.player.tickDamage = 0;
        }, 500);
    }
    this.hurt(amount - this.player.tickDamage, options);
    this.player.tickDamage = amount;
}

/**摔落伤害 */
function sjs() {
    this.initFallDamage = function () {
        world.onTick(() => {
            world.querySelectorAll("player").filter(x => x.player.spectator == false && x.player.loaded).forEach(e => {
                var x = Math.round(e.position.x);
                var y = Math.round(e.position.y) - 1;
                var z = Math.round(e.position.z);
                let reFall = voxels.getVoxelId(x, y, z) == 364 || voxels.getVoxelId(x - 1, y, z) == 364
                    || voxels.getVoxelId(x, y, z - 1) == 364 || voxels.getVoxelId(x - 1, y, z - 1) == 364
                    || voxels.getVoxelId(x, y, z) == 426 || voxels.getVoxelId(x - 1, y, z) == 426
                    || voxels.getVoxelId(x, y, z - 1) == 426 || voxels.getVoxelId(x - 1, y, z - 1) == 426;
                if (reFall) {
                    e.fallStart = -999;
                    return;
                }
                if (e.velocity.y >= 0) {
                    let safeHeight = 4
                    if (e.player.effectList[3]) { safeHeight = 9 }
                    else if (e.player.effectList[7]) { safeHeight = 6 }
                    if (e.fallStart - e.position.y > safeHeight) {
                        let damage = e.fallStart - e.position.y - safeHeight
                        e.tickHurt(Math.max(calculateDamage(damage, 0, teamupgrades[['red', 'blue', 'green', 'yellow'].indexOf(e.player.team)][3] * 4, 0, 0)), { damageType: 'fall' })
                    }
                    e.fallStart = -999;
                } else if (e.fallStart == -999) {
                    e.fallStart = e.position.y;
                }
            })
        })
    }
}

/**隐身 */
GameEntity.prototype.invisible = function () {
    this.player.setSkinByName('隐形人')
    this.showHealthBar = false;
    this.player.showName = false;
    const bodyPartList = [GameBodyPart.HEAD, GameBodyPart.TORSO, GameBodyPart.LEFT_UPPER_ARM, GameBodyPart.RIGHT_UPPER_ARM, GameBodyPart.RIGHT_FOOT, GameBodyPart.LEFT_FOOT, GameBodyPart.LEFT_HAND]
    for (let i = 0; i < bodyPartList.length; i++) {
        this.player.wearables(bodyPartList[i]).forEach((item) => {
            item.remove();
        });
    }
}
GameEntity.prototype.visible = function () {
    this.player.resetToDefaultSkin()
    this.showHealthBar = true;
    this.player.showName = true;
    let team = ['红', '蓝', '绿', '黄'][['red', 'blue', 'green', 'yellow'].indexOf(this.player.team)]
    let bootType = [`${team}色皮革靴子`, `锁链靴子`, `铁靴子`, `钻石靴子`][[7, 9, 11, 13].indexOf(this.player.defence)]
    this.wear(team + '色皮革头盔', 'head')
    this.wear(team + '色皮革胸甲', 'torso')
    this.wear(team + '色皮革护肩', 'right_upper_arm')
    this.wear(bootType, 'right_foot', teamupgrades[['red', 'blue', 'green', 'yellow'].indexOf(this.player.team)][3] > 0)
    this.wear(team + '色皮革护肩', 'left_upper_arm')
    this.wear(bootType, 'left_foot', teamupgrades[['red', 'blue', 'green', 'yellow'].indexOf(this.player.team)][3] > 0)
    this.dressUp();
}

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
}

/**破坏梯子 */
function breakLadder(x, y, z) {
    const bl = [[x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1]]
    for (const pos of bl) {
        if (voxels.getVoxelId(pos[0], y, pos[1]) == 426) {
            voxels.setVoxelId(pos[0], y, pos[1], 0)
        }
    }
}

/**主手物品显示 */
GameEntity.prototype.addRightHandWear = function () {
    this.player.wearables(GameBodyPart.RIGHT_HAND).forEach((item) => {
        item.remove()
    })
    const item = SHOP[this.player.tool]
    if (!item) return;
    if (this.player.tool.includes('Sword')) {
        this.wear(item[0], 'sword', teamupgrades[['red', 'blue', 'green', 'yellow'].indexOf(this.player.team)][2] > 0)
    } else if (this.player.tool.includes('Pickaxe') || this.player.tool.includes('Axe') || this.player.tool == 'scissors') {
        this.wear(item[0], 'sword', teamupgrades[['red', 'blue', 'green', 'yellow'].indexOf(this.player.team)][1] > 0)
    } else if (['wool', 'sand', 'enderStone', 'plank', 'obdisian', 'tnt', 'glass'].includes(this.player.tool)) {
        this.wear(item[0], 'block')
    } else if (['fireBall', 'enderPearl', 'iron', 'gold', 'emerald', 'diamond', 'waterBucket', 'bucket', 'invisiblePotion', 'jumpPotion', 'goldenApple', 'egg', 'speedPotion', 'compass', 'milk', 'ladder'].includes(this.player.tool)) {
        this.wear(item[0], 'item')
    } else if (this.player.tool == 'knockbackStick') {
        this.wear(item[0], 'sword', true)
    } else if (this.player.tool == 'plate') {
        this.wear(item[0], 'sword', false)
    } else if (this.player.tool.includes('bow')) {
        this.wear('弓', 'bow', this.player.tool != 'bow')
    } else if (this.player.tool == 'arrow') {
        this.wear('箭', 'arrow')
    }
}

/**更新玩家快捷栏UI*/
GameEntity.prototype.setQuickInvUI = function (index, all = false) {
    if (all) {
        remoteChannel.sendClientEvent(this, { type: 'setAllQI', args: { playerInventory: this.player.inventory.slice(0, 9) } });
    } else {
        remoteChannel.sendClientEvent(this, { type: 'setSingleQI', args: { index: index, image: this.player.inventory[index][0], number: this.player.inventory[index][1] } });
    }
}

/**给予玩家物品*/
GameEntity.prototype.give = function (thing, number, maxStack) {
    let index = 0
    let leftNum = number
    for (let i = 0; i < this.player.inventory.length; i++) {
        if (this.player.inventory[i][0] == thing) {
            if (this.player.inventory[i][1] + leftNum >= maxStack) {
                leftNum -= maxStack - this.player.inventory[i][1]
                this.player.inventory[i][1] = maxStack
            } else if (this.player.inventory[i][1] + leftNum < maxStack) {
                this.player.inventory[i][1] += leftNum
                leftNum = 0
            }
        }
    }
    if (leftNum > 0) {
        let s = false
        for (const item of this.player.inventory) {
            if (item[0] == '') {
                if (leftNum <= maxStack) {
                    this.player.inventory[index] = [thing, leftNum]
                } else {
                    this.player.inventory[index] = [thing, 1]
                    this.give(thing, leftNum - 1, maxStack)
                }
                s = true
                break;
            }
            index += 1
        }
        if (!s) return
    }
    this.player.tool = this.player.inventory[this.player.rightHandPos][0]
    this.setQuickInvUI(0, true)
    this.addRightHandWear()
    if (this.player.openInventoryType != '') {
        remoteChannel.sendClientEvent(this, { type: 'setinventory', args: { playerInventory: this.player.inventory } });
    }
}

/**取走玩家物品*/
function take(entity, thing, number, take) {
    let index = 0
    let leftNum = number
    let ownnum = 0
    for (const item of entity.player.inventory) {
        if (item[0] == thing) {
            ownnum += item[1]
        }
    }
    if (ownnum < leftNum) {
        return false;
    } else if (!take) {
        return true
    }
    for (const item of entity.player.inventory) {
        if (item[0] == thing) {
            if (item[1] >= leftNum) {
                if (item[1] > leftNum) {
                    entity.player.inventory[index][1] -= leftNum
                } else {
                    entity.player.inventory[index] = ['', 1]
                }
                leftNum = 0
                break;
            } else if (item[1] < leftNum) {
                leftNum -= item[1]
                entity.player.inventory[index] = ['', 1]
            }
        }
        index += 1
    }
    entity.player.tool = entity.player.inventory[entity.player.rightHandPos][0]
    entity.setQuickInvUI(0, true)
    entity.addRightHandWear()
    if (entity.player.openInventoryType != '') {
        remoteChannel.sendClientEvent(entity, { type: 'setinventory', args: { playerInventory: entity.player.inventory } });
    }
    return true;
}

/**消耗玩家主手物品*1 */
GameEntity.prototype.consume = function (pos) {
    this.player.inventory[pos][1] -= 1
    if (this.player.inventory[pos][1] == 0) {
        this.player.inventory[pos] = ['', 1]
        if (this.player.inventory[this.player.rightHandPos][0] == '') this.player.tool = '';
        this.addRightHandWear()
    }
    this.setQuickInvUI(pos, false)
}

/**爆炸*/
function ball(x, y, z, r, dr, breakBlock = true, block = 'air', options = { damageType: 'tnt' }) {
    if (breakBlock) {
        for (let i = Math.floor(x) - r; i <= Math.floor(x) + r; i++) {
            for (let j = Math.floor(y) - r; j <= Math.floor(y) + r; j++) {
                for (let k = Math.floor(z) - r; k <= Math.floor(z) + r; k++) {
                    if (new GameVector3(i, j, k).distance(new GameVector3(x, y, z)) <= r) {
                        let raycast_ = world.raycast(new GameVector3(x, y, z), new GameVector3(i + 0.5, j + 0.5, k + 0.5).sub(new GameVector3(x, y, z)), { ignoreEntities: true })
                        let hitVoxel = raycast_.hitVoxel
                        if (hitVoxel == 170) continue;
                        if (voxels.getVoxelId(i, j, k) == 426) {
                            voxels.setVoxelId(i, j, k, voxels.id(block));
                        }
                        if (voxels.getVoxelId(i, j, k) == 177 || voxels.getVoxelId(i, j, k) == 141) {
                            voxels.setVoxelId(i, j, k, voxels.id(block));
                            breakLadder(i, j, k)
                        }
                        if (options.damageType == 'tnt' && (voxels.getVoxelId(i, j, k) == 389 || voxels.getVoxelId(i, j, k) == 135)) {
                            voxels.setVoxelId(i, j, k, voxels.id(block))
                            breakLadder(i, j, k)
                        }
                    }
                }
            }
        }
    }
    world.querySelectorAll('*').filter(e => e.position.distance(new GameVector3(x, y, z)) <= dr).forEach(e => {
        if ((e.isPlayer && !e.player.tickDamage) || (e.id == 'tnt' && options.damageType != 'fireBall') || e.id == 'enderPearl') {
            let force = 5;
            if (options.damageType == 'fireBall' && e.isPlayer || e.id == 'tnt' || e.id == 'enderPearl') force = 3.6
            let direction = e.position.sub(new GameVector3(x, y, z))
            let mag = direction.mag();
            let xzDist = mag * Math.sqrt(mag * 3 + 2)
            let yDist = Math.abs(direction.y) * Math.sqrt((mag + Math.sqrt(direction.x * direction.x + direction.z * direction.z)) * 3 + 3)
            let vy = Math.max(direction.y * force / yDist, 0.1);
            e.velocity.x += direction.x * force / xzDist
            e.velocity.y = options.damageType == 'tnt' ? 0.5 * vy : options.attacker === e ? vy : 0.75 * vy
            e.velocity.z += direction.z * force / xzDist
        }
        if (e.isPlayer && !e.player.spectator && !e.player.dead) {
            const damageOptions = {
                ...options,
                attacker: options.attacker && options.attacker.player.team == e.player.team ? null : options.attacker
            };
            e.tickHurt(calculateDamage(5, e.player.defence, teamupgrades[['red', 'blue', 'green', 'yellow'].indexOf(e.player.team)][3] * 4, 0, 0), damageOptions);
        }
        if (e.id == 'item' && options.damageType == 'fireBall') {
            emeralds.concat(diamonds).filter(x => { return x.pPos.equals(e.pPos) }).forEach((x) => {
                x.meshInvisible = true
                x.destroy()
            })
            emeralds = emeralds.filter(x => { return !x.meshInvisible })
            diamonds = diamonds.filter(x => { return !x.meshInvisible })
            emeraldPoints.concat(diamondPoints).filter(p => { return p[0].equals(e.pPos) }).forEach((p) => {
                p[1] = 0
            });
        }
    })
}

/**判断玩家是否进入液体*/
function inFluid(entity, fluidType) {
    if (entity.fluidContacts.length > 0) {
        for (const f of entity.fluidContacts) {
            if (f.voxel == fluidType) {
                return true
            }
        }
        return false
    } else {
        return false;
    }
}

/**陷阱*/
function addTrap(i) {
    return world.addZone({
        selector: 'player',
        bounds: {
            lo: TrapBounds[i][0],
            hi: TrapBounds[i][1]
        },
    })
}
function trapOnEnter(trap, i) {
    trap.onEnter(({ entity }) => {
        if (!entity.isPlayer || entity.player.spectator || !entity.player.loaded || entity.player.team == ['red', 'blue', 'green', 'yellow'][i] || entity.player.effectList[5] > 0) return
        if (teamTraps[i][0] == '这是个陷阱！') {
            entity.addTag('inTrap')
            teamTraps[i].shift()
            setTimeout(() => {
                if (entity.hasTag('inTrap')) entity.removeTag('inTrap')
            }, 10000);
        } else if (teamTraps[i][0] == '警报陷阱') {
            teamTraps[i].shift()
            if (entity.player.effectList[0]) {
                entity.player.effectList[0] = 0;
                entity.visible();
            }
            world.querySelectorAll('player').filter(e => e.player.team == ['red', 'blue', 'green', 'yellow'][i]).forEach(async x => {
                remoteChannel.sendClientEvent(x, { type: 'showText', args: { content: '有人拆床！', show: true } });
                x.directMsg(
                    entity.player.titleList[0].replace('玩家名', entity.player.name) + ' 触发了警报陷阱！',
                    entity.player.titleList[0].length - 3,
                    TitleColor[entity.player.titleList[0].slice(0, -3)]
                );
                setTimeout(() => {
                    if (x.destroyed) return;
                    remoteChannel.sendClientEvent(x, { type: 'showText', args: { content: '有人拆床！', show: false } });
                }, 2000);
            });
        } else if (teamTraps[i][0] == '反击陷阱') {
            teamTraps[i].shift()
            world.querySelectorAll('player').filter(e => e.player.team == ['red', 'blue', 'green', 'yellow'][i]).forEach(async x => {
                x.player.effectList[4] += 10
                x.player.cameraFovY = x.player.fovy * 1.2
                x.player.effectList[7] += 10
                if (x.player.effectList[3] == 0) x.player.jumpPower = JumpPowerII
            });

        } else if (teamTraps[i][0] == '挖掘疲劳陷阱') {
            teamTraps[i].shift()
            entity.player.effectList[6] = 15
        }
    })
}

/**Math */
function bowTimeToDeg(t) {
    return t * (t + 40) / 1200;
}
GameVector3.prototype.toQuaternion = function () {
    if (this.y === 0 && this.z === 0) {
        return new GameQuaternion(0, 1, 0, 0);
    }
    let t = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + 2 * this.x + 1);
    return new GameQuaternion((this.x + 1) / t, this.y / t, this.z / t, 0);
}
GameVector3.prototype.toUnitVector = function () {
    let t = this.mag();
    return this.div(new GameVector3(t, t, t));
}

/**广播 */
function sendMsg(content, titleLength = 0, titleColor = ['White', 0]) {
    remoteChannel.broadcastClientEvent({ type: 'message', args: { content: content, titleLength: titleLength, titleColor: titleColor } });
}
GameEntity.prototype.directMsg = function (content, titleLength = 0, titleColor = ['White', 0]) {
    remoteChannel.sendClientEvent(this, { type: 'message', args: { content: content, titleLength: titleLength, titleColor: titleColor } });
}

/**计算经验 */
function calculateXp(level) {
    if (level >= 1000) {
        return Infinity
    }
    return (((level + 1) ** 2 - level ** 2 + 1) * (60 - (40 - level)))
}
/**升级 */
function levelUp(entity) {
    if (entity.player.lv > 1000) return;
    var startLevel = entity.player.lv
    while (true) {
        if (entity.player.xp < calculateXp(entity.player.lv)) break;
        entity.player.xp -= calculateXp(entity.player.lv)
        entity.player.lv++
    }
    if (entity.player.lv == startLevel) return false;
    entity.directMsg(`你升到了${entity.player.lv}级！`);
    return true;
}

/**黑名单与白名单 */
async function ban(playerId) {
    let blackList = await GroupStorage.get('BlackList')
    if (!blackList.value.includes(playerId)) {
        blackList.value.push(playerId)
        await GroupStorage.update('BlackList', () => { return blackList.value })
        world.querySelectorAll('player').forEach(e => {
            if (e.player.userId == playerId) {
                e.player.kick()
            }
        })
    }
    return blackList.value
}
async function addWhiteList(playerId) {
    let whiteList = await GroupStorage.get('WhiteList')
    if (!whiteList.value.includes(playerId)) {
        whiteList.value.push(playerId)
        await GroupStorage.update('WhiteList', () => { return whiteList.value })
    }
    return whiteList.value
}

/**丢弃 */
GameEntity.prototype.throwAll = function () {
    if (this.player.chooseInventory[0] == 'inventory') {
        var a = this.player.inventory
    } else if (this.player.chooseInventory[0] == 'teamchest') {
        var i = this.player.chestType
        var a = teamchests[i]
    } else if (this.player.chooseInventory[0] == 'enderBag') {
        var a = this.player.enderBag
    }
    a[this.player.chooseInventory[1]] = ['', 1]
    remoteChannel.sendClientEvent(this, { type: 'setInventoryCase', args: { index: this.player.chooseInventory[1], s: false, type: 'inventory' } });
    if (this.player.chooseInventory[0] == 'inventory') {
        this.player.inventory[this.player.chooseInventory[1]] = a[this.player.chooseInventory[1]]
        remoteChannel.sendClientEvent(this, { type: 'setSingleItem', args: { index: this.player.chooseInventory[1], image: this.player.inventory[this.player.chooseInventory[1]][0], number: this.player.inventory[this.player.chooseInventory[1]][1] } });
    } else if (this.player.chooseInventory[0] == 'teamchest') {
        teamchests[i][this.player.chooseInventory[1]] = a[this.player.chooseInventory[1]]
        remoteChannel.sendClientEvent(this, { type: 'setSingleCI', args: { index: this.player.chooseInventory[1], image: teamchests[i][this.player.chooseInventory[1]][0], number: teamchests[i][this.player.chooseInventory[1]][1] } });
        world.querySelectorAll('player').forEach(async e => {
            if (e.player.chestType == this.player.chestType) {
                remoteChannel.sendClientEvent(e, { type: 'setSingleCI', args: { index: this.player.chooseInventory[1], image: teamchests[i][this.player.chooseInventory[1]][0], number: teamchests[i][this.player.chooseInventory[1]][1] } });
            }
        })
    } else if (this.player.chooseInventory[0] == 'enderBag') {
        this.player.enderBag[this.player.chooseInventory[1]] = a[this.player.chooseInventory[1]]
        remoteChannel.sendClientEvent(this, { type: 'setSingleCI', args: { index: this.player.chooseInventory[1], image: this.player.enderBag[this.player.chooseInventory[1]][0], number: this.player.enderBag[this.player.chooseInventory[1]][1] } });
    }
    this.player.tool = this.player.inventory[this.player.rightHandPos][0]
    if (this.player.chooseInventory[1] < 9) {
        this.setQuickInvUI(this.player.chooseInventory[1], false)
        this.addRightHandWear()
    }
    this.player.chooseInventory = ['', 0]
}

/**打开背包*/
GameEntity.prototype.openBag = function (open, type) {
    this.player.chooseInventory = ['', 0]
    this.player.enableJump = !open
    this.player.disableInputDirection = open ? 'both' : 'none'
    this.player.openInventoryType = open ? type : ''
    if (open) {
        this.player.pressAction1 = false
        this.player.cancelDialogs()
        remoteChannel.sendClientEvent(this, { type: 'showinventory', args: { show: true, type: type } });
        remoteChannel.sendClientEvent(this, { type: 'setinventory', args: { playerInventory: this.player.inventory } });
        if (type == 'teamchest') {
            remoteChannel.sendClientEvent(this, { type: 'setAllCI', args: { items: teamchests[this.player.chestType] } });
        } else if (type == 'enderBag') {
            remoteChannel.sendClientEvent(this, { type: 'setAllCI', args: { items: this.player.enderBag } });
        }
    } else {
        remoteChannel.sendClientEvent(this, { type: 'showinventory', args: { show: false, type: type } });
        if (type == 'teamchest') {
            this.player.chestType = false
            this.player.sound('audio/closeChest.mp3')
        } else if (type == 'enderBag') {
            this.player.sound('audio/closeChest.mp3')
        }
    }
    type == 'inventory' && remoteChannel.sendClientEvent(this, { type: 'setArmor', args: { armorType: this.player.wearables(GameBodyPart.LEFT_FOOT)[0]['mesh'].slice(5, -3), show: open } })
}

/**重新开始*/
async function gameRestart() {
    if (!restartAble) return;
    restartAble = false;
    let currentTime = Date.now();
    const baseScoreAdd = world.querySelectorAll('player').length > 10 ? 120 : 40;
    const gameLastingTime = gameStartTime === null ? null : currentTime - gameStartTime;
    for (let i = 0; i < 4; i++) {
        if (allplayers[i] > 0) {
            sendMsg(['红', '蓝', '绿', '黄'][i] + '队 赢得了胜利！')
        }
        const currentHour = new Date().getHours() + 8;
        if (world.querySelectorAll('player').length > 1 && currentHour < 22 && currentHour >= 8) {
            world.querySelectorAll('player').filter(e => e.player.team == ['red', 'blue', 'green', 'yellow'][i] && e.player.url.searchParams.get('serverId') === null).forEach(async (entity) => {
                let scoreAdd = gameLastingTime === null ? baseScoreAdd : Math.round((currentTime - entity.player.startPlayeringTime) / gameLastingTime * baseScoreAdd);
                if (entity.player.singleGameData[0] < 2 && entity.player.deathNum < 2) scoreAdd = Math.round(scoreAdd / 2);
                entity.player.wins++;
                entity.player.scoreS2 += scoreAdd;
                entity.player.xp += 400
                entity.directMsg(`你获得了400点经验、${scoreAdd}点赛季积分`);
                levelUp(entity)
            });
        };
    }

    let highestScore = 0
    let mvpPlayers = []
    world.querySelectorAll('player').filter(e => e.player.singleGameData != undefined).forEach(async (entity) => {
        const playerScore = entity.player.singleGameData[1] + entity.player.singleGameData[2] * 5;
        if (playerScore > highestScore) {
            highestScore = playerScore
            mvpPlayers = [entity]
        } else if (playerScore == highestScore && highestScore != 0) {
            mvpPlayers.push(entity);
        }
    });
    if (highestScore != 0) {
        let word = ''
        const extraScore = Math.round(30 / mvpPlayers.length + 5);
        mvpPlayers.forEach(entity => {
            word += `${entity.player.name} `
            entity.player.scoreS2 += extraScore;
            entity.directMsg(`你获得了${extraScore}点赛季积分`)
        })
        sendMsg(`本局MVP：${word}`)
    }
    await sleep(2000)

    timer = 0
    allplayers = [0, 0, 0, 0]
    respawnable = [true, true, true, true]
    materials = [
        [0, 1, 0],
        [0, 1, 0],
        [0, 1, 0],
        [0, 1, 0]
    ]
    emeraldPoints.concat(diamondPoints).forEach((x) => {
        x[1] = 0
    })
    emeraldTime = 65
    diamondTime = 30
    teamupgrades = [//冶炼, 疯狂矿工，锋利，保护，治愈池，陷阱，警报陷阱，反击陷阱，挖掘疲劳陷阱
        [0, 0, 0, 0, 0, 0, 0, 0, 0],//红，蓝，绿，黄
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0]
    ]
    teamTraps = [[], [], [], []]
    teamchests = [
        [['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1]],
        [['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1]],
        [['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1]],
        [['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1]]
    ]
    world.querySelectorAll('.bed').forEach((x) => {//床
        x.meshInvisible = false
    })
    world.querySelectorAll('.fly').forEach((x) => {//箭矢
        x.destroy()
    })
    emeralds.concat(diamonds).forEach((x) => {
        x.destroy()
    })
    emeralds = []
    diamonds = []
    deadplayers = []
    currentTime = Date.now();
    gameStartTime = currentTime;
    for (px = 0; px < 255; px++) {
        for (py = 0; py < 65; py++) {
            for (pz = 0; pz < 255; pz++) {
                if (voxels.getVoxelId(px, py, pz) == 177 ||
                    voxels.getVoxelId(px, py, pz) == 135 ||
                    voxels.getVoxelId(px, py, pz) == 141 ||
                    voxels.getVoxelId(px, py, pz) == 364 ||
                    voxels.getVoxelId(px, py, pz) == 170 ||
                    voxels.getVoxelId(px, py, pz) == 426 ||
                    voxels.getVoxelId(px, py, pz) == 389 ||
                    voxels.getVoxelId(px, py, pz) == 175) {
                    voxels.setVoxelId(px, py, pz, 0)
                }
            }
        }
    }
    for (let i = 0; i < 4; i++) {
        voxels.setVoxelId(BedPos[i][0].x, BedPos[i][0].y, BedPos[i][0].z, 650)
        voxels.setVoxelId(BedPos[i][1].x, BedPos[i][1].y, BedPos[i][1].z, 650)
    }
    world.querySelectorAll('player').forEach(async (entity) => {
        entity.player.spectator = false
        entity.player.invisible = false
        entity.player.showName = true;
        entity.hasTag('inTrap') && entity.removeTag('inTrap');
        entity.fallStart = -999;
        entity.player.scale = 0.8;
        entity.player.cameraMode = 'fps';
        entity.player.cameraFovY = entity.player.fovy;
        entity.player.enable3DCursor = true;
        entity.friction = Friction;
        entity.showHealthBar = true;
        entity.maxHp = 20;
        entity.hp = 20;
        entity.player.jumpPower = JumpPower;
        entity.player.tool = 'woodenSword';
        entity.player.rightHandPos = 0
        entity.player.inventory = [['woodenSword', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['compass', 1]];//总背包
        entity.player.enderBag = [['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1], ['', 1]]
        entity.player.toolsType = ['', '', '']
        remoteChannel.sendClientEvent(entity, { type: 'changeToolsType', args: { t: entity.player.toolsType } });
        entity.player.team = ''
        entity.player.defence = 7;
        entity.player.effectList = new Array(9).fill(0)
        entity.player.resetToDefaultSkin()
        entity.player.ableplate = true
        entity.player.beAttackedPlayer = null
        entity.player.tickDamage = 0
        entity.player.track = ''
        entity.player.singleGameData = [0, 0, 0];
        entity.player.deathNum = 0;
        entity.player.itemCD = [false, false]
        remoteChannel.sendClientEvent(entity, { type: 'changeData', args: { index: 0, datas: entity.player.singleGameData, single: false } });
        remoteChannel.sendClientEvent(entity, { type: 'setchoosecase', args: { pos: entity.player.rightHandPos + 1 } });
        remoteChannel.sendClientEvent(entity, { type: 'changeBed', args: { index: 0, beds: respawnable, single: false } });
        remoteChannel.sendClientEvent(entity, { type: 'changeUpgrade', args: { upg: [0, 0, 0, 0, 0] } })
        entity.player.openInventoryType != '' && entity.openBag(false, entity.player.openInventoryType)
        entity.player.openInventoryType = ''
        entity.player.startPlayeringTime = currentTime;
        entity.setQuickInvUI(0, true)
    })
    if (world.querySelectorAll('player').length >= 15) {
        let teams = []
        roomManager.getRoomALL().forEach(rid => {
            if (roomManager.getRoomMembers(rid).length > 1) {
                teams.push(roomManager.getRoomMembers(rid))
            }
        })
        teams.forEach(async team => {
            separateTeam(team, ['红', '绿', '蓝', '黄'])
        });
    };
    world.querySelectorAll('player').filter(x => x.player.loaded).forEach(async (entity) => {
        entity.player.team == '' && separateTeam([entity], ['红', '绿', '蓝', '黄'])
        entity.dressUp();
        await savePlayer_group(entity);
    });
    remoteChannel.broadcastClientEvent({ type: 'changePlayers', args: { index: 0, allplayers: allplayers, single: false } });
    restartAble = true;
}

/**装扮 */
GameEntity.prototype.dressUp = function () {
    const dresses = this.player.clothes.slice(0, this.player.clothes.indexOf('无'))
    for (const dress of dresses) {
        this.wear(dress, ClothesList[dress].part);
    }
}

async function openSettings(entity) {
    entity.player.cancelDialogs();
    const setting = await entity.player.dialog({
        type: GameDialogType.SELECT,
        title: '设置',
        content:
            `S2赛季积分：${entity.player.scoreS2}
等级：${entity.player.lv}
经验：${entity.player.xp}/${calculateXp(entity.player.lv)}
S1赛季积分：${entity.player.score}`,
        options: ['查看', '装扮', '称号', '队伍', '辅助搭路开关', '自定义按键', 'UI设置', '帮助', '保存', '返回']
    })
    if (!setting || setting === null) return;
    if (setting) {
        if (setting.value == '返回') return;
        if (setting.value == '自定义按键') {
            let keyOp = []
            for (let i = 0; i < Keys.length; i++) {
                keyOp.push(Keys[i] + ' --- ' + ASCII_form[0][ASCII_form[1].indexOf(entity.player.keys[i])])
            }
            const key = await entity.player.dialog({
                type: GameDialogType.SELECT,
                title: '自定义按键',
                content: '请选择你要更改的按键',
                options: keyOp.concat(['返回'])
            })
            if (!key || key === null) return;
            if (key) {
                if (key.value == '返回') return;
                entity.player.changeKey = key.index
                const wait = await entity.player.dialog({
                    type: GameDialogType.SELECT,
                    title: '',
                    content: '请按下按键...\n退出对话框可取消自定义按键',
                    options: ['退出']
                })
                if (!wait || wait === null) {
                    entity.player.changeKey = null
                    return;
                }
                if (wait) {
                    if (wait.value == '退出') {
                        entity.player.changeKey = null
                        return;
                    }
                }
            }
        } else if (setting.value == '帮助') {
            await entity.player.dialog({
                type: 'select',
                content: HELP,
                title: '帮助',
                options: ['返回']
            })
        } else if (setting.value == '称号') {
            const t = await entity.player.dialog({
                type: 'select',
                content: `当前称号：${entity.player.titleList[0]}`,
                title: '称号',
                options: entity.player.titleList.concat(['返回'])
            })
            if (!t || t === null) return;
            if (t) {
                if (t.value == '返回') return;
                let tt = entity.player.titleList.splice(entity.player.titleList.indexOf(t.value), 1)[0];
                entity.player.titleList.unshift(tt);
            }
        } else if (setting.value == '辅助搭路开关') {
            entity.player.roadHelper = entity.player.roadHelper ? false : true
            entity.player.directMessage(`辅助搭路已${entity.player.roadHelper ? '开启' : '关闭'}`)
        } else if (setting.value == 'UI设置') {
            const tz = await entity.player.dialog({
                type: 'select',
                title: '调整UI大小',
                content: '',
                options: ['手动调整UI尺寸', 'UI尺寸自适应', '侧边栏UI显示/隐藏', '聊天栏UI显示/隐藏', '聊天栏背景显示/隐藏', '返回']
            })
            if (!tz || tz === null) return;
            if (tz) {
                if (tz.value == '返回') return;
                else if (tz.value == '手动调整UI尺寸') {
                    const us = await entity.player.dialog({
                        type: 'input',
                        title: '调整UI大小',
                        content: `当前UI大小：${entity.player.uiScale}`
                    })
                    if (!us || us === null) return;
                    if (us) {
                        entity.player.uiScale = us
                        entity.player.directMessage(`调整成功！当前UI大小：${entity.player.uiScale}`)
                        remoteChannel.sendClientEvent(entity, { type: 'ui scale', args: { scale: entity.player.uiScale / 100, auto: false } });
                    }
                } else if (tz.value == 'UI尺寸自适应') {
                    remoteChannel.sendClientEvent(entity, { type: 'ui scale', args: { scale: 100, auto: true } });
                    entity.player.directMessage('调整成功！')
                } else if (tz.value == '侧边栏UI显示/隐藏') {
                    remoteChannel.sendClientEvent(entity, { type: 'showUI', args: { type: 'sidebar' } });
                    entity.player.directMessage('操作成功！')
                } else if (tz.value == '聊天栏UI显示/隐藏') {
                    remoteChannel.sendClientEvent(entity, { type: 'showUI', args: { type: 'msg' } });
                    entity.player.directMessage('操作成功！')
                } else if (tz.value == '聊天栏背景显示/隐藏') {
                    remoteChannel.sendClientEvent(entity, { type: 'showUI', args: { type: 'msgbox' } });
                    entity.player.directMessage('操作成功！')
                }
            }
        } else if (setting.value == '装扮') {
            const clothing = await entity.player.dialog({
                title: '装扮',
                type: 'select',
                content: `当前穿戴：${JSON.stringify(entity.player.clothes.slice(0, entity.player.clothes.indexOf('无')))}`,
                options: entity.player.clothes.filter(c => c !== '无').concat(['返回'])
            })
            if (!clothing || clothing === null) return;
            if (clothing) {
                if (clothing.value == '返回') return;
                else {
                    const dressUp = await entity.player.dialog({
                        title: clothing.value,
                        type: 'select',
                        content: ClothesList[clothing.value].intro,
                        options: ['穿戴', '卸下', '返回']
                    })
                    if (!dressUp || dressUp === null) return;
                    if (dressUp) {
                        if (dressUp.value == '返回') return;
                        if (dressUp.value == '卸下') {
                            entity.player.wearables(WearDatas[ClothesList[clothing.value].part].bodyPart).forEach((item) => {
                                if (item.mesh == `mesh/${clothing.value}.vb`) {
                                    item.remove();
                                }
                            })
                            entity.player.clothes = entity.player.clothes.filter(c => c !== clothing.value);
                            entity.player.clothes.push(clothing.value)
                            entity.player.directMessage(`已卸下 ${clothing.value}`)
                        } else if (dressUp.value == '穿戴') {
                            entity.player.wearables().forEach((item) => {
                                const meshName = item.mesh.slice(5, -3)
                                if (Object.keys(ClothesList).includes(meshName)) {
                                    if (ClothesList[meshName].type == ClothesList[clothing.value].type) {
                                        entity.player.clothes = entity.player.clothes.filter(c => c !== meshName);
                                        entity.player.clothes.push(meshName)
                                        item.remove();
                                    }
                                }
                            })
                            entity.player.clothes = entity.player.clothes.filter(c => c !== clothing.value);
                            entity.player.clothes.unshift(clothing.value);
                            entity.wear(clothing.value, ClothesList[clothing.value].part);
                            entity.player.directMessage(`已穿戴 ${clothing.value}`)
                        }
                    }
                }
            }
        } else if (setting.value == '保存') {
            await savePlayer_group(entity)
            entity.player.directMessage('保存成功！')
        } else if (setting.value == '查看') {
            let playersOp = []
            world.querySelectorAll('player').forEach(async e => {
                playersOp.push(e.player.name)
            })
            const players = await entity.player.dialog({
                title: '查看',
                type: 'select',
                content: '',
                options: playersOp.concat(['返回'])
            })
            if (!players || players === null) return;
            if (players) {
                if (players.value == '返回') return;
                let target = find(players.value)
                if (!target) return entity.player.directMessage('该玩家不存在')
                const page = await entity.player.dialog({
                    title: players.value,
                    type: 'select',
                    content: `name: ${players.value}
userId: ${target.player.userId}
teamId: ${target.player.roomId}`,
                    options: ['检测cps', '返回']
                })
                if (!page || page === null) return;
                if (page) {
                    if (page.value == '返回') return;
                    if (!find(players.value)) return entity.player.directMessage('该玩家不存在');
                    if (page.value == '检测cps') {
                        if (entity.player.cpsInterval) clearInterval(entity.player.cpsInterval)
                        entity.player.cpsInterval = setInterval(() => {
                            entity.player.directMessage(`${players.value} 当前cps：${target.player.cps}`)
                        }, 200)
                    }
                }
            }
        } else if (setting.value == '队伍') {
            let membersOp = []
            roomManager.getRoomMembers(entity.player.roomId).forEach(async e => {
                membersOp.push(e.player.name)
            })
            await entity.player.dialog({
                title: '队伍',
                type: 'select',
                content: `队伍ID：${entity.player.roomId}`,
                options: membersOp.concat(['返回'])
            })
        }
    }
}

module.exports = {
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
    calculateXp,
    levelUp,
    take,
    ban,
    addWhiteList,
    gameRestart,
    openSettings
}



