globalThis.BLACK=  { r: 0, g: 0, b: 0};
globalThis.WHITE=  { r: 255, g: 255, b: 255};
globalThis.GREY=  { r: 170, g: 170, b: 170};
globalThis.YELLOW=  { r: 255, g: 255, b: 85};
globalThis.RED=  { r: 255, g: 85, b: 85};
globalThis.GREEN=  { r: 85, g: 255, b: 85};
globalThis.BLUE=  { r: 85, g: 85, b: 255};

globalThis.input;
const uiScale = UiScale.create();
globalThis.shop=ui.findChildByName('shop');
const _x = 62;
const _y = 62;
shop.uiScale = uiScale;
globalThis.opt=[];
globalThis.opts=[];
var tp=-1;
var lt=-1;
function init(){
    for(let i=0;i<Types.length;i++){
        let a;
        a=UiImage.create();
        a.parent=shop;
        a.name='*'+i;
        a.position.offset.x=24+(i%9)*_x-dt;
        a.position.offset.y=(3+Math.floor(i/9))*(_y+9)-18;
        a.size.offset.x=_x;
        a.size.offset.y=_y;
        a.type=0;
        a.backgroundOpacity=0;
        a.ind=i;
        a.image=Types[i].pic;
        opts.push(a);
    }
    let ltp=-1,cnt=0;
    for(let i=0;i<Prices.length;i++){
        if(ltp!=Prices[i].type){
            cnt=0;
            ltp=Prices[i].type;
        }
        let a;
        a=UiImage.create();
        a.parent=shop;
        a.name=String(i);
        a.position.offset.x=24+(cnt%9)*_x-dt;
        a.position.offset.y=(4+Math.floor(cnt/9))*(_y+9)-7;
        let b=UiText.create();
        b.parent=shop;
        b.textColor.copy(Vec3.create(GREEN));
        b.textContent=String(Prices[i].score)+'exp';
        b.position.offset.x=(cnt%9)*_x-40-dt;
        b.position.offset.y=(4+Math.floor(cnt/9))*(_y+9)+30;
        b.zIndex=100;
        b.name='p'+String(i);
        let c=UiText.create();
        c.parent=shop;
        c.textColor.copy(Vec3.create(GREEN));
        c.textContent=String(Prices[i].name);
        c.position.offset.x=(cnt%9)*_x-40-dt;
        c.position.offset.y=(3+Math.floor(cnt/9))*(_y+9)+45;
        c.zIndex=100;
        c.name='n'+String(i);
        a.size.offset.x=_x;
        a.size.offset.y=_y;
        a.backgroundOpacity=0;
        a.ind=i;
        a.type=1;
        a.tp=Prices[i].type;
        b.tp=Prices[i].type;
        a.pd=0;
        let name=Prices[i].name;
        for(let j=0;j<=ITEM_DATA.length;j++){
            if(ITEM_DATA[j].usename.chinese==name){
                a.image=Image_Data[j];
                break;
            }
        }
        a.visible=0;
        b.visible=0;
        c.visible=0;
        opt.push({a:a,b:b,c:c});
        opts.push(a);
        cnt++;
    }
    for(let i=0;i<opts.length;i++){
        let target=opts[i];
        target.events.on("pointerdown", () => {
            console.log(target.type);
            if(target.type==0){
                if(lt!=-1)cl(lt);
                tp=target.ind;
                ol();
                lt=target.ind;
            }
            if(target.type==1){
                remoteChannel.sendServerEvent({//向非UI端发送命令
                    type:'buything',
                    score:Prices[target.ind].score,
                    num:target.ind,
                    buyInd:allInd
                });
                allInd++;
                return;
            }
        });
    }
}init();

function ol(){
    for(let i=0;i<opt.length;i++){
        if(opt[i].a.tp!=tp)continue;
        opt[i].a.visible=1;
        opt[i].b.visible=1;
        opt[i].c.visible=1;
    }
}

function cl(a){
    for(let i=0;i<opt.length;i++){
        if(opt[i].a.tp!=tp)continue;
        opt[i].a.visible=0;
        opt[i].b.visible=0;
        opt[i].c.visible=0;
    }
}

async function shopOpen(){
    const _x_ = Math.floor(screenWidth / 240);
    const _y_ = Math.floor(screenHeight / 210);
    const a = Math.min(_x_, _y_);
    uiScale.scale = (a * 0.4 - (a * 0.4 - 1.2) * 0.18) * 0.6;
    input.unlockPointer();
    ui.findChildByName('lock').visible=1;
    shop.visible=1;
}

function shopClose(){
    ui.findChildByName('lock').visible=0;
    shop.visible=0; 
    input.lockPointer();
}

remoteChannel.events.on('client', async (args) => {//UI端收到命令
    if(args.type&&args.type=='openShop'){
        shopOpen();
    }
    if(args.type&&args.type=='closeShop'){
        shopClose();
    }
});