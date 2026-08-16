world.onPlayerJoin(({entity})=>{
    entity.usingobj=0;//是否正在使用物品
});

world.onPress(async ({ entity, button, raycast }) => {
    if (!world.gameStarting || entity.dead) return;
    defineEntity(entity);
    if (button == 'action1') {
        if (props[entity.hand]) {
            if(entity.usingobj)return;
            if (entity.hand == '救援平台' && entity.jyptcd) return;
            if (entity.hand == '回城卷轴' && entity.hcjzcd) return;
            if (entity.hand == 'TNT' && raycast.distance > 4.5) return;
            if (entity.hand == '桶' && raycast.distance > 4.5) return;
            if (entity.hand == '水桶' && raycast.distance > 4.5) return;
            if (entity.hand == '防御塔' && raycast.distance > 4.5) return;
            entity.bag.slots[entity.choose.index].num--;
            if (entity.bag.slots[entity.choose.index].num == 0) {
                entity.bag.slots[entity.choose.index] = new GameItem(0);
            }
            remoteChannel.sendClientEvent(entity, { type: "update_hotbar", args: { bag: entity.bag } });
            props[entity.hand](raycast, entity);
            remoteChannel.sendClientEvent(entity, { type: "update_hotbar", args: { bag: entity.bag } });
        }
        if (useBow[entity.hand]) {
            if (entity.bowcd) return;
            entity.bowcd = 1;
            let bb=0;
            for (let i = 0; i < entity.bag.slots.length; i++) {
                if (entity.bag.slots[i].id == 53) {
                    entity.bag.slots[i].num--;
                    bb=1;
                    if (entity.bag.slots[i].num == 0) {
                        entity.bag.slots[i] = new GameItem(0);
                    }
                    remoteChannel.sendClientEvent(entity, { type: "update_hotbar", args: { bag: entity.bag } });
                    break;
                }
            }
            if(!bb){
                entity.bowcd = 0;
                return;
            }
            useBow[entity.hand](raycast, entity);
            await sleep(1000);
            entity.bowcd = 0;
        }
        if (entity.hand == '钓鱼竿') {
            if (entity.isdy) {
                entity.isdy = 0;
                const e = entity.yge;
                e.destroy();
                if (entity.hitp == '') return;
                const p = entity.hitp;
                let x1 = p.position.x, y1 = p.position.y, z1 = p.position.z;
                let x2 = entity.position.x, y2 = entity.position.y, z2 = entity.position.z;
                let d = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2 + (z2 - z1) ** 2);
                if (d > 10) return;
                if (p.isPlayer) banCrouch(p);
                p.velocity.x = (x2 - x1) / d * 1.2;
                p.velocity.y = (y2 - y1) / d * 0.8;
                p.velocity.z = (z2 - z1) / d * 1.2;
                return;
            }
            entity.isdy = 1;
            const e = world.createEntity({
                position: [entity.position.x + raycast.direction.x, entity.position.y + raycast.direction.y, entity.position.z + raycast.direction.z],
                collides: true,
                gravity: true,
                fixed: false,
                friction: 1,
                meshScale: [1 / 32, 1 / 32, 1 / 32],
                mass: 0.002,
                mesh: "mesh/浮漂.vb",
            });
            e.velocity.x = raycast.direction.x * 1.5;
            e.velocity.y = raycast.direction.y * 1.5;
            e.velocity.z = raycast.direction.z * 1.5;
            entity.hitp = '';
            entity.yge = e;
            e.onEntityContact(({ other }) => {
                if (other.hasTag('fb') || other.isPlayer) entity.hitp = other;
                if (!other.isPlayer) return;
                other.hurt(0);
                other.tzys = 1;
                setTimeout(() => {
                    other.tzys = 0;
                }, 1000);
                other.special++;
                setTimeout(()=>{
                    other.special--;
                },2000);
            });
            await sleep(20000);
            e.destroy();
        }
    }
});

