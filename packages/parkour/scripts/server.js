for(let ix=0;ix<=256;ix++){
    for(let iz=0;iz<=256;iz++){
        for(let iy=0;iy<=64;iy++){
            if(voxels.getVoxel(ix,iy,iz)==voxels.id('dirt')&&voxels.getVoxel(ix,iy+1,iz)==voxels.id('air')){
                voxels.setVoxel(ix,8,iz,'water')
            }
        }
    }
}
const admin = ['弑神宗-小椰', 'Yua2nZHo1uLv4']
world.onPlayerJoin(({entity}) => {
    if (admin.includes(entity.player.name)){world.say('管理员'+entity.player.name +'进入了地图')}
    else{world.say(entity.player.name +'进入了地图')}
})
world.onChat(async({ entity, message }) => {
    if (entity.isPlayer) {
        if (message =='帮助') {
            const result4 = await entity.player.dialog({
                type:Box3DialogType.TEXT,
                title:'游戏帮助',
                content:'卒方块列表grass,snowland哦对了为了游戏体验，请你不要作弊'
            });

            if (!result4 || result === null){
                return;
            }
        }
        if (message == '还原') {
            entity.player.scale = 1
            entity.player.runSpeed = 1
            entity.player.invisible = false
            entity.player.spectator = false
            entity.player.color.set(1, 1, 1)
            entity.player.canFly = false
            entity.player.showName = true
            entity.player.emissive = 0
            entity.player.shininess = 0;
            entity.hp= 100
        }
        if (admin.includes(entity.player.name)) {
            if (message == '飞行'){
                entity.player.canfly = true
            }
            if(message =='隐形'){
                entity.player.invisible =true
            }
            if(message =='取消隐形'){
            entity.plauer.invisible =false
            }
            if(message.startsWith('禁言')){
                if(message.slice(2)==entity.player.name){
                    entity.player.directMessage('无法禁言自己，请重新尝试！')
                }else{
                    world.querySelectorAll('player').forEach((x)=>{
                        if(x.player.name == message.slice(2)){
                            x.player.directMessage('你已被伟大的管理员禁言，请等待管理员解除')
                            world.say('有人犯了错，被管理员禁言了！')
                            x.player.muted=true
                        }
                    })
                }
            }
            if(message.startsWith('解除禁言')){
                if(message.slice(4)==entity.player.name){
                    entity.player.directMessage('无法解除禁言自己，请重新尝试！')
                }else{
                    world.querySelectorAll('player').forEach((x)=>{
                    if(x.player.name == message.slice(4)){
                        x.player.directMessage('你已被管理员解除禁言')
                        world.say('有人被管理员解除禁言了！')
                        x.player.muted=false
                    }
                })
            }
        }
        if (message == '管理员特权') { entity.player.directMessage('亲爱的管理员你好！特殊功能包含飞行、解除飞行、加速、隐身、现身、隐藏名字、显示名字、幽灵、解除幽灵、发光、还原发光、反光、还原反光、变红色、变蓝色、变绿色、变紫色、变黄色、变浅蓝色、还原颜色、瞬移、关闭瞬移、加血、全部还原、关闭粒子特效、开启粒子特效、禁言(例如:禁言+禁言者名字)、解除禁言(例如:解除禁言+被禁言者名字)') }
        if (message == '飞行') { entity.player.canFly = true; world.say(entity.player.name + '开启了飞行模式') }
        if (message == '解除飞行') { entity.player.canFly = false; world.say(entity.player.name + '关闭了飞行模式') }
        
        if (message == '加速') {
            entity.player.walkSpeed += 50
            entity.player.runSpeed += 50
            entity.player.flySpeed += 50
            world.say(entity.player.name + '加速了')
        }
        if (message == '隐身') { entity.player.invisible = true; world.say(entity.player.name + '隐身了') }
        if (message == '现身') { entity.player.invisible = false; world.say(entity.player.name + '现身了') }
        if (message == '隐藏名字') { entity.player.showName = false; world.say(entity.player.name + '隐藏了名字') }
        if (message == '显示名字') { entity.player.showName = true; world.say(entity.player.name + '显示了名字') }
        if (message == '幽灵') { entity.player.spectator = true; world.say(entity.player.name + '开启了幽灵模式') }
        if (message == '解除幽灵') { entity.player.spectator = false; world.say(entity.player.name + '关闭了幽灵模式') }
        if (message == '发光') { entity.player.emissive = 1; world.say(entity.player.name + '开启了发光效果') }
        if (message == '还原发光') { entity.player.emissive = 0; world.say(entity.player.name + '还原了发光效果') }
        if (message == '反光') { entity.player.shininess = 1; world.say(entity.player.name + '开启了反光效果') }
        if (message == '还原反光') { entity.player.shininess = 0; world.say(entity.player.name + '还原了反光效果') }
        if (message == '变红色') { entity.player.color.set(1, 0, 0); world.say(entity.player.name + '变成了红色') }
        if (message == '变蓝色') { entity.player.color.set(0, 0, 1); world.say(entity.player.name + '变成了蓝色') }
        if (message == '变绿色') { entity.player.color.set(0, 1, 0); world.say(entity.player.name + '变成了绿色') }
        if (message == '变紫色') { entity.player.color.set(1, 0, 1); world.say(entity.player.name + '变成了紫色') }
        if (message == '变黄色') { entity.player.color.set(1, 1, 0); world.say(entity.player.name + '变成了黄色') }
        if (message == '变浅蓝色') { entity.player.color.set(0, 1, 1); world.say(entity.player.name + '变成了浅蓝色') }
        if (message == '还原颜色') { entity.player.color.set(1, 1, 1); world.say(entity.player.name + '还原了颜色') }
        if(message=='加血'){entity.hp += 1000;}
        if(message=='删除宠物'){entity.setPet();}
        if (message == '瞬移') { shunyi = 1; world.say(entity.player.name + '开启了瞬移') }
        if (message == '关闭瞬移') { shunyi = 0; world.say(entity.player.name + '关闭了瞬移')  }
        if (message == '全部还原') {
            entity.player.canFly = false
            entity.player.showName = true;
            entity.player.spectator = false;
            entity.player.invisible = false;
            entity.player.emissive = 0;
            entity.player.shininess = 0;
            entity.player.color.set(1, 1, 1);
            Object.assign(entity, { particleRate: 250, });
            world.say(entity.player.name + '全部还原了');
        };
        
        if (message == '关闭粒子特效') { Object.assign(entity, { particleRate: 0, }); world.say(entity.player.name + '关闭了粒子特效');}
        if (message == '开启粒子特效') { Object.assign(entity, { particleRate: 250, }); world.say(entity.player.name + '开启了粒子特效');}
        }    
    }
})                                                  






