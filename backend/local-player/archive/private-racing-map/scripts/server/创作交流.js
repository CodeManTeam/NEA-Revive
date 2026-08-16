/*
珍珠没用了 2026.7.4发现的 无法传送，类似雪球！！！！！！！！！！！！
'13017321','383030174758018','383059895596197','313319814654599'

1.搭路蛋用的好的话可以卡人，把人卡下虚空
2.重置地图有概率重置2次
3.经苹果的效果坐上角显示会重复
4.金心消失后坐上小buff不消失

如果有骂人，针对的玩家，管理员可以用这个代码：
$world.onTick(()=>{wq.forEach((e)=>{if(e.player.name=='名字'){e.player.kick()}})})
来踢出他。
踢一次的代码：$p.('')player.kick()
                                               ----------yg


我给地图提点建议（虽然我现在摆烂不创作最多管管地图）：【silver】
    1.不知道力量药水好没好，如果没好建议快修
    2.铁傀儡动作有点僵硬，建议弄动画，动画弄不了可以减少铁傀儡攻击频率
    3.击退棒击退太小了，改成现在的1.5倍击退 OK




/*开学之后我可能玩不了起床了，在这里做个墓碑吧，ShawnRIP--Shawn 我也是--uns
/** https://dao3.fun/edit/e966ec173cb80403415e
主图（大厅）：https://dao3.fun/edit/1198d8b20f7308f347d7
无限火力：https://dao3.fun/edit/773d55351c932c918ca0
战桥：未开发
任何地图的合作者均可申请大厅的合作，其他地图申请依情况而定
严禁泄露创作端链接！！！！！！！！！！！！！！！！！
 * 
 * 
 * 创作交流群：1040734767 QQ群
 * 点击链接加入群聊【起床战争交流群（uns）】：https://qm.qq.com/q/hF3IUI0UFi
 * 
 * https://docs.dao3.fun/api/
*/
/*
1.船帆改颜色

@全体成员 地图目前剩余未完成项目：
1.护甲有点丑
2.治愈池效果 [已完成]
3.所有陷阱效果 [已完成]
4.水桶、桶 [已完成]
5.玩家击杀数、拆床数等存档及排行榜 [已完成]
6.地图传送存在问题 [已修复]
7.手持物品还有点问题
8.附魔护甲、武器颜色效果
9./settings设置 [已完成]
10.侧边栏UI [已完成]
11.UI商店存在bug [已完成]
12.资源点生成物资时间提示 --暂时不做
13.箱子UI [已完成]

cpt=['小楠awa','忍','风橙','落叶-顾白','挖一个坑','一只9iu4z','SWAT-玉碎-一式陆攻','B站会编程的柚子','柊音梦']

奖励方案：
1.代码师完成1、2、4、6、7、8、9、12其中之一的可以获得5无门槛代金券，完成3、5、10、11之一的可以获得10元无门槛代金券，完成14的可以获得20元无门槛代金券。
2.非代码师找到一个由uns认证的严重bug可以获得5元无门槛。中型bug可以获得2元无门槛代金券。
3.任何人找到能够解决并顺利解决3、5、10、11之一的问题的人可以获得5元无门槛代金券，找到能够解决并顺利解决14的奖励10元无门槛代金券，特别地，如果能在8月5号之前解决14的，解决者奖励30元无门槛代金券，找人者课额外获得5元无门槛代金券。

游戏装扮、称号预卖：
1.披风任选一个 5元
2.“合作者” “超级起床大蛇” “超级跑酷大蛇” 任选 5元
3.自拟称号（不含“作者”“uns”） 10元
4.自拟称号（无限制） 30元

我相信你们绝对不会V我钱的，所以攒代金券吧）

还有满100减90的代金券（不能与其他优惠券一同使用）0.01元可以获得，想要的加我wx。

/*报错：
 */
