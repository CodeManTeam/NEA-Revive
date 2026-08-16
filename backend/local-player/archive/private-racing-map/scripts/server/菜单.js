//world.querySelectorAll('player')
class DW{
    member=[];//成员名单
}
globalThis.getdwperson = 0; 
globalThis.gly = ['13082652','13374101', '13790153','13627632','272578644057028','313308796218296','378102974836447','50496996','13485142','3918842437'];
world.onChat(async ({ entity, message }) => {
    if (message == "/settings"||message == "/setting"||message == "/menu") {
        settings(entity);
    }
});
remoteChannel.onServerEvent(({ entity, args }) => {//非UI端收到命令
    if(args.type=='sz'){
        settings(entity);
    }
});
globalThis.settings=async function(entity){
    let option = ['发不了消息？按这里','切换视角','丢弃主手物品',"CPS监测","辅助搭路开关", '自定义按键', "赛季积分排行榜", "击杀数排行榜", "最终击杀数排行榜", "强制起床排行榜", "举报", "组队", "称号",'背包','皮肤','隐藏左侧按键','调整视场角'];
    if (admin.includes(entity.player.userId)||gly.includes(entity.player.userId)||entity.player.name=='uns') {
        option.push("查看举报");
        option.push("重新开始游戏");
        option.push('强制服务器重启');
    }
    if(entity.player.name.includes('挖一个坑'))option.pop();
    if(admin.includes(entity.player.userId)||entity.player.name=='uns'||entity.player.name=='wind'){
        option.push('添加比赛名单');
        option.push('查看比赛名单');
        option.push('删除比赛名单');
        option.push('查看存活人ID');
        option.push("封号");
    }
    if(admin.includes(entity.player.userId)||entity.player.name=='uns'){
        option.push("控制台");
    }
    let i = await selectDialog("玩家姓名:" + entity.player.name + "\n" + 
    `击杀数: ${entity.data.kills}\n最终击杀数: ${entity.data.endKills}\n摧毁床数: ${entity.data.beds}\n起床分数: ${entity.data.score_2}\n请进行操作...`
    , "设置", option, entity);
    if (!i) return;
    if(i.value=='查看存活人ID'){
        let a='',cnt=0;
        world.querySelectorAll('player').forEach((e)=>{
            if(e.enableDamage){
                a+=`'`+e.player.userId+`',`; 
                cnt++;
            }
        });
        selectDialog(a,cnt,['确定'],entity);
    }
    if(i.value=='查看死亡顺序'){
        selectDialog(deadNum,'死亡顺序',['确定'],entity);
    }
    if(i.value=='切换视角')entity.player.cameraMode = (entity.player.cameraMode == 'follow' ? 'fps' : 'follow');
    if(i.value=='隐藏左侧按键')remoteChannel.sendClientEvent(entity,{ type: "noe"} );
    if(i.value=='丢弃主手物品'){
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
    if(i.value=='发不了消息？按这里'){
        var message = await inputDialog('请输入消息','发消息',entity);
        if(!message)return;
        if(message.length>30)return;
        world.say(entity.player.name+' : '+message);
        world.querySelectorAll('player').forEach((e)=>{
            gui.message(e, (entity.data.appellation!=''?`[${entity.data.appellation}]`:'')+entity.player.name + ':' + message, entity);
        });
    }
    if(i.value=='调整视场角'){
        var message = await inputDialog('请输入视场角（1-150）','/fovy',entity);
        let a = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
        for (let i = 0; i < message.length; i++) {
            if (!a.includes(message[i])) return;
        }
        let n = Number(message);
        if (n > 150) n = 150;
        entity.player.cameraFovY = n / 150;
    }
    if(i.value=='控制台'){
        const d = await inputDialog('Over', '请输入你的命令', entity);
        if (!d) return;
        try {
            textDialog(eval(d), 'Over', entity);
        } catch (err) {
            textDialog(err , 'Error', entity);
        }
    }
    if(i.value.includes('排行')){
        updateRankData(entity);
    }
    if(i.value==="CPS监测"){
        let pn=[],p=[];
        for(let i=0;i<world.querySelectorAll('player').length;i++){
            pn.push(world.querySelectorAll('player')[i].player.name);
            p.push(world.querySelectorAll('player')[i]);
        }
        d.push('取消监测');
        const d=await selectDialog('选择你要检测的对象',i.value,pn,entity);
        if(!d)return;
        if(d.value=='取消监测'){
            pn.push('取消监测');
            entity.checkCPS='';
            return;
        }
        entity.checkCPS=p[d.index];
    }
    if(i.value=='添加比赛名单'){
        const d=await inputDialog(i.value,'请输入玩家id',entity);
        if(!d)return;
        await loadcpt();
        cpt.push(d);
        await updatecpt();
        textDialog(i.value,'添加成功',entity);
    }
    else if(i.value=='删除比赛名单'){
        await loadcpt();
        const d=await selectDialog(i.value,'请点击要删除的玩家id',cpt,entity);
        if(!d)return;
        cpt.remove(d.value);
        await updatecpt();
        textDialog(i.value,'删除成功',entity);
    }
    else if(i.value=='查看比赛名单'){
        await loadcpt();
        selectDialog(i.value,'名单：',cpt,entity);
    }
    else if (i.value == "击杀数排行榜") {
        selectDialog(
            rankDataKills.map((e, i) => {
                return `第${i + 1}名 ${e.name}；击杀数：${e.kills}`
            }).join('\n'), '排行榜', ['确定'],
            entity);
    }
    else if (i.value == "最终击杀数排行榜") {
        selectDialog(
            rankDataEndKills.map((e, i) => {
                return `第${i + 1}名 ${e.name}；最终击杀数数：${e.endKills}`
            }).join('\n'), '排行榜', ['确定'],
            entity);
    }
    else if (i.value == "强制起床排行榜") {
        selectDialog(
            rankDataBeds.map((e, i) => {
                return `第${i + 1}名 ${e.name}；摧毁床数：${e.beds}`
            }).join('\n'), '排行榜', ['确定'],
            entity);
    }
    else if (i.value == "赛季积分排行榜") {
        selectDialog(
            rankDataScore.map((e, i) => {
                return `第${i + 1}名 ${e.name}；赛季积分：${e.score}`
            }).join('\n'), '排行榜', ['确定'],
            entity);
    }
    else if (i.value == "举报") {
        let op = world.querySelectorAll('player');
        let pl = [];
        for (let i = 0; i < op.length; i++) {
            pl.push(op[i].player.name);
        }
        let i = await selectDialog("你要举报谁", "uns·视奸反外挂系统", pl, entity);
        if (!i)
            return;
        jb.push(op[i.index]);
    } else if (i.value == "组队") {
        let p = ["邀请他人"];
        if (entity.dw==-1) {
            p.push("查看邀请");
        } else {
            p.push("退出队伍");
        }
        let ask = "";
        if (entity.dw!=-1) {
            ask += "你的队伍里有...\n";
            for(let i=0;i<dws[entity.dw].member.length;i++){
                ask+=dws[entity.dw].member[i].player.name+'\n';
            }
        }
        ask += "你要...";
        let cz = await selectDialog(ask, "组队", p, entity);
        if (!cz) return;
        if (cz.value == "邀请他人") {
            let op = world.querySelectorAll('player');
            let pl = [],opt=[];
            for (let i = 0; i < op.length; i++) {
                if(op[i].dw!=-1||op[i]==entity)continue;
                pl.push(op[i].player.name);
                opt.push(op[i]);
            }
            let i = await selectDialog("你要邀请谁", "组队系统", pl, entity);
            if(!i)return;
            if(entity.dw==-1){
                entity.dw=dws.length;
                let a=new DW();
                a.member.push(entity);
                dws.push(a);
            }
            opt[i.index].player.directMessage("你收到一条组队邀请");
            opt[i.index].yq.push(entity);
        } else if (cz.value == "退出队伍") {
            world.querySelectorAll('player').forEach((e)=>{
                if(e.dw==entity.dw&&e.dw!=-1){
                    e.player.directMessage(entity.player.name + "退出了你所在的队伍");
                }
            });
            if(entity.dw==-1)return;
            dws[entity.dw].member.remove(entity);
            entity.dw = 0;
        } else {
            let tmp = [];
            for (let i = 0; i < entity.yq.length; i++) {
                const e=entity.yq[i];
                tmp.push(e.player.name);
            }
            let i = await selectDialog("邀请如下", "组队系统", tmp, entity);
            if (!i) return;
            entity.dw=entity.yq[i.index].dw;
            world.querySelectorAll('player').forEach((e)=>{
                if(e.dw==entity.dw){
                    e.player.directMessage(entity.player.name + "加入了你所在的队伍");
                }
            });
            dws[entity.dw].member.push(entity);
            entity.yq = [];
        }
    } else if (i.value == "辅助搭路开关") {
        if (entity.data.dlkg) {
            entity.player.directMessage("辅助搭路已关闭");
            entity.data.dlkg = false;
        } else {
            entity.player.directMessage("辅助搭路已开启");
            entity.data.dlkg = true;
        }
    } else if (i.value == "查看举报") {
        let tmp = [];
        for (let i = 0; i < jb.length; i ++) {
            tmp.push(jb[i].player.name);
        }
        let i = await selectDialog("举报如下", "封禁系统", tmp, entity);
        if (!i) return;
        let j = await selectDialog("你确定要封禁 " + tmp[i.index] + " 吗?", "封禁系统", ["确定", "取消"], entity);
        if (!j) return;
        if (j.value == "确定") {
            let k = await selectDialog("你被管理员ban了!", "封禁系统", ["确定"], jb[i.index]);
            jb[i.index].player.kick();
        }
    }else if(i.value=='封号'){
        let a=[],b=[],c=[];
        world.querySelectorAll('player').forEach((e)=>{
            a.push(e.player.name);
            b.push(e.player.userId);
            c.push(e);
        });
        a.push('其他');
        let dd=await selectDialog('封号名称','封号',a,entity);
        if(dd.index==a.length-1){
            let d=await inputDialog('封号id','封号',entity);
            if(d=='313312734669695')return;
            hmd.push(d);
            world.querySelectorAll('player').forEach((e)=>{
                if(e.player.userId==d&&e.player.name!='uns'){
                    e.player.kick();
                    e.data.isBan=1;
                }
            });
        }else{
            world.querySelectorAll('player').forEach((e)=>{
                if(e.player.name==dd.value){
                    hmd.push(e.player.userId);
                    e.player.kick();
                    e.data.isBan=1;
                }
            });
        }
    }else if(i.value=='自定义按键'){
        let buttonName=[1,2,3,4,5,6,7,8,9,'打开背包','切换视角','丢弃物品'];
        let a=[];
        for(let i=0;i<buttonName.length;i++){
            a.push(String(buttonName[i])+'--'+String(words[entity.data.button[i]]));
        }
        let d = await selectDialog('自定义按键','设置',a,entity);
        if(!d)return;
        let e = await inputDialog('请输入你想设置的按键名称 例如：A 0 Tab，请勿使用小写字母','设置',entity);
        if(!e)return;
        if(e.length>10)return;
        if(!keys[String(e)])return;
        entity.data.button[d.index]=keys[String(e)];
    }else if (i.value == "称号") {
        let i = await selectDialog("选择哪个称号？", "称号", entity.data.appellations, entity);
        if (!i) return;
        entity.data.appellation = i.value;
        await savePlayer();
        await textDialog("设置成功！", "系统", entity);
    }else if(i.value=='背包'){
        let i = await selectDialog("穿戴哪个物品？", "背包", entity.data.bag, entity);
        if (!i) return;
        if(!i.value.includes('披风'))return;
        entity.data.wearing = i.value;
        await savePlayer();
        await textDialog("设置成功！重进后生效", "系统", entity);
    }else if(i.value=='皮肤'){
        let d = await selectDialog("穿戴哪个皮肤？", "皮肤", entity.data.pf, entity);
        if(!d)return;
        entity.player.setSkinByName(d.value);
    }else if(i.value=='重新开始游戏'){
        gameReStart();
    }else if(i.value=='强制服务器重启'){
        while(1){};
    }
}

globalThis.musicList=['audio/Manasha.mp3','audio/once upon a time.mp3','audio/underground.mp3','audio/wake.mp3','audio/disaster.mp3'];

world.onPlayerJoin(({entity})=>{
    entity.musicNum=0;
    entity.music='';
});

remoteChannel.onServerEvent(({ entity, args }) => {//非UI端收到命令
    if(args.type=='nextMusic'){
        if(entity.music!='')entity.music.stop();
        entity.musicNum=(entity.musicNum+1+musicList.length)%musicList.length;
        entity.music=entity.sound(musicList[entity.musicNum]);
        remoteChannel.sendClientEvent(//向UI端发送命令
            entity,
            {type:"updmusic",music:entity.musicNum}
        );
    }
    if(args.type=='lastMusic'){
        if(entity.music!='')entity.music.stop();
        entity.musicNum=(entity.musicNum-1+musicList.length)%musicList.length;
        entity.music=entity.sound(musicList[entity.musicNum]);
        remoteChannel.sendClientEvent(//向UI端发送命令
            entity,
            {type:"updmusic",music:entity.musicNum}
        );
    }
    if(args.type=='pause'){
        if(entity.music!='')entity.music.pause();
    }
    if(args.type=='resume'){
        if(entity.music!='')entity.music.resume();
    }
    if(args.type=='rt'){
        world.querySelectorAll('player').forEach((e)=>{
            if(e.teamNumber==entity.teamNumber){
                remoteChannel.sendClientEvent(//向UI端发送命令
                    e, // 玩家实体参数
                    {type:"remind",state:args.state,team:args.team,name:entity.player.name} // 事件参数
                );
            }
        });
    }
    if(args.type=='sm'){
        talk=entity.player.name+'：'+args.value+'\n'+talk;
        remoteChannel.sendClientEvent(//向UI端发送命令
            entity, // 玩家实体参数
            {type:"ut",value:talk} // 事件参数
        );
    }
});

globalThis.talk='';