world.onVoxelContact(async({entity,voxel}) => {
    if(entity.isPlayer){
        if(voxel == voxels.id('grass')){
            await sleep(100); 
            entity.player.directMessage('你被毒草毒S了')
            await sleep(200); 
            entity.player.forceRespawn();  // 让玩家重生
        } 
        if(voxel == voxels.id('snowland')){
            await sleep(100); 
            entity.player.directMessage('你被冻S了')
            await sleep(200); 
            entity.player.forceRespawn();  // 让玩家重生
        } 
        if(voxel == voxels.id('orange')){
            await sleep(100); 
            entity.player.directMessage('你被撞S了')
            await sleep(200); 
            entity.player.forceRespawn();  // 让玩家重生
        } 
        if(voxel == voxels.id('medium_green')){
            await sleep(100); 
            entity.player.directMessage('你被绿S了')
            await sleep(200); 
            entity.player.forceRespawn();  // 让玩家重生
        } 
    }
})







for (const e of world.querySelectorAll('*')) {//遍历所有实体
    if (e.id.startsWith('存档')) {//如果当前实体名左边部分刚好是“存档点”，比如：存档点
        e.collides = true  //开始碰撞
        e.fixed = true //固定实体不被推移
        e.onEntityContact(({ other }) => { //每当存档点碰到另一个实体
            if (other.isPlayer) {//另一个实体是玩家
                if (e.position !== other.player.spawnPoint) {//检测当前存档点
                    if (e.id === '存档点_终点') {
                        other.player.directMessage('恭喜你，到达终点，开启飞行！')  //给玩家发消息
                        other.player.canFly = true
                        return;
                    }
                    other.player.directMessage('恭喜你，到达新的重生点，继续加油吧！')  //给玩家发消息
                    other.player.spawnPoint = [e.position.x , e.position.y + 2 , e.position.z]  
                    //other.x=other.position.x
                    //other.y=other.position.y
                }
            }
        })
    }
}