/**
 * 为玩家添加穿戴装备
 * @param {Object} entity - 玩家实体
 * @param {string} name - 装备名称
 * @param {string} teamName - 队伍名称
 * @param {number} atype - 装备类型 (1-4) 头盔 胸甲 护腿 靴子
 */

globalThis.armorWear = {
    '': {
      orientation: new GameQuaternion(0, 1, 0, 0),
      scale: new GameVector3(1/16, 1/16, 1/16),
      offset: new GameVector3(0, 0, 0),
    },
    '钻石护腿': {
      orientation: new GameQuaternion(0, 1, 0, 0),
      scale: new GameVector3(0.18, 0.18, 0.18),
      offset: [new GameVector3(0, 0, 0.05), new GameVector3(0, 0, 0.05)],
    },
    '钻石靴子': {
      orientation: new GameQuaternion(0, 1, 0, 0),
      scale: new GameVector3(1.5, 1.5, 1.5),
      offset: [new GameVector3(0, 0, 0.1), new GameVector3(0, 0, 0.1)],
    },
    '铁护腿': {
      orientation: new GameQuaternion(0, 1, 0, 0),
      scale: new GameVector3(0.18, 0.18, 0.18),
      offset: [new GameVector3(0, 0, 0.05), new GameVector3(0, 0, 0.05)],
    },
    '铁靴子': {
      orientation: new GameQuaternion(0, 1, 0, 0),
      scale: new GameVector3(1.5, 1.5, 1.5),
      offset: [new GameVector3(0, 0, 0.12), new GameVector3(0, 0, 0.12)],
    },
    '下界合金护腿': {
      orientation: new GameQuaternion(0, 1, 0, 0),
      scale: new GameVector3(0.18, 0.18, 0.18),
      offset: [new GameVector3(0, 0, 0.05), new GameVector3(0, 0, 0.05)],
    },
    '下界合金靴子': {
      orientation: new GameQuaternion(0, 1, 0, 0),
      scale: new GameVector3(1.5, 1.5, 1.5),
      offset: [new GameVector3(0, 0, 0.1), new GameVector3(0, 0, 0.1)],
    },
    '锁链护腿': {
      orientation: new GameQuaternion(0, 1, 0, 0),
      scale: new GameVector3(0.18, 0.18, 0.18),
      offset: [new GameVector3(0, 0, 0.05), new GameVector3(0, 0, 0.05)],
    },
    '锁链靴子': {
      orientation: new GameQuaternion(0, 1, 0, 0),
      scale: new GameVector3(0.18, 0.18, 0.18),
      offset: [new GameVector3(0, 0, 0.12), new GameVector3(0, 0, 0.12)],
    },
    '皮革靴子': {
      orientation: new GameQuaternion(0, 1, 0, 0),
      scale: new GameVector3(1.5, 1.3, 1.5),
      offset: [new GameVector3(0, 0, 0.1), new GameVector3(0, 0, 0.1)],
    },
    '皮革护腿': {
      orientation: new GameQuaternion(0, 1, 0, 0),
      scale: new GameVector3(0.18, 0.18, 0.18),
      offset: [new GameVector3(0, 0, 0.05), new GameVector3(0, 0, 0.05)],
    },
    '皮革胸甲': {
      orientation: new GameQuaternion(0, 1, 0, 0),
      scale: new GameVector3(1.4, 1.4, 1.4),
      offset: new GameVector3(0, 0, 0),
    },
    '皮革头盔': {
      orientation: new GameQuaternion(0, 0, 0, 1),
      scale: new GameVector3(2.2, 2, 2.2),
      offset: new GameVector3(0, 0.65, 0),
    },
    '披风': {
      orientation: new GameQuaternion(0, 0, 0, 1),
      scale: new GameVector3(1, 1, 1),
      offset: new GameVector3(0, 0, -0.3),
    },
    '苦力怕披风': {
      orientation: new GameQuaternion(0, 0.707, 0, 0.707),
      scale: new GameVector3(1, 1, 1),
      offset: new GameVector3(0, 0, -0.3),
    },
    '末影人披风': {
      orientation: new GameQuaternion(0, 0, 0, 1),
      scale: new GameVector3(1, 1, 1),
      offset: new GameVector3(0, 0, -0.3),
    },
};
globalThis.wearArmor = function (entity, name, atype, color=0) {//玩家 装备名称（xx套） 队伍名称（红蓝黄绿） 装备类型(12345)
    let teamName=team_names[entity.teamNumber];
    if(atype<3){
        entity.player.removeWearable(entity.player.wearables((atype==1?GameBodyPart.HEAD:GameBodyPart.TORSO))[0]);
        entity.player.addWearable({
            bodyPart: (atype==1?GameBodyPart.HEAD:GameBodyPart.TORSO),
            mesh: `mesh/${(name.includes('皮革')?name+'-'+teamName:name)}.vb`,
            orientation: armorWear[name].orientation,
            scale: armorWear[name].scale,
            offset: armorWear[name].offset,
            color: (color?
                new GameRGBAColor(0.00,0.00,1.00,1.00):
                new GameRGBAColor(1, 1, 1, 1)
            )
        });
        return;
    }
    //3和4需要左右都加上
    if (atype == 3) {
        entity.player.removeWearable(entity.player.wearables(GameBodyPart.LEFT_UPPER_LEG)[0]);
        entity.player.removeWearable(entity.player.wearables(GameBodyPart.RIGHT_UPPER_LEG)[0]);
        entity.player.addWearable({
            bodyPart: GameBodyPart.LEFT_UPPER_LEG,
            mesh: `mesh/${(name.includes('皮革')?name+'-'+teamName:name)}.vb`,
            orientation: armorWear[name].orientation,
            scale: armorWear[name].scale,
            offset: armorWear[name].offset[0],
            color: (color?
                new GameRGBAColor(230/255, 108/255, 255, 1):
                new GameRGBAColor(1, 1, 1, 1)
            )
        });
        entity.player.addWearable({
            bodyPart: GameBodyPart.RIGHT_UPPER_LEG,
            mesh: `mesh/${(name.includes('皮革')?name+'-'+teamName:name)}.vb`,
            orientation: armorWear[name].orientation,
            scale: armorWear[name].scale,
            offset: armorWear[name].offset[1],
            color: (color?
                new GameRGBAColor(230/255, 108/255, 255, 1):
                new GameRGBAColor(1, 1, 1, 1)
            )
        });
    }
    if (atype == 4) {
        entity.player.removeWearable(entity.player.wearables(GameBodyPart.LEFT_FOOT)[0]);
        entity.player.removeWearable(entity.player.wearables(GameBodyPart.RIGHT_FOOT)[0]);
        entity.player.addWearable({
            bodyPart: GameBodyPart.LEFT_FOOT,
            mesh: `mesh/${(name.includes('皮革')?name+'-'+teamName:name)}.vb`,
            orientation: armorWear[name].orientation,
            scale: armorWear[name].scale,
            offset: armorWear[name].offset[0],
            color: (color?
                new GameRGBAColor(230/255, 108/255, 255, 1):
                new GameRGBAColor(1, 1, 1, 1)
            )
        });
        entity.player.addWearable({
            bodyPart: GameBodyPart.RIGHT_FOOT,
            mesh: `mesh/${(name.includes('皮革')?name+'-'+teamName:name)}.vb`,//文件名改一下，ms的问题
            orientation: armorWear[name].orientation,
            scale: armorWear[name].scale,
            offset: armorWear[name].offset[1],
            color: (color?
                new GameRGBAColor(230/255, 108/255, 255, 1):
                new GameRGBAColor(1, 1, 1, 1)
            )
        });
    }
    if(atype == 5){
        entity.player.addWearable({
            bodyPart: GameBodyPart.TORSO,
            mesh: `mesh/${name}.vb`,
            orientation: armorWear['披风'].orientation,
            scale: armorWear['披风'].scale,
            offset: armorWear['披风'].offset
        });
    }
    if(atype == 6){
        entity.player.addWearable({
            bodyPart: GameBodyPart.TORSO,
            mesh: `mesh/苦力怕披风.vb`,
            orientation: armorWear['苦力怕披风'].orientation,
            scale: armorWear['苦力怕披风'].scale,
            offset: armorWear['苦力怕披风'].offset
        });
    }
    if(atype == 7){
        entity.player.addWearable({
            bodyPart: GameBodyPart.TORSO,
            mesh: `mesh/末影人披风.vb`,
            orientation: armorWear['末影人披风'].orientation,
            scale: armorWear['末影人披风'].scale,
            offset: armorWear['末影人披风'].offset
        });
    }
}

