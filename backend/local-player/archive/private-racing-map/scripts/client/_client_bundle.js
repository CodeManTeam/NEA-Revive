globalThis.main = UiScreen.getAllScreen().find((_screen) => _screen.name == "main");
const uc_ = UiBox.create();
uc_.parent = main;
uc_.name = "uc";
uc_.backgroundOpacity = 0;
uc_.zIndex = 0;
uc_.pointerEventBehavior = PointerEventBehavior.DISABLE;
uc_.anchor.copy(Vec2.create({ x: 0.5, y: 1 }));
const uiScale = UiScale.create();

// const bs=ui.findChildByName('饱食度');
// bs.visible=1;
// const size__1=0.9,size__2=0.95;
// bs.size.offset.y=37.5*size__1;
// bs.size.offset.x=300*size__2;

remoteChannel.events.on('client', async (args) => {
    const _x = Math.floor(screenWidth / 240);
    const _y = Math.floor(screenHeight / 210);
    const a = Math.min(_x, _y);
    uiScale.scale = a * 0.4 - (a * 0.4 - 1.2) * 0.18;
    uc_.size.offset.x = screenWidth;
    uc_.size.offset.y = screenHeight;
    uc_.position.offset.x = screenWidth / 2;
    uc_.position.offset.y = screenHeight + screenHeight * (uiScale.scale);
    // bs.position.offset.x = screenWidth / 2 + 13;
    // bs.position.offset.y = screenHeight - 133;
    uc_.uiScale = uiScale;
    if (args[0] == 'client_things') {
        let background_name = 'background_thing_';
        let thing_name = 'thing_';
        let cnt=0;
        for (let i=0;i<10;i++){
            if (!uc_.findChildByName('je' + i)) {
                let je = UiImage.create();
                je.name = 'je' + i;
                je.position.offset.y = screenHeight - 86 - (Math.floor(i / 10) * 18) - screenHeight;
                je.position.offset.x = screenWidth/2 + 10 + i*18;
                je.size.offset.x = args[4][1][0];
                je.size.offset.y = args[4][1][1];
                je.image = 'picture/je.png';
                je.backgroundOpacity = 0;
                je.parent = uc_;
                je.zIndex=(5-Math.floor(i / 10))*2;
                je.visible=1;
            }
        }
        for (let i = args[12] - 1; i >= 0; i--) {
            if (!uc_.findChildByName(background_name + i)) {
                let thing_background = UiImage.create();
                thing_background.name = background_name + i;
                thing_background.position.offset.y = screenHeight - 86 - (Math.floor(i / 10) * 18) - screenHeight;
                thing_background.position.offset.x = screenWidth / 2 + 150 - args[4][0][0] + i % args[3] * (args[4][1][0] + args[4][2][0]);
                thing_background.size.offset.x = args[4][1][0];
                thing_background.size.offset.y = args[4][1][1];
                thing_background.image = 'picture/' + args[5]['back_grounds'][args[7]];
                thing_background.backgroundOpacity = 0;
                thing_background.parent = uc_;
                thing_background.zIndex=(5-Math.floor(i / 10))*2;
                thing_background.visible=1;
            }
            else {
                let thing_background = uc_.findChildByName(background_name + i);
                thing_background.position.offset.y = screenHeight - 86 - (Math.floor(i / 10) * 18) - screenHeight;
                thing_background.position.offset.x = screenWidth / 2 + 150 - args[4][0][0] + i % args[3] * (args[4][1][0] + args[4][2][0]);
                if (i == args[6][0]) {
                    thing_background.position.offset.y -= args[6][1];
                }
                else {
                    if (args[8].length > i) {
                        thing_background.position.offset.y += args[8][i];
                    }
                }
                thing_background.size.offset.x = args[4][1][0];
                thing_background.size.offset.y = args[4][1][1];
                thing_background.image = 'picture/' + args[5]['back_grounds'][args[7]];
                thing_background.zIndex=(5-Math.floor(i / 10))*2;
                thing_background.visible=1;
            }
            if (!uc_.findChildByName(thing_name + i)) {
                let thing = UiImage.create();
                thing.name = thing_name + i;
                thing.position.offset.y = screenHeight - 86 - (Math.floor(i / 10) * 18) - screenHeight;
                thing.position.offset.x = screenWidth / 2 + 150 - args[4][0][0] + i % args[3] * (args[4][1][0] + args[4][2][0]);
                thing.size.offset.x = args[4][1][0];
                thing.size.offset.y = args[4][1][1];
                if (i < args[1] / 2) {
                    thing.visible = true;
                    if (i > args[1] / 2 - 1) {
                        thing.image = 'picture/' + args[5]['things']['half'];
                    }
                    else {
                        thing.image = 'picture/' + args[5]['things']['full'];
                    }
                    ;
                }
                else {
                    thing.visible = false;
                }
                ;
                thing.backgroundOpacity = 0;
                thing.parent = uc_;
                thing.zIndex=(5-Math.floor(i / 10))*2+1;
            }
            else {
                let thing = uc_.findChildByName(thing_name + i);
                thing.position.offset.y = screenHeight - 86 - (Math.floor(i / 10) * 18) - screenHeight;
                thing.position.offset.x = screenWidth / 2 + 150 - args[4][0][0] + i % args[3] * (args[4][1][0] + args[4][2][0]);
                if (i == args[6][0]) {
                    thing.position.offset.y -= args[6][1];
                }
                else {
                    if (args[8].length > i) {
                        thing.position.offset.y += args[8][i];
                    }
                    ;
                }
                ;
                thing.size.offset.x = args[4][1][0];
                thing.size.offset.y = args[4][1][1];
                thing.zIndex=(5-Math.floor(i / 10))*2+1;
                if (i < args[1] / 2) {
                    thing.visible = true;
                    if (i > args[1] / 2 - 1) {
                        if (args[1] >= args[9]) {
                            thing.image = 'picture/' + args[5]['things']['half'];
                        }
                        else {
                            thing.image = 'picture/' + [args[5]['things']['half'], args[5]['things']['half_left_blink']][args[7]];
                        }
                    }
                    else {
                        thing.image = 'picture/' + args[5]['things']['full'];
                    }
                }
                else {
                    if (i < args[9] / 2) {
                        if (i > args[9] / 2 - 1) {
                            thing.image = 'picture/' + args[5]['things']['half_blink'];
                        }
                        else {
                            thing.image = 'picture/' + args[5]['things']['full_blink'];
                        }
                        thing.visible = [false, true][args[7]];
                    }
                    else {
                        thing.visible = false;
                    }
                    ;
                }
                ;
            }
            ;
        }
        for(let i=args[12];i<40;i++){
            if(uc_.findChildByName(background_name + i)){
                uc_.findChildByName(background_name + i).visible=0;
            }
        }
        for(let i=args[12]-cnt;i<args[12]+args[10]-cnt;i++){
            if (!uc_.findChildByName('gh' + i)) {
                let thing_background = UiImage.create();
                thing_background.name = 'gh' + i;
                thing_background.position.offset.y = screenHeight - 86 - (Math.floor(i / 10) * 18) - screenHeight;
                thing_background.position.offset.x = screenWidth / 2 + 150 - args[4][0][0] + i % args[3] * (args[4][1][0] + args[4][2][0]);
                thing_background.size.offset.x = args[4][1][0];
                thing_background.size.offset.y = args[4][1][1];
                thing_background.image = (args[5]['back_grounds'][args[7]][0]!='c'?'picture/gold_':'picture/') + args[5]['back_grounds'][args[7]];
                thing_background.backgroundOpacity = 0;
                thing_background.parent = uc_;
                thing_background.zIndex=0;
            }else{
                let thing_background=uc_.findChildByName('gh' + i);
                thing_background.name = 'gh' + i;
                thing_background.position.offset.y = screenHeight - 86 - (Math.floor(i / 10) * 18) - screenHeight;
                thing_background.position.offset.x = screenWidth / 2 + 150 - args[4][0][0] + i % args[3] * (args[4][1][0] + args[4][2][0]);
                thing_background.size.offset.x = args[4][1][0];
                thing_background.size.offset.y = args[4][1][1];
                thing_background.image = (args[5]['back_grounds'][args[7]][0]!='c'?'picture/gold_':'picture/') + args[5]['back_grounds'][args[7]];
                thing_background.backgroundOpacity = 0;
                thing_background.parent = uc_;
                thing_background.zIndex=0;
            }
            let thing = uc_.findChildByName('gh' + i);
            let ind=i-args[12]+1;
            if (ind*2 <= args[11]+1) {
                thing.visible = true;
                if (ind*2 == args[11]+1) {
                    thing.image = 'picture/gold_' + args[5]['things']['half'];
                }else{
                    thing.image = 'picture/gold_' + args[5]['things']['full'];
                }
                ;
            }
            else {
                thing.visible = false;
            }
            ;
            thing.backgroundOpacity = 0;
            thing.parent = uc_;
        }
        for(let i=args[12];i<40;i++){
            if(uc_.findChildByName('background_thing_' + i)){
                uc_.findChildByName('background_thing_' + i).visible=0;
            }
            if(uc_.findChildByName('thing_' + i)){
                uc_.findChildByName('thing_' + i).visible=0;
            }
        }
        ;
    }
    ;
});