globalThis.props = {
    "TNT": async function (raycast, entity) {
        const pos = raycast.voxelIndex.add(raycast.normal);
        const canBoom = [];
        for (let i = 0; i < Blocks.length; i++) {
            if (Blocks[i].explosion_hardness < 2) {
                canBoom.push(voxels.id(Blocks[i].voxelName));
            }
        }
        console.log(canBoom);
        const e = world.createEntity({
            mesh: "mesh/TNT.vb",
            position: [pos.x + 0.5, pos.y + 0.5, pos.z + 0.5],
            fixed: false,
            collides: true,
            gravity: true,
            mass: 1,
            meshScale: [1 / 16, 1 / 16, 1 / 16]
        });
        e.addTag('tnt');
        e.addTag('fb');
        await sleep(3000);
        if (!world.gameStarting) return;
        let r = 3.5;
        let bl=[];
        for (let i = e.position.x - r; i <= e.position.x + r; i++) {
            for (let j = e.position.y - r; j <= e.position.y + r; j++) {
                for (let k = e.position.z - r; k <= e.position.z + r; k++) {
                    if (voxels.getVoxelId(i, j, k)==170||voxels.getVoxelId(i, j, k)==364) {
                        bl.push({x:i+0.5,y:j+0.5,z:k+0.5});
                    }
                }
            }
        }
        var d3_ = function (a,b){
            function _2(n){
                return n*n;
            }
            return Math.sqrt(_2(a.x-b.x)+_2(a.y-b.y)+_2(a.z-b.z));
        };
        for (let i = e.position.x - r; i <= e.position.x + r; i++) {
            for (let j = e.position.y - r; j <= e.position.y + r; j++) {
                for (let k = e.position.z - r; k <= e.position.z + r; k++) {
                    if (Math.sqrt(
                        (i - e.position.x) * (i - e.position.x) +
                        (j - e.position.y) * (j - e.position.y) +
                        (k - e.position.z) * (k - e.position.z)) < r) {
                        if ([177, 137, 135, 121, 143, 278].includes(voxels.getVoxelId(i, j, k))) {
                            let bb=0;
                            for(let u=0;u<bl.length;u++){
                                if(d3_({x:i+0.5,y:j+0.5,z:k+0.5},e.position)>=d3_({x:i+0.5,y:j+0.5,z:k+0.5},bl[u])){
                                    bb=1;
                                    break;
                                }
                            }
                            if(bb==0)voxels.setVoxelId(i, j, k, 0);
                        }
                    }
                }
            }
        }
        e.destroy();
        world.querySelectorAll('*').forEach(p => {
            if (p.hasTag('tnt') || p.isPlayer || p.hasTag('fb')) {
                const distance = Math.sqrt(
                    Math.pow(p.position.x - e.position.x, 2) +
                    Math.pow(p.position.y - e.position.y, 2) +
                    Math.pow(p.position.z - e.position.z, 2)
                )
                if (distance < 4) {
                    let x1=p.position.x,y1=p.position.y,z1=p.position.z;
                    let x2=e.position.x,y2=e.position.y,z2=e.position.z;
                    let d=Math.sqrt((x2-x1)**2+(y2-y1)**2+(z2-z1)**2);
                    p.velocity.x+=-(x2-x1)/d*5;
                    p.velocity.y+=-(y2-y1)/d*2.5;
                    p.velocity.z+=-(z2-z1)/d*5;
                    p.enblekfk=0;
                    p.ky=4;
                    setTimeout(()=>{
                        p.enblekfk=1;
                        p.ky=0;
                    },500);
                    p.special++;
                    setTimeout(()=>{
                        p.special--;
                    },2000);
                    entity.special++;
                    setTimeout(()=>{
                        entity.special--;
                    },2000);
                    if (p.hasTag('tkl'))p.hurt(3);
                    if (p.isPlayer && p.team != entity.team) {
                        ht(p,p.def.defence >= 2 ? (p.def.defence >= 4 ? 1 : 2) : 3);
                        p.tzys = 1;
                        setTimeout(() => {
                            p.tzys = 0;
                        }, 1000);
                    }
                    if (p.isPlayer && p.team != entity.team) p.killedType == 3;
                    if (p.isPlayer && p.team != entity.team) p.killer = entity.player.name;
                }
            }
        });
    },
    "火焰弹": async function (raycast, entity) {
        const e = world.createEntity({
            position: [entity.position.x + raycast.direction.x, entity.position.y + raycast.direction.y, entity.position.z + raycast.direction.z],
            collides: true,
            gravity: false,
            fixed: false,
            friction: 1,
            meshScale: [1 / 16, 1 / 16, 1 / 16],
            mass: 1,
            mesh: "mesh/火焰弹.vb",
        });
        e.addTag('hyd');
        e.velocity.x = raycast.direction.x * 2.5;
        e.velocity.y = raycast.direction.y * 2.5;
        e.velocity.z = raycast.direction.z * 2.5;
        var d3_ = function (a,b){
            function _2(n){
                return n*n;
            }
            return Math.sqrt(_2(a.x-b.x)+_2(a.y-b.y)+_2(a.z-b.z));
        };
        let cf = function () {
            if (!world.gameStarting) return;
            var x = e.position.x;
            var y = e.position.y;
            var z = e.position.z;
            e.destroy();
            let r = 3;
            let bl=[];
            for (let i = x - r; i <= x + r; i++) {
                for (let j = y - r; j <= y + r; j++) {
                    for (let k = z - r; k <= z + r; k++) {
                        if (voxels.getVoxelId(i, j, k)==170||voxels.getVoxelId(i, j, k)==364) {
                            bl.push({x:i+0.5,y:j+0.5,z:k+0.5});
                        }
                    }
                }
            }
            for (let i = x - r; i <= x + r; i++) {
                for (let j = y - r; j <= y + r; j++) {
                    for (let k = z - r; k <= z + r; k++) {
                        if (Math.sqrt((i - x) * (i - x) + (j - y) * (j - y) + (k - z) * (k - z)) < r) {
                            if ([177, 137, 278, 143].includes(voxels.getVoxelId(i, j, k))){
                                let bb=0;
                                for(let u=0;u<bl.length;u++){
                                    if(d3_({x:i+0.5,y:j+0.5,z:k+0.5},{x:x+0.5,y:y+0.5,z:z+0.5})>=d3_({x:i+0.5,y:j+0.5,z:k+0.5},bl[u])){
                                        bb=1;
                                        break;
                                    }
                                }
                                if(bb==0)voxels.setVoxelId(i, j, k, 0);
                            }
                        }
                    }
                }
            }
            world.querySelectorAll('*').forEach(p => {
                if (p.hasTag('tnt') || p.isPlayer || p.hasTag('fb')) {
                    const distance = Math.sqrt(
                        Math.pow(p.position.x - e.position.x, 2) +
                        Math.pow(p.position.y - e.position.y, 2) +
                        Math.pow(p.position.z - e.position.z, 2)
                    )
                    if (distance < 4) {
                        let x1=p.position.x,y1=p.position.y,z1=p.position.z;
                        let x2=e.position.x,y2=e.position.y,z2=e.position.z;
                        let d=Math.sqrt((x2-x1)**2+(y2-y1)**2+(z2-z1)**2);
                        p.velocity.x+=-(x2-x1)/d*1.5;
                        p.velocity.y+=-(y2-y1)/d*1.5;
                        p.velocity.z+=-(z2-z1)/d*1.5;
                        if(p==entity){
                            let num=1;
                            p.velocity.x+=raycast.direction.x*num;
                            p.velocity.z+=raycast.direction.z*num;
                        }
                        p.enblekfk=0;
                        p.ky=4;
                        setTimeout(()=>{
                            p.enblekfk=1;
                            p.ky=0;
                        },1500);
                        entity.special++;
                        setTimeout(()=>{
                            entity.special--;
                        },2000);
                        p.special++;
                        setTimeout(()=>{
                            p.special--;
                        },2000);
                        if (p.isPlayer && p.team != entity.team) {
                            ht(p,p.def.defence >= 2 ? (p.def.defence >= 4 ? 1 : 2) : 3);
                            p.tzys = 1;
                            setTimeout(() => {
                                p.tzys = 0;
                            }, 1000);
                        }
                        if (p.hasTag('tkl'))p.hurt(3);
                        if (p.isPlayer && p.team != entity.team) p.killedType == 3;
                        if (p.isPlayer && p.team != entity.team) p.killer = entity.player.name;
                        //if (p.isPlayer) Canopy.grantProtection(entity, Canopy.ExemptReason.DAMAGE_KNOCKBACK, 40);
                    }
                }
            });
        }
        let b = 0;
        e.onVoxelContact(() => {
            if (b) return;
            b = 1;
            cf();
        });
        e.onEntityContact(() => {
            if (b) return;
            b = 1;
            cf();
        });
        await sleep(16);
        e.lookAt({ x: entity.position.x, y: entity.position.y, z: entity.position.z });
        e.rotateLocal({ x: 0, y: 0, z: 0 }, 'Y', Math.PI / 2);
        await sleep(15000);
        e.destroy();
    },
    "雪球": async function (raycast, entity) {
        const e = world.createEntity({
            position: [entity.position.x + raycast.direction.x, entity.position.y + raycast.direction.y, entity.position.z + raycast.direction.z],
            collides: true,
            gravity: true,
            fixed: false,
            friction: 1,
            meshScale: [1 / 32, 1 / 32, 1 / 32],
            mass: 0.001,
            mesh: "mesh/雪球.vb",
        });
        e.velocity.x = raycast.direction.x * 3.6;
        e.velocity.y = raycast.direction.y * 3.6;
        e.velocity.z = raycast.direction.z * 3.6;
        e.onVoxelContact(() => {
            e.destroy();
        });
        e.onEntityContact(({ other }) => {
            const p = other;
            if (!p.isPlayer) return;
            if (p.team == entity.team) {
                e.destroy();
                return;
            }
            p.hurt(0);
            p.tzys = 1;
            setTimeout(() => {
                p.tzys = 0;
            }, 1000);
            entity.special++;
            setTimeout(()=>{
                entity.special--;
            },2000);
            p.special++;
            setTimeout(()=>{
                p.special--;
            },2000);
            banCrouch(p);
            p.velocity.x = raycast.direction.x * 1.1;
            p.velocity.y = 0.3;
            p.velocity.z = raycast.direction.z * 1.1;
            p.killedType == 3;
            p.killer = entity.player.name;
            e.destroy();
        });
        await sleep(16);
        e.lookAt({ x: entity.position.x, y: entity.position.y, z: entity.position.z });
        await sleep(5000);
        e.destroy();
    },
    "搭路蛋": async function (raycast, entity) {
        const e = world.createEntity({
            position: [entity.position.x + raycast.direction.x, entity.position.y - 0.5 + raycast.direction.y * 0.2, entity.position.z + raycast.direction.z],
            collides: true,
            gravity: true,
            fixed: false,
            friction: 1,
            meshScale: [1 / 16, 1 / 16, 1 / 16],
            mass: 0.01,
            mesh: "mesh/搭路蛋.vb",
        });
        e.velocity.x = raycast.direction.x * 2.1;
        e.velocity.y = raycast.direction.y * 2.1 + 0.2;
        e.velocity.z = raycast.direction.z * 2.1;
        e.addTag('fb');
        setTimeout(() => {
            e.addTag('dld');
        }, 100);
        e.onVoxelContact(() => {
            e.destroy();
        });
        await sleep(16);
        e.lookAt({ x: entity.position.x, y: entity.position.y, z: entity.position.z });
        setTimeout(() => {
            e.destroy();
        }, 1500);
    },
    "末影珍珠": async function (raycast, entity) {
        const e = world.createEntity({
            position: [entity.position.x + raycast.direction.x, entity.position.y + raycast.direction.y, entity.position.z + raycast.direction.z],
            collides: true,
            gravity: true,
            fixed: false,
            friction: 1,
            meshScale: [1 / 16, 1 / 16, 1 / 16],
            mass: 0.001,
            mesh: "mesh/末影珍珠.vb",
            meshScale: [0.05, 0.05, 0.05],
        });
        var y = entity.player.cameraYaw;
        var p = entity.player.cameraPitch;
        var forward = new GameVector3(
            -Math.cos(y) * Math.cos(p),
            -Math.sin(p),
            -Math.sin(y) * Math.cos(p)
        )
        console.log(y);
        e.velocity.x = raycast.direction.x * 3.6;
        e.velocity.y = raycast.direction.y * 3.6;
        e.velocity.z = raycast.direction.z * 3.6;
        e.addTag('fb');
        var b = 0;
        let cs = async function () {
            if (b) return;
            b = 1;
            e.destroy();
            entity.efb = 0;
 /*           Canopy.grantProtection(entity, Canopy.ExemptReasonTELEPORT_SCRIPT, 6);*/
            entity.position.set(e.position.x, e.position.y + 2, e.position.z);
            ht(entity,entity.def.defence >= 2 ? (entity.def.defence >= 4 ? 1 : 2) : 3);
            entity.special++;
            setTimeout(()=>{
                entity.special--;
            },5000);
            await sleep(2000);
            entity.efb = 1;
        }
        e.onVoxelContact(() => {
            cs();
        });
        e.onEntityContact(() => {
            cs();
        });
        await sleep(16);
        e.lookAt({ x: entity.position.x, y: entity.position.y, z: entity.position.z });
        await sleep(15000);
        e.destroy();
    },
    "救援平台": async function (raycast, entity) {
        let r = 3, x = entity.position.x, y = entity.position.y - 3, z = entity.position.z;
        entity.jyptcd = 1;
        entity.efb = 0;
        entity.special++;
        if(entity.position.y<0){
            entity.velocity.y=0;
            const e = world.createEntity({
                position: [entity.position.x, entity.position.y-3, entity.position.z],
                collides: true,
                gravity: false,
                fixed: false,
                friction: 1,
                meshScale: [1 / 4, 1 / 4, 1 / 4],
                mass: 0,
                mesh: "mesh/救援平台.vb",
            });
            while(entity.position.y<=5){
                e.velocity.y+=1;
                entity.velocity.y=e.velocity.y;
                await sleep(100);
            }
            r = 3, x = entity.position.x, y = entity.position.y - 3, z = entity.position.z;
            e.destroy();
        }
        const ee = world.createEntity({
            position: [entity.position.x, entity.position.y-4, entity.position.z],
            collides: true,
            gravity: false,
            fixed: false,
            friction: 1,
            meshScale: [1 / 4, 1 / 4, 1 / 4],
            mass: 0,
            mesh: "mesh/救援平台.vb",
        });
        for (let i = x - r; i <= x + r; i++) {
            for (let k = z - r; k <= z + r; k++) {
                if (Math.sqrt((i - x) * (i - x) + (k - z) * (k - z)) < r) {
                    if (voxels.getVoxelId(i, y, k) == 0) voxels.setVoxelId(i, y, k, voxels.id('green_glass'));
                }
            }
        }
        entity.velocity.y = 0;
        setTimeout(()=>{
            entity.special--;
        },2000);
        await sleep(3000);
        entity.efb = 1;
        await sleep(7000);
        for (let i = x - r; i <= x + r; i++) {
            for (let k = z - r; k <= z + r; k++) {
                if (Math.sqrt((i - x) * (i - x) + (k - z) * (k - z)) < r) {
                    if (voxels.getVoxelId(i, y, k) == voxels.id('green_glass')) voxels.setVoxelId(i, y, k, 0);
                }
            }
        }
        ee.destroy();
        await sleep(10000);
        entity.jyptcd = 0;
    },
    "回城卷轴": async function (raycast, entity) {
        entity.hcjzcd = 1;
        var a = {
            x: entity.position.x,
            y: entity.position.y,
            z: entity.position.z
        };
        let t = 5;
        while (t--) {
            entity.player.directMessage(`${t}秒后回城，请勿移动！`);
            await sleep(1000);
            if (Math.abs(a.x - entity.position.x) >= 1 || Math.abs(a.y - entity.position.y) >= 1 || Math.abs(a.z - entity.position.z) >= 1) {
                entity.player.directMessage(`回城取消`);
                entity.hcjzcd = 0;
                return;
            }
        }
        entity.special++;
        setTimeout(()=>{
            entity.special--;
        },2000);
        entity.player.forceRespawn();
        entity.hcjzcd = 0;
    },
    "金苹果": async function (raycast, entity) {
        if (!await use(entity, "金苹果", 43)) return;
        entity.states.push({ name: 'sh', time: 8, lv: 4 });
        entity.states.push({ name: 'xs', time: 60, lv: 4 });
        entity.xsTime=60000;
        entity.xs=4;
        remoteChannel.sendClientEvent(
            entity, 
            {type:"updgh",value:entity.xs}
        );
    },
    "跳跃药水": async function (raycast, entity) {
        if (!await use(entity, "跳跃药水", 39)) return;
        entity.states.push({ name: 'ty', time: 60, lv: 5 });
    },
    "迅捷药水": async function (raycast, entity) {
        if (!await use(entity, "迅捷药水", 40)) return;
        entity.states.push({ name: 'xj', time: 60, lv: 1 });
    },
    "力量药水": async function (raycast, entity) {
        if (!await use(entity, "力量药水", 41)) return;
        entity.states.push({ name: 'll', time: 60, lv: 1 });
    },
    "隐身药水": async function (raycast, entity) {
        if (!await use(entity, "隐身药水", 49)) return;
        entity.chp = entity.hp;
        entity.states.push({ name: 'ys', time: 30, lv: 1 });
    },
    "瞬间治疗药水": async function (raycast, entity) {
        if (!await use(entity, "瞬间治疗药水", 3)) return;
        if (entity.state.ys) {
            entity.chp += 12;
        } else {
            entity.hp += 12;
        }
    },
    "生命恢复药水": async function (raycast, entity) {
        if (!await use(entity, "生命恢复药水", 63)) return;
        entity.states.push({ name: 'sh', time: 60, lv: 2 });
        remoteChannel.sendClientEvent(
            entity, 
            {type:"updgh",value:entity.xs}
        );
    },
    "水桶": async function (raycast, entity) {
        const pos = raycast.voxelIndex.add(raycast.normal);
        if(voxels.getVoxelId(pos.x,pos.y,pos.z)){
            entity.bag.pile(51, 1);
            return;
        }
        entity.fks=3;
        voxels.setVoxelId(pos.x, pos.y, pos.z, 364);
        entity.bag.pile(58, 1);
        await sleep(2000);
        entity.fks=0;
    },
    "桶": async function (raycast, entity) {
        const pos = raycast.voxelIndex;
        if (voxels.getVoxelId(pos.x, pos.y, pos.z) == 364) {
            voxels.setVoxelId(pos.x, pos.y, pos.z, 0);
            entity.bag.pile(51, 1);
        } else {
            entity.bag.pile(58, 1);
        }
    },
    "牛奶": async function (raycast, entity) {
        if (!await use(entity, "牛奶", 59)) return;
        entity.player.directMessage('你获得了30秒无视陷阱的能力');
        entity.states.push({ name: 'dx', time: 30, lv: 1 });
    },
    "防御塔": async function (raycast, entity) {
        const pos = raycast.voxelIndex.add(raycast.normal);
        for(let i=0;i<6;i++){
            for(let j=-2;j<=2;j++){
                for(let k=-2;k<=2;k++){
                    let xx=pos.x+j,yy=pos.y+i,zz=pos.z+k;
                    if(!voxels.getVoxelId(xx,yy,zz)&&!bcp[xx*256*128+yy*256+zz]){
                        voxels.setVoxelId(xx,yy,zz,177);
                    }
                }
            }
            for(let j=-1;j<2;j++){
                for(let k=-1;k<2;k++){
                    let xx=pos.x+j,yy=pos.y+i,zz=pos.z+k;
                    if(voxels.getVoxelId(xx,yy,zz)==177){
                        voxels.setVoxelId(xx,yy,zz,0);
                    }
                }
            }
            await sleep(100);
        }
        for(let j=-2;j<=2;j++){
            for(let k=-2;k<=2;k++){
                let xx=pos.x+j,yy=pos.y+4,zz=pos.z+k;
                if(!voxels.getVoxelId(xx,yy,zz)&&!bcp[xx*256*128+yy*256+zz]){
                    voxels.setVoxelId(xx,yy,zz,177);
                }
            }
        }
        if(voxels.getVoxelId(pos.x,pos.y+4,pos.z)==177){
            voxels.setVoxelId(pos.x,pos.y+4,pos.z,0);
        }
        await sleep(100);
        let i=6;
        for(let j=-2;j<=2;j++){
            for(let k=-2;k<=2;k++){
                let xx=pos.x+j,yy=pos.y+i,zz=pos.z+k;
                if(!voxels.getVoxelId(xx,yy,zz)&&!bcp[xx*256*128+yy*256+zz]){
                    voxels.setVoxelId(xx,yy,zz,177);
                }
            }
        }
        for(let j=-1;j<2;j++){
            for(let k=-1;k<2;k++){
                let xx=pos.x+j,yy=pos.y+i,zz=pos.z+k;
                if(voxels.getVoxelId(xx,yy,zz)==177){
                    voxels.setVoxelId(xx,yy,zz,0);
                }
            }
        }
        for(let j=-2;j<=2;j++){
            for(let k=-2;k<=2;k++){
                if(j%2==0&&k%2==0)continue;
                let xx=pos.x+j,yy=pos.y+i,zz=pos.z+k;
                if(voxels.getVoxelId(xx,yy,zz)==177){
                    voxels.setVoxelId(xx,yy,zz,0);
                }
            }
        }
    },
    "铁傀儡刷怪蛋": async function (raycast, entity) {
        creattkl({x:entity.position.x,y:entity.position.y+3,z:entity.position.z},entity.teamNumber,entity.player.name);
        entity.special++;
        setTimeout(()=>{
            entity.special--;
        },2000);
    },
    "梯子": async function (raycast, entity) {
        
    },
};

