let screen = UiScreen.getAllScreen().find(screen => screen.name == "main");
screen.findChildByName('开始游戏').findChildByName('关闭').events.on("pointerdown", () => {
    screen.findChildByName('开始游戏').visible = false;
    f.visible=1;
    input.unlockPointer();
});
remoteChannel.events.on('client', async (args) => {//UI端收到命令
    if(args.type=='start'){
        f.visible=1;
        input.unlockPointer();
    }
});
const ServerConfig = [//     
    {
        cname:"起床战争·无限火力-主服",//纯文本名称
        name:`<stroke thickness="1" opacity="1" color="#847702"> <font color="#FFAE00">起床战争·无限火力</font></stroke> - <stroke thickness="1" opacity="1" color="#A01883"><font color="#F629CA">主服</font></stroke>`,
        //xml写法颜色字名称
        confrim:()=>{//确认函数
            remoteChannel.sendServerEvent({
                type:"choose-server",
                url:"https://dao3.fun/play/d16fda33511732ea7cd4",
            })    
            return true;
        },
        getPlayerNum:()=>{//获取玩家数量函数
            return "暂时无法查询人数";
        }
    },
    {
        cname:"起床战争·无限火力-无尽服",
        name:`<stroke thickness="1" opacity="1" color="#847702"> <font color="#FFAE00">起床战争·无限火力</font></stroke> - <stroke thickness="1" opacity="1" color="#A01883"><font color="#F629CA">无尽服</font></stroke>`,
        confrim:()=>{
            remoteChannel.sendServerEvent({
                type:"choose-server",
                url:"https://dao3.fun/play/061b3091ed1ae74e7413",
            })
            return true;
        },
        getPlayerNum:()=>{
            return "暂时无法查询人数";
        }
    },
    {
        cname:"超级组队系统[New]",
        name:`<stroke thickness="1" opacity="1" color="#A01883"><font color="#F629CA">超级组队系统<font color="#FF0000">[New]</font></font></stroke>`,
        confrim:()=>{
            remoteChannel.sendServerEvent({
                type:"choose-server-special",
                lx:"zd"
            })
            return true;
        },
        getPlayerNum:()=>{
            return `<font color="#FFE500">组队系统，可以创建队伍，或加入队伍</font>`
        }
    },
    {
        cname:"模型作品集",
        name:`<stroke thickness="1" opacity="1" color="#A01883"><font color="#F629CA">模型作品集</font></stroke>`,
        confrim:()=>{
            remoteChannel.sendServerEvent({
                type:"choose-server",
                url:"https://dao3.fun/profile/313302324407187",
            })
            return true;
        },
        getPlayerNum:()=>{
            return `<font color="#FFE500">模型作品集！！……@！@￥@！……！&！</font>`;
        }
    },
    {
        cname:"PVP训练",
        name:`<stroke thickness="1" opacity="1" color="#A01883"><font color="#F629CA">PVP训练</font></stroke>`,
        confrim:()=>{
            remoteChannel.sendServerEvent({
                type:"choose-server",
                url:"https://dao3.fun/play/2a46cebc435361f1e979",
            })
            return true;
        },
        getPlayerNum:()=>{
            return "暂时无法查询人数";
        }
    },
    {
        cname:"活动服",
        name:`<stroke thickness="1" opacity="1" color="#A01883"><font color="#F629CA">活动服</font></stroke>`,
        confrim:()=>{
            remoteChannel.sendServerEvent({
                type:"choose-server",
                url:"https://dao3.fun/play/29b047121b5fde57d30d",
            })
            return true;
        },
        getPlayerNum:()=>{
            return "暂时无法查询人数";
        }
    },
    {
        cname:"起床战争·无限火力-比赛服",
        name:`<stroke thickness="1" opacity="1" color="#847702"> <font color="#FFAE00">起床战争·无限火力</font></stroke> - <stroke thickness="2" opacity="1" color="#A01883"><font color="#F629CA">比赛服</font></stroke>`,
        confrim:()=>{
            remoteChannel.sendServerEvent({
                type:"choose-server",
                url:"https://dao3.fun/play/1e57fa81ac4268b7239a",
            })
            return true;
        },
        getPlayerNum:()=>{
            return "暂时无法查询人数";
        }
    },
    {
        cname:"起床战争·无限火力-备用服",
        name:`<stroke thickness="1" opacity="1" color="#847702"> <font color="#FFAE00">起床战争·无限火力</font></stroke> - <stroke thickness="2" opacity="1" color="#A01883"><font color="#F629CA">备用服</font></stroke>`,
        confrim:()=>{
            remoteChannel.sendServerEvent({
                type:"choose-server",
                url:"https://dao3.fun/play/799ff05265ab16e538be",
            })
            return true;
        },
        getPlayerNum:()=>{
            return "暂时无法查询人数";
        }
    },
    {
        cname:"空岛战争（非本地图）",
        name:`<stroke thickness="1" opacity="1" color="#A01883"><font color="#F629CA">空岛战争（非本地图）</font></stroke>`,
        confrim:()=>{
            remoteChannel.sendServerEvent({
                type:"choose-server",
                url:"https://dao3.fun/exp/experience/detail/100483974",
            })
            return true;
        },
        getPlayerNum:()=>{
            return "暂时无法查询人数";
        }
    },
]
class TheServerUI{
    constructor(){
        this.md = screen.findChildByName("开始游戏").findChildByName("列表").findChildByName("模板");
        this.uis = [];
        this.chooseIndex = 0;
        for(let i in ServerConfig){
            this.createUI(i);
        }
        this.choose(0);
        screen.findChildByName('开始游戏').findChildByName('开始').events.on("pointerdown", () => {
            this.uis[this.chooseIndex].custom.confrim();
        });
    }
    setChoiseSytle(node){
        if(node.custom.index == this.chooseIndex){
            node.backgroundColor.copy(Vec3.create({r:200,g:200,b:200}))
            node.custom.node._in.backgroundColor.copy(Vec3.create({r:150,g:150,b:150}))
        }else{
            node.backgroundColor.copy(Vec3.create({r:130,g:130,b:130}))
            node.custom.node._in.backgroundColor.copy(Vec3.create({r:97,g:97,b:97}))
        
        }
    }
    createUI(index){
        let node = this.md.clone();
        let numNode = node.findChildByName("人数");
        let nameNode = node.findChildByName("名称")
        let inNode = node.findChildByName("内部装饰")
        let name = ServerConfig[index].name;
        let confrim = ServerConfig[index].confrim;
        let num = ServerConfig[index].getPlayerNum();
        node.visible = true;
        node.position.scale.y = index*0.25 + 0.05
        node.custom = {index:index,confrim:confrim,node:{num:numNode,name:nameNode,_in:inNode}};
        nameNode.textContent = name;
        numNode.textContent = num;
        node.events.on("pointerdown", () => {
            this.choose(index);
        });
        this.uis.push(node);
    }
    choose(index){
        this.chooseIndex = index;
        for(let i in this.uis){
            this.setChoiseSytle(this.uis[i]);
        }
        screen.findChildByName("开始游戏").findChildByName("当前选择").textContent = "当前选择:" + ServerConfig[index].cname
    }
}
new TheServerUI();