const Ease = {
    linear: (r) => r,
    sine: (r) => Math.sin(r * Math.PI / 2),
    easeInOut: (r) => 6 * r ** 5 - 15 * r ** 4 + 10 * r ** 3,
    easeIn: (r) => Math.sqrt(r),
    easeOut: (r) => r ** 3,
    easeLate: (r) => 1 - Math.sqrt(1 - Math.sqrt(r)),
};
/**
 * 动画运动类
 * 管理对象的动画过渡效果
 * @template T 动画对象类型
 */
class Motion {
    obj;
    duration;
    from;
    to;
    ease;
    id;
    rate;
    vars;
    resolve;
    wait;
    constructor(obj, duration, from, to, ease) {
        this.obj = obj;
        this.duration = duration;
        this.from = from;
        this.to = to;
        this.ease = ease;
        this.id = Symbol();
        this.rate = 0;
        this.vars = [];
        this.wait = new Promise(resolve => this.resolve = resolve);
        for (const key in this.from) {
            if (typeof this.from[key] !== typeof this.to[key]) {
                continue;
            }
            if (typeof this.to[key] !== "number") {
                continue;
            }
            this.vars.push(key);
        }
    }
    update(dt) {
        this.rate += dt;
        const rate = this.rate / this.duration;
        if (rate >= 1) {
            Motion.remove(this.id);
            this.resolve?.();
            for (const key in this.to) {
                this.obj[key] = this.to[key];
            }
            return;
        }
        for (const key of this.vars) {
            const from = this.from[key];
            const delta = (this.to[key] - from) * this.ease(rate);
            this.obj[key] = from + delta;
        }
    }
    resume() {
        Motion.add(this, this.id);
    }
    pause() {
        Motion.remove(this.id);
    }
    static motions = new Map();
    static add(m, id) {
        this.motions.set(id, m);
    }
    static remove(id) {
        this.motions.delete(id);
    }
    static fromTo(obj, duration, from, to, ease = Ease.linear) {
        const m = new Motion(obj, duration, from, to, ease);
        Motion.add(m, m.id);
        return m;
    }
    static update(dt) {
        for (const [id, m] of this.motions) {
            m.update(dt);
        }
    }
}
;
(function () {
    setInterval(() => {
        Motion.update(4);
    }, 4);
})();