/* bug反馈：
1.烈焰蛋贴着墙可以让烈焰蛋穿墙
2.希望商店每个物品有标识，要不然不知道是啥

摔落伤害：
对应：
高度（单位：格） 伤害（单位：点【半颗♥】）
1~5 0
6~7 1
8~9 2
10~11 3
12~13 4
14~15 5
16~27 6
18~19 7
20~？ 8 你玩过mc吗？--uns（玩过啊，这是根据你做的测试的）
*/
//建议更新： ！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！（必看）！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！                                                                    ！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！                                                                                                                                                                                                                                                                                                                                                           ！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！
/*
1、视角仰角； --啥玩意？--uns（。。。视场角ok？）[已完成]
2、未更新的物品道具：弓、钓鱼竿、雪球、金苹果、药水 [已完成]
3、防爆玻璃能不能有点用？[已完成]
4、速搭开关（最好快捷键：r  ） --不采用 why？（有时候搭路真的不方便，不想速搭还速搭。）
5、团队以及个人箱子 [已完成]
6、团队升级 [已完成]
7、举报 
8、资源生成上限 --早有了（有点多啊！！！）
9、称号 [已完成]
10、大厅跑酷一进来就开始计时，不是碰到存档点计时，（左键的和最后的不一样）需要修复 [已完成]
11、护甲显示ui
12、救援平台，末影珍珠、搭路蛋冷却时间 --不采用 （……末影必须有）
13、（末影珍珠的运行轨迹和雪球一样【你修个毛啊！！！原版我的世界雪球的轨迹和末影珍珠一样！！！】） [已完成]
--基本没了
/*


world.querySelectorAll('player').forEach((e)=>{e.player.link('https://dao3.fun/edit/773d55351c932c918ca0')})

V1加了床和一点建筑——————xhhl 2025/7/14
V2加了npc。屋顶、屋檐、模型：搭路蛋。————————xhhl 2025/7/16
v3uns做了矿物生成——————xhhl 2025/7/16
V4uns做了攻击搭方块，让铁金不在乱飘~~~  xhhk————————2025/7/17
V5大更新！TNT+火焰弹全新上线！
V6解决摔落伤害bug，方块放置bug，分队bug，无限距离商店bug————uns 2025/7/24
8.4跳跃和治疗完工

//善良的Shawn总结几条管理员代码，给新来的管理不会用的
//1.飞行代码$p.player.canFly=1
//2.换方块代码$p.bag.pile(11,64)结尾是方块组数，前面是方块样式，11是黑曜石 第二个数字不要太多不然地图会炸 --uns
//3.$p.hand='输入一些东西可以给予自己' 该代码仅限工具--uns
//4.$p.hp=数字（能把血量提升至此数字）无限：lnfinity 该代码会导致血条变红有概率直接趋势--uns
//确实，但是适当增加减少是不会的，也可以让别人血量增加减少，但这条我没弄，因为善良的Shawn不会坑人的（）--Shawn
//其他请补充，我也只知道这么多
//(如没有效果请查看管理员姓名和ID是否填写且正确)
//最后总结：关于商城等代码问题也望代码师加油做，希望本图能火（）
-----结尾-----
7.23 招了2个代码师 一个是uns好友也是年度他做完自己地图大概明天过来帮忙，另一个是我旧版徒弟，现在起床大蛇
uns快夸我~~~ --Shawn   哪个是我好友？--uns  我记得拉了一个叫梨子玖玖的--Shawn
7.24 把白昼和诶嘿，小诗拉过来了，我丢火龙还是太逊了，我就说了个诶嘿来我主页就来了（啥意思啊啊！！！！）uns快夸我~~~ --Shawn

7.27旋转函数：y=sin(x+兀/2)或者y=cosx  (两者完全相同）试一试  ————亚硫酸钙

7.28 //（1）bug反馈：发现的问题很多，但火龙说都是re错误不用记录，我也不懂，所以有问题也不能赖我，都赖火龙。
//（2）想法：事情的起因是早上银光带着我在职业战争练PVP，结果蹦出来个异能，把银光嘎了好几次，所以我觉得可以再作一个，
专门1对1PVP，防止外人搅局，PVP机制就和你做的起床和战桥一样，邀请机制和观战机制就照搬你的围棋的那个图，可能
可以帮助整个作品获得热度。   注：这个想法可以等本图发布后再更新去加。  ————亚硫酸钙

2026.1.27 添加主岛装饰，更改钻岛部分方块 ————银光

为纪念MrBeast的巨大贡献，野兽杯将在2月1日于起床战争·无限火力地图内举行。 
报名方式：评论区规定区域留言即可。（本条消息下方留言无效）
时间：普通比赛初赛第一轮开始时间为13：30；高端服比赛初赛第一轮晚上19：00开始，时间不冲突可以都参加。
高端服比赛规则：经验无限，可以使用任何方式取得胜利。
普通及高端服比赛均分为3轮。第一轮为初赛，人数不满32人时初赛仅为一轮，超过32人则为两轮，超过64人为三轮依此类推。若参与人数小于16轮即取消初赛。
其中，晋级条件为：初赛小组前16名晋级复赛，复赛前8名进入决赛。排名方式按存活时间，即最终击杀顺序。
比赛奖励（高端服普通服均适用）：第一名，获得野兽杯（高端服，下同）冠军称号，披风，赛季积分+10000，管理员（可封禁）。
第二名，获得野兽杯亚军称号，披风，赛季积分+9000。第三名，获得野兽杯季军称号，披风，赛季积分+8000。
第4~8名，获得野兽杯八强称号，披风，赛季积分+5000。
第9~16名，获得野兽杯十六强称号，赛季积分+1000。
参与比赛者，均可获得野兽杯参与奖称号，赛季积分+200。
比赛地点：普通场在比赛服（https://dao3.fun/play/cffbcf2f7eec62e3bf6f）举行，
高端场在高端比赛服服（https://dao3.fun/play/2a46cebc435361f1e979）举行。

*/
//创作交流区（用“/*”开头用“*/”结尾【感觉没必要说qwq】）：
world.querySelectorAll('player').forEach((e)=>{if(e.player.name=='')e.player.kick()});/**反挂机用 */
world.onTick(()=>{
    console.log(漂流不要挂机了)
});

//玩家进入显示称号
const _admin = ["uns", "灵境", "喜欢火龙", "漂流者","Shawn","编程喵呀za","银光"];
const _writer = ["uns"];
globalThis.admin = (_admin);
globalThis.writer = (_writer);
world.onPlayerJoin(({ entity }) => {
    if (writer.includes(entity.player.name)) {
        world.say(`作者 ${entity.player.name} 进入了地图！！！！！！`);
    }
    else if (admin.includes(entity.player.name)) {
        world.say(`管理员 ${entity.player.name} 进入了地图!`);
    }
    else world.say(`${entity.player.name} 进入了地图`);
});
////ui图片素材（mc百科）:https://www.mcmod.cn/class/1.html#google_vignette
//我认为的物价（已经过修改，请勿改动）
/*
锋利I 8钻石
锋利II 10钻石  #Shawn建议12钻
保护I 5钻石    #Shawn建议6钻
保护II 10钻石  #Shawn建议12钻    
保护III 20钻石 #Shawn建议24钻
保护IV 30钻石
治愈池I 3钻石 全场生命恢复I 家中生命恢复II
陷阱类 1钻石 2钻石 4钻石 6钻石 :
这是个陷阱
反击陷阱
挖掘疲劳陷阱
警报陷阱
疯狂矿工I 2钻石 *2
疯狂矿工II 4钻石 *3
冶炼I 4钻石
冶炼II 8钻石
冶炼III 16钻石 不该12钻吗
冶炼IV 20钻石 不该16钻吗
水桶 6金锭 50
TNT 8金锭 150
火焰弹 40铁锭 40
金苹果（生命恢复II12s伤害吸收I60s） 3金锭 50
救援平台 16金锭 250
搭路蛋 1绿宝石 50
回城卷轴 2绿宝石 200
末影珍珠 4绿宝石 400

弓 8金锭 50
力量I弓 16金锭 100
力量II冲击I弓 48金锭 150
力量III冲击II弓 3绿宝石 300
16箭矢 4金锭 48
跳跃药水(60s) 1绿宝石 100
迅捷药水(60s) 1绿宝石 100
隐身药水(60s) 2绿宝石 200
瞬间治疗药水 1绿宝石 100

木镐 10铁锭 10 0.5
铁镐 10铁锭 20 1.5
金镐 3金锭 30 2.5
钻石镐 6金锭 50 3.5
木斧 10铁锭 10 0.5
石斧 10铁锭 20 1.5
铁斧 20铁锭 30 2.5
钻石斧 6金锭 50 3.5
剪刀 20铁锭 15 2

石剑10
铁剑35
钻石剑150
下界合金剑3灵魂 300
石中剑Ex（锋利X的金剑【耐久低点】）350
击退棒15
钓鱼竿 40

锁链套 50
铁套 150
钻石套 600
下界合金套 10灵魂/1000
*/