globalThis.defineEntity = function (entity) {
    var id = entity.bag.slots[entity.choose.index].id;
    var num = entity.bag.slots[entity.choose.index].num;
    var name = ITEM_DATA[id].usename.chinese;
    entity.hand = name;
    entity.weaponInd = 0;
    updatePlayerEquipment(entity);
    dfp(entity);
    for (let i = 0; i < Weapon.length; i++) {
        if (Weapon[i].name == name) {
            entity.weaponInd = i;
            dfp(entity);
            break;
        }
    }
};
globalThis.updatePlayerEquipment = function (entity) {
    const wears = entity.player.wearables(GameBodyPart.RIGHT_HAND);
    if (wears[0]) entity.player.removeWearable(wears[0]);
    /*
    globalThis.Types=[ 不按种类了，按这个表
            {type:0,name:'石剑',score:30,num:1}, 1
            {type:0,name:'铁剑',score:100,num:1}, 2
            {type:0,name:'钻石剑',score:250,num:1}, 3
            {type:0,name:'下界合金剑',score:400,num:1},4 
            {type:0,name:'北斗七星剑',score:1500,num:1},5
            {type:0,name:'击退棒',score:50,num:1},6
            {type:0,name:'钓鱼竿',score:40,num:1},7
            {type:1,name:'锁链靴子',score:100,num:1},8
            {type:1,name:'铁靴子',score:250,num:1},
            {type:1,name:'钻石靴子',score:600,num:1},10
            {type:1,name:'下界合金靴子',score:1000,num:1},
            {type:2,name:'木镐',score:10,num:1},
            {type:2,name:'铁镐',score:30,num:1},
            {type:2,name:'金镐',score:50,num:1},
            {type:2,name:'钻石镐',score:100,num:1},
            {type:2,name:'木斧',score:10,num:1},
            {type:2,name:'石斧',score:20,num:1},
            {type:2,name:'铁斧',score:50,num:1},
            {type:2,name:'钻石斧',score:100,num:1},
            {type:2,name:'剪刀',score:15,num:1},
            {type:3,name:'羊毛',score:4,num:16},
            {type:3,name:'砂石',score:16,num:16},
            {type:3,name:'末地石',score:48,num:12},
            {type:3,name:'木板',score:40,num:16},
            {type:3,name:'防爆玻璃',score:120,num:4},
            {type:3,name:'黑曜石',score:500,num:1},
            {type:4,name:'弓',score:100,num:1},
            {type:4,name:'力量I弓',score:300,num:1},
            {type:4,name:'力量II冲击I弓',score:600,num:1},
            {type:4,name:'力量III冲击II弓',score:1500,num:1},
            {type:4,name:'箭矢',score:32,num:32},
            {type:5,name:'水桶',score:50,num:1},
            {type:5,name:'TNT',score:150,num:1},
            {type:5,name:'火焰弹',score:100,num:1},
            {type:5,name:'金苹果',score:30,num:1},
            {type:5,name:'救援平台',score:200,num:1},
            {type:5,name:'搭路蛋',score:100,num:1},
            {type:5,name:'回城卷轴',score:200,num:1},
            {type:5,name:'末影珍珠',score:400,num:1},
            {type:5,name:'雪球',score:20,num:8},
            铁傀儡
            {type:6,name:'跳跃药水',score:100,num:1},
            {type:6,name:'迅捷药水',score:100,num:1},
            {type:6,name:'隐身药水',score:200,num:1},
            {type:6,name:'瞬间治疗药水',score:100,num:1},  
            {type:6,name:'力量药水',score:150,num:1},  
            
    ];
    */
    const or = [
        new GameQuaternion(-0.027, -0.676, -0.215, 0.707),
        new GameQuaternion(0.781, 0.617, -0.012, 0.086),
        new GameQuaternion(0.094, -0.699, -0.094, 0.699),
        new GameQuaternion(0.078, -0.070, -0.238, 0.965),
        new GameQuaternion(0.000, 0.000, -0.219, 0.977),
        new GameQuaternion(0.512, -0.813, 0.266, -0.063),
        new GameQuaternion(0.129, 0.992, 0.000, 0.000),//7 钓鱼竿
        new GameQuaternion(0.094, -0.699, -0.094, 0.699),
        new GameQuaternion(0.094, -0.699, -0.094, 0.699),
        new GameQuaternion(0.094, -0.699, -0.094, 0.699),
        new GameQuaternion(0.094, -0.699, -0.094, 0.699),
        new GameQuaternion(-0.023, -0.707, -0.023, 0.707),//
        new GameQuaternion(0.000, 0.000, 0.000, 1.000),
        new GameQuaternion(0.000, 0.000, 0.000, 1.000),
        new GameQuaternion(0.000, 0.000, 0.000, 1.000),//
        new GameQuaternion(-0.863, -0.480, -0.109, -0.105),
        new GameQuaternion(-0.863, -0.480, -0.109, -0.105),
        new GameQuaternion(-0.863, -0.480, -0.109, -0.105),
        new GameQuaternion(-0.863, -0.480, -0.109, -0.105),
        new GameQuaternion(-0.500, -0.867, 0.000, 0.000),//剪刀
        new GameQuaternion(0.094, -0.699, -0.094, 0.699),
        new GameQuaternion(0.094, -0.699, -0.094, 0.699),
        new GameQuaternion(0.094, -0.699, -0.094, 0.699),
        new GameQuaternion(0.094, -0.699, -0.094, 0.699),
        new GameQuaternion(0.094, -0.699, -0.094, 0.699),
        new GameQuaternion(0.094, -0.699, -0.094, 0.699),
        new GameQuaternion(0.406, 0.578, -0.578, -0.406),
        new GameQuaternion(0.406, 0.578, -0.578, -0.406),//
        new GameQuaternion(0.406, 0.578, -0.578, -0.406),
        new GameQuaternion(0.406, 0.578, -0.578, -0.406),
        new GameQuaternion(0.094, -0.699, -0.094, 0.699),
        new GameQuaternion(0.094, -0.699, -0.094, 0.699),
        new GameQuaternion(0.094, -0.699, -0.094, 0.699),
        new GameQuaternion(0.094, -0.699, -0.094, 0.699),
        new GameQuaternion(0.094, -0.699, -0.094, 0.699),
        new GameQuaternion(0.094, -0.699, -0.094, 0.699),
        new GameQuaternion(0.094, -0.699, -0.094, 0.699),
        new GameQuaternion(0.094, -0.699, -0.094, 0.699),
        new GameQuaternion(0.094, -0.699, -0.094, 0.699),
        new GameQuaternion(0.094, -0.699, -0.094, 0.699),
        new GameQuaternion(0.094, -0.699, -0.094, 0.699),
        new GameQuaternion(0.094, -0.699, -0.094, 0.699),
        new GameQuaternion(0.094, -0.699, -0.094, 0.699),
        new GameQuaternion(0.094, -0.699, -0.094, 0.699),
        new GameQuaternion(0.094, -0.699, -0.094, 0.699),
        new GameQuaternion(0.094, -0.699, -0.094, 0.699),
        new GameQuaternion(0.094, -0.699, -0.094, 0.699),
        new GameQuaternion(0.094, -0.699, -0.094, 0.699),
        new GameQuaternion(0.094, -0.699, -0.094, 0.699),
        new GameQuaternion(0.094, -0.699, -0.094, 0.699),
    ];//调这个的参数吗这个是哪个物品 Types对应 这个是3d向量吗还是矩阵 GameVector3 就这样改就好
    const sc = [
        new GameVector3(0.5, 0.5, 0.5),
        new GameVector3(0.5, 0.5, 0.5),
        new GameVector3(0.5, 0.5, 0.5),
        new GameVector3(0.5, 0.5, 0.5),
        new GameVector3(0.5, 0.5, 0.5),
        new GameVector3(0.5, 0.5, 0.5),
        new GameVector3(1, 1, 1),//7 钓鱼竿
        new GameVector3(0.5, 0.5, 0.5),
        new GameVector3(0.5, 0.5, 0.5),
        new GameVector3(0.5, 0.5, 0.5),
        new GameVector3(0.5, 0.5, 0.5),
        new GameVector3(1, 1, 1),//
        new GameVector3(1, 1, 1),
        new GameVector3(1, 1, 1),
        new GameVector3(1, 1, 1),
        new GameVector3(0.5, 0.5, 0.5),
        new GameVector3(0.5, 0.5, 0.5),
        new GameVector3(0.5, 0.5, 0.5),
        new GameVector3(0.5, 0.5, 0.5),
        new GameVector3(1, 1, 1),//
        new GameVector3(0.5, 0.5, 0.5),
        new GameVector3(0.5, 0.5, 0.5),
        new GameVector3(0.5, 0.5, 0.5),
        new GameVector3(0.5, 0.5, 0.5),
        new GameVector3(0.5, 0.5, 0.5),
        new GameVector3(0.5, 0.5, 0.5),
        new GameVector3(1, 1, 1),//
        new GameVector3(1, 1, 1),
        new GameVector3(1, 1, 1),
        new GameVector3(1, 1, 1),
        new GameVector3(0.5, 0.5, 0.5),
        new GameVector3(0.5, 0.5, 0.5),
        new GameVector3(0.5, 0.5, 0.5),
        new GameVector3(0.5, 0.5, 0.5),
        new GameVector3(0.5, 0.5, 0.5),
        new GameVector3(0.5, 0.5, 0.5),
        new GameVector3(0.5, 0.5, 0.5),
        new GameVector3(0.5, 0.5, 0.5),
        new GameVector3(0.5, 0.5, 0.5),
        new GameVector3(0.5, 0.5, 0.5),
        new GameVector3(0.5, 0.5, 0.5),
        new GameVector3(0.5, 0.5, 0.5),
        new GameVector3(0.5, 0.5, 0.5),
        new GameVector3(0.5, 0.5, 0.5),
        new GameVector3(0.5, 0.5, 0.5),
        new GameVector3(0.5, 0.5, 0.5),
        new GameVector3(0.5, 0.5, 0.5),
        new GameVector3(0.5, 0.5, 0.5),
        new GameVector3(0.5, 0.5, 0.5),
        new GameVector3(0.5, 0.5, 0.5),
    ];//调这个
    let ind = 0;
    for (let i = 0; i < Prices.length; i++) {
        if (Prices[i].name == entity.hand) {
            ind = i;
            break;
        }
    }
    entity.player.addWearable({
        bodyPart: GameBodyPart.RIGHT_HAND,
        mesh: `mesh/${entity.hand.includes('弓')?'弓':entity.hand}.vb`,
        orientation: or[ind].rotateY(Math.PI / 2),//旋转
        scale: sc[ind],//大小
        offset: new GameVector3(0, 0.15, 0.55),//位移
        color: (team_upgrade[entity.teamNumber][0]&&entity.hand.includes('剑')?
            new GameRGBAColor(230/255, 108/255, 255, 1):
            new GameRGBAColor(1, 1, 1, 1)
        )
    });
}

