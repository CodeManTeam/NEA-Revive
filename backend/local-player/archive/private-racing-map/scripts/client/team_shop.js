globalThis.input;
const uiScale = UiScale.create();
remoteChannel.events.on('client', async (args) => {//UI端收到命令
    if(args.type&&args.type=='openTeamShop'){
        shopOpen(args.u);
    }
    if(args.type&&args.type=='closeTeamShop'){
        shopClose();
    }
});
var tp=-1;
var lt=-1;
globalThis.allInd=0;
async function shopOpen(u){
    input.unlockPointer();
    const _x_ = Math.floor(screenWidth / 240);
    const _y_ = Math.floor(screenHeight / 210);
    const a = Math.min(_x_, _y_);
    uiScale.scale = (a * 0.4 - (a * 0.4 - 1.2) * 0.18) * 0.6;
    const shop=ui.findChildByName('teamshop');
    const _x = 62;
    const _y = 62;
    shop.visible=1;
    shop.uiScale = uiScale;
    for(let i=0;i<Team_Prices.length;i++){
        let a;
        a=UiImage.create();
        a.parent=shop;
        a.name='*'+i;
        a.position.offset.x=24+(i%9)*_x-dt;
        a.position.offset.y=(3+Math.floor(i/9))*(_y+9)-18;
        a.size.offset.x=_x;
        a.size.offset.y=_y;
        a.backgroundOpacity=0;
        a.ind=i;
        a.type=2;
        a.image=Team_Prices[i].pic;
        let b=UiText.create();
        b.parent=shop;
        b.textColor.copy(Vec3.create(GREEN));
        b.textContent=String(u[i]);
        b.position.offset.x=(i%9)*_x-25-dt;
        b.position.offset.y=(3+Math.floor(i/9))*(_y+9)+10;
        b.textFontSize=25;
        b.visible=1;
        b.zIndex=100;
        b.name='u'+String(i);
        a.events.on("pointerdown", () => {
            const target=a;
            //console.log('buyteamthingui');
            remoteChannel.sendServerEvent({//向非UI端发送命令
                type:'buyteamthing',
                num:target.ind,
                buyInd:allInd
            });
            allInd++;
        });
    }
    await sleep(16);
    input.unlockPointer();
}
function shopClose(){
    const shop=ui.findChildByName('teamshop');
    shop.visible=0; 
    for(let i=0;i<Prices.length;i++){
        var c = shop.findChildByName('*'+String(i));
        if(c) {
            c.parent=null;
            c=null;
        }
        var d = shop.findChildByName('u'+String(i));
        if(d) {
            d.parent=null;
            d=null;
        }
    }
    input.lockPointer();
}