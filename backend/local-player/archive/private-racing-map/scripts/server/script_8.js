
var selectDialog = async function (content, title, options, entity) {
    return await entity.player.dialog({
        type: 'select',
        title: title,
        content: content,
        options: options
    })
};
var inputDialog = async function (content, title, entity) {
    return await entity.player.dialog({
        type: 'input',
        title: title,
        content: content,
    })
};
var textDialog = function (content, title, entity) {
    return entity.player.dialog({
        type: 'text',
        title: title,
        content: content,
    })
};
world.meg_uns=[];
world.meg_zym=[];
world.onPlayerJoin(async({entity})=>{
    if(entity.player.name=='柊音梦'||entity.player.userId=='313302324407187'){
        for(let i=0;i<mag_uns.length;i++){
            const d = await selectDialog(mag_uns[i],'来自uns的信',['回复']);
            if(!d){
                while(1){
                    const dd = await selectDialog(`uns给你写的信，不看看嘛？`,'来自uns的信',['看','不看']);
                    if(!dd)continue;
                    if(dd.value=='不看'){
                        break;
                    }else{
                        i--;
                        break;
                    }
                }
            }
            if(d.value=='回复'){
                const d=await inputDialog('回信：','给uns回信',entity);
                if(d)world.meg_zym.push(d);
            }
        }
    }
});