const bag_ui_main = UiScreen.getAllScreen().find((_screen) => _screen.name == "main");

const equipments = (/* unused pure expression or super */ null && (["helmet", "chestplate", "leggings", "boots"]));
const inventory = bag_ui_main.findChildByName("Inventory");
const cover = bag_ui_main.findChildByName("cover");
const hotbar = bag_ui_main.findChildByName("Hotbar");
const uc = bag_ui_main.findChildByName("uc");
const more = hotbar.findChildByName("more");
const hotbar_select = hotbar.findChildByName("hotbar_select");
const _divide_num = UiText.create();
hotbar.parent = uc;
hotbar.findChildByName('more').events.on("pointerdown", () => {
    remoteChannel.sendServerEvent({
        type:'e',
    });
});
const unit = UiImage.create();
const unit_num = UiText.create();
const bag = new Array(46).fill(0);
const bag_follow = {
    hotbar: new Array(10).fill(0),
};
const chose = {
    index: -1,
    id: null,
    double: false,
};
remoteChannel.events.on('client', async (args) => {//UI端收到命令
    if(args.type=='watchshow'){
        ui.findChildByName('event').visible=0;
        ui.findChildByName('e').visible=0;
        hotbar.visible=0;
        uc_.visible=0;
        ui.findChildByName('set').visible=1;
        ui.findChildByName('打分').visible=1;
        ui.findChildByName('表演停止').visible=1;
        ui.findChildByName('下一项节目').visible=1;
        ui.findChildByName('播放旁白').visible=1;
        ui.findChildByName('隐藏右侧UI').visible=1;
    }
    if(args.type=='able'){
        hotbar.visible=1;
        uc_.visible=1;
        ui.findChildByName('event').visible=1;
        ui.findChildByName('e').visible=1;
        ui.findChildByName('set').visible=0;
        ui.findChildByName('打分').visible=0;
        ui.findChildByName('表演停止').visible=0;
        ui.findChildByName('下一项节目').visible=0;
        ui.findChildByName('播放旁白').visible=0;
        ui.findChildByName('隐藏右侧UI').visible=0;
    }
});
globalThis.onshift=0;
(async function () {
    inventory.pointerEventBehavior = PointerEventBehavior.BLOCK_PASS_THROUGH;
    unit.anchor.copy(Vec2.create({ x: 0.5, y: 0.5 }));
    unit.size.offset.x = unit.size.offset.y = 33;
    unit_num.anchor.copy(Vec2.create({ x: 1, y: 1 }));
    unit_num.size.offset.x = 31, unit_num.size.offset.y = 7;
    unit_num.textColor.copy(Vec3.create({ r: 255, g: 255, b: 255 }));
    unit_num.textContent = "num";
    unit_num.textFontSize = 14;
    unit_num.textXAlignment = "Right";
    unit_num.textStrokeThickness = 1;
    unit_num.textStrokeColor.copy(Vec3.create({ r: 0, g: 0, b: 0 }));
    unit_num.textStrokeOpacity = 1;
    unit_num.textFontFamily = UITextFontFamily.CodeNewRomanBold;
    _divide_num.parent = inventory;
    _divide_num.zIndex = 14;
    _divide_num.textContent = `${0}`;
    _divide_num.anchor.copy(Vec2.create({ x: 0.5, y: 0.5 }));
    _divide_num.size.offset.x = 20, _divide_num.size.offset.y = 20;
    _divide_num.textColor.copy(Vec3.create({ r: 250, g: 250, b: 250 }));
    _divide_num.textContent = "";
    _divide_num.textFontSize = 12;
    _divide_num.textXAlignment = "Center";
    _divide_num.textStrokeThickness = 1;
    _divide_num.textStrokeColor.copy(Vec3.create({ r: 0, g: 0, b: 0 }));
    _divide_num.textStrokeOpacity = 1;
    unit_num.textFontFamily = UITextFontFamily.CodeNewRomanBold;
    _divide_num.visible = false;
    for (let i = 0; i < 56; i++) {
        bag[i] = unit.clone();
        bag[i].num = unit_num.clone();
        bag[i].parent = inventory;
        bag[i].num.parent = bag[i];
        bag[i].zIndex = 12;
        bag[i].num.zIndex = 13;
        bag[i].num.position.offset.x = bag[i].num.position.offset.y = 32;
        bag[i].num.textContent = "";
        if (i < 9) {
            bag[i].position.offset.x = 32 + (i % 9) * 36;
            bag[i].position.offset.y = 300;
        }
        else if (i >= 9 && i < 36) {
            bag[i].position.offset.x = 32 + (i % 9) * 36;
            bag[i].position.offset.y = 292 - Math.floor(i / 9) * 36;
        }
        else if (i >= 36 && i < 40) {
            bag[i].position.offset.x = 32;
            bag[i].position.offset.y = 140 - (i - 36) * 36;
        }
        else if (i >= 40 && i < 44) {
            bag[i].position.offset.x = 212 + Math.floor((i - 40) % 2) * 36;
            bag[i].position.offset.y = 52 + Math.floor((i - 40) / 2) * 36;
        }
        else if (i == 44) {
            bag[i].position.offset.x = 170;
            bag[i].position.offset.y = 140;
        }
        else if (i == 45) {
            bag[i].position.offset.x = 324;
            bag[i].position.offset.y = 72;
        }
        else if (i >= 46 && i < 55) {
            bag[i].position.offset.x = 76 + Math.floor((i - 46) % 3) * 36;
            bag[i].position.offset.y = 50 + Math.floor((i - 46) / 3) * 36;
        }
        else if (i == 55) {
            bag[i].position.offset.x = 264;
            bag[i].position.offset.y = 86;
            bag[i].size.offset.x = bag[i].size.offset.y = 50;
        }
        bag[i].imageOpacity = 1;
        bag[i].backgroundOpacity = 0;
        bag[i].image = 'picture/none.png';
        bag[i].imageDisplayMode = ImageDisplayMode.Contain;
        bag[i].index = i;
        const _this = bag[i];
        _this.events.on("pointerup", async () => {
            if (chose.double) {
                chose.double = false;
                _divide_num.textContent = "";
                _divide_num.visible = false;
                remoteChannel.sendServerEvent({ type: "bag::over_divide" });
                return;
            }
            else if (chose.index == -1) {
                if(onshift){
                    let ind=-1;
                    let a=[27,28,29,30,31,32,33,34,35,18,19,20,21,22,23,24,25,26,9,10,11,12,13,14,15,16,17,8,7,6,5,4,3,2,1,0];
                    for(let j=0;j<a.length;j++){
                        if(bag[a[j]].image=='picture/none.png'){
                            ind=a[j];
                            break;
                        }
                    }
                    if(a.indexOf(_this.index)<a.indexOf(ind)||a.indexOf(_this.index)<27){
                        for(let j=a.length-1;j>=0;j--){
                            if(bag[a[j]].image=='picture/none.png'){
                                ind=a[j];
                                break;
                            }
                        }
                    }
                    if(ind==-1)return;
                    remoteChannel.sendServerEvent({ type: "bag_exchange", index: { a: _this.index, b: ind } });
                    return;
                }
                _this.backgroundOpacity = 0.5;
                chose.index = _this.index;
                chose.double = false;
                return;
            }
            else {
                if (chose.index == _this.index) {
                    if (!chose.double) {
                        chose.double = true;
                    }
                    else {
                        chose.double = false;
                        chose.index = 0;
                        return;
                    }
                    ;
                    let _count = 0;
                    while (chose.double) {
                        _count++;
                        Motion.fromTo(_this, 500, {
                            backgroundOpacity: _this.backgroundOpacity
                        }, {
                            backgroundOpacity: (0.5 - (_count % 2) / 2)
                        }, Ease.easeInOut).wait;
                        await sleep(500);
                    }
                    ;
                    _this.backgroundOpacity = 0;
                    _divide_num.textContent = "";
                    _divide_num.visible = false;
                    chose.index = -1;
                }
                else {
                    remoteChannel.sendServerEvent({ type: "bag_exchange", index: { a: chose.index, b: _this.index } });
                }
                ;
            }
            ;
        });
        _this.events.on("pointerdown", async () => {
            if (chose.double) {
                remoteChannel.sendServerEvent({ type: "bag::divide", index: { a: chose.index, b: _this.index } });
                return;
            }
            ;
        });
    }
    // for (let i = 0; i < 56; i++) {
    //     bag[i].position.offset.y += 9;
    // }
    ;
    for (let i = 0; i < 9; i++) {
        bag_follow.hotbar[i] = unit.clone();
        bag_follow.hotbar[i].num = unit_num.clone();
        bag_follow.hotbar[i].parent = hotbar;
        bag_follow.hotbar[i].num.parent = bag_follow.hotbar[i];
        bag_follow.hotbar[i].zIndex = 15;
        bag_follow.hotbar[i].num.zIndex = 11;
        bag_follow.hotbar[i].num.position.offset.x = 30, bag_follow.hotbar[i].num.position.offset.y = 34;
        bag_follow.hotbar[i].num.textFontSize = 12;
        bag_follow.hotbar[i].num.textContent = "";
        bag_follow.hotbar[i].position.offset.x = 23 + (i % 9) * 40;
        bag_follow.hotbar[i].position.offset.y = 22;
        bag_follow.hotbar[i].imageOpacity = 0.8;
        bag_follow.hotbar[i].backgroundOpacity = 0;
        bag_follow.hotbar[i].image = 'picture/none.png';
        bag_follow.hotbar[i].imageDisplayMode = ImageDisplayMode.Contain;
        bag_follow.hotbar[i].index = i;
        bag_follow.hotbar[i].events.on("pointerup", async () => {
            remoteChannel.sendServerEvent({ type: "ck", num: i });
        });
    }
    ;
})();

