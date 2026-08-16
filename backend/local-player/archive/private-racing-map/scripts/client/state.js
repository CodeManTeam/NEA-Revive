var s=[];
for(let i=1;i<=5;i++){
    s.push(ui.findChildByName('state'+String(i)));
}
var gh=[]; 
const _x = screenWidth*0.0203;
for(let i=0;i<10;i++){
    const e=UiImage.create();
    e.image='picture/金心.png';
    e.size.offset.x = _x;
    e.size.offset.y = _x;
    e.position.offset.x = screenWidth/2-_x*10+_x*i;
    e.position.offset.y = screenHeight*0.82;
    e.backgroundOpacity = 0;
    e.visible=1;
    e.parent=ui;
    e.zIndex=-10;
    e.visible=0;
    gh.push(e);
}
globalThis.sta={
    'sh':"picture/9387.png",//生命恢复
    'ty':"picture/9385.png",//跳跃提升
    'xj':"picture/9378.png",//迅捷
    'll':"picture/9382.png",//力量
    'ys':"picture/9391.png",//隐身
    'xs':"picture/9399.png",//伤害吸收
    'hm':"picture/.png",//缓慢
    'jp':"picture/9378.png",//急迫
    'pl':"picture/9381.png",//挖掘疲劳
    'dx':"picture/9378.png",//躲避陷阱
};
remoteChannel.events.on('client', async (args) => {
    if(args.type=='addstate'){
        if(args.ind>5)return;
        if(args.value=='hm')return;
        if(args.ind==-1){
            for(let i=args.ind+1;i<5;i++){
                s[i].visible=0;
            }
            return;
        }
        s[args.ind].image=sta[args.value];
        s[args.ind].visible=1;
        s[args.ind].findChildByName('time').textContent=String(args.time);
        for(let i=args.ind+1;i<5;i++){
            s[i].visible=0;
        }
    }
    if(args.type=='updgh'){
        // for(let i=0;i<10;i++){
        //     if(args.value>=(i+1)*2){
        //         gh[i].visible=1;
        //     }else{
        //         gh[i].visible=0;
        //     }
        // }
    }
});


        