ui.findChildByName('首页').findChildByName('1').findChildByName('image-1').size.offset.y=ui.findChildByName('首页').findChildByName('1').findChildByName('image-1').size.offset.x=screenWidth*0.2;
ui.findChildByName('首页').findChildByName('1').findChildByName('image-1').position.offset.x=screenWidth*0.25;
ui.findChildByName('首页').findChildByName('1').findChildByName('image-2').size.offset.x=screenWidth*0.2;
ui.findChildByName('首页').findChildByName('1').findChildByName('image-2').size.offset.y=screenWidth*0.2*80/200;
ui.findChildByName('首页').findChildByName('1').findChildByName('image-2').position.offset.x=screenWidth*0.25;

var choose=0;
const all=4;
const f=ui.findChildByName('首页');
const box=ui.findChildByName('首页').findChildByName('box');
function upd(){
    for(let i=1;i<=all;i++){
        if(choose!=i){
            box.findChildByName('x'+i).visible=0;
            f.findChildByName(String(i)).visible=0;
        }else{
            box.findChildByName('x'+i).visible=1;
            f.findChildByName(String(i)).visible=1;
        }
    }
}
upd();
for(let i=1;i<=all;i++){
    box.findChildByName(String(i)).events.on("pointerdown", () => {
        if(choose==i){
            choose=0;
        }else{
            choose=i;
        }
        upd();
    });
}

f.findChildByName('1').findChildByName('begin').events.on("pointerdown", () => {
    screen.findChildByName('开始游戏').visible = true;
    f.visible=0;
});

box.findChildByName('关闭').events.on("pointerdown",()=>{
    f.visible=0;
});

