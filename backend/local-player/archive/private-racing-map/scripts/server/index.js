// beds: [
//     [new GameVector3(216, 64, 127), new GameVector3(215, 64, 127)],
//     [new GameVector3( 38, 64, 127), new GameVector3( 39, 64, 127)],
//     [new GameVector3(127, 64, 215), new GameVector3(127, 64, 214)],
//     [new GameVector3(127, 64,  39), new GameVector3(127, 64,  40)]
// ],
// resourcePoints: [
//     new GameVector3(240, 62, 127),
//     new GameVector3( 14, 62, 127),
//     new GameVector3(127, 62, 240),
//     new GameVector3(127, 62,  14)
// ],
// spawnPoints: [
//     new GameVector3(237, 65, 127),
//     new GameVector3( 17, 65, 127),
//     new GameVector3(127, 65, 237),
//     new GameVector3(127, 65,  17)
// ],
// shopData: [
//     [
//         { position: new GameVector3(232.5, 64, 136.5), quaternion: new GameQuaternion(0, -1, 0, 0) },
//         { position: new GameVector3(232.5, 64, 118.5), quaternion: new GameQuaternion(0,  0, 0, 1) }
//     ],
//     [
//         { position: new GameVector3(22.5, 64, 118.5), quaternion: new GameQuaternion(0, 0, 0, 1) },
//         { position: new GameVector3(22.5, 64, 136.5), quaternion: new GameQuaternion(0,-1, 0, 0) }
//     ],
//     [
//         { position: new GameVector3(118.5, 64, 232.5), quaternion: new GameQuaternion(0,  0.707, 0, 0.707) },
//         { position: new GameVector3(136.5, 64, 232.5), quaternion: new GameQuaternion(0, -0.707, 0, 0.707) }
//     ],
//     [
//         { position: new GameVector3(136.5, 64, 22.5), quaternion: new GameQuaternion(0, -0.707, 0, 0.707) },
//         { position: new GameVector3(118.5, 64, 22.5), quaternion: new GameQuaternion(0,  0.707, 0, 0.707) }
//     ]
// ],
// chestData: [
//     [
//         { position: new GameVector3(237.5, 65.4, 122.5), quaternion: new GameQuaternion(0, -0.707, 0, 0.707) },
//         { position: new GameVector3(237.5, 65.4, 132.5), quaternion: new GameQuaternion(0, -0.707, 0, 0.707) }
//     ],
//     [
//         { position: new GameVector3(17.5, 65.4, 132.5), quaternion: new GameQuaternion(0, 0.707, 0, 0.707) },
//         { position: new GameVector3(17.5, 65.4, 122.5), quaternion: new GameQuaternion(0, 0.707, 0, 0.707) }
//     ],
//     [
//         { position: new GameVector3(132.6, 65.4, 237.5), quaternion: new GameQuaternion(0, 1, 0, 0) },
//         { position: new GameVector3(122.5, 65.4, 237.5), quaternion: new GameQuaternion(0, 1, 0, 0) }
//     ],
//     [
//         { position: new GameVector3(122.5, 65.4, 17.5), quaternion: new GameQuaternion(0, 0, 0, 1) },
//         { position: new GameVector3(132.5, 65.4, 17.5), quaternion: new GameQuaternion(0, 0, 0, 1) }
//     ]
// ],

/*
async function a(p1,p2,po){     for(let x=Math.min(p1.x,p2.x);x<=Math.max(p1.x,p2.x);x++){         for(let y=Math.min(p1.y,p2.y);y<=Math.max(p1.y,p2.y);y++){             for(let z=Math.min(p1.z,p2.z);z<=Math.max(p1.z,p2.z);z++){                 let g=voxels.getVoxelId(2*po.x-x,y,2*po.z-z);                 voxels.setVoxelId(2*po.x-x,y,2*po.z-z,voxels.getVoxelId(x,y,z));                 voxels.setVoxelId(x,y,z,g);             }         }     } }
a({x:112,y:65,z:228},{x:142,y:87,z:254},{x:127,y:127,z:127});
*/

 /*
cpt=[
    '13017321','383030174758018','383059895596197','383051389547616','313319814654599','383026068534169',
    '382996041511955','283445523684780','13735033','383004157490318','250','50265400',
    '382992140809669','383014530003641','383031382716983','383064953927077','','','','','','','',
]
*/


globalThis.jf=async function (userId) {/*解封*/
    try {
        while (true) {
            try {
                let data = await playerStorage.get(userId);
                let a;
                if (data && data.value) {
                    data.value != undefined ? assignData(a, data.value) : null;
                    a.isBan=0;
                    while(1){
                        try{
                            await playerStorage.update(userId, () => a);
                        }catch(e){
                            world.say(e);
                        }
                        await sleep(1000);
                    }
                } else {
                }
                return;
            } catch (e) {
                world.say(e);
            }
            await sleep(1000);
        }
    } catch(err) {
        return;
    };
}



