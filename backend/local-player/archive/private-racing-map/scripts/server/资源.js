let sourceName = ['铁锭', '金锭', '绿宝石', '灵魂', '钻石'];
let sourceExp = [1, 3, 100, -1, -1];
globalThis.sources = [];

world.time=0;
setInterval(()=>{
    world.time+=500;
    for(let i=0;i<sources.length;i++){
        if(sources[i].type!=4){
            for(let j=0;j<=world.querySelectorAll('player').length/5;j++)sources[i].creat();
        }else{
            sources[i].creat();
        }
    }
},500);

globalThis.sourceNum=[
    [4000,3000,2000,1000,500],[8000,7000,5000,4000,2000],[],[],[]
];

globalThis.sourcesLevel=[
    [],[],[60000,55000,50000,45000],[30000,25000,20000,15000]
];

class Source {
    pos = { x: -1, y: -1, z: -1 };
    type = -1;// 0铁1金2绿4钻3灵魂
    sc = 0;// 数量
    time = Infinity;// 生产时间(ms)
    team = 0;// 队伍
    max = 0;// 上限
    id = -1;
    lt = 0;
    async creat() {
        if(this.type==-1)return;
        if(!world.gameStarting)return;
        if(this.team!=0){
            this.time=sourceNum[this.type][team_upgrade[this.team][2]];
        }
        if (this.sc < this.max&&world.time-this.lt>=this.time) {
            this.sc++;
            setTimeout(() => {
                if (this.type > 1) {
                    const e = world.createEntity({
                        position: [this.pos.x + Math.random(), this.pos.y + 1 + Math.random() / 2, this.pos.z + Math.random()],
                        mesh: world.querySelector(`.s${this.type}`).mesh,
                        meshScale: [1 / 32, 1 / 32, 1 / 32],
                        collides: false,
                        fixed: true,
                        meshOrientation: [0, Math.random() * 2 - 1, 0, Math.random() * 2 - 1],
                    });
                    e.addTag(`so${this.id}`);
                    e.addTag(`so`);
                }
                this.lt=world.time;
            }, Math.floor(Math.random() * 1000));
        };
    }
    a() {
        this.lt=world.time;
        world.onVoxelContact(({ entity, x, y, z }) => {
            if(!world.gameStarting||entity.dead||this.sc<=0)return;
            if(!this.sc||this.sc==undefined||this.sc==null||this.sc==NaN)return;
            if(this.type<0)return;
            if (x == this.pos.x && y == this.pos.y && z == this.pos.z && this.sc && entity.isPlayer) {
                if (sourceExp[this.type] < 0) {
                    entity.player.directMessage(`你获得了${this.sc}个${sourceName[this.type]}`);
                    for(let i=0;i<=ITEM_DATA.length;i++){
                        if(ITEM_DATA[i].usename.chinese==sourceName[this.type]){
                            entity.bag.pile(i,this.sc);
                            remoteChannel.sendClientEvent(entity, { type: "update_hotbar", args: { bag: entity.bag } });
                            break;
                        }
                    }
                } else {
                    entity.player.directMessage(`你获得了${this.sc * sourceExp[this.type]}点经验`);
                    entity.gameScore+=this.sc * sourceExp[this.type];
                    remoteChannel.sendClientEvent(entity,{//向非UI端发送命令
                        type:'changeScore',value:entity.gameScore
                    });
                }
                world.querySelectorAll(`.so${this.id}`).forEach((e) => { e.destroy() });
                this.sc = 0;
            }
        })
    }
}

// var orcount = 0;

// setInterval(() => {
//     world.querySelectorAll('.so').forEach((e) => {
//         if (e.hasTag('t')) {
//             if (isNaN(e.count)) {
//                 e.count = 0;
//             }
//             if (isNaN(e.mutiple)) {
//                 e.mutiple = 1;
//             }
//             if (e.count >= 1e+9 || e.position.y <= -10) {
//                 e.destroy();
//             }
//             if (e.position.y >= 68 + Math.random() * 2) {
//                 e.position.y = 62;
//                 setTimeout(() => {
//                     e.meshColor.copy({ r: 1, g: 1, b: 1, a: 1 });
//                 }, 200);
//             }
//             e.count += 1;
//             e.meshColor.copy({ r: 1, g: 1, b: 1, a: e.meshColor.a - 0.0017 });
//             e.meshOrientation = e.meshOrientation.rotateY(Math.PI / 180);
//             e.position.y += (Math.PI / 360 * e.mutiple);
//             if (orcount > 12) {
//                 orcount = 0;
//                 e.mutiple *= -1;
//             }
//         }
//     })
//     orcount += 1
// }, 60);

globalThis.SourceInit = async function(){
    world.querySelectorAll(`.so`).forEach((e)=>{e.destroy()});
    for(let i=0;i<sources.length;i++){
        sources[i].type=-1;
        sources[i]=undefined;
    }
    sources=[];
    for (let i = 0; i < 256; i++) {
        for (let j = 0; j < 128; j++) {
            for (let k = 0; k < 256; k++) {
                if (voxels.getVoxelId(i, j, k) == 93) { //powder_blue 资源池
                    let s = new Source();
                    s.id = sources.length;
                    s.pos = {
                        x: i, y: j, z: k
                    };
                    s.team=getTeamPos(i,k)+1;
                    if (voxels.getVoxelId(i + 1, j, k) == 93 && voxels.getVoxelId(i - 1, j, k) == 93 && voxels.getVoxelId(i, j, k + 1) == 93 && voxels.getVoxelId(i, j, k - 1) == 93) {
                        s.type = 1;
                        s.max = 12;
                        s.time = 4000;
                    } else {
                        s.type = 0;
                        s.max = 32;
                        s.time = 2000;
                    }
                    s.creat();
                    s.a();
                    sources.push(s);
                }
                if (voxels.getVoxelId(i, j, k) == 285) {  //yellow_light 黄金
                    let s = new Source();
                    s.id = sources.length;
                    s.pos = {
                        x: i, y: j, z: k
                    };
                    s.type = 1;
                    s.max = 128;
                    s.time = 1000;
                    s.creat();
                    s.a();
                    sources.push(s);
                }
                if (voxels.getVoxelId(i, j, k) == 287) {  //green_light 绿宝石
                    let s = new Source();
                    s.id = sources.length;
                    s.pos = {
                        x: i, y: j, z: k
                    };
                    s.type = 2;
                    s.max = 32;
                    s.time = 60000;
                    s.creat();
                    s.a();
                    sources.push(s);
                }
                if (voxels.getVoxelId(i, j, k) == 289) { //indigo_light 钻石
                    let s = new Source();
                    s.id = sources.length;
                    s.pos = {
                        x: i, y: j, z: k
                    };
                    s.type = 4;
                    s.max = 8;
                    s.time = 30000;
                    s.creat();
                    s.a();
                    sources.push(s);
                }
                if (voxels.getVoxelId(i, j, k) == 295) { // pink_light 灵魂
                    let s = new Source();
                    s.id = sources.length;
                    s.pos = {
                        x: i, y: j, z: k
                    };
                    s.type = 3;
                    s.max = 8;
                    s.time = 60000;
                    s.creat();
                    s.a();
                    sources.push(s);
                }
            }
        }
        await sleep(1);
    }
}

globalThis.sources=[];

world.onPlayerJoin(({entity})=>{
    entity.gameScore=0;//经验
});