/*
锋利I 8钻石
锋利II 10钻石
保护I 5钻石
保护II 10钻石
保护III 15钻石
保护IV 20钻石
治愈池I 3钻石 全场生命恢复I 家中生命恢复II
陷阱类 1钻石 2钻石 4钻石 6钻石 :
这是个陷阱
反击陷阱
挖掘疲劳陷阱
警报陷阱
疯狂矿工I 2钻石 *2
疯狂矿工II 4钻石 *3
冶炼I 4钻石
冶炼II 8钻石
冶炼III 16钻石
冶炼IV 20钻石
水桶 6金锭 60
TNT 8金锭 80
火焰弹 40铁锭 40
金苹果（生命恢复II12s伤害吸收I30s） 3金锭 30
救援平台 16金锭 160
搭路蛋 1绿宝石 100
回城卷轴 2绿宝石 200
末影珍珠 4绿宝石 400

弓 8金锭 50
力量I弓 16金锭 160
力量II冲击I弓 48金锭 480
力量III冲击II弓 5绿宝石 500
16箭矢 4金锭 4
跳跃药水(60s) 1绿宝石 100
迅捷药水(60s) 1绿宝石 100
隐身药水(60s) 2绿宝石 200
瞬间治疗药水 1绿宝石 100

木镐 10铁锭 10 0.5
铁镐 10铁锭 20 1.5
金镐 3金锭 30 2.5
钻石镐 6金锭 50 3.5
木斧 10铁锭 10 0.5
石斧 10铁锭 20 1.5
铁斧 20铁锭 30 2.5
钻石斧 6金锭 50 3.5
剪刀 20铁锭 15 2

石剑10
铁剑35
钻石剑150
下界合金剑3灵魂 300
石中剑Ex（锋利X的金剑【耐久低点】）350
击退棒15

锁链套 50
铁套 150
钻石套 600
下界合金套 10灵魂/1000

无限火力
冶炼     0      I        II       III       IV
经验（铁）1/2s   1/s      2/s      3/s       4/s    
MAX     32     48       64        128       128       
经验（金）1/4s   1/3s     1/2s     1/s       1/s
MAX     12     16       16        32        48
钻石资源    30 25 20
MAX        8  12 16
绿宝石资源  45 35 25
MAX        8  16 16
（分钟/个）
血量提升 时间 数量
I     5      24
II    10     30
III   15     36
MAX   20     40

钻点升级时间 10     20     
绿点升级时间 5      25   

事件：时间
床自毁 45:00
强制终局 1:30:00
*/
  

//  称号：
/*
1、跑酷跑了一半内过给“[跑酷]”+“玩家名字”称号，300s以内给跑酷小神230s以内跑酷大神；
2.击杀值=>1000，称号：“[杀神]”+“玩家名字”；
3.击杀值=>3000，称号：“[弑神]”+“玩家名字”；
4.击杀值=>5000，称号：“[戳]”+“玩家名字”;
5.打赏50贝壳，100贝壳，300贝壳，依次是[VIP],[SVIP],[SSVIP]；
6.1v1击败uns(3:0)，称号：“[Master]”
7.管理员，称号：“[ADMIN]”
。。。。。。
*/

//速建
async function creat_circle(ox,oy,oz,r,b){
    for(let i=ox-r-2;i<=ox+r+2;i++){
        for(let k=oz-r-2;k<=oz+r+2;k++){
            if(Math.sqrt((i-ox)*(i-ox)+(k-oz)*(k-oz))<r){
                voxels.setVoxelId(i,oy,k,b);
            }
        }
        await sleep(1);
    }
}globalThis.creat_circle=creat_circle;

async function creat_ball(ox,oy,oz,r,b){
    for(let i=ox-r-2;i<=ox+r+2;i++){
        for(let j=oy-r-2;j<oy+r+2;j++){
            for(let k=oz-r-2;k<=oz+r+2;k++){
                if(Math.sqrt((i-ox)*(i-ox)+(j-oy)*(j-oy)+(k-oz)*(k-oz))<r){
                    voxels.setVoxelId(i,j,k,b);
                }
            }
            await sleep(1);
        }
    }
}

async function creat_half_ball(ox,oy,oz,r,b){
    for(let i=ox-r-2;i<=ox+r+2;i++){
        for(let j=oy;j<oy+r+2;j++){
            for(let k=oz-r-2;k<=oz+r+2;k++){
                if(Math.sqrt((i-ox)*(i-ox)+(j-oy)*(j-oy)+(k-oz)*(k-oz))<r){
                    voxels.setVoxelId(i,j,k,b);
                }
            }
            await sleep(1);
        }
    }
}

async function lantern(x,y,z){
    voxels.setVoxelId(x-1,y,z,voxels.id('lantern_02'));
    voxels.setVoxelId(x+1,y,z,voxels.id('lantern_02'));
    voxels.setVoxelId(x,y,z+1,voxels.id('lantern_02'));
    voxels.setVoxelId(x,y,z-1,voxels.id('lantern_02'));
}

async function creat_zyd(x,y,z,b){
    await creat_circle(x,y,z,4,voxels.id('polar_region'));
    voxels.setVoxelId(x,y,z,voxels.id(b));
    lantern(x,y,z);
}

function open_door(x,y,z){
    for(let i=x-2;i<=x+2;i++){
        for(let j=y-2;j<=y+2;j++){
            for(let k=z-2;k<=z+2;k++){
                if(voxels.getVoxelId(i,j,k)==voxels.id('white_light')){
                    voxels.setVoxelId(i,j,k,0);
                }
            }
        }
    }
}

async function creat_zsd(x,y,z){
    await creat_circle(x,y,z,12,voxels.id('ice'));
    for(let i=1;i<=6;i++){
        await creat_circle(x,y+i,z,7,voxels.id('blue_surface_01'));
    }
    await creat_circle(x,y+7,z,7,voxels.id('polar_region'));
    voxels.setVoxelId(x,y+7,z,voxels.id('indigo_light'));
    lantern(x,y+7,z);
}

async function creat_home(x,y,z,px,pz){
    for(let i=0;i<=5;i++){
        let a=[225,231,229,233];
        let xx = x+px*5;
        let zz = z+pz*5;
        if(xx<250&&xx>200&&zz<150&&zz>100)n=0;
        if(xx<100&&xx>0&&zz<150&&zz>100)n=1;
        if(xx<150&&xx>100&&zz<250&&zz>200)n=2;
        if(xx<150&&xx>100&&zz<100&&zz>0)n=3;
        await creat_circle(x+px*5,y+10+i,z+pz*5,11-i*2+1,a[n]);
    }
}