more.events.on("pointerup", async () => {
    remoteChannel.sendServerEvent("bag");
});
const openbag = function (_bag) {
    inventory.image = "picture/Inventory.jpg";
    inventory.visible = cover.visible = true;
    cover.pointerEventBehavior = PointerEventBehavior.ENABLE;
    const _x = Math.floor(screenWidth / 240);
    const _y = Math.floor(screenHeight / 210);
    const a = Math.min(_x, _y);
    uiScale.scale = a * 0.4 - (a * 0.4 - 1.2) * 0.18;
    inventory.uiScale = uiScale;
    for (let i = 0; i < 36; i++) {
        bag[i].image = Image_Data[_bag.slots[i].id];
        bag[i].num.textContent = `${_bag.slots[i].num == 1 ? "" : _bag.slots[i].num}`;
    }
    for (let i = 36; i < 40; i++) {
        bag[(75 - i)].image = Image_Data[Object.values(_bag.equipment.slots)[(i - 36)]?.id || 0];
        bag[(75 - i)].visible = true;
    }
    for (let i = 0; i < 9; i++) {
        bag_follow.hotbar[i].image = Image_Data[_bag.slots[i].id];
        bag_follow.hotbar[i].num.textContent = `${_bag.slots[i].num == 1 ? "" : _bag.slots[i].num}`;
    }
    for (let i = 40; i <= 45; i++) {
        bag[i].visible = true;
    }
    for (let i = 46; i <= 55; i++) {
        bag[i].visible = false;
        bag[i].image = Image_Data[0];
        bag[i].num.textContent = "";
        remoteChannel.sendServerEvent("clear_craftings");
    }
    input.unlockPointer();
    return;
};
const closebag = function () {
    inventory.visible = cover.visible = false;
    input.lockPointer();
    bag[chose.index].backgroundOpacity = 0;
    chose.index = -1;
    return;
};
const updatebag = function (_bag) {
    for (let i = 0; i < 36; i++) {
        bag[i].image = Image_Data[_bag.slots[i].id];
        bag[i].num.textContent = `${_bag.slots[i].num == 1 ? "" : _bag.slots[i].num}`;
    }
    ;
    for (let i = 36; i < 40; i++) {
        bag[(75 - i)].image = Image_Data[Object.values(_bag.equipment.slots)[(i - 36)]?.id || 0];
    }
    ;
    for (let i = 40; i < 44; i++) {
        bag[i].image = Image_Data[_bag.craft[(i - 40)]?.id || 0];
        bag[i].num.textContent = `${_bag.craft[(i - 40)]?.num == 1 ? "" : _bag.craft[(i - 40)]?.num}`;
    }
    ;
    bag[45].image = Image_Data[_bag.craft[45]?.id || 0];
    bag[45].num.textContent = `${_bag.craft[45].num == 1 ? "" : _bag.craft[45].num}`;
    for (let i = 0; i < 9; i++) {
        bag_follow.hotbar[i].image = Image_Data[_bag.slots[i].id];
        bag_follow.hotbar[i].num.textContent = `${_bag.slots[i].num == 1 ? "" : _bag.slots[i].num}`;
    }
    ;
    for (let i = 40; i <= 45; i++) {
        bag[i].visible = true;
    }
    ;
    for (let i = 46; i <= 55; i++) {
        bag[i].visible = false;
    }
    ;
    return;
};
const updatehotbar = function (_bag) {
    for (let i = 0; i < 9; i++) {
        bag_follow.hotbar[i].image = Image_Data[_bag.slots[i].id];
        bag_follow.hotbar[i].num.textContent = `${_bag.slots[i].num == 1 ? "" : _bag.slots[i].num}`;
    }
    ;
    return;
};
const updatehotbar_select = function (_selection) {
    hotbar_select.position.offset.x = 40 * _selection;
    return;
};
const updatecrafting = function (id, num) {
    bag[45].image = Image_Data[id];
    bag[45].num.textContent = `${num == 1 ? "" : num}`;
    bag[45].visible = true;
    return;
};
const divide_num = function (index, num) {
    _divide_num.visible = true;
    _divide_num.textContent = `${num}`;
    _divide_num.position.offset.x = bag[index].position.offset.x + 0.5;
    _divide_num.position.offset.y = bag[index].position.offset.y - 9;
    return;
};
const change_crafting_table = function (_bag) {
    inventory.image = "picture/Crafting_Table_GUI_Simplified.png";
    cover.pointerEventBehavior = PointerEventBehavior.ENABLE;
    const _x = Math.floor(screenWidth / 240);
    const _y = Math.floor(screenHeight / 210);
    const a = Math.min(_x, _y);
    uiScale.scale = a * 0.4 - (a * 0.4 - 1.2) * 0.18;
    inventory.uiScale = uiScale;
    for (let i = 0; i < 36; i++) {
        bag[i].image = Image_Data[_bag.slots[i].id];
        bag[i].num.textContent = `${_bag.slots[i].num == 1 ? "" : _bag.slots[i].num}`;
    }
    ;
    for (let i = 36; i < 40; i++) {
        bag[(75 - i)].visible = false;
    }
    ;
    for (let i = 40; i <= 45; i++) {
        bag[i].visible = false;
    }
    ;
    for (let i = 46; i <= 55; i++) {
        bag[i].visible = true;
    }
    ;
    inventory.visible = cover.visible = true;
    input.unlockPointer();
    return;
};
const update_crafting_table = function (_craftings, _bag) {
    for (let i = 0; i < 9; i++) {
        if (_craftings[i].index == -1) {
            bag[i + 46].image = Image_Data[0];
            bag[i + 46].num.textContent = ``;
        }
        else {
            bag[i + 46].image = Image_Data[_bag.slots[_craftings[i].index].id];
            bag[i + 46].num.textContent = `${_craftings[i].num}`;
            if (_bag.slots[_craftings[i].index].num - _craftings[i].num == 0) {
                bag[_craftings[i].index].image = Image_Data[0];
                bag[_craftings[i].index].num.textContent = ``;
            }
            else {
                bag[_craftings[i].index].num.textContent = _bag.slots[_craftings[i].index].num - _craftings[i].num == 1 ? "" : `${_bag.slots[_craftings[i].index].num - _craftings[i].num}`;
            }
            ;
        }
        ;
    }
    ;
    return;
};
const exchangebag = function (index) {
    bag[index.a].backgroundOpacity = 0;
    const last = bag[index.a].image;
    const last_num = bag[index.a].num.textContent;
    if (index.a < 9 && index.b >= 9) {
        bag_follow.hotbar[index.a].image = bag[index.b].image;
        bag_follow.hotbar[index.a].num.textContent = bag[index.b].num.textContent;
    }
    else if (index.b < 9 && index.a >= 9) {
        bag_follow.hotbar[index.b].image = bag[index.a].image;
        bag_follow.hotbar[index.b].num.textContent = bag[index.a].num.textContent;
    }
    else if (index.b < 9 && index.a < 9) {
        bag_follow.hotbar[index.a].image = bag[index.b].image;
        bag_follow.hotbar[index.a].num.textContent = bag[index.b].num.textContent;
        bag_follow.hotbar[index.b].image = bag[index.a].image;
        bag_follow.hotbar[index.b].num.textContent = bag[index.a].num.textContent;
    }
    ;
    bag[index.a].image = bag[index.b].image;
    bag[index.b].image = last;
    bag[index.a].num.textContent = bag[index.b].num.textContent;
    bag[index.b].num.textContent = last_num;
    chose.index = -1;
    return;
};
const remove = function(index){
    if (index < 9) {
        bag_follow.hotbar[index].image = 'picture/none.png';
        bag_follow.hotbar[index].num.textContent = '';
    }
    bag[index].image = 'picture/none.png';
    bag[index].num.textContent = '';
    bag[index].backgroundOpacity = 0;
    remoteChannel.sendServerEvent({
        type:'remove',value:index
    });
    chose.index = -1;
}
ui.findChildByName('lock').events.on("pointerdown", async () => {
    if(inventory.visible){
        remove(chose.index);
    }
});
cover.events.on("pointerdown", async () => {
    if(inventory.visible){
        remove(chose.index);
    }
});
remoteChannel.events.on("client", events => {
    if (events.type == "open_bag") {
        openbag(events.args.bag);
    }
    else if (events.type == "update_bag") {
        updatebag(events.args.bag);
    }
    else if (events.type == "close") {
        closebag();
    }
    else if (events.type == "exchange_bag") {
        exchangebag(events.args.index);
    }
    else if (events.type == "update_hotbar") {
        updatehotbar(events.args.bag);
    }
    else if (events.type == "updatehotbar_select") {
        updatehotbar_select(events.args._selection);
    }
    else if (events.type == "update_crafting") {
        updatecrafting(events.args.id, events.args.num);
    }
    else if (events.type == "bag::divide_num") {
        divide_num(events.args.index, events.args.num);
    }
    else if (events.type == "change_crafting_table") {
        change_crafting_table(events.args._bag);
    }
    else if (events.type == "update_crafting_table") {
        update_crafting_table(events.args._craftings, events.args._bag);
    }
    else if(events.type == 'shifton'){
        onshift=true;
    }
    else if(events.type == 'shiftdown'){
        onshift=false;
    }
    else if(events.type == 'q'){
        remove(chose.index);
    }
    ;
});

let isLocked = false;
input.pointerLockEvents.on("pointerlockchange", event => {
    isLocked = event.isLocked;
});

export { isLocked };
