remoteChannel.events.on('client', async (args) => {//UI端收到命令
    if(args.type=='win'){
        console.log('win');
        ui.findChildByName('go').visible=1;
        ui.findChildByName('go').findChildByName('b').textContent=args.value.a;
        ui.findChildByName('go').findChildByName('a').textContent=args.value.b;
        await sleep(3000);
        ui.findChildByName('go').visible=0;
    }
});


const main__ = UiScreen.getAllScreen().find((_screen) => _screen.name == "main");
ui.findChildByName('killcnt').sut=0;
remoteChannel.events.on('client', async (args) => {//UI端收到命令
    if(args.type&&args.type=='changeScore'){
        const c = main__.findChildByName('uc').findChildByName('Hotbar');
        const b = c.findChildByName('经验条');
        const a = b.findChildByName('sc');
        a.textContent=String(args.value);
    };
    if(args.type=='noe'){
        ui.findChildByName('e').visible=0;
    }
    if(args.type=='upd'){
        const a = ui.findChildByName('event');
        a.textContent=args.value;
    }
    if(args.type=='updk'){
        ui.findChildByName('killcnt').textContent=args.value+' 杀';
        ui.findChildByName('killcnt').sut+=3;
    }
});

setInterval(()=>{
    if(ui.findChildByName('killcnt').sut<=0){
        ui.findChildByName('killcnt').visible=0;
    }else{
        ui.findChildByName('killcnt').visible=1;
        ui.findChildByName('killcnt').sut--;
    }
},1000);

ui.findChildByName('e').events.on("pointerdown", () => {
    remoteChannel.sendServerEvent({
        type:'e',
    });
});


ui.findChildByName('设置').events.on("pointerdown", () => {
    remoteChannel.sendServerEvent({
        type:'sz',
    });
});