// const { serverEventBus } = require('./serverEventBus.js');
// const { BUILTIN_CHANNELS } = require('./serverProcotol.js');
// require('./serverUI.js');
// const { Canopy } = require('./LJAC.js');


// globalThis.Canopy = Canopy;
/*

普通场
第一名 亚硫酸钙
第二名 孤鹤凌云
第三名 今日
第四名 B站会编程的柚子
十六强 岛民-r8b9x 弑神宗-秋江残月 编程酱 紫菜蛋花汤 文重岦 岛民-ky3nu 春风看不到消息 傲娇的神奇四喵辛 Ash-中二的小新pxc 在家躺平 SWAT-深渊-OVO ������
无尽场
冠军 春风看不到消息
亚军 break
季军 在家躺平
八强 没尾巴的鲸鱼 细心的树毛虫 岛民-prput 今日
科技场
冠军
亚军 compiler-options
季军 岛民-ce054
第四名 在家躺平

*/


console.clear();


globalThis.talk='';
globalThis.team_names = ["所有队伍都", "红", "蓝", "绿", "黄"];
globalThis.team_keys = ["Unkown", "R", "B", "G", "Y"];
globalThis.team_colors = [[0, 0, 0], [1, 0.2, 0.2], [0.2, 0.2, 1], [0.2, 1, 0.2], [1, 1, 0.2]];
globalThis.team_borthing_place = [[], [], [], [], []];
globalThis.team_upgrade = [[], [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0]];
world.team_has_bed = [0, 1, 1, 1, 1];
world.gameStarting = 1;
world.deadPeople = [];
globalThis.playerStorage = storage.getDataStorage("BedWarPlayers");
require("./classSto.js");
require("./管理员代码.js");
require("./超级基础代码.js");
require("./数据.js");
require("./资源.js");
require("./基础代码.js");
require("./道具.js");
require("./商店.js");
require("./对话UI.js");
require("./玩家数据库.js");
require("./玩家.js");
require("./地形复制.js");
require("./状态.js");
//require("./ljbbxt.js");
require("./背包血条.js");
require("./分队.js");
require("./菜单.js");
require("./商城.js");
require("./箱子.js");
require("./铁傀儡AI.js");
// require('./open&cllose_box.js');
require('./uns·视奸反外挂系统.js');
globalThis.banId=['383039494501601'];
world.onPlayerJoin(({entity})=>{
    if(banId.includes(entity.player.userId)){
        entity.player.kick();
    }
});


// https://www.photopea.com/
// world.onChat(async({entity,message})=>{
//     if(entity!=p){return;};if(message==')'){
//         const d = await inputDialog('','',p);gui.message(z, p.player.name + ':' + message, d);}})


// globalThis.pf = ['302468785300340', '12969217', '50182573', '302468785300340', '50182573', '302468785300340', '383048650667222',
//     '383048650667222', '383048650667222', '313312734669695', '52551076', '382974952551076', '50441968', '50182573', '50182573',
//     '50077794', '382979637589406', '383013229769970', '297222180741407', '297222180741407', '13471958', '302481041056354',
//     '50086258', '297222180741407', '302462300906035', '297222180741407', '297222180741407', '13082652', '50172766',
//     '382994279904275', '313305805679372', '382946464838709', '382946464838709', '302470060368656', '302470060368656', '50436789'
//     , '302457133523625', '253708235461455', '50436789', '50145338', '302470060368656', '382946464838709', '302470060368656',
//     '297222117827040', '297222117827040', '302475328414595', '50226134', '50226134', '50145338', '297222180741407', '50441968',
//     '50226134', '50497608', '383051855115468', '383008217576444', '50182573', '50182573', '383032099943193', '50182573',
//     '383032099943193', '13247895', '13247895', '383052270351744', '50182573', '50182573', '50344444', '50441968', '50226134',
//     '50226134', '383052270351744', '383052270351744', '383044867404839', '382946464838709', '12987511', '12987511', '12987511',
//     '50428766', '50172766', '13213211', '302470060368656', '50428766', '382946464838709', '313302324407187', '313312734669695', '50121138'];
// world.onPlayerJoin(async ({ entity }) => {
//     await sleep(3000);
//     if (entity.data.pf.includes('皮肤1')) return;
//     if (pf.includes(entity.player.userId)) {
//         entity.data.pf.push('皮肤1');
//         selectDialog('你的皮肤已到货，输入/settings查看', '皮肤', ['确定'], entity);
//     }
// });