const gg=[
    {title:'神岛解禁',content:'！！！热烈庆祝神岛防沉迷解除！！！\n\n6月30日'},
    {title:'招代码师',content:'地图招代码师，有意者加QQ（3875308649）或留言。'},
    {title:'招建筑师',content:'地图招建筑师，要求先建出一个起床地图的建筑，有意者加QQ（3875308649）或留言。'},
    {title:'比赛申办',content:'地图鼓励玩家办比赛，有意者加QQ（3875308649）或留言'},
];

var gc=-1;
var ga=[];

for(let i=0;i<gg.length;i++){
    let e=UiText.create();
    e.parent=f.findChildByName('2').findChildByName('b');
    e.textContent=gg[i].title;
    e.textStrokeColor=Vec3.create({r:256,g:256,b:256});
    e.textStrokeThickness=1;
    e.textFontSize=36;
    e.textFontFamily=UITextFontFamily.BoldRound;
    e.backgroundOpacity=0.6;
    e.size.offset.x=screenWidth*0.322*0.96;
    e.position.offset.x=screenWidth*0.322*0.02;
    e.size.offset.y=screenHeight*0.5831*0.13;
    e.position.offset.y=screenHeight*0.322*0.02+i*screenHeight*0.5831*0.15;
    e.visible=1;
    ga.push(e);
    e.events.on("pointerdown",()=>{
        if(gc==i){
            f.findChildByName('2').findChildByName('t').textContent=' ';
            e.backgroundOpacity=0.6;
            gc=-1;
        }else{
            f.findChildByName('2').findChildByName('t').textContent=gg[i].content;
            e.backgroundOpacity=0.8;
            if(gc!=-1){
                ga[gc].backgroundOpacity=0.6;
            }
            gc=i;
        }
    });
}

const cc=[
    {title:'SZ杯-已结束',content:`
时间：7月8日—7月10日
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
`},
    {title:'冰与火之杯-已结束',content:`
时间：2025年8月11日
冠军：不胜传说周已复活，
亚军：被夹的kun，
季军：竹青墨染，
第四：地下-六月无雪，
第五：情海 获得 苦力怕披风
八强：Fall-Su-Fish-DLD，我是卦哥，灵境
`},
    {title:'周周极霸杯-已结束',content:`
时间：2025年8月16日
`},
    {title:'野兽杯-已结束',content:`
时间：2月1日
普通场：第一名：MrBeast 第二名：岛民-3xh61 第三名：额-----睡着了Zzz 第四名：时间简史-指南针 第五名：江辞 第六名：丁真 第七名：风橙 第八名：女囚--双正
高端场：第一名：岛民-3xh61 第二名：风橙 第三名：��权威嘉豪�� 第四名： wind 第五名：暐 第六名：B站会编程的柚子 第七名：青鸾-白狸 第八名：忍
`},
    {title:'鲫鱼杯-已结束',content:`
时间：2月19日
冠军：六翼天使千仞雪(小号)
亚军：꧁༺挖一个坑༻꧂
季军：老半仙仙仙仙仙XGY月恨红莲战神zc4
第四：傻了吧唧的年糕
`},

];

var pc=-1;
var ca=[];

for(let i=0;i<cc.length;i++){
    let e=UiText.create();
    e.parent=f.findChildByName('3').findChildByName('b');
    e.textContent=cc[i].title;
    e.textStrokeColor=Vec3.create({r:256,g:256,b:256});
    e.textStrokeThickness=1;
    e.textFontSize=36;
    e.textFontFamily=UITextFontFamily.BoldRound;
    e.backgroundOpacity=0.6;
    e.size.offset.x=screenWidth*0.322*0.96;
    e.position.offset.x=screenWidth*0.322*0.02;
    e.size.offset.y=screenHeight*0.5831*0.13;
    e.position.offset.y=screenHeight*0.322*0.02+i*screenHeight*0.5831*0.15;
    e.visible=1;
    ca.push(e);
    e.events.on("pointerdown",()=>{
        if(pc==i){
            f.findChildByName('3').findChildByName('t').findChildByName('t').textContent=' ';
            e.backgroundOpacity=0.6;
            pc=-1;
        }else{
            f.findChildByName('3').findChildByName('t').findChildByName('t').textContent=cc[i].content;
            e.backgroundOpacity=0.8;
            if(pc!=-1){
                ca[pc].backgroundOpacity=0.6;
            }
            pc=i;
        }
    });
}

