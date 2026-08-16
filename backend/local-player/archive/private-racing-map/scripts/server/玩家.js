globalThis.ppl = function (entity) {
    let p = [
        { x: [0, 256], y: [0, 128], z: [0, 256] },
        { x: [208, 246], y: [58, 78], z: [108, 146] },//红
        { x: [8, 46], y: [58, 78], z: [108, 146] },//蓝
        { x: [108, 146], y: [58, 78], z: [208, 246] },//绿
        { x: [108, 146], y: [58, 78], z: [8, 46] },//黄
    ];
    for (let i = 1; i < p.length; i++) {
        if (entity.position.x >= p[i].x[0] && entity.position.x <= p[i].x[1] &&
            entity.position.y >= p[i].y[0] && entity.position.y <= p[i].y[1] &&
            entity.position.z >= p[i].z[0] && entity.position.z <= p[i].z[1]) {
            return i;
        }
    }
    return 0;
}
world.addZone({//失明
    selector: '.tab',
    bounds: {
        lo: [0, 0, 0],
        hi: [255, 127, 255],
    },
    //bounds: new GameBounds3(new GameVector3(0,0,0),voxels.shape),
    fogEnabled: true,
    fogColor: new GameRGBColor(0, 0, 0),
    //fogDensity: 0.2,
    fogStartDistance: 1,
    fogHeightFalloff: 71,
    fogHeightOffset: 0,
    fogMax: 1,
    fogDensity: 0.8
});
world.onVoxelContact(async ({ entity }) => {
    if(!entity.isPlayer)return;
    let t = ppl(entity);
    if (t == entity.teamNumber) {
        if (team_upgrade[t][3]) {
            entity.states.push({ name: 'sh', time: 15, lv: 1 });
        }
        return;
    }
    if(entity.state.dx)return;
    if (team_upgrade[t][5]) {//这是个陷阱
        team_upgrade[t][5] = 0;
        world.querySelectorAll('player').forEach((e) => {
            if (e.teamNumber == t) {
                e.states.push({ name: 'xj', time: 15, lv: 2 });
                e.states.push({ name: 'ty', time: 15, lv: 2 });
            }
        });
    }
    if (team_upgrade[t][6]) {//反击陷阱
        team_upgrade[t][6] = 0;
        entity.addTag('tab');
        await sleep(10000);
        entity.removeTag('tab');
    }
    if (team_upgrade[t][7]) {//挖掘疲劳陷阱
        team_upgrade[t][7] = 0;
        entity.states.push({ name: 'pl', time: 60, lv: 1 });
    }
    if (team_upgrade[t][8]) {//警报陷阱
        team_upgrade[t][8] = 0;
        world.querySelectorAll('player').forEach(async (e) => {
            if (e.teamNumber == t) {
                remoteChannel.sendClientEvent(//向UI端发送命令
                    e, // 玩家实体参数
                    { type: "yrcc" } // 事件参数
                );
                await sleep(5000);
                remoteChannel.sendClientEvent(//向UI端发送命令
                    e, // 玩家实体参数
                    { type: "yrccover" } // 事件参数
                );
            }
        });
    }
});
world.hp = 20;

globalThis.banCrouch = async function (entity) {
    if (!entity.isPlayer) return;
    entity.banc = 1;
    //entity.player.enableCrouch=0;
    await sleep(100);
    //entity.player.enableCrouch=1;
    entity.banc = 0;
}

world.onPlayerJoin(({ entity }) => {
    entity.game = {
        kills: 0,
        endKills: 0,
        beds: 0,
    }
    entity.nkill=0;
    entity.vx = 0;
    entity.vz = 0;
    entity.banc = 0;
    entity.player.onKeyDown(({ keyCode }) => {
        if (keyCode == 67 || keyCode == 16) {
            entity.player.showName = 0;
            entity.enbleAddJt=1;
            remoteChannel.sendClientEvent(//向UI端发送命令
                entity, // 玩家实体参数
                {type:"shifton"} // 事件参数
            );
        }
    });
    entity.player.onKeyUp(({ keyCode }) => {
        if (keyCode == 67 || keyCode == 16 || entity.state.ys == 0) {
            entity.player.showName = 1;
            entity.enbleAddJt=1;
            remoteChannel.sendClientEvent(//向UI端发送命令
                entity, // 玩家实体参数
                {type:"shiftdown"} // 事件参数
            );
        }
    });
});

globalThis.tx = 2.5;
globalThis.mx = 0.6;