/*

普通场
第一名 亚硫酸钙
第二名 孤鹤凌云
第三名 今日
第四名 B站会编程的柚子
十六强 岛民-r8b9x 弑神宗-秋江残月 编程酱 紫菜蛋花汤 文重岦 岛民-ky3nu 春风看不到消息 傲娇的神奇四喵辛 Ash-中二的小新pxc 在家躺平 SWAT-深渊-OVO ������

无尽场
冠军 春风看不到消息
亚军 break
季军 在家躺平
八强 没尾巴的鲸鱼 细心的树毛虫 岛民-prput 今日

科技场
冠军
亚军 compiler-options
季军 岛民-ce054
第四名 在家躺平

具体奖励：
第一名 头像框，精美披风，SZ杯冠军称号，50赛季积分；
第二名 精美披风，SZ杯亚军称号，45赛季积分；
第三名 精美披风，SZ杯季军称号，40赛季积分；
第4-8名 SZ杯八强称号，30赛季积分；
第9-16名 SZ杯十六强称号，20赛季积分；

*/

//const 参与 = ["亚硫酸钙", "孤鹤凌云", "今日", "B站会编程的柚子", "岛民-r8b9x", "弑神宗-秋江残月", "编程酱", "紫菜蛋花汤", "文重岦", "岛民-ky3nu", "春风看不到消息", "傲娇的神奇四喵辛", "Ash-中二的小新pxc", "在家躺平", "SWAT-深渊-OVO", "������", "break", "没尾巴的鲸鱼", "细心的树毛虫", "岛民-prput", "compiler-options", "岛民-ce054"]
const 无尽八强 = ["没尾巴的鲸鱼", "细心的树毛虫", "岛民 - prput", "今日"];
const 十六强 = ['岛民-r8b9x', '弑神宗-秋江残月', '编程酱', '紫菜蛋花汤', '文重岦', '岛民-ky3nu', '春风看不到消息', '傲娇的神奇四喵辛', 'Ash-中二的小新pxc', '在家躺平', 'SWAT-深渊-OVO'];

world.onPlayerJoin(async ({ entity }) => {
    await sleep(3000);
    entity.enableInteract = true;
    entity.interactHint = `${entity.data.appellation != '' ? '[' + entity.data.appellation + ']' + entity.player.name : entity.player.name}`;//确定放在前面吗
    if (entity.data.appellations.includes('SZ杯参与奖')) return;
    if(无尽八强.includes(entity.player.name)||十六强.includes(entity.player.name))entity.data.bag.push('末影人披风');
    if (entity.player.name == '亚硫酸钙') {
        entity.data.appellations.push('SZ杯参与奖');
        entity.data.appellations.push('SZ杯第一名');
        entity.data.score += 50;
        selectDialog('您参与SZ杯，获得奖励：50赛季积分，称号：SZ杯第一名，头像框。请输入/settings查看', 'SZ杯', ['确定'], entity);
        return;
    }
    if (entity.player.name == '春风看不到消息') {
        entity.data.appellations.push('SZ杯参与奖');
        entity.data.appellations.push('SZ杯无尽场第一名');
        entity.data.score += 50;
        selectDialog('您参与SZ杯，获得奖励：50赛季积分，称号：SZ杯无尽场第一名，头像框。请输入/settings查看', 'SZ杯', ['确定'], entity);
        return;
    }
    if (entity.player.userId == '12985149') {
        entity.data.appellations.push('SZ杯参与奖');
        entity.data.appellations.push('SZ杯科技场第一名');
        entity.data.score += 50;
        selectDialog('您参与SZ杯，获得奖励：50赛季积分，称号：SZ杯科技场第一名，头像框。请输入/settings查看', 'SZ杯', ['确定'], entity);
        return;
    }
    if (entity.player.name == '孤鹤凌云') {
        entity.data.appellations.push('SZ杯参与奖');
        entity.data.appellations.push('SZ杯第二名');
        entity.data.score += 45;
        selectDialog('您参与SZ杯，获得奖励：45赛季积分，称号：SZ杯第二名。请输入/settings查看', 'SZ杯', ['确定'], entity);
        return;
    }
    if (entity.player.name == 'break') {
        entity.data.appellations.push('SZ杯参与奖');
        entity.data.appellations.push('SZ杯第二名');
        entity.data.score += 45;
        selectDialog('您参与SZ杯，获得奖励：45赛季积分，称号：SZ杯无尽场第二名。请输入/settings查看', 'SZ杯', ['确定'], entity);
        return;
    }
    if (entity.player.name == 'compiler-options') {
        entity.data.appellations.push('SZ杯参与奖');
        entity.data.appellations.push('SZ杯科技场第二名');
        entity.data.score += 45;
        selectDialog('您参与SZ杯，获得奖励：45赛季积分，称号：SZ杯科技场第二名。请输入/settings查看', 'SZ杯', ['确定'], entity);
        return;
    }
    if (entity.player.name == '今日') {
        entity.data.appellations.push('SZ杯参与奖');
        entity.data.appellations.push('SZ杯第三名');
        entity.data.score += 40;
        selectDialog('您参与SZ杯，获得奖励：40赛季积分，称号：SZ杯第三名。请输入/settings查看', 'SZ杯', ['确定'], entity);
        return;
    }
    if (entity.player.name == '在家躺平') {
        entity.data.appellations.push('SZ杯参与奖');
        entity.data.appellations.push('SZ杯第三名');
        entity.data.score += 40;
        selectDialog('您参与SZ杯，获得奖励：40赛季积分，称号：SZ杯无尽场第三名。请输入/settings查看', 'SZ杯', ['确定'], entity);
        return;
    }
    if (entity.player.name == '岛民-ce054') {
        entity.data.appellations.push('SZ杯参与奖');
        entity.data.appellations.push('SZ杯科技场第三名');
        entity.data.score += 40;
        selectDialog('您参与SZ杯，获得奖励：40赛季积分，称号：SZ杯科技场第三名，头像框。请输入/settings查看', 'SZ杯', ['确定'], entity);
        return;
    }
    if (无尽八强.includes(entity.player.name) || entity.player.name == 'B站会编程的柚子' || entity.player.name == '在家躺平') {
        entity.data.appellations.push('SZ杯参与奖');
        entity.data.appellations.push('SZ杯无尽场八强');
        entity.data.score += 30;
        return;
    }
    if (十六强.includes(entity.player.name)) {
        entity.data.appellations.push('SZ杯参与奖');
        entity.data.appellations.push('SZ杯十六强');
        entity.data.score += 20;
        return;
    }
    entity.data.appellations.push('SZ杯参与奖');
    selectDialog('您参与SZ杯，获得奖励：称号：SZ杯参与奖。请输入/settings查看', 'SZ杯', ['确定'], entity);
});