globalThis.useBow = {
    "弓": async function (raycast, entity) {
        bow(raycast, entity, 0, 0);
    },
    "力量I弓": async function (raycast, entity) {
        bow(raycast, entity, 1, 0);
    },
    "力量II冲击I弓": async function (raycast, entity) {
        bow(raycast, entity, 2, 1);
    },
    "力量III冲击II弓": async function (raycast, entity) {
        bow(raycast, entity, 3, 2);
    },
};

async function bow(raycast, entity, ll, cj) {/*力量、冲击*/
    let fj = async function (d) {
        var y = entity.player.cameraYaw;
        var p = entity.player.cameraPitch;
        var forward = new GameVector3(
            -Math.cos(y) * Math.cos(p),
            -Math.sin(p),
            -Math.sin(y) * Math.cos(p)
        );
        const e = world.createEntity({
            position: [entity.position.x + forward.x, entity.position.y + forward.y, entity.position.z + forward.z],
            collides: true,
            gravity: true,
            fixed: false,
            friction: 1,
            meshScale: [1 / 32, 1 / 32, 1 / 32],
            mass: 0,
            mesh: "mesh/箭矢.vb",
        });
        let num = 5.5;
        e.velocity.x = forward.x * num;
        e.velocity.y = forward.y * num;
        e.velocity.z = forward.z * num;
        e.ed = 0;
        e.onEntityContact(({ other }) => {
            const p = other;
            if(p.hasTag('tkl')){
                let c = (cj == 2 ? 2 : (cj == 1 ? 1.4 : 0.7));
                let dmg = ll * 1.5 + d * 2 + 1;
                p.velocity.x += (forward.x * num * c)*0.7;
                p.velocity.y += 0.21;
                p.velocity.z += (forward.z * num * c)*0.7;
                p.hurt(dmg);
                return;
            }
            if (!p.isPlayer) return;
            if (p.team == entity.team || e.ed) {
                p.player.directMessage('你获得了一支箭矢');
                p.bag.pile(53, 1);
                remoteChannel.sendClientEvent(entity, { type: "update_hotbar", args: { bag: entity.bag } });
                e.destroy();
                return;
            }
            let c = (cj == 2 ? 2 : (cj == 1 ? 1.4 : 0.7));
            let dmg = ll * 1.5 + d * 2 + 1;
            let num_=1;
            p.velocity.x += (forward.x * num_ * c);
            p.velocity.y += 0.3;
            p.velocity.z += (forward.z * num_ * c);
            dmg -= p.def.defence;
            if (dmg < 0) dmg = 0;
            if(entity.state.ll==1)dmg=(dmg+1)*1.5;
            if(entity.state.ll==2)dmg=(dmg+2)*2;
            if(entity.state.ll==3)dmg=(dmg+4)*3;
            dmg *= p.def.da; /*乘减伤系数*/
            dmg *= p.getDamage; /*伤害抗性*/
            ht(p,dmg);
            p.tzys = 1;
            setTimeout(() => {
                p.tzys = 0;
            }, 1000);
            p.killer = entity.player.name;
            p.killedType = 3;
            p.player.directMessage('你受到了来自' + entity.player.name + '的' + dmg + '点伤害，剩余血量:' + Math.round(p.hp * 10) / 10);
            e.destroy();
        });
        e.onVoxelContact(() => {
            e.ed = 1;
        });
        e.lookAt({ x: entity.position.x, y: entity.position.y, z: entity.position.z });
        e.rotateLocal({ x: 0, y: 0, z: 0 }, 'Y', Math.PI);
        await sleep(15000);
        e.destroy();
    };
    let t = 3, fv = entity.player.cameraFovY;
    while (1) {
        if (!entity.player.action1Button) {
            entity.player.cameraFovY = fv;
            fj(3 - t);
            break;
        };
        if (t < 0) { await sleep(100); continue; };
        entity.player.cameraFovY *= 0.96;
        entity.states.push({ name: 'hm', time: 1, lv: 1 });
        entity.player.directMessage(`蓄力中（${3 - t}/3）`);
        t -= 0.5;
        await sleep(100);
    };
    entity.player.cameraFovY = fv;
}