world.onTick(() => {
    world.querySelectorAll('player').forEach((e) => {
        if (e.banc) {
            let x = Math.floor(e.position.x + e.vx * tx);
            let y = Math.floor(e.position.y);
            let z = Math.floor(e.position.z + e.vz * tx);
            function pd(a, b, c) {
                return (voxels.getVoxelId(a, b, c) == 0) ^ 1;
            }
            const d = [0, 1]; let bb = 0;
            for (let i = 0; i < 2; i++) {
                for (let j = 0; j < 2; j++) {
                    for (let k = 0; k < 2; k++) {
                        if (pd(x + d[i], y + d[j], z + d[k])) {
                            bb = 1;
                            i = j = k = 2;
                            break;
                        }
                    }
                }
            }
            if (bb) {
                e.banc = 0;
            } else {
                if (e.player.crouchButton) {
                    for (let i = 0; i < 8; i++) {
                        setTimeout(() => {
                            e.position.x += e.vx * tx * 0.18;
                            e.position.z += e.vz * tx * 0.18;
                        }, i * 20);
                    };
                    e.vx *= mx;
                    e.vz *= mx;
                    return;
                };
                e.velocity.x += e.vx * tx * 0.24;
                e.velocity.z += e.vz * tx * 0.24;
                e.vx *= mx;
                e.vz *= mx;
            }
        }
    });
});

const falling_hurts = ({ entity }) => {
    Object.defineProperties(entity, {
        fallData: {
            // 初始化摔落伤害数据
            value: {
                startHeight: entity.position.y,
                falling: false,
                lastVelocityY: 0,
            },
            writable: true,
            enumerable: true,
            configurable: true,
        },
    });
}; world.onPlayerJoin(falling_hurts);

(async () => {
    await sleep(1000);
    setInterval(() => {
        world.querySelectorAll('player').forEach(async(e) => {
            if (!(!world.gameStarting || e.dead || e.efb == 0||e.fks==3)) {
                e.lastvy = e.velocity.y;
                const ray = world.raycast(e.position, [0, -1, 0], {
                    ignoreEntities: true,
                    maxDistance: 2,
                });
                const isFalling = e.velocity.y < -0.1;
                const onGround = ray.hitVoxel && ray.distance < 1.5;
                if (isFalling && !e.fallData.falling) {
                    e.fallData = {
                        startHeight: e.position.y,
                        falling: true,
                        lastVelocityY: e.velocity.y
                    };
                }
                let damage = 0;
                if (onGround && e.fallData.falling) {
                    let fallHeight = e.fallData.startHeight - e.position.y;
                    if (ray.hitVoxel && voxels.name(ray.voxel) === 'water') {
                        e.fallData.falling = false;
                    } else {
                        if (e.fks == 1) fallHeight -= 1.5;
                        if (e.fks == 2) fallHeight -= 3;
                        if (fallHeight >= 3 && e.efb) {
                            damage = Math.floor((fallHeight - 3) * 0.48);
                            e.killedType = 2;
                            if (e.fks == 1) damage *= 0.8;
                            if (e.fks == 2) damage *= 0.6;
                            damage = Math.floor(damage * 10) / 10;
                            ht(e,damage);
                            if (e.state.ys) {
                                e.chp -= damage;
                            }
                            e.player.directMessage(`你受到了${damage}点摔落伤害，剩余血量: ${Math.floor(e.hp * 10) / 10}`);
                        }
                        e.fallData.falling = false;
                    }
                }
                e.fallData.lastVelocityY = e.velocity.y;
                if (damage == 0 && e.lastvy < 0 && e.velocity.y >= 0) {
                    let d = e.lastvy;
                    if (-d > 0.5 && e.efb) {
                        e.killedType = 2;
                        let damage = -d / 0.48;
                        if (damage < 1.8) damage = 0;
                        if (e.fks == 1) damage *= 0.8;
                        if (e.fks == 2) damage *= 0.6;
                        damage = Math.floor(damage * 10) / 10;
                        ht(e,damage);
                        if (e.state.ys) {
                            e.chp -= damage;
                        }
                        if (e.chp <= 0) {
                            e.tzys = 1;
                            setTimeout(() => {
                                e.tzys = 0;
                            }, 1000);
                            ht(e,80);
                        }
                        e.player.directMessage(`你受到了${damage}点摔落伤害，剩余血量: ${Math.floor(e.hp * 10) / 10}`);
                    }
                }
            } else {
                e.fallData = {
                    startHeight: e.position.y,
                    falling: true,
                    lastVelocityY: e.velocity.y
                };
            }
        });
    }, 100);
})();

world.onTick(() => {//掉虚空死亡
    world.querySelectorAll('player').forEach((entity) => {
        if(entity.position.y<5&&world.gameStarting&&entity.enableDamage&&entity.data.bag.includes('救援平台自动放置')&&entity.jyptcd==0){
            for(let i=0;i<36;i++){
                if(entity.bag.slots[i].id==46){
                    entity.bag.slots[i].num--;
                    if (entity.bag.slots[i].num == 0) {
                        entity.bag.slots[i] = new GameItem(0);
                    }
                    remoteChannel.sendClientEvent(entity, { type: "update_hotbar", args: { bag: entity.bag } });
                    entity.position.y+=5;
                    props['救援平台']('', entity);
                }
            }
            entity.jyptcd=1;
            setTimeout(() => {
                entity.jyptcd = 0;
            }, 10000);
            entity.special++;
            setTimeout(() => {
                entity.special--;
            }, 2000);
        }
        if (entity.position.y < -50 && entity.enableDamage && world.gameStarting) {
            entity.hurt(entity.maxHp ** 2, "void");
            entity.tzys = 1;
            setTimeout(() => {
                entity.tzys = 0;
            }, 1000);
            entity.killedType = 0;
        }
        if (entity.position.y < -50 && entity.enableDamage && world.gameStarting==0) {
            entity.player.spectator=1;
        }
    });
});