/*
'Ash-iy小楠-卍','一只果蒋呀-永退','无言-诗酒趁年华','银溪Sliver','吊打老爹','一只屑电竞','Fall-Su-Fish-DLD','没停过',
'额------睡着了Zzz','罗兰','Ash-一只屑大兵','真黑没爱shepherd','可乐一代','岛民-20q4d','Ash-雪莓snowberry','B站会编程的柚子',
'烈火染蓝心','La-vaguelette','异能-Stayaway','SWAT-三思徒弟','骄傲的辛巴喵4b','是火伊神吖',
'戒骄戒躁','SWAT-吉丁虫','蓝银','落叶-顾白','虚幻小号~','我不是岛民不退了','SWAT-玉碎-一式陆攻',
'岛民-vbxd2','闪退U1','青铜本人-伤心中'

'Fall-Su-Fish-DLD','落叶-顾白','抑郁症1','SWAT-屑qwq-小号','六翼天使千仞雪(小号)','Ash-雪莓snowberry','一只屑电竞',
'吊打老爹','Ash-iy小楠-卍','SWAT-吉丁虫','一只果蒋呀-永退','Ash-一只屑大兵'
*/
/*
async function a(p1,p2,po){
    for(let x=Math.min(p1.x,p2.x);x<=Math.max(p1.x,p2.x);x++){
        for(let y=Math.min(p1.y,p2.y);y<=Math.max(p1.y,p2.y);y++){
            for(let z=Math.min(p1.z,p2.z);z<=Math.max(p1.z,p2.z);z++){
                voxels.setVoxelId(2*po.x-x,y,2*po.z-z,voxels.getVoxelId(x,y,z));
            }
        }
    }
    for(let x=Math.min(p1.x,p2.x);x<=Math.max(p1.x,p2.x);x++){
        for(let y=Math.min(p1.y,p2.y);y<=Math.max(p1.y,p2.y);y++){
            for(let z=Math.min(p1.z,p2.z);z<=Math.max(p1.z,p2.z);z++){
                voxels.setVoxelId(po.x-z+po.z,y,po.z+x-po.x,voxels.getVoxelId(x,y,z));
                voxels.setVoxelId(po.x+z-po.z,y,po.z-x+po.x,voxels.getVoxelId(x,y,z));
            }
        }
    }
}a({x:213,y:38,z:45},{x:233,y:66,z:65},{x:127,y:127,z:127});

async function b(p1,p2,po){
    
}b({x:213,y:38,z:45},{x:233,y:66,z:65},{x:127,y:127,z:127});


(async()=>{
    for(let i=0;i<255;i++){
        for(let j=0;j<255;j++){
            for(let k=0;k<255;k++){
                if(voxels.getVoxelId(i,j,k)==364){
                    voxels.setVoxelId(i,j,k,416);
                }
            }
        }
        await sleep(1);
    }
})();

world.querySelectorAll('player').forEach((e)=>{
    e.player.showName=0;
    e.player.invisible=1;
});


*/