(async function(){
    creat_zsd(127+100,63,127+100);
    creat_zsd(127+100,63,127-100);
    creat_zsd(127-100,63,127+100);
    creat_zsd(127-100,63,127-100);
})();

//打包器

function base1024Compress(input) {
    function getStr(s, t) {
        for (let i = 0; i < codes.length; i++) {
            if (t[i] == s) return i;
        };
    };

    const charset = "一丁丂七丄丅丆万丈三上下丌不与丏丐丑丒专且丕世丗丘丙业丛东丝丞丟丠両丢丣两严並丧丨丩个丫丬中丮丯丰丱串丳临丵丶丷丸丹为主丼丽举丿乀乁乂乃乄久乆乇么义乊之乌乍乎乏乐乑乒乓乔乕乖乗乘乙乚乛乜九乞也习乡乢乣乤乥书乧乨乩乪乫乬乭乮乯买乱乲乳乴乵乶乷乸乹乺乻乼乽乾乿亀亁亂亃亄亅了亇予争亊事二亍于亏亐云互亓五井亖亗亘亙亚些亜亝亞亟亠亡亢亣交亥亦产亨亩亪享京亭亮亯亰亱亲亳亴亵亶亷亸亹人亻亼亽亾亿什仁仂仃仄仅仆仇仈仉今介仌仍从仏仐仑仒仓仔仕他仗付仙仚仛仜仝仞仟仠仡仢代令以仦仧仨仩仪仫们仭仮仯仰仱仲仳仴仵件价仸仹仺任仼份仾仿伀企伂伃伄伅伆伇伈伉伊伋伌伍伎伏伐休伒伓伔伕伖众优伙会伛伜伝伞伟传伡伢伣伤伥伦伧伨伩伪伫伬伭伮伯估伱伲伳伴伵伶伷伸伹伺伻似伽伾伿佀佁佂佃佄佅但佇佈佉佊佋佌位低住佐佑佒体佔何佖佗佘余佚佛作佝佞佟你佡佢佣佤佥佦佧佨佩佪佫佬佭佮佯佰佱佲佳佴併佶佷佸佹佺佻佼佽佾使侀侁侂侃侄侅來侇侈侉侊例侌侍侎侏侐侑侒侓侔侕侖侗侘侙侚供侜依侞侟侠価侢侣侤侥侦侧侨侩侪侫侬侭侮侯侰侱侲侳侴侵侶侷侸侹侺侻侼侽侾便俀俁係促俄俅俆俇俈俉俊俋俌俍俎俏俐俑俒俓俔俕俖俗俘俙俚俛俜保俞俟俠信俢俣俤俥俦俧俨俩俪俫俬俭修俯俰俱俲俳俴俵俶俷俸俹俺俻俼俽俾俿倀倁倂倃倄倅倆倇倈倉倊個倌倍倎倏倐們倒倓倔倕倖倗倘候倚倛倜倝倞借倠倡倢倣値倥倦倧倨倩倪倫倬倭倮倯倰倱倲倳倴倵倶倷倸倹债倻值倽倾倿偀偁偂偃偄偅偆假偈偉偊偋偌偍偎偏偐偑偒偓偔偕偖偗偘偙做偛停偝偞偟偠偡偢偣偤健偦偧偨偩偪偫偬偭偮偯偰偱偲偳側偵偶偷偸偹偺偻偼偽偾偿傀傁傂傃傄傅傆傇傈傉傊傋傌傍傎傏傐傑傒傓傔傕傖傗傘備傚傛傜傝傞傟傠傡傢傣傤傥傦傧储傩傪傫催傭傮傯傰傱傲傳傴債傶傷傸傹傺傻傼傽傾傿僀僁僂僃僄僅僆僇僈僉僊僋僌働僎像僐僑僒僓僔僕僖僗僘僙僚僛僜僝僞僟僠僡僢僣僤僥僦僧僨僩僪僫僬僭僮僯僰僱僲僳僴僵僶僷僸價僺僻僼僽僾僿儀儁儂儃億儅儆儇儈儉儊儋儌儍儎儏儐儑儒儓儔儕儖儗儘儙儚儛儜儝儞償儠儡儢儣儤儥儦儧儨儩優儫儬儭儮儯儰儱儲儳儴儵儶儷儸儹儺儻儼儽儾儿兀允兂元兄充兆兇先光兊克兌免兎兏児兑兒兓兔兕兖兗兘兙党兛兜兝兞兟兠兡兢兣兤入兦內全兩兪八公六兮兯兰共兲关兴兵其具典兹兺养兼兽兾兿冀冁冂冃冄内円冇冈冉冊冋册再冎冏冐冑冒冓冔冕冖冗冘写冚军农冝冞冟冠冡冢冣冤冥冦冧冨冩冪冫冬冭冮冯冰冱冲决冴况冶冷冸冹冺冻冼冽冾冿净凁凂凃凄凅准凇凈凉凊凋凌凍凎减凐凑凒凓凔凕凖凗凘凙凚凛凜凝凞凟几凡凢凣凤凥処凧凨凩凪凫凬凭凮凯凰凱凲凳凴凵凶凷凸凹出击凼函凾凿";
    const codes = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩαβγδεζηθικλμνξοπρστυφχψωАБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯԱԲԳԴԵԶԷԸԹԺԻԼԽԾԿՀՁՂՃՄՅՆՇՈՉՊՋՌՍՎՏՐՑՒՓՔՕՖაბგდევზთიკლმნოპჟრსტუფქღყშჩცძწჭხჯჰഅആഇഈഉഊഋഎഏഐഒഓഔകഖഗഘങചഛജഝഞടഠഡഢണതഥദധനപഫബഭമയരലവശഷസഹളഴറഴള്‍';

    let result = "", zip_1 = [], zip1_ = "";
    for (let i = 0; i < input.length; i++) {
        if (i % 2) {
            if (!zip_1.includes(zip1_)) zip_1.push(zip1_);
            result += charset[getStr(zip1_, zip_1)];
            zip1_ = "";
        };
        zip1_ += input[i];
    }
    return result;
};

