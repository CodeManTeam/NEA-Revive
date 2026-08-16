class State{
    name='';
    time=0;
};

globalThis.tts=function(x){
    let res='';
    if(x>3600){
        res+=Math.floor(x/3600)+':';
    }
    x=x%3600;
    if(x>60){
        res+=Math.floor(x/60)+':';
    }
    x=x%60;
    res+=Math.floor(x);
    return res;
};

world.onTick(()=>{
    world.querySelectorAll('player').forEach((e)=>{
        if(e.state.ys==0)e.chp=e.hp;
    });
});

world.onPlayerJoin(({entity})=>{
    entity.xs=0;
    entity.xsTime=0;
    entity.sp=0;
});

globalThis.sendGJD=async function(entity){}

globalThis.events=[
    {time:1.5,name:'钻石点II级',func:()=>{
            world.say('钻石点已升级至II级');
            for(let i=0;i<sources.length;i++){
                let s=sources[i];
                if(s.type==4){
                    s.time=sourcesLevel[3][1];
                }
            }
        }
    },
    {time:2,name:'血量提升 阶段I',func:()=>{
            world.say('血量提升 阶段I');
            world.querySelectorAll('player').forEach((e)=>{
                e.maxHp=26;
            });
            world.hp=26;
        }
    },
    {time:3,name:'绿宝石点II级',func:()=>{
            world.say('绿宝石点已升级至II级');
            for(let i=0;i<sources.length;i++){
                let s=sources[i];
                if(s.type==2){
                    s.time=sourcesLevel[2][1];
                }
            }
        }
    },
    {time:5,name:'血量提升 阶段II',func:()=>{
            world.say('血量提升 阶段II');
            world.querySelectorAll('player').forEach((e)=>{
                e.maxHp=30;
            });
            world.hp=30;
        }
    },
    {time:7,name:'钻石点III级',func:()=>{
            world.say('钻石点已升级至III级');
            for(let i=0;i<sources.length;i++){
                let s=sources[i];
                if(s.type==4){
                    s.time=sourcesLevel[3][2];
                }
            }
        }
    },
    {time:8,name:'绿宝石点III级',func:()=>{
            world.say('绿宝石点已升级至III级');
            for(let i=0;i<sources.length;i++){
                let s=sources[i];
                if(s.type==2){
                    s.time=sourcesLevel[2][2];
                }
            }
        }
    },
    {time:10,name:'血量提升 阶段III',func:()=>{
            world.say('血量提升 阶段III');
            world.querySelectorAll('player').forEach((e)=>{
                e.maxHp=34;
            });
            world.hp=34;
        }
    },
    {time:15,name:'血量提升 阶段MAX',func:()=>{
            world.say('血量提升 阶段MAX');
            world.querySelectorAll('player').forEach((e)=>{
                e.maxHp=40;
            });
            world.hp=40;
        }
    },
    {time:18,name:'钻石点MAX级',func:()=>{
            world.say('钻石点已升级至MAX级');
            for(let i=0;i<sources.length;i++){
                let s=sources[i];
                if(s.type==4){
                    s.time=sourcesLevel[3][3];
                }
            }
        }
    },
    {time:20,name:'绿宝石点MAX级',func:()=>{
            world.say('绿宝石点已升级至MAX级');
            for(let i=0;i<sources.length;i++){
                let s=sources[i];
                if(s.type==2){
                    s.time=sourcesLevel[2][3];
                }
            }
        }
    },
    {time:45,name:'床自毁',func:async()=>{
            world.team_has_bed=[0,0,0,0,0];
            updateTeam();
            world.say('全部床已自毁');
            world.querySelectorAll('player').forEach(async(e)=>{
                remoteChannel.sendClientEvent(//向UI端发送命令
                    e, // 玩家实体参数
                    { type: "beddestory" } // 事件参数
                );
                await sleep(5000);
                remoteChannel.sendClientEvent(//向UI端发送命令
                    e, // 玩家实体参数
                    { type: "beddestoryover" } // 事件参数
                );
            });
            for(let i=0;i<256;i++){
                for(let j=0;j<128;j++){
                    for(let k=0;k<256;k++){
                        if(voxels.getVoxelId(i,j,k)==650){
                            voxels.setVoxelId(i,j,k,0);
                        }
                    }
                }
                await sleep(1);
            }
            for(let i=1;i<=4;i++)world.querySelector(`.bed${t}`).meshInvisible = 1;
        }
    },
    {time:60,name:'强制终局',func:()=>{
            world.say('强制终局');
            gameReStart();
        }
    },
];

