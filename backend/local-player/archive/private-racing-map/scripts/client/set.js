const st=ui.findChildByName('st');
const c=st.findChildByName('c');

c.events.on("pointerdown",async()=>{
    if(c.textContent=='>'){
        while(screenWidth*0.13-st.position.offset.x>30){
            st.position.offset.x+=10;
            await sleep(16);
        }
        c.textContent='<';
    }else{
        while(st.position.offset.x>0){
            st.position.offset.x-=10;
            await sleep(16);
        }
        st.position.offset.x=0;
        c.textContent='>';
    }
});

const m=ui.findChildByName('music');
globalThis.musicList=['audio/Manasha.mp3','audio/once upon a time.mp3','audio/underground.mp3','audio/wake.mp3','audio/disaster.mp3'];

st.findChildByName('音乐').events.on("pointerdown",()=>{m.visible^=1;});

m.findChildByName('0').events.on("pointerdown",()=>{remoteChannel.sendServerEvent({type:'lastMusic'});});
m.findChildByName('1').events.on("pointerdown",()=>{
    if(m.findChildByName('1').textContent=='='){
        remoteChannel.sendServerEvent({type:'pause'});
        m.findChildByName('1').textContent='△';
    }else{
        remoteChannel.sendServerEvent({type:'resume'});
        m.findChildByName('1').textContent='=';
    }
    
});
m.findChildByName('2').events.on("pointerdown",()=>{remoteChannel.sendServerEvent({type:'nextMusic'});});

remoteChannel.events.on('client', async (args) => {
    if(args.type=='updmusic'){
        m.findChildByName('text').textContent='当前播放：\n'+musicList[args.music];
    }
});

const r=ui.findChildByName('remind');
const x=r.findChildByName('x');
let state=0;
st.findChildByName('提醒队友').events.on("pointerdown",()=>{r.visible^=1;});

r.findChildByName('进攻').events.on("pointerdown",()=>{
    if(state==1){
        state=0;
        x.visible^=1;
    }else{
        state=1;
        x.visible=1;
    }
});

r.findChildByName('防守').events.on("pointerdown",()=>{
    if(state==2){
        state=0;
        x.visible^=1;
    }else{
        state=2;
        x.visible=1;
    }
});

for(let i=0;i<4;i++){
    let e=x.findChildByName(String(i));
    e.events.on("pointerdown",()=>{
        remoteChannel.sendServerEvent({//向非UI端发送命令
            type:'rt',state:state,team:e.textContent
        });
    });
}

remoteChannel.events.on('client', async (args) => {//UI端收到命令
    if(args.type=='remind'&&js==0){
        ui.findChildByName('tr').textContent=`${args.name}提醒队友：\n${args.state==1?'前去进攻':'注意防守'}${args.team}`;
        ui.findChildByName('tr').visible=1;
        await sleep(3000);
        ui.findChildByName('tr').visible=0;
    }
    if(args.type=='ut'){
        t.findChildByName('text').findChildByName('a').textContent=args.value;
    }
});

var js=0;

st.findChildByName('不接收队友提醒').events.on('pointerdown',()=>{
    st.findChildByName('不接收队友提醒').textContent=(js==0?'接收队友提醒':'不接收队友提醒');
    js^=1;
});

const t=ui.findChildByName('talk');

st.findChildByName('聊天').events.on('pointerdown',()=>{
    t.visible=1;
    st.visible=0;
});
t.findChildByName('shut').events.on("pointerdown",()=>{
    t.visible=0;
    st.visible=1;
});
t.findChildByName('send').events.on("pointerdown",()=>{
    remoteChannel.sendServerEvent({//向非UI端发送命令
        type:'sm',value:t.findChildByName('input').blur()
    });
});