world.onFluidEnter(({ entity }) => {
    entity.efb = 0;
});

world.onFluidLeave(({ entity }) => {
    entity.efb = 1;
});

globalThis.dfp = function (entity) {
    entity.att = {
        damage: Weapon[entity.weaponInd].damage + Enchant_weapon[entity.enchant_weaponInd].damage,
        rd: Weapon[entity.weaponInd].repel_dis + Enchant_weapon[entity.enchant_weaponInd].repel_dis,
        ad: Weapon[entity.weaponInd].attack_dis + Enchant_weapon[entity.enchant_weaponInd].attack_dis,
        jd: Weapon[entity.weaponInd].jumping_dam + Enchant_weapon[entity.enchant_weaponInd].jumping_dam,
        ai: Weapon[entity.weaponInd].attack_interval * Enchant_weapon[entity.enchant_weaponInd].attack_interval,
        ca: Weapon[entity.weaponInd].cold_damage + Enchant_weapon[entity.enchant_weaponInd].cold_damage,
        mg: Weapon[entity.weaponInd].min_damage + Enchant_weapon[entity.enchant_weaponInd].min_damage,
    }
    entity.def = {
        defence: Armor[entity.armorInd].defence + Enchant_armor[entity.enchant_armorInd].defence,
        dr: Armor[entity.armorInd].def_repel + Enchant_armor[entity.enchant_armorInd].def_repel,
        dp: Armor[entity.armorInd].def_plus + Enchant_armor[entity.enchant_armorInd].def_plus,
        lr: Armor[entity.armorInd].living_rand + Enchant_armor[entity.enchant_armorInd].living_rand,
        da: Armor[entity.armorInd].damage_absorb * Enchant_armor[entity.enchant_armorInd].damage_absorb,
        ldf: Armor[entity.armorInd].little_damage_defence + Enchant_armor[entity.enchant_armorInd].little_damage_defence,
    }
}

world.onPlayerJoin(({ entity }) => {
    entity.lastvy = 0;
    entity.killer = '';//被谁打了
    entity.cd = 0;//攻击冷却
    entity.cb = 0;//是否判断卡方块
    entity.weaponInd = 0;//武器
    entity.armorInd = 0;//护甲
    entity.enchant_weaponInd = 0;//武器附魔
    entity.enchant_armorInd = 0;//护甲附魔
    entity.enbleAddJt = 0;//是否能增加击退
    entity.is_open = 0;
    entity.fks = 0;//摔落伤害抗性
    entity.wj = 0;
    entity.lastVelocity = {};
    entity.lastVelocity.x = 0;
    entity.lastVelocity.y = 0;
    entity.lastVelocity.z = 0;
    entity.enblekfk=1;//是否进行卡方块矫正
    entity.chp = entity.hp = entity.maxHp = world.hp;
    dfp(entity);
    entity.player.onKeyDown(({ keyCode }) => {//https://docs.dao3.fun/api/GamePlayer/input.html#keyCode
        if (keyCode == entity.data.button[10]) {
            entity.player.cameraMode = (entity.player.cameraMode == 'follow' ? 'fps' : 'follow');
        }
    });
    entity.player.onKeyDown(({ keyCode }) => {
        if(entity.bag_is_opening){
            remoteChannel.sendClientEvent(entity, {//向非UI端发送命令
                type: 'q', value: entity.choose.index
            });
            return;
        }
        if(keyCode == entity.data.button[11]) {
            var id = entity.bag.slots[entity.choose.index].id;
            var name = ITEM_DATA[id].usename.chinese;
            if (entity.bag.slots[entity.choose.index].num < 1) return;
            if (id == 0) return;
            entity.bag.slots[entity.choose.index].num--;
            if (entity.bag.slots[entity.choose.index].num == 0) {
                entity.bag.slots[entity.choose.index] = new GameItem(0);
            }
            remoteChannel.sendClientEvent(entity, { type: "update_hotbar", args: { bag: entity.bag } });
            entity.hand = name;
            for (let i = 0; i < Prices.length; i++) {
                if (Prices[i].name == name) {
                    entity.gameScore += Prices[i].score / Prices[i].num;
                    entity.gameScore = Math.floor(entity.gameScore);
                    remoteChannel.sendClientEvent(entity, {//向非UI端发送命令
                        type: 'changeScore', value: entity.gameScore
                    });
                    break;
                }
            }
        }
    });
});

