//console.clear();

var d3 = function (a,b){
    function _2(n){
        return n*n;
    }
    return Math.sqrt(_2(a.x-b.x)+_2(a.y-b.y)+_2(a.z-b.z));
}
world.onPlayerJoin(({entity})=>{
    entity.tklcd=0;
});
world.onClick(async({clicker,entity,raycast})=>{
    if(!entity.hasTag('tkl'))return;
    if(clicker.tklcd==1)return;
    if(raycast.distance>5)return;
    if(clicker.enableDamage==0)return;
    let dmg = clicker.att.damage;
    if (clicker.player.moveState == 'fall'){
        dmg += clicker.att.jd;
    }
    entity.hurt(dmg);
    var y = clicker.player.cameraYaw;
    var p = clicker.player.cameraPitch;
    var forward = new GameVector3(
        -Math.cos(y) * Math.cos(p),
        -Math.sin(p),
        -Math.sin(y) * Math.cos(p)
    );
    entity.velocity.x+=forward.x*1.5;
    entity.velocity.z+=forward.x*1.5;
    clicker.tklcd=1;
    await sleep(300);
    clicker.tklcd=0;
});

globalThis.creattkl=async function(pos,tn,n){
    var e = world.createEntity({
        mesh:'mesh/铁傀儡.vb',
        position:pos,
        collides:true,
        fixed:false,
        gravity:true,
        meshScale:new GameVector3(0.02,0.02,0.02),
        hp:20,
        maxHp:20
    });
    e.addTag('fb');
    e.addTag('tkl');
    e.cd=0;
    e.enableDamage=1;
    e.maxHp=20;
    e.hp=20;
    e.bj=1;
    e.teamNumber=tn;
    e.n=n;
    e.onDie(()=>{
        e.destroy();
        e.bj=0;
    });
    let p='',dis=1e9,cnt=0;
    while(1){
        for(let i=0;i<world.querySelectorAll('player').length;i++){
            if(d3(e.position,world.querySelectorAll('player')[i].position)<dis&&world.querySelectorAll('player')[i].enableDamage&&world.querySelectorAll('player')[i].teamNumber!=e.teamNumber){
                p=world.querySelectorAll('player')[i];
                dis=d3(e.position,world.querySelectorAll('player')[i].position);
            }
        }
        if(p.teamNumber==e.teamNumber){
            await sleep(1000);
            continue;
        }
        if(d3(e.position,p.position)<=50&&p!='')break;
        await sleep(1000);
    }
    while(++cnt&&e.bj){
        if(p.enableDamage==0){
            e.destroy();
            creattkl(e.position,tn,e.n);
            break;
        }
        if(d3(e.position,p.position)>50){
            await sleep(100);
            continue;
        }
        e.velocity.x=Math.min(0.3*((e.position.x>p.position.x)?-1:1),-(e.position.x-p.position.x)*0.1)*0.7;
        e.velocity.z=Math.min(0.3*((e.position.z>p.position.z)?-1:1),-(e.position.z-p.position.z)*0.1)*0.7;
        while(Math.sqrt(e.velocity.x**2+e.velocity.z**2)>0.5){
            e.velocity.x*=0.7;
            e.velocity.z*=0.7;
        }
        e.lookAt(p.position);
        var Q = new GameQuaternion(0,1,0,0);
        var orientation = Q.rotateY(Math.atan2(e.velocity.z, e.velocity.x));
        e.meshOrientation.copy(orientation);
        if(cnt%10==0&&e.position.y<p.position.y)e.velocity.y+=0.6;
        if(d3(e.position,p.position)<3&&e.cd==0){
            p.hurt(4-p.def.defence);
            p.killer=e.n;
            p.killedType=1;
            p.player.directMessage('你被铁傀儡肘击受到'+Number(4-p.def.defence)+'点伤害，剩余血量：'+p.hp);
            e.cd=1;
            p.velocity.x-=Math.min(0.6*((e.position.x>p.position.x)?1:-1),(e.position.x-p.position.x)*0.5)*(entity.def.dr==1?0.3:0.7);
            p.velocity.y+=0.25*(entity.def.dr?0:1);
            p.velocity.z-=Math.min(0.6*((e.position.z>p.position.z)?1:-1),(e.position.z-p.position.z)*0.5)*(entity.def.dr==1?0.3:0.7);
            setTimeout(()=>{
                e.cd=0;
            },2000);
            p.special++;
            setTimeout(()=>{
                p.special--;
            },2000);
        }
        if(e.position.y<-50)e.destroy(),e.bj=0;
        await sleep(100);
    }
};

//world.onPlayerJoin(({entity})=>{entity.enableDamage=true});


//console.clear();