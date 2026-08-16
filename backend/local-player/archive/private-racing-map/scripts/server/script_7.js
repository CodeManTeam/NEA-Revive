




globalThis.sendGJD=async function(entity){
    if(entity.sp)return;
    entity.sp=1;
    const d = await selectDialog('马上就要宵禁了，uns将施展法力，抵抗吉吉的宵禁。', 'uns温馨提示', ['支持uns！'], entity);
    if(d){
        entity.player.link('https://goboxgame.com/play/d16fda33511732ea7cd4?teamId=&refererServerId=5232677',{isNewTab:false,isConfirm:false});
    }
};
world.querySelectorAll('player').forEach((e)=>{
    sendGJD(e);
});

world.querySelectorAll('player').forEach((e)=>{
    const d = await selectDialog('这里如果发不了消息请点击下方链接登录，然后再次进入即可发消息了','正在与吉吉大战的uns',['进入'],e);
    if(d){
        entity.player.link('https://goboxgame.com');
    }
});

/*


SS级（深紫名）
（起床大蛇，超级大蛇，RichMaster，大神之神，SVIP++）（玩家名）的专属称号，无敌战神，无敌战神+，无敌战神++，起床概念神，无敌技术大师，RichMaster+，RichMaster++，大神之神之神神神神神，起床大蛇+，起床大蛇++，自定义称号（需管理员审核），InvincibleMaster，WD++
价值：41，41，41，43，47，50，52，55，52，48，42，45，55，42，45，60，58，52
S级（淡紫名）
起床大蛇，超级大蛇，RichMaster，大神之神，SVIP+，SVIP（玩家名）的专属称号，SVIP++
价值：36，36，36，40，38，40，42
A级（浅红名）
假·大神之神，大神，大蛇，Expert，起床小蛇（玩家名）的专属称号，CVIP+，CVIP++，SVIP
价值：30，28，26，28，30，28，32，35
B级（浅橙名）
起床高手，Elite，起床高手（玩家名）的专属称号，VIP++，CVIP
价值：20，20，25，20，25
C级（淡黄名）
（玩家名）的专属称号，牢玩家，VIP，VIP+
价值：15，10，10，15
D级（深灰名）
假·萌新，这是个称号，一个小萌新，V+
价值：5，5，5，5

C级称号盲盒
范围：5~15
中奖概率：25
奖项分布概率：75 25
价格：1

B级称号盲盒
范围：5~25
中奖概率：75
奖项分布概率：90 8 2
价格：5

A级称号盲盒
范围：10~35
中奖概率：100
奖项分布概率：0 40 40 20
价格：10

S级称号盲盒
范围：25~45
中奖概率：100
奖项分布概率：0 0 50 30 10 10
价格：20

SS级称号盲盒
范围：30~45
中奖概率：100
奖项分布概率：0 0 0 60 25 15
价格：30

SSS级称号盲盒
范围：40~60
中奖概率：100
奖项分布概率：0 0 0 0 60 40
价格：50

称号-等级分
冰与火之杯
冰桶挑战 5
16强 50
季军 150
亚军 180
冠军 200
周周极霸杯
参与奖 5
12强 50
季军 120
亚军 150
冠军 180
*/