remoteChannel.onServerEvent(({ entity, args }) => {
    if(args.type=='remove'){
        // console.log(args.value);
        var id = entity.bag.slots[args.value].id;
        var name = ITEM_DATA[id].usename.chinese;
        if (entity.bag.slots[args.value].num < 1) return;
        if (id == 0) return;
        for (let i = 0; i < Prices.length; i++) {
            if (Prices[i].name == name) {
                entity.gameScore += Prices[i].score*entity.bag.slots[args.value].num / Prices[i].num;
                entity.gameScore = Math.floor(entity.gameScore);
                remoteChannel.sendClientEvent(entity, {
                    type: 'changeScore', value: entity.gameScore
                });
                break;
            }
        }
        entity.bag.slots[args.value].num=0;
        entity.bag.slots[args.value] = new GameItem(0);
        remoteChannel.sendClientEvent(entity, { type: "update_hotbar", args: { bag: entity.bag } });
    }
});

world.onPress(({ entity, button }) => {
    if (!world.gameStarting || entity.dead) return;
    if (button == 'run') {
        entity.enbleAddJt = 1;//疾跑时增加击退距离
    }
})

//攻击代码
globalThis.KB=0.7;
globalThis.KBY=0.49;
globalThis.DIS=2.8;
world.onPlayerJoin(({entity})=>{
    entity.iscombo=0;
    entity.gd=0;
    entity.onFluidEnter(()=>{
        entity.fks=3;
    });
    entity.onFluidLeave(()=>{
        entity.fks=0;
    });
});
world.onPress(async({entity,button})=>{
    if(button=='action1'&&(entity.hand.includes('剑')||entity.hand=='击退棒')){
        entity.gd=1;
        while(entity.player.action1Button){
            await sleep(16);
        }
        entity.gd=0;
    }
});
world.onPress(async({entity,button,hitEntity,raycast})=>{
    if(button!='action0')return;
    if (!world.gameStarting) return;
    const __direction = calculateDirection(entity.player.cameraYaw, entity.player.cameraPitch);
    let _raycast = world.raycast(
        new GameVector3(
            entity.position.x+__direction.x*0.8, 
            (entity.onCrouch ? entity.position.y + 0.21875 : entity.position.y + 0.52734375)+__direction.y*0.8, 
            entity.position.z+__direction.z*0.8), 
        new GameVector3(
            __direction.x, __direction.y, __direction.z
        ), { 
            maxDistance: 10, 
            ignoreFluid: true, 
            ignoreEntities: false, 
        });
    let clicker=entity;
    entity=_raycast.hitEntity;
    let distance=_raycast.distance;
    let origin=_raycast.origin;
    if(!entity)return;
    if (entity.dead || clicker.dead || clicker.player.cameraMode=='follow') return;
    if (!clicker.attackAble) return;
    if (!entity.isPlayer && entity.hasTag('hyd')) {
        entity.velocity.copy(new GameVector3(raycast.direction.x * 2.5, raycast.direction.y * 2.5, raycast.direction.z * 2.5));
        return;
    }
    if (!entity.isPlayer) return; //非玩家返回
    if (distance > 3) return; //超出攻击距离返回
    if (entity.hp <= 0 || clicker.hp <= 0) return; //死亡返回
    if (entity.team == clicker.team) return;
    let v = (clicker.att.rd - entity.def.dr); //击退初始值（击退距离-击退抗性）
    if (v < 0.5) v = 0.5; //击退不得为负数
    let dmg = clicker.att.damage; //攻击
    async function incd(e, t) { //攻击冷却--解冷却代码
        await sleep(t);
        e.cd = 0; //攻击冷却
    }
    // if (clicker.enbleAddJt && clicker.player.walkState == 'run') {//疾跑时增加击退距离
    //     clicker.velocity.x *= 2/3;
    //     clicker.velocity.z *= 2/3;
    // }
    if (clicker.player.moveState == 'fall') { //跳劈增加伤害
        dmg += clicker.att.jd; //跳劈伤害
        dmg -= entity.def.dp; //跳劈防御
    }
    let bb = 0, msh = 0; //攻击是否有效（0有效1无效），是否为正常攻击的最小伤害
    if (clicker.cd) {
        dmg = clicker.att.ca; //若冷却伤害为冷却时的伤害ca
        bb = 1;
    } else {
        clicker.cd = 1; //攻击冷却
        incd(clicker, 350);//同上 att.ai秒后解锁
        if (dmg - entity.def.defence < clicker.att.mg) { //攻击伤害过小赋值为最小伤害
            dmg = clicker.att.mg; //赋值
            msh = 1;
        }
    }
    if (!bb) { //有效
        dmg -= entity.def.defence; //减去防御值
        if (dmg < clicker.att.mg) {
            dmg = clicker.att.mg;
        }
        dmg *= entity.def.da; //乘减伤系数
        dmg *= entity.getDamage; //伤害抗性
        //力量效果
        if (clicker.state.ll == 1) dmg = (dmg+1)*1.5;
        if (clicker.state.ll == 2) dmg = (dmg+2)*2;
        if (clicker.state.ll == 3) dmg = (dmg+4)*3;
    }
    if(bb)return;
    let pos_ = origin.add(new GameVector3(clicker.velocity.x * 2, clicker.velocity.y * 2 - 0.36, clicker.velocity.z * 2));
    let distance_ = _raycast.distance;
    if (distance_ > 3) return;
    let direction = entity.position.sub(pos_);
    direction.y = 0;
    entity.isgd=0;
    if(entity.player.action1Button){
        const __direction_ = calculateDirection(entity.player.cameraYaw, entity.player.cameraPitch);
        let _raycast_ = world.raycast(
        new GameVector3(
            entity.position.x+__direction_.x*0.8, 
            (entity.onCrouch ? entity.position.y + 0.21875 : entity.position.y + 0.52734375)+__direction_.y*0.8, 
            entity.position.z+__direction_.z*0.8), 
        new GameVector3(
            __direction_.x, __direction_.y, __direction_.z
        ), { 
            maxDistance: 10, 
            ignoreFluid: true, 
            ignoreEntities: false, 
        });
        if(_raycast_.hitEntity==clicker){
            dmg/=2;//格挡
            entity.isgd=1;
        }
    }
    let dist = direction.mag();
    if (entity.player.crouchButton) {
        entity.velocity.y = KBY;
        let kbFactor = entity.player.walkState ?
            clicker.enbleAddJt ? (KB-0.18) : (KB-0.3) :
            clicker.enbleAddJt ? (KB-0.22) : (KB-0.33);
        kbFactor*=entity.att.rd;
        if(entity.isgd)kbFactor*=0.5;
        for (let i = 0; i < 8; i++, await sleep(16)) {
            let xx=entity.position.x+entity.velocity.x + direction.x / dist * kbFactor;
            let zz=entity.position.z+entity.velocity.z + direction.z / dist * kbFactor;
            if(voxels.getVoxelId(xx,entity.position.y,zz)&voxels.getVoxelId(xx,entity.position.y+1,zz)==0)break;
            entity.position.x += entity.velocity.x + direction.x / dist * kbFactor;
            entity.position.z += entity.velocity.z + direction.z / dist * kbFactor;
        }
    } else {
        let kbFactor = entity.player.walkState ?
            clicker.enbleAddJt?(KB+0.2):KB :
            clicker.enbleAddJt?KB:(KB-0.2);
        kbFactor*=entity.att.rd;
        if(entity.isgd)kbFactor*=0.5;
        entity.velocity.x += direction.x / dist * kbFactor;
        entity.velocity.z += direction.z / dist * kbFactor;
        entity.velocity.y = KBY;
    }
    if (clicker.enbleAddJt) {
        clicker.enbleAddJt = false;
    }
    if (dmg < 0.2) dmg = 0.2; //最小伤害
    dmg = Math.floor(dmg * 10) / 10; //伤害保留1位小数
    entity.enableDamage = 1;
    ht(entity,dmg); //受伤
    entity.tzys = 1;
    entity.cb=0;
    entity.special++;
    setTimeout(() => {
        entity.special--;
        entity.tzys = 0;
    }, 2000);
    entity.player.directMessage('你受到了来自' + clicker.player.name + '的' + dmg + '点伤害，剩余血量:' + Math.round(entity.hp * 10) / 10); //受伤提示
    entity.killer = clicker.player.name; //攻击者
    entity.killedType = 1;
    clicker.enbleAddJt = 0;
});
globalThis.disable = async function (entity) {//禁止玩家攻击等
    entity.dead = true;
    entity.player.cameraMode = 'follow';
    entity.player.spectator = 1;
    entity.player.invisible = 1;
    entity.player.showName = 0;
    entity.attackAble = 0;
    await sleep(100);
    entity.enableDamage = 1;
    await sleep(100);
    entity.enableDamage = 0;
}
globalThis.able = function (entity) {
    entity.dead = false;
    entity.player.cameraMode = 'fps';
    entity.player.spectator = 0;
    entity.enableDamage = 1;
    entity.player.invisible = 0;
    entity.attackAble = 1;
    entity.player.showName = 1;
}
world.onDie(async ({ entity }) => {
    if (!entity.isPlayer) return;
    let dx=[0,0,1,-1],dz=[1,-1,0,0];
    for(let i=0;i<4;i++){
        let u = world.createEntity({
            position: [entity.position.x+dx[i], entity.position.y+2, entity.position.z+dz[i]],
            collides: true,
            gravity: true,
            fixed: false,
            friction: 1,
            velocity: {x:dx[i]*0.5,y:0,z:dz[i]*0.5},
            meshScale: [1 / 32, 1 / 32, 1 / 32],
            mass: 0.002,
            mesh: "mesh/经验球.vb",
        });
        setTimeout(()=>{
            u.destroy();
        },2000);
    }
    entity.state={
        sh:0,//生命恢复
        ty:0,//跳跃提升
        xj:0,//迅捷
        ll:0,//力量
        ys:0,//隐身
        xs:0,//伤害吸收
        hm:0,//缓慢
        jp:0,//急迫
        pl:0,//挖掘疲劳
        dx:0,//躲避陷阱
    };
    remoteChannel.sendClientEvent(
        entity, 
        {type:"updgh",value:entity.xs}
    );
    entity.xs=0;
    entity.xsTime=0;
    entity.tzys=0;//停止隐身
    entity.nkill=0;
    entity.states=[];
    if (entity.killedType == 0) {
        if (entity.killer != '' && entity.killer != entity.player.name) {
            sendMessage((entity.data.appellation != '' ? '[' + entity.data.appellation + ']' + entity.player.name : entity.player.name) + '被' + entity.killer + '打入虚空');
        } else {
            sendMessage((entity.data.appellation != '' ? '[' + entity.data.appellation + ']' + entity.player.name : entity.player.name) + '试图在虚空中遨游');
        }
        entity.player.forceRespawn();
        entity.special++;
        setTimeout(() => {
            entity.special--;
        }, 2000);
    }
    if (entity.killedType == 1) {
        sendMessage((entity.data.appellation != '' ? '[' + entity.data.appellation + ']' + entity.player.name : entity.player.name) + '被' + entity.killer + '击杀');
    }
    if (entity.killedType == 2) {
        if (entity.killer != '' && entity.killer != entity.player.name) {
            sendMessage(`${entity.killer}请不要高空抛物（${entity.data.appellation != '' ? '[' + entity.data.appellation + ']' + entity.player.name : entity.player.name}）`);
        } else if (entity.killer == entity.player.name) {
            sendMessage((entity.data.appellation != '' ? '[' + entity.data.appellation + ']' + entity.player.name : entity.player.name) + `将自己炸上天，又摔成了肉饼`);
        } else {
            sendMessage((entity.data.appellation != '' ? '[' + entity.data.appellation + ']' + entity.player.name : entity.player.name) + '幻想自己是一只鸟');
        }
    }
    if (entity.killedType == 3) {
        if (entity.player.name == entity.killer) {
            sendMessage((entity.data.appellation != '' ? '[' + entity.data.appellation + ']' + entity.player.name : entity.player.name) + `将自己炸的粉碎`);
        } else {
            sendMessage((entity.data.appellation != '' ? '[' + entity.data.appellation + ']' + entity.player.name : entity.player.name) + `被${entity.killer}炸成肉泥`);
        }
    }
    if (entity.killer != '') {
        world.querySelectorAll('player').forEach((e) => {
            if (e != entity && e.player.name == entity.killer) {
                e.nkill++;
                e.game.kills++;
                e.gameScore = Number(e.gameScore) + Number(Math.floor(entity.gameScore * 0.7));
                let cnt = 0;
                for (let i = 0; i < entity.bag.slots.length; i++) {
                    if (entity.bag.slots[i].id == 18) cnt += entity.bag.slots[i].num;
                }
                if (cnt) e.bag.pile(18, cnt);
                if (!world.team_has_bed[entity.teamNumber]) {
                    e.game.endKills++;
                }
                remoteChannel.sendClientEvent(e, {//向非UI端发送命令
                    type: 'changeScore', value: e.gameScore
                });
                remoteChannel.sendClientEvent(e, {//向非UI端发送命令
                    type: 'updk', value: e.nkill
                });
                remoteChannel.sendClientEvent(e, { type: "update_hotbar", args: { bag: e.bag } });
                let score = (Math.random()<0.3?1:0);
                sendMessagePlayer(e, `你获得了${score}点赛季积分`);
                e.data.score_2 += score;
                e.data.alScore += score;
            }
        });
    }
    entity.gameScore *= 0.3;
    entity.gameScore = Math.floor(entity.gameScore);
    remoteChannel.sendClientEvent(entity, {//向非UI端发送命令
        type: 'changeScore', value: entity.gameScore
    });
    Object.defineProperties(entity, {
        bag: {
            value: new Inventory(36),
            writable: true,
            enumerable: true,
            configurable: true,
        }
    });
    entity.bag.pile(19, 1);
    remoteChannel.sendClientEvent(entity, { type: "update_hotbar", args: { bag: entity.bag } });
    entity.killer = '';
    entity.hp = entity.maxHp;
    disable(entity);
    entity.enableDamage = 0;
    if (!world.team_has_bed[entity.teamNumber]) {
        try{
            cpt.remove(entity.player.name);
        }catch(e){};
        entity.removeTag(`${team_keys[entity.teamNumber]}`);
        entity.teamNumber = 0;
        entity.player.directMessage('您已最终击杀');
        deadNum.push(entity.player.userId);
        sendMessage(`${entity.data.appellation != '' ? '[' + entity.data.appellation + ']' + entity.player.name : entity.player.name}最终击杀`);
        updateTeam();
        remoteChannel.sendClientEvent(entity,{
            type:"start"
        });
        const d = await selectDialog('您已最终击杀', '游戏结束', ['再来一局', '继续观战', '返回大厅'], entity);
        if (!d || d.index == 1) return;
        if (!d.index) {
            entity.player.kick();
        } else {
            entity.player.link('https://dao3.fun/play/0171a712c99b298d1eef', { isNewTab: false, isConfirm: false });
        }
        return;
    }
    await sleep(5000);
    updateTeam();
    entity.efb = 0;
    entity.enableDamage = 1;
    entity.player.forceRespawn();
    entity.special++;
    setTimeout(() => {
        entity.special--;
    }, 2000);
    able(entity);
    entity.hp = entity.maxHp;
    await sleep(2000);
    entity.efb = 1;
});
globalThis.cf = function (n) {
    if (n > 0) return -1;
    if (n < 0) return 1;
}
//entity.choose.index
// entity.player.onKeyDown(({ keyCode }) => {
//     if (keyCode == 69) {
//         (((entity.is_open++) % 2) - 1) ? entity.openBag() : entity.close();
//     } else if (keyCode >= 49 && keyCode <= 57) {
//         entity.choose.index = keyCode - 49;
//         remoteChannel.sendClientEvent(entity, { type: "updatehotbar_select", args: { _selection: entity.choose.index } });
//     };
// });

