globalThis.playerStorage = storage.getDataStorage("BedWarPlayers");
globalThis.cpt=[];

globalThis.updatecpt=async function(){
    while(1){
        try{
            let data = await playerStorage.get("cpt1",cpt);
            if(!data||!data.value){
                await playerStorage.set("cpt1",[]);
                continue;
            }
            await playerStorage.set("cpt1",cpt);
            break;
        }catch(e){
            console.log('比赛数据库: '+e);
        }
        await sleep(1000);
    }
    console.log('上传成功');
}

globalThis.loadcpt=async function(){
    while(1){
        try{
            let data = await playerStorage.get("cpt1",cpt);
            if(!data||!data.value){
                await playerStorage.set("cpt1",[]);
                continue;
            }
            cpt=data.value;
            break;
        }catch(e){
            console.log('比赛数据库: '+e);
        }
        await sleep(1000);
    }
    console.log('读取成功');
}