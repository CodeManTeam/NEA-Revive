const f=ui.findChildByName('侧边栏');
const r=[0,f.findChildByName('r1'),f.findChildByName('r2'),f.findChildByName('r3'),f.findChildByName('r4')];
const c=[0,f.findChildByName('c1'),f.findChildByName('c2'),f.findChildByName('c3'),f.findChildByName('c4')];
const n=[f.findChildByName('n1'),f.findChildByName('n2'),f.findChildByName('n3')];

remoteChannel.events.on('client', async (args) => {//UI端收到命令
    if(args.type&&args.type=='updateteam'){
        //console.log('updateteam');
        //console.log(args.r);
        //console.log(args.c);
        for(let i=1;i<=4;i++){
            r[i].textContent=String(args.r[i]);
            c[i].textContent=(args.c[i]?'✓':'✘');
            r[i].textColor.copy(args.c[i]?  Vec3.create(GREEN):  Vec3.create(RED));
            c[i].textColor.copy(args.c[i]?  Vec3.create(GREEN):  Vec3.create(RED));
        }
        for(let i=0;i<3;i++){
            n[i].textContent=String(args.n[i]);
        }
    }
});

remoteChannel.events.on('client', async (args) => {//UI端收到命令
    if(args.type&&args.type=='beddestory'){
        ui.findChildByName('床没了').visible=1;
    }
    if(args.type&&args.type=='beddestoryover'){
        ui.findChildByName('床没了').visible=0;
    }
});

remoteChannel.events.on('client', async (args) => {//UI端收到命令
    if(args.type&&args.type=='yrcc'){
        ui.findChildByName('有人拆床').visible=1;
    }
    if(args.type&&args.type=='yrccover'){
        ui.findChildByName('有人拆床').visible=0;
    }
});