globalThis.timeCnt=0;
(async()=>{await sleep(1000);setInterval(()=>{
    updateTeam();
    if(world.gameTime%1000==0){
        world.querySelectorAll('player').forEach((e)=>{
            if(e.checkCPS!='')e.player.directMessage(`${e.checkCPS.player.name}的左键cps为${e.checkCPS.leftCps}，右键cps为${e.checkCPS.rightCps}。`);
            e.maxHp=world.hp;
            e.leftCps=0;
            e.rightCps=0;
        });
        for (let i = 1; i <= 20; i++) {
            world.querySelector('.m' + i).position.copy(area[areaCnt].mop[i - 1]);
            world.querySelector('.m' + i).meshOrientation.copy(area[areaCnt].mot[i - 1]);
        }
    }
    if(new Date().getHours()+8==21&&new Date().getMinutes()>=58){
        world.querySelectorAll('player').forEach((e)=>{
            sendGJD(e);
        });
    }
    // if(timeCnt%200==0)world.say('uns的UI商店有发力风险，按Q键可以把多买的物品卖掉');
    // if(timeCnt%200==50)world.say('移动端点击屏幕即可切换武器，点右侧白色按键可开、关背包');
    // if(timeCnt%200==100)world.say('商店在出生点正前方，村民和骷髅（小白）是商店，其中小白是团队商店');
    // if(timeCnt%200==150)world.say('uns·视奸反外挂系统已启动，请勿试图开挂，一经发现，直接永封！');
    let nen=events[0].name,net=events[0].time;
    for(let i=0;i<events.length;i++){
        if(world.gameTime==events[i].time*60000){
            events[i].func();
        }
        if(world.gameTime>=events[i].time*60000){
            if(i!=events.length-1){
                nen=events[i+1].name;
                net=events[i+1].time;
            }
        }
    }
    world.querySelectorAll('player').forEach((e)=>{
        remoteChannel.sendClientEvent(//向UI端发送命令
            e, // 玩家实体参数
            {type:"ut",value:talk} // 事件参数
        );
        remoteChannel.sendClientEvent(e, { type: "update_hotbar", args: { bag: e.bag } });
        let t0=Math.floor(net*60-world.gameTime/1000);
        let t1=Math.floor(world.gameTime/1000);
        remoteChannel.sendClientEvent(e, {
            type: 'upd', value: `目前地图：${area[areaCnt].name}，
下一事件：${nen}，
时间：${tts(t0)}
游戏总用时：${tts(t1)}`
        });
    });
    world.querySelectorAll('player').forEach((e)=>{
        var names=['sh','ty','xj','ll','ys','xs','hm','jp','pl','dx','kx'];
        for(let i=0;i<names.length;i++){
            e.state[names[i]]=0;
        }
        let arr=[];
        for(let i=0;i<e.states.length;i++){
            if(e.states[i].name!=' '&&e.states[i].time>0){
                arr.push(e.states[i])
            }
        }
        e.states=arr;
        let ct=0;
        // for(let i=0;i<e.states.length;i++){
        //     console.log(e.states[i].name+' '+e.states[i].time);
        // }
        // console.log('---------');
        for(let i=0;i<e.states.length;i++){
            console.log(i);
            e.states[i].time-=0.1;
            if(e.states[i].time<=0||(e.states[i].name=='ys'&&e.tzys)){
                if(e.states[i].name=='ys'){
                    e.hp=e.chp;
                }
                e.states[i].name=' ';
                continue;
            }
            e.state[e.states[i].name]=e.states[i].lv;
            if(ct<5)remoteChannel.sendClientEvent(//向UI端发送命令
                e, // 玩家实体参数
                {type:"addstate",ind:ct++,value:e.states[i].name,time:Math.floor(e.states[i].time)} // 事件参数
            );
        }
        if(ct==0){
            remoteChannel.sendClientEvent(//向UI端发送命令
                e, // 玩家实体参数
                {type:"addstate",ind:-1,value:'',time:''} // 事件参数
            );
        }
        //生命恢复
        if((world.gameTime%5000==0&&e.state.sh==0)||(world.gameTime%2000==0&&e.state.sh==1)||
        (world.gameTime%1000==0&&e.state.sh==2)||(world.gameTime%600==0&&e.state.sh==3)||
        (world.gameTime%500==0&&e.state.sh==4)||(world.gameTime%200==0&&e.hp<=e.maxHp-1&&e.state.sh==5)){
            if(e.state.ys==0){
                if(e.hp<=e.maxHp-1){
                    e.hp++;
                }
            }else{
                if(e.chp<=e.maxHp-1){
                    e.chp++;
                }
            }
        }
        //跳跃
        if(e.state.ty==0){
            e.player.jumpPower=0.563;
            e.ky=1;
            if(e.fks!=3)e.fks=0;
        }
        if(e.state.ty==2){
            e.player.jumpPower=0.75;
            e.ky=2;
            if(e.fks!=3)e.fks=1;
        }
        if(e.state.ty==5){
            e.player.jumpPower=1.1;
            e.ky=4;
            if(e.fks!=3)e.fks=2;
        }
        //迅捷
        if(e.state.xj==0){
            e.player.runSpeed=e.player.walkSpeed=0.181;
        }
        if(e.state.xj==1){
            e.player.runSpeed=e.player.walkSpeed=0.32;
        }
        if(e.state.xj==2){
            e.player.runSpeed=e.player.walkSpeed=0.36;
        }
        //缓慢
        if(e.state.hm==1||e.gd){
            e.player.runSpeed*=0.3;
            e.player.walkSpeed*=0.3;
        }
        //隐身
        if(e.state.ys==0&&e.dead==0&&!e.player.crouchButton){
            e.enableInteract = true; 
            e.player.invisible=0;
            e.player.showName=1;
            e.player.showIndicator=0;
        }
        if(e.state.ys==1){
            e.enableInteract = false; 
            e.hp=e.maxHp;
            e.player.invisible=1;
            e.player.showName=0;
            e.player.showIndicator=1;
        }
        //伤害吸收
        if(e.state.kx==0){
            e.getDamage=1;
        }
        if(e.state.kx==1){
            e.getDamage=0.8;
        }
        if(e.state.kx==2){
            e.getDamage=0.6;
        }
        if(e.shopOpening||e.is_open%2||e.boxOpening){
            e.player.runSpeed=e.player.walkSpeed=e.player.jumpPower=0;
            e.player.runAcceleration=e.player.walkAcceleration=0;
        }else{
            e.player.runAcceleration=e.player.walkAcceleration=0.1796875;
        }
    });
    timeCnt++;
    world.gameTime+=100;
    world.querySelectorAll('player').forEach((e)=>{
        if(e.xsTime>0){
            e.xsTime-=100;
        }else{
            e.xs=0;
        }
    });
},100);})();
world.onPlayerJoin(({entity})=>{
    entity.getDamage=1;//承受伤害*<-
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
        kx:0,//伤害抗性
    };
    entity.tzys=0;//停止隐身
    entity.states=[];//{name: time: lv:}
});

// world.onTick(() => {
//     world.querySelectorAll('player').forEach((e) => {
//         if(!e.lvy)e.lvy={x:0,y:0,z:0};
//         e.lvy.x = e.velocity.x;
//         e.lvy.y = e.velocity.y;
//         e.lvy.z = e.velocity.z;
//     });
// });

world.onPlayerJoin(({ entity }) => {
    entity.lvy={x:0,y:0,z:0};
    entity.hand = '';
    entity.efb=1;//是否受到摔落伤害
    entity.jyptcd=0;//救援平台冷却
    entity.hcjzcd=0;//回城卷轴冷却
    entity.ky=1;//y速度为...时判定卡方块
    entity.bowcd=0;//弓cd
    entity.isdy=0;//钓鱼竿是否正在钓
    entity.checkCPS='';
    entity.leftCps=0;
    entity.rightCps=0;
});

world.onPress(({button,entity})=>{
    if(button=='action1'){
        entity.rightCps++;
    }
    if(button=='action0'){
        entity.leftCps++;
    }
});