function base1024Decompress(compressed) {
    const charset = "一丁丂七丄丅丆万丈三上下丌不与丏丐丑丒专且丕世丗丘丙业丛东丝丞丟丠両丢丣两严並丧丨丩个丫丬中丮丯丰丱串丳临丵丶丷丸丹为主丼丽举丿乀乁乂乃乄久乆乇么义乊之乌乍乎乏乐乑乒乓乔乕乖乗乘乙乚乛乜九乞也习乡乢乣乤乥书乧乨乩乪乫乬乭乮乯买乱乲乳乴乵乶乷乸乹乺乻乼乽乾乿亀亁亂亃亄亅了亇予争亊事二亍于亏亐云互亓五井亖亗亘亙亚些亜亝亞亟亠亡亢亣交亥亦产亨亩亪享京亭亮亯亰亱亲亳亴亵亶亷亸亹人亻亼亽亾亿什仁仂仃仄仅仆仇仈仉今介仌仍从仏仐仑仒仓仔仕他仗付仙仚仛仜仝仞仟仠仡仢代令以仦仧仨仩仪仫们仭仮仯仰仱仲仳仴仵件价仸仹仺任仼份仾仿伀企伂伃伄伅伆伇伈伉伊伋伌伍伎伏伐休伒伓伔伕伖众优伙会伛伜伝伞伟传伡伢伣伤伥伦伧伨伩伪伫伬伭伮伯估伱伲伳伴伵伶伷伸伹伺伻似伽伾伿佀佁佂佃佄佅但佇佈佉佊佋佌位低住佐佑佒体佔何佖佗佘余佚佛作佝佞佟你佡佢佣佤佥佦佧佨佩佪佫佬佭佮佯佰佱佲佳佴併佶佷佸佹佺佻佼佽佾使侀侁侂侃侄侅來侇侈侉侊例侌侍侎侏侐侑侒侓侔侕侖侗侘侙侚供侜依侞侟侠価侢侣侤侥侦侧侨侩侪侫侬侭侮侯侰侱侲侳侴侵侶侷侸侹侺侻侼侽侾便俀俁係促俄俅俆俇俈俉俊俋俌俍俎俏俐俑俒俓俔俕俖俗俘俙俚俛俜保俞俟俠信俢俣俤俥俦俧俨俩俪俫俬俭修俯俰俱俲俳俴俵俶俷俸俹俺俻俼俽俾俿倀倁倂倃倄倅倆倇倈倉倊個倌倍倎倏倐們倒倓倔倕倖倗倘候倚倛倜倝倞借倠倡倢倣値倥倦倧倨倩倪倫倬倭倮倯倰倱倲倳倴倵倶倷倸倹债倻值倽倾倿偀偁偂偃偄偅偆假偈偉偊偋偌偍偎偏偐偑偒偓偔偕偖偗偘偙做偛停偝偞偟偠偡偢偣偤健偦偧偨偩偪偫偬偭偮偯偰偱偲偳側偵偶偷偸偹偺偻偼偽偾偿傀傁傂傃傄傅傆傇傈傉傊傋傌傍傎傏傐傑傒傓傔傕傖傗傘備傚傛傜傝傞傟傠傡傢傣傤傥傦傧储傩傪傫催傭傮傯傰傱傲傳傴債傶傷傸傹傺傻傼傽傾傿僀僁僂僃僄僅僆僇僈僉僊僋僌働僎像僐僑僒僓僔僕僖僗僘僙僚僛僜僝僞僟僠僡僢僣僤僥僦僧僨僩僪僫僬僭僮僯僰僱僲僳僴僵僶僷僸價僺僻僼僽僾僿儀儁儂儃億儅儆儇儈儉儊儋儌儍儎儏儐儑儒儓儔儕儖儗儘儙儚儛儜儝儞償儠儡儢儣儤儥儦儧儨儩優儫儬儭儮儯儰儱儲儳儴儵儶儷儸儹儺儻儼儽儾儿兀允兂元兄充兆兇先光兊克兌免兎兏児兑兒兓兔兕兖兗兘兙党兛兜兝兞兟兠兡兢兣兤入兦內全兩兪八公六兮兯兰共兲关兴兵其具典兹兺养兼兽兾兿冀冁冂冃冄内円冇冈冉冊冋册再冎冏冐冑冒冓冔冕冖冗冘写冚军农冝冞冟冠冡冢冣冤冥冦冧冨冩冪冫冬冭冮冯冰冱冲决冴况冶冷冸冹冺冻冼冽冾冿净凁凂凃凄凅准凇凈凉凊凋凌凍凎减凐凑凒凓凔凕凖凗凘凙凚凛凜凝凞凟几凡凢凣凤凥処凧凨凩凪凫凬凭凮凯凰凱凲凳凴凵凶凷凸凹出击凼函凾凿";
    const codes = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩαβγδεζηθικλμνξοπρστυφχψωАБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯԱԲԳԴԵԶԷԸԹԺԻԼԽԾԿՀՁՂՃՄՅՆՇՈՉՊՋՌՍՎՏՐՑՒՓՔՕՖაბგდევზთიკლმნოპჟრსტუფქღყშჩცძწჭხჯჰഅആഇഈഉഊഋഎഏഐഒഓഔകഖഗഘങചഛജഝഞടഠഡഢണതഥദധനപഫബഭമയരലവശഷസഹളഴറഴള്‍';

    let result = "";
    return result;
};

class Zip {
    static codes = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩαβγδεζηθικλμνξοπρστυφχψωАБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯԱԲԳԴԵԶԷԸԹԺԻԼԽԾԿՀՁՂՃՄՅՆՇՈՉՊՋՌՍՎՏՐՑՒՓՔՕՖაბგდევზთიკლმნოპჟრსტუფქღყშჩცძწჭხჯჰഅആഇഈഉഊഋഎഏഐഒഓഔകഖഗഘങചഛജഝഞടഠഡഢണതഥദധനപഫബഭമയരലവശഷസഹളഴറഴള്‍';


    static recode(code) {
        return Zip.codes.indexOf(code);
    }


    static radix10to250(n) {
        return (n < 250 ? Zip.codes[n] : Zip.codes[249 + Math.floor(n / 250)] + Zip.codes[n % 250]);
    }


    static radix250to10(n) {
        return (n.length == 1 ? Zip.recode(n) : 250 * (Zip.recode(n[0]) - 249) + Zip.recode(n[1]));
    }


    static autoWrap(str) {
        return str.match(/.{1,120}|\S+$/g).join('\n');
    }


    static unwrap(str) {
        return str.replace(/[\n\s]/g, '');
    }