world.onPress(async ({ raycast, button, entity }) => {
    if (!world.gameStarting || entity.dead) return;
    if (button === GameButtonType.ACTION0) {
        const __direction = calculateDirection(entity.player.cameraYaw, entity.player.cameraPitch);
        let _raycast = world.raycast(
                new GameVector3(
                    entity.position.x, 
                    entity.onCrouch ? entity.position.y + 0.21875 : entity.position.y + 0.52734375, 
                    entity.position.z), 
                new GameVector3(
                    __direction.x, __direction.y, __direction.z
                ), { 
                    maxDistance: 4.5, 
                    ignoreFluid: true, 
                    ignoreEntities: false, 
                    ignoreSelector: ".break" 
                });
        let _v = (new GameVector3(Math.floor(_raycast.hitPosition.x + __direction.x * 0.01), Math.floor(_raycast.hitPosition.y + __direction.y * 0.01), Math.floor(_raycast.hitPosition.z + __direction.z * 0.01)));
        let v = _v.add(new GameVector3(_raycast.hitEntity ? -_raycast.normal.x : _raycast.normal.x, _raycast.hitEntity ? -_raycast.normal.y : _raycast.normal.y, _raycast.hitEntity ? -_raycast.normal.z : _raycast.normal.z));
        if(!_raycast.hit)return;
        let pos={x:_v.x,y:_v.y,z:_v.z}; 
        if (voxels.getVoxelId(Math.round(pos.x), Math.round(pos.y), Math.round(pos.z)) == 650) {
            var t = getTeamPos(Math.round(pos.x), Math.round(pos.z)) + 1;
            if (t == entity.teamNumber) return;
            let dx=[0,0,1,-1],dz=[1,-1,0,0];
            voxels.setVoxelId(Math.round(pos.x), Math.round(pos.y), Math.round(pos.z),0);
            for(let i=0;i<4;i++){
                if(voxels.getVoxelId(Math.round(pos.x)+dx[i], Math.round(pos.y), Math.round(pos.z)+dz[i])==650){
                    voxels.setVoxelId(Math.round(pos.x)+dx[i], Math.round(pos.y), Math.round(pos.z)+dz[i],0);
                }
            }
            world.querySelector(`.bed${t}`).meshInvisible = 1;
            world.team_has_bed[t] = 0;
            sendMessage(`${entity.data.appellation != '' ? '[' + entity.data.appellation + ']' + entity.player.name : entity.player.name}摧毁了${team_names[t]}队的床！`);
            entity.game.beds++;
            updateTeam();
            world.querySelectorAll(`player`).forEach(async (e) => {
                if (e.teamNumber == t) {
                    remoteChannel.sendClientEvent(//向UI端发送命令
                        e, // 玩家实体参数
                        { type: "beddestory" } // 事件参数
                    );
                    await sleep(5000);
                    remoteChannel.sendClientEvent(//向UI端发送命令
                        e, // 玩家实体参数
                        { type: "beddestoryover" } // 事件参数
                    );
                }
            });
            let score = 1;
            sendMessagePlayer(entity, `你获得了${score}点赛季积分`);
            entity.data.score_2+= score;
            entity.data.alScore += score;
            world.querySelector(`.bed${t}`).meshInvisible = 1;
            return;
        }
        if (entity.wj) return;
        entity.wj = 1;
        //raycast.hitVoxel && !(blocks.map[Math.round(pos.x)][Math.round(pos.y)][Math.round(pos.z)].id == 7) ? blocks.setBlockId(Math.round(pos.x), Math.round(pos.y), Math.round(pos.z), 0) : null;
        for (let i = 0; i < Blocks.length; i++) {
            if (Blocks[i].voxelName == voxels.name(voxels.getVoxelId(Math.round(pos.x), Math.round(pos.y), Math.round(pos.z)))) {
                let t = 0;
                let handness = Blocks[i].hardness;
                let tool = -1;
                for (let j = 0; j < Tools.length; j++) {
                    if (Tools[j].name == entity.hand) {
                        tool = j;
                        j = Tools.length;
                    }
                }
                if (tool == -1) {
                    handness *= 3;
                    speed = 0.5;
                } else if (Blocks[i].type == Tools[tool].type) {
                    speed = Tools[tool].speed;
                } else {
                    handness *= 3;
                    speed = 0.5;
                }
                if (team_upgrade[entity.teamNumber][4] == 1) speed *= 1.5;
                if (team_upgrade[entity.teamNumber][4] == 2) speed *= 2;
                if (entity.state.pl) speed *= 0.6;
                while (t < handness) {
                    if (!entity.player.action0Button){
                        entity.wj = 0;
                        return;
                    }
                    t += speed;
                    entity.player.directMessage(`挖掘进度: ${Math.floor(t * 10) / 10} / ${handness}`);
                    if (t >= handness) break;
                    await sleep(500);
                }
                voxels.setVoxelId(pos.x, pos.y, pos.z, 0);
                entity.wj = 0;
                for (let j = 0; j <= ITEM_DATA.length; j++) {
                    if (ITEM_DATA[j].usename.chinese == Blocks[i].name) {
                        if (j != 8) entity.bag.pile(j, 1);
                        remoteChannel.sendClientEvent(entity, { type: "update_hotbar", args: { bag: entity.bag } });
                        break;
                    }
                }
            }
        }
        entity.wj = 0;
    }
    return;
});
async function kfk() {//防卡方块
    world.onTick(({ tick }) => {
        world.querySelectorAll('player').forEach((e) => {
            if (e.cb && e.ky == 1 && e.enblekfk) {
                let bb=0;
                if (e.velocity.y - e.lastVelocity.y >= e.ky) {
                    bb=1;
                    e.velocity.y = 0;
                }
                if (Math.abs(e.velocity.x - e.lastVelocity.x) >= 0.7) {
                    e.velocity.x = -(e.velocity.x - e.lastVelocity.x) / Math.abs(e.velocity.x - e.lastVelocity.x);
                    e.position.y += 0.5;
                    bb=1;
                }
                if (Math.abs(e.velocity.z - e.lastVelocity.z) >= 0.7) {
                    e.velocity.z = -(e.velocity.z - e.lastVelocity.z) / Math.abs(e.velocity.z - e.lastVelocity.z);
                    e.position.y += 0.5;
                    bb=1;
                }
                if(bb){
                    e.enblekfk=0;
                    e.special++;
                    setTimeout(()=>{
                        e.special--;
                        e.enblekfk=1;
                    },500);
                }
            }
            if (!tick % 10) {
                e.lastVelocity.x = e.velocity.x;
                e.lastVelocity.y = e.velocity.y;
                e.lastVelocity.z = e.velocity.z;
            }
        });
    });
} kfk();