async function use(entity, name, num) {
    console.log('using '+name);
    entity.usingobj=1;
    let a = 0.2;
    entity.player.walkSpeed *= a;
    entity.player.runSpeed *= a;
    let t = 3;
    while (t--) {
        if (!entity.player.action1Button) {
            entity.bag.pile(num, 1);
            remoteChannel.sendClientEvent(entity, { type: "update_hotbar", args: { bag: entity.bag } });
            entity.player.walkSpeed /= a;
            entity.player.runSpeed /= a;
            entity.usingobj=0;
            return 0;
        }
        entity.states.push({ name: 'hm', time: 1, lv: 1 });
        entity.player.directMessage(`${t}秒后使用${name}`);
        await sleep(1000);
    }
    entity.usingobj=0;
    entity.player.directMessage(`使用完毕`);
    entity.player.walkSpeed /= a;
    entity.player.runSpeed /= a;
    return 1;
}

async function sw(x, y, z) {
    await sleep(500);
    if (voxels.getVoxelId(x, y, z) == 0) {
        if (bcp[x * 256 * 128 + y * 256 + z]) return;
        voxels.setVoxelId(x, y, z, voxels.id('white'));
    }
}
// world.onTick(()=>{
//     world.querySelectorAll('player').forEach((e)=>{
//         if(e.player.name=='uns'){             
//             world.say(e.player.cameraPitch+' '+e.player.cameraYaw)         
//                              -0.5π~0.5π             0~2π
//         }
//     })
// });
let count = 0;
setInterval(() => {
    world.querySelectorAll('.dld').forEach(async (e) => {
        sw(Math.floor(e.position.x), Math.floor(e.position.y), Math.floor(e.position.z));
        sw(Math.floor(e.position.x) + 1, Math.floor(e.position.y), Math.floor(e.position.z));
        sw(Math.floor(e.position.x), Math.floor(e.position.y), Math.floor(e.position.z) + 1);
        sw(Math.floor(e.position.x) + 1, Math.floor(e.position.y), Math.floor(e.position.z)+1);
        e.velocity.y += 0.01;
    });
}, 64);
setInterval(() => {
    world.querySelectorAll('player').forEach(async (e) => {
        if(e.hand=='指南针'){
            let mind=Infinity,minp='';
            for(let i=0;i<world.querySelectorAll('player').length;i++){
                let p=world.querySelectorAll('player')[i];
                if(e.teamNumber==p.teamNumber)continue;
                if(p.enableDamage==0)continue;
                let d=getDis(p.position,e.position);
                mind=Math.min(mind,d);
                if(mind==d)minp=p;
            }
            if(minp!='')e.player.directMessage(`${minp.player.name}距离你${Math.round(mind)}米`);
        }
    });
}, 1000);
/*
console.log(entity.bag.slots[entity.choose.index].id+' '+entity.bag.slots[entity.choose.index].num);
*/