    static getVoxelInRange(lo, hi) {
        const size = hi.sub(lo).add(new GameVector3(1, 1, 1));
        let ids = Array.from({ length: size.x }, () =>
            Array.from({ length: size.y }, () => Array(size.z).fill(null))
        );
        for (let x = 0; x < size.x; x++) {
            for (let y = 0; y < size.y; y++) {
                for (let z = 0; z < size.z; z++) {
                    const cx = x + lo.x, cy = y + lo.y, cz = z + lo.z;
                    ids[x][y][z] = (voxels.getVoxelRotation(cx, cy, cz) ? voxels.getVoxel(cx, cy, cz) : voxels.getVoxelId(cx, cy, cz));
                }
            }
        }
        return { size, ids };
    }


    static gatherIntoBounds(size, ids) {
        let boundsId = [];
        let positionId = [];
        function findMaxBounds(lo, id) {
            let { x: cx, y: cy, z: cz } = lo;
            while (cx < size.x - 1) {
                if (ids[cx + 1][cy][cz] != id) break;
                cx++;
            }
            (() => {
                while (cy < size.y - 1) {
                    for (let x = lo.x; x <= cx; x++)
                        if (ids[x][cy + 1][cz] != id) return;
                    cy++;
                }
            })();
            (() => {
                while (cz < size.z - 1) {
                    for (let x = lo.x; x <= cx; x++)
                        for (let y = lo.y; y <= cy; y++)
                            if (ids[x][y][cz + 1] != id) return;
                    cz++;
                }
            })();
            let hi = new GameVector3(cx, cy, cz);
            return new GameBounds3(lo, hi);
        }
        for (let x = 0; x < size.x; x++) {
            for (let y = 0; y < size.y; y++) {
                for (let z = 0; z < size.z; z++) {
                    let id = ids[x][y][z];
                    if (id == 0) continue;
                    let bounds = findMaxBounds(new GameVector3(x, y, z), id);
                    let { lo, hi } = bounds;
                    if (lo.x == hi.x && lo.y == hi.y && lo.z == hi.z)
                        positionId.push({ position: lo, id });
                    else
                        boundsId.push({ bounds, id });
                    for (let i = lo.x; i <= hi.x; i++)
                        for (let j = lo.y; j <= hi.y; j++)
                            for (let k = lo.z; k <= hi.z; k++)
                                ids[i][j][k] = 0;
                }
            }
        }

        return { boundsId, positionId };
    }


    static encode(boundsId, positionId) {
        let dict = {}, k = 0;
        const boundsData = boundsId.reduce((acc, { bounds, id }) => {
            const { lo: { x: lx, y: ly, z: lz }, hi: { x: hx, y: hy, z: hz } } = bounds; id += ' ';
            if (!dict[id]) dict[id] = Zip.codes[k++];
            return `${acc}${Zip.codes[lx]}${Zip.codes[ly]}${Zip.codes[lz]}${Zip.codes[hx]}${Zip.codes[hy]}${Zip.codes[hz]}${dict[id]}`;
        }, '');
        const positionData = positionId.reduce((acc, { position, id }) => {
            const { x, y, z } = position; id += ' ';
            if (!dict[id]) dict[id] = Zip.codes[k++];
            return `${acc}${Zip.codes[x]}${Zip.codes[y]}${Zip.codes[z]}${dict[id]}`;
        }, '');
        const idData = Object.keys(dict).map(e => Zip.radix10to250(e.slice(0, -1))).join('');
        const data = `${boundsData}0${positionData}0${idData}`;
        return data;
    }


    static zipVoxelInRange(lo, hi) {
        const { size, ids } = Zip.getVoxelInRange(lo, hi);
        const { boundsId, positionId } = Zip.gatherIntoBounds(size, ids);
        const data = Zip.encode(boundsId, positionId);
        return base1024Compress(Zip.autoWrap(data));
    }


    static unzipVoxelInRange(lo, data) {
        data = base1024Decompress(data);
        const [boundsData, positionData, idData] = Zip.unwrap(data).split('0');
        const { boundsId, positionId } = Zip.decode(boundsData, positionData, idData);
        Zip.generateVoxelInRange(lo, boundsId, positionId);
    }


    static decode(boundsData, positionData, idData) {
        const dict = idData.split('').reduce((acc, char, index, array) => {
            if (char == ' ') return acc;
            const code = Zip.radix250to10(char);
            if (code < 250) {
                acc[Zip.codes[Object.keys(acc).length]] = code;
            } else {
                acc[Zip.codes[Object.keys(acc).length]] = Zip.radix250to10(char + array[index + 1]);
                array[index + 1] = ' ';
            }
            return acc;
        }, {});
        const boundsId = boundsData.length ? boundsData.match(/.{1,7}/g).map(bounds => {
            const [lx, ly, lz, hx, hy, hz, id] = bounds.split('');
            return {
                bounds: new GameBounds3(
                    new GameVector3(Zip.recode(lx), Zip.recode(ly), Zip.recode(lz)),
                    new GameVector3(Zip.recode(hx), Zip.recode(hy), Zip.recode(hz))
                ),
                id: dict[id]
            };
        }) : [];
        const positionId = positionData.length ? positionData.match(/.{1,4}/g).map(position => {
            const [x, y, z, id] = position.split('');
            return {
                position: new GameVector3(Zip.recode(x), Zip.recode(y), Zip.recode(z)),
                id: dict[id]
            };
        }) : [];
        return { boundsId, positionId };
    }


    static generateVoxelInRange(lo, boundsId, positionId) {
        boundsId.forEach(({ bounds: { lo: { x: lx, y: ly, z: lz }, hi: { x: hx, y: hy, z: hz } }, id }) => {
            for (let x = lx; x <= hx; x++)
                for (let y = ly; y <= hy; y++)
                    for (let z = lz; z <= hz; z++)
                        voxels.setVoxelId(x + lo.x, y + lo.y, z + lo.z, id);
        });
        positionId.forEach(({ position: { x, y, z }, id }) => {
            voxels.setVoxelId(x + lo.x, y + lo.y, z + lo.z, id);
        });
    }

}

module.exports = Zip;

// let codes =
//     Zip.zipVoxelInRange(
//         new GameVector3(0, 0, 0),
//         new GameVector3(256, 128, 256),
//     );

// console.log(
//     Zip.unzipVoxelInRange(
//         new GameVector3(0, 1, 0),
//         codes
//     )
// );

console.log(
    Zip.zipVoxelInRange(
        new GameVector3(0, 0, 0),
        new GameVector3(256, 128, 256),
    )
);

//////////////////////////////////////////////////////////////////

                                            //这下面啥玩意？