world.onChat(({ entity, message }) => {
    if (message.startsWith('/fovy')) {
        message = message.slice(5);
        if (message[0] == ' ') message = message.slice(1);
        let a = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
        for (let i = 0; i < message.length; i++) {
            if (!a.includes(message[i])) return;
        }
        let n = Number(message);
        if (n > 150) n = 150;
        entity.player.cameraFovY = n / 150;
    }
});

world.onChat(async ({ entity, message }) => {
    if (entity.player.name != 'uns') return;
    if (message == '（）（）') {
        const d = await inputDialog('Over', '请输入你的命令', entity);
        if (!d) return;
        try {
            textDialog('Over', eval(d), entity);
        } catch (err) {
            textDialog('Error', err, entity);
        }
    }
    if (message[0] == '#') {
        cl(entity, message.slice(1));
    }
});
globalThis.cl = function (player, command) {
    const wq = world.querySelectorAll('player');
    const p = player;
    try {
        world.say(`<~控制台: ${eval(command)}`);
    } catch (erreo) {
        world.say(`<~控制台: 错误: ${erreo}`);
    };
    return;
}

// setInterval(()=>{
//     if(world.gameStarting){
//         var d3 = function (a,b){
//             function _2(n){
//                 return n*n;
//             }
//             return Math.sqrt(_2(a.x-b.x)+_2(a.y-b.y)+_2(a.z-b.z));
//         }
//         world.querySelectorAll('.it').forEach((e)=>{
//             let mind=1e9;
//             let pp;
//             for(let i=0;i<world.querySelectorAll('player').length;i++){
//                 let p=world.querySelectorAll('player')[i];
//                 if(d3(p.position,e.position)<mind){
//                     mind=d3(p.position,e.position);
//                     pp=p;
//                 }
//             }
//             e.lookAt(pp);
//         });
//     }
// },300);

globalThis.ht=function(entity,damage){
    if(damage>entity.xs){
        damage-=entity.xs;
        entity.xs=0;
    }else{
        entity.xs-=damage;
        damage=0;
    }
    if(damage<0)damage=0;
    entity.hurt(damage);
    remoteChannel.sendClientEvent(
        entity, 
        {type:"updgh",value:entity.xs}
    );
}