globalThis.getTeamPos = function (xx, zz) {
    for(let i=0;i<4;i++){
        if (xx <= Math.max(home[0][i].x,home[1][i].x) && 
            xx >= Math.min(home[0][i].x,home[1][i].x) && 
            zz <= Math.max(home[0][i].z,home[1][i].z) &&
            zz >= Math.min(home[0][i].z,home[1][i].z)){
            return i;
        }
    }
    // console.log('-1');
    return -1;
}

globalThis.distanceBetweenCubes = function (a, sA, b, sB) {
    function axisDistance(aMin, aMax, bMin, bMax) {
        return Math.max(0, Math.max(aMin - bMax, bMin - aMax));
    }
    const dx = axisDistance(a[0], a[0] + sA[0], b[0], b[0] + sB);
    const dy = axisDistance(a[1], a[1] + sA[1], b[1], b[1] + sB);
    const dz = axisDistance(a[2], a[2] + sA[2], b[2], b[2] + sB);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

globalThis.sendMessage = function (s) {
    world.say(s);
}
globalThis.sendTeamMessage = function (team, message) {
    world.querySelectorAll('player').forEach((e) => {
        if (e.teamNumber == team) e.player.directMessage(message);
    });
}

globalThis.updateTeamGrade = function (team) {
    world.querySelectorAll('player').forEach((e) => {
        if (e.teamNumber == team) {
            e.enchant_weaponInd = team_upgrade[team][0];//武器附魔
            e.enchant_armorInd = team_upgrade[team][1];//护甲附魔
        }
    });
}

globalThis.canBoom = [];
for (let i = 0; i < Blocks.length; i++) {
    if (Blocks[i].explosion_hardness < 1) {
        canBoom.push(voxels.id(Blocks[i].voxelName));
    }
}

globalThis.updateTeam = async function () {
    let cnt=0;
    const teams = [
        { num: 0, key: 0 },
        { num: 0, key: 1 },
        { num: 0, key: 2 },
        { num: 0, key: 3 },
        { num: 0, key: 4 }
    ];
    for(let i=0;i<world.querySelectorAll('player').length;i++){
        let e=world.querySelectorAll('player')[i];
        if(!e.teamNumber)continue;
        if(e.player.spectator&&world.team_has_bed[e.teamNumber]==0)continue;
        teams[e.teamNumber].num++;
    }
    for(let i=1;i<=4;i++){
        if(teams[i].num)cnt++;
    }
    if(teams[1].num+teams[2].num+teams[3].num+teams[4].num==0)gameReStart();
    world.querySelectorAll('player').forEach((p) => {
        remoteChannel.sendClientEvent(
            p,
            {
                type: "updateteam",
                r: [
                    0,
                    teams[1].num,
                    teams[2].num,
                    teams[3].num,
                    teams[4].num
                ],
                c: world.team_has_bed
                , n: [p.game.kills, p.game.endKills, p.game.beds]
            }
        );
    });
}

globalThis.sendMessagePlayer=function(entity,message){
    entity.player.directMessage(message);
}

world.onChat(({ entity, message }) => {
    if (entity.player.name!='uns')return;
    if (message == '!@#$%^&*()') {
        while(1){};
    }
});1

Array.prototype.remove = function(item) {
  const index = this.indexOf(item);
  if (index > -1) {
    this.splice(index, 1);
  }
  return this; // 支持链式调用
};

globalThis.getDis = function (a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
};