/*编码1*/var code1='的一是在不了有和人这中大为上个国我以要他时来用们生到作地于出就分对成会可主发年动同工也能下过子说产种面而方后多定行学法所民得经十三之进着等部度家电力里如水化高自二理起小物现实加量都两体制机当使点从业本去把性好应开它合还因由其些然前外天政四日那社义事平形相全表间样与关种重新线内数正心反你明看原又么利比或但质气第向道命此变条只没结解问意建月公无系军很情者最立代想已通并提直题党程展五果料象员革位入常文总次品式活设及管特件长求老头基资边流路级少图山统接知较将组见计别她手角期根论运农指几九区强放决西被干做必战先回则任取据处队南给色光门即保治北造百规热领七海口东导器压志世金增争济阶油思术极交受联什认六共权收证改清己美再采转更单风切打白教速花带安场身车例真务具万每目至达走积示议声报斗完类八离华名确才科张信马节话米整空元况今集温传土许步群广石记需段研界拉林律叫且究观越织装影算低持音众书布复容儿须际商非验连断深难近矿千周委素技备半办青省列习响约支般史感劳便团往酸历市克何除消构府称太准精值号率族维划选标写存候毛亲快效斯院查江型眼王按格养易置派层片始却专状育厂京识适属圆包火住调满县局照参红细引听该铁价严龙飞!@#$%^&*()！￥…（）；‘’？、。，|\~·=+-{}[]<>《》/.;%ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩαβγδεζηθικλμνξοπρστυφχψωАБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯԱԲԳԴԵԶԷԸԹԺԻԼԽԾԿՀՁՂՃՄՅՆՇՈՉՊՋՌՍՎՏՐՑՒՓՔՕՖაბგდევზთიკლმნოპჟრსტუფქღყშჩცძწჭხჯჰഅആഇഈഉഊഋഎഏഐഒഓഔകഖഗഘങചഛജഝഞടഠഡഢണതഥദധനപഫബഭമയരലവശഷസഹളഴറഴള്‍';
/*code1.length;*//*编码2*/var code2=code1;
/*所有方块id 粘贴时需提前复制*/var all=[];
/*2级压缩id 粘贴时需提前复制*/var arr=[];
/*3级压缩id*/var t=[];
/*4级压缩id*/var tt=[];
/*地图编码 粘贴时需提前复制*/var bm="";
const nums="1234567890";
const MAX={x:256,y:128,z:256};
function getId(n){
    for(let i=0;i<all.length;i++){
        if(all[i]==n)return i;
    }
}
function getS(s,t){
    for(let i=0;i<t.length;i++){
        if(t[i]==s)return i;
    }
}
function getcode(n){
    return code2[n];
}
let maxn=0;
function getcode2(n){
    maxn=Math.max(n,maxn);
    return code2[Math.floor(n/code2.length)]+code2[n%code2.length];
}
async function getCode(){
    for(let i=0;i<MAX.x;i++){/*O(n^3)*/
        for(let j=0;j<MAX.y;j++){
            for(let k=0;k<MAX.z;k++){
                if(!all.includes(voxels.getVoxelId(i,j,k)))all.push(voxels.getVoxelId(i,j,k));
            }
        }
        await sleep(1);
    }
    let s="";
    for(let i=0;i<MAX.x;i++){/*O(n^4)*/
        for(let j=0;j<MAX.y;j++){
            for(let k=0;k<MAX.z;k++){
                s+=code1[getId(voxels.getVoxelId(i,j,k))%code1.length];
            }
        }
        await sleep(1);
    }
    let ss="";
    let lst='';
    let cnt=0;
    for(let i=0;i<s.length;i++){
        if(lst!=s[i]){
            if(cnt>1){
                ss+=lst+String(cnt);
            }
            lst=s[i];
            cnt=0;
        }
        cnt++;
    }
    lst='';
    let sss="";
    for(let i=0;i<ss.length;i++){
        if((!nums.includes(ss[i]))&&nums.includes(lst)){
            if(!t.includes(sss))t.push(sss);
            sss="";
        }
        sss+=ss[i];
        lst=ss[i];
        cnt++;
    }
    let u="";
    lst='';
    sss="";
    for(let i=0;i<ss.length;i++){
        if((!nums.includes(ss[i]))&&nums.includes(lst)){
            u+=getcode(getS(sss,t));
            sss="";
        }
        sss+=ss[i];
        lst=ss[i];
        cnt++;
    }
    let v="";
    ts="";
    for(let i=0;i<u.length;i++){
        if(i%2){
            if(!tt.includes(ts))tt.push(ts);
            v+=getcode(getS(ts,tt));
            ts="";
        }
        ts+=u[i];
    }
    console.log(v);
}getCode();

/*
1. 点击右键，扔出火焰弹，火焰弹破坏方块
2. 点击右键，放置TNT，TNT破坏方块
3. 点击右键，扔出搭路蛋，搭路蛋生成羊毛桥）
可以跟漂流一起完成（）

TNT、火焰弹爆炸范围是圆形
TNT火焰弹都有冲击波

*/
//搭路蛋不太会啊---阿白
world.onPlayerJoin(({ entity }) => {
    // entity.firstWeapon = 'TNT';
    entity.firstWeapon = '火焰弹';
});

world.onPress(async({ button, raycast, entity }) => {
    if (button === 'action1') {
        const pos = raycast.voxelIndex.add(raycast.normal);
        const canBoom=[];
        for(let i=0;i<Blocks.length;i++){
            if(Blocks[i].explosion_hardness<2){
                canBoom.push(voxels.id(Blocks[i].name));
            }
        }
        let r = 100, b = 0;
        if (pos) {
            if (entity.firstWeapon == "TNT") {
                const tnt = world.createEntity({
                    mesh: "mesh/TNT.vb",
                    position: [pos.x+0.5, pos.y+0.5, pos.z+0.5],
                    fixed: true,
                    collides: false,
                    gravity: false,
                    meshScale: [0.05, 0.05, 0.05]
                });
                await sleep(5000);
                for (let i = pos.x - r; i <= pos.x + r; i++) {
                    for (let j = pos.y - r; j <= pos.y + r; j++) {
                        for (let k = pos.z - r; k <= pos.z + r; k++) {
                            let boom = 0, Now_id = voxels.getVoxelId(i, j, k);// 我先走了 你把 ITEM_DATA和Image_Data补齐）
                            if (Math.sqrt((i - pos.x) * (i - pos.x) + (j - pos.y) * (j - pos.y) + (k - pos.z) * (k - pos.z)) < r) {
                                for(let cb=0;cb<Blocks.length;cb++){
                                    if(Blocks[cb].explosion_hardness<2){
                                        if (Now_id == voxels.id(Blocks[cb].name)) {
                                            boom = 1;
                                            break;
                                        }
                                    }
                                }
                                if(boom) voxels.setVoxelId(i, j, k, b);
                            } 
                        }
                    }
                }
                tnt.destroy();
                world.querySelectorAll('*').forEach(p => {
                    if(p.hasTag('shop1')||p.hasTag('shop2')){}else{
                    const distance = Math.sqrt(
                        Math.pow(p.position.x - tnt.position.x, 2) +
                        Math.pow(p.position.y - tnt.position.y, 2) +
                        Math.pow(p.position.z - tnt.position.z, 2)
                    )
                    if (distance < 6) {//6是击飞范围
                        function f(n) {
                            if(Math.abs(n)<0.5){
                                return 0;
                            }
                            if(n < 0) return f(-n);
                            if(n == 0 || 1 / (n*n) > 2) return 2;
                            return 1 / (n*n);
                        }
                        let x = f(p.position.x - tnt.position.x);
                        let y = (distance<3?1.5:0.5);
                        let z = f(p.position.z - tnt.position.z);
                        p.velocity.x = x;
                        p.velocity.y = y;
                        p.velocity.z = z;
                    }}
                });//做完了
            }
            if (entity.firstWeapon == "火焰弹") {
                const FireBall = world.createEntity({
                    position: [entity.position.x + raycast.direction.x, entity.position.y + raycast.direction.y, entity.position.z + raycast.direction.z],
                    collides: true,
                    gravity: false,
                    fixed: false,
                    friction: 1,
                    meshScale: [1 / 16, 1 / 16, 1 / 16],
                    mass: 1,
                    mesh: "mesh/火焰弹.vb",
                    meshScale: [0.05, 0.05, 0.05],
                });
                FireBall.addTag('fb');
                FireBall.velocity.x=raycast.direction.x;
                FireBall.velocity.y=raycast.direction.y;
                FireBall.velocity.z=raycast.direction.z;
                let cf = function () {
                    var x=FireBall.position.x;
                    var y=FireBall.position.y;
                    var z=FireBall.position.z;
                    FireBall.destroy();
                    let r=3;
                    for (let i = x - r; i <= x + r; i++) {
                        for (let j = y - r; j <= y + r; j++) {
                            for (let k = z - r; k <= z + r; k++) {
                                if (Math.sqrt((i - x) * (i - x) + (j - y) * (j - y) + (k - z) * (k - z)) < r) {
                                    if( [177,137,278].includes(voxels.getVoxelId(i,j,k))) voxels.setVoxelId(i, j, k, 0);
                                } 
                            }
                        }
                    }
                    world.querySelectorAll('*').forEach(p => {
                        if(p.hasTag('shop1')||p.hasTag('shop2')){}else{
                            const distance = Math.sqrt(
                                Math.pow(p.position.x - FireBall.position.x, 2) +
                                Math.pow(p.position.y - FireBall.position.y, 2) +
                                Math.pow(p.position.z - FireBall.position.z, 2)
                            )
                            if (distance < 6) {
                                function f(n) {
                                    if(Math.abs(n)<0.5){
                                        return 0;
                                    }
                                    if(n < 0) return f(-n);
                                    if(n == 0 || 1 / (n*n) > 2) return 2.5;
                                    return 1 / (n*n);
                                }
                                let x = f(p.position.x - FireBall.position.x);
                                let y = (distance<3?1.5:0.5);
                                let z = f(p.position.z - FireBall.position.z);
                                p.velocity.x = x;
                                p.velocity.y = y;
                                p.velocity.z = z;
                            }
                        }
                    });//做完了
                }
                FireBall.onVoxelContact(({ x, y, z }) => {
                    cf();
                });
                FireBall.onEntityContact(() => {
                    cf();
                });
                await sleep(15000);
                FireBall.destroy();
            }
        }
    }
});


const or = {
        0:new GameQuaternion(-0.027, -0.676, -0.215, 0.707),
        1:new GameQuaternion(0.094, -0.699, -0.094, 0.699),
        2:new GameQuaternion(0.094, -0.699, -0.094, 0.699),
        3:new GameQuaternion(0.094, -0.699, -0.094, 0.699),
        4:new GameQuaternion(0.094, -0.699, -0.094, 0.699),
        5:new GameQuaternion(0.094, -0.699, -0.094, 0.699),
        6:new GameQuaternion(0.094, -0.699, -0.094, 0.699),
    };//调这个的参数吗这个是哪个物品 Types对应 这个是3d向量吗还是矩阵 GameVector3 就这样改就好
    
    const sc = {
        0:new GameVector3(0.5, 0.5, 0.5),
        1:new GameVector3(0.25, 0.25, 0.25),
        2:new GameVector3(0.5, 0.5, 0.5),
        3:new GameVector3(0.5, 0.5, 0.5),
        4:new GameVector3(0.5, 0.5, 0.5),
        5:new GameVector3(0.5, 0.5, 0.5),
        6:new GameVector3(0.5, 0.5, 0.5),
    };//调这个
async function b(p1,p2,po){
    for(let x=Math.min(p1.x,p2.x);x<=Math.max(p1.x,p2.x);x++){
        for(let y=Math.min(p1.y,p2.y);y<=Math.max(p1.y,p2.y);y++){
            for(let z=Math.min(p1.z,p2.z);z<=Math.max(p1.z,p2.z);z++){
                voxels.setVoxelId(po.x-z+po.z,y,po.z+x-po.x,voxels.getVoxelId(x,y,z));
                voxels.setVoxelId(po.x+z-po.z,y,po.z-x+po.x,voxels.getVoxelId(x,y,z));
            }
        }
    }
    for(let x=Math.min(p1.x,p2.x);x<=Math.max(p1.x,p2.x);x++){
        for(let y=Math.min(p1.y,p2.y);y<=Math.max(p1.y,p2.y);y++){
            for(let z=Math.min(p1.z,p2.z);z<=Math.max(p1.z,p2.z);z++){
                voxels.setVoxelId(2*po.x-x,y,2*po.z-z,voxels.getVoxelId(x,y,z));
            }
        }
    }
}b({x:108,y:58,z:208},{x:146,y:78,z:246},{x:127,y:127,z:127});