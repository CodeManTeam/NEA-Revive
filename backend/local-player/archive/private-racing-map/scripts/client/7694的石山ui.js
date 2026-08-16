const main2 = UiScreen.getAllScreen().find((screen) => screen.name == "screen");
const main = UiScreen.getAllScreen().find((screen) => screen.name == "main");
const hotbar = main.findChildByName("hotbar")
const hotbar_index = hotbar.findChildByName("hotbar_index")
const exp = hotbar.findChildByName("exp")
const exp_Name = exp.findChildByName("Name")
const exp_index = exp.findChildByName("exp_index")
const random = main.findChildByName("exp")
const random_index = random.findChildByName("exp_index")
const random_txt = random.findChildByName("exp_txt")
const Items = hotbar.findChildByName("Items")
var itemP = Items.findChildByName("item")
var itemLd = hotbar.findChildByName("item")
const BagUIOpen = main.findChildByName("BagOpen")
const ESCUIOpen = main.findChildByName("OpenESC")
const DiuUIOpen = main.findChildByName("OpenDiu")
const ShiUIOpen = main.findChildByName("OpenShi")
const ShangUIOpen = main.findChildByName("OpenShang")
const LiaoUIOpen = main2.findChildByName("OpenLiao")
const DuiUIOpen = main.findChildByName("OpenDui")
const DiuUI = main.findChildByName("Diu")

const Ui = main2.findChildByName("UI")
const UiTxt = Ui.findChildByName("Txt")
const UiTxt2 = Ui.findChildByName("Txt2")
const UiTxt3 = Ui.findChildByName("Txt3")
UiTxt.textFontSize = screenHeight / 46.8
UiTxt2.textFontSize = screenHeight / 46.8
UiTxt3.textFontSize = screenHeight / 46.8
main2.visible = true;

var itemlist = [];
var allitem = [];
var index = 0;
var d = null;
var islock = true;
var isEnter = false;
var textlist = [];
//初始化
exp_Name.textFontSize = screenHeight / 35.1
main.visible = true;
itemP.findChildByName("Num").textFontSize = screenHeight / 50.14
itemLd.findChildByName("Num").textFontSize = screenHeight / 50.14

remoteChannel.events.on('client',(event) => {
    if (event.type === "RandomUpdate") {
        random.visible = event.is
        random_index.backgroundColor.copy(Vec3.create({r:event.r+50,g:event.g+50,b:event.b+50}))
        random.backgroundColor.copy(Vec3.create({r:event.r-50,g:event.g-50,b:event.b-50}))
        random_txt.textColor.copy(Vec3.create({r:event.r+50,g:event.g+50,b:event.b+50}))
        random_txt.textStrokeColor.copy(Vec3.create({r:event.r-50,g:event.g-50,b:event.b-50}))
        random_index.size.scale.x = 98 * (event.index % 100) * 0.01 * 0.01
        random_txt.textContent = event.txt
    }
})
itemlist.push(itemP)
//事件event
remoteChannel.events.on('client', (event) => {
    if (event.type === "chosse") {
        index = event.index
        UiTxt2.textContent = `物品:${textlist[0][index]}  耐久:${textlist[2][index][0]}/${!textlist[2][index][1]?"无":textlist[2][index][1]}\n数量:[${textlist[1][index]}]`
        hotbar_index.position.scale.x = event.index * 0.11
        remoteChannel.sendServerEvent({
            type: 'index_modify',
            index: (index),
        })
    }
    if (event.type === "BagUpdate") {
        textlist = [event.item, event.num , event.dur , event.en]
        UiTxt2.textContent = `物品:${textlist[0][index]}  耐久:${textlist[2][index][0]}/${!textlist[2][index][1]?"无":textlist[2][index][1]}\n数量:[${textlist[1][index]}]`
        for (let i in itemlist) {
            itemlist[i].image = `picture/${event.item[i]}.png`
            itemlist[i].findChildByName("Num").textContent = event.num[i] == "无" ? "" : event.num[(i).toString()] == 1 ? "" : event.num[i].toString()
            itemlist[i].findChildByName("SF").visible = !(typeof event.dur[(i).toString()] == 'string')
            itemlist[i].findChildByName("SF").visible = (event.dur[(i).toString()][0] >= 0)
            itemlist[i].findChildByName("SF").findChildByName("Sf").size.scale.x = typeof event.dur[(i).toString()] == 'string' ? 0 :event.dur[(i).toString()][0] / event.dur[(i).toString()][1]
            if((event.dur[(i).toString()][0] / event.dur[(i).toString()][1]) <= 0.25){
                ChangeColor(itemlist[i].findChildByName("SF").findChildByName("Sf"),255,0,0)
            }else if((event.dur[(i).toString()][0] / event.dur[(i).toString()][1]) <= 0.55){
                ChangeColor(itemlist[i].findChildByName("SF").findChildByName("Sf"),255,255,0)
            }else{
                ChangeColor(itemlist[i].findChildByName("SF").findChildByName("Sf"),0,255,0)
            }
            if(event.item[(i).toString()] != "无" &&event.en[(i).toString()] != "无" && event.en[(i).toString()][0] != null){
                itemlist[i].findChildByName("SL").visible = true;
            }else{
                itemlist[i].findChildByName("SL").visible = false;
            }
            itemlist[i].findChildByName("SF").visible = itemlist[i].findChildByName("SF").visible ? ((event.dur[(i).toString()][0] != event.dur[(i).toString()][1])) : false
        }
        itemlist[9].image = `picture/${event.item[41]}.png`
        itemlist[9].findChildByName("Num").textContent = event.num[41] == "无" ? "" : event.num[(41).toString()] == 1 ? "" : event.num[41].toString()
        itemlist[9].findChildByName("SF").visible = !(typeof event.dur[(41).toString()] == 'string')
        itemlist[9].findChildByName("SF").visible = (event.dur[(41).toString()][0] >= 0)
        itemlist[9].findChildByName("SF").findChildByName("Sf").size.scale.x = typeof event.dur[(41).toString()] == 'string' ? 0 :event.dur[(41).toString()][0] / event.dur[(41).toString()][1]
        if((event.dur[(41).toString()][0] / event.dur[(41).toString()][1]) <= 0.25){
            ChangeColor(itemlist[9].findChildByName("SF").findChildByName("Sf"),255,0,0)
        }else if((event.dur[(41).toString()][0] / event.dur[(41).toString()][1]) <= 0.55){
            ChangeColor(itemlist[9].findChildByName("SF").findChildByName("Sf"),255,255,0)
        }else{
            ChangeColor(itemlist[9].findChildByName("SF").findChildByName("Sf"),0,255,0)
        }
        if(event.item[9] != "无" &&event.en[9] != "无" && event.en[9][0] != null){
            itemlist[9].findChildByName("SL").visible = true;
        }else{
            itemlist[9].findChildByName("SL").visible = false;
        }
        itemlist[9].findChildByName("SF").visible = itemlist[9].findChildByName("SF").visible ? ((event.dur[(9).toString()][0] != event.dur[(9).toString()][1])) : false
    }
})
//初始化
for (let i = 1; i <= 8; i++) {
    var newitem = itemlist[i - 1].clone()
    newitem.position.scale.x += 0.11
    newitem.events.removeAll()
    AddItemSF(newitem)
    newitem.events.add("pointerup", async () => {
        index = i
        hotbar_index.position.scale.x = index * 0.11
        remoteChannel.sendServerEvent({
            type: 'index_modify',
            index: i,
        })
    })
    itemlist.push(newitem)
}
AddItemSF(itemP)
itemP.events.add("pointerup", async () => {
    hotbar_index.position.scale.x = 0 * 0.11
    remoteChannel.sendServerEvent({
        type: 'index_modify',
        index: 0,
    })
})
AddItemSF(itemLd)
itemLd.events.add("pointerup", async () => {
    hotbar_index.position.scale.x = 0 * 0.11
    remoteChannel.sendServerEvent({
        type: 'index_modify',
        index: 0,
    })
})
itemlist.push(itemLd)
class BagClient {
    constructor(BagNode, Items_bag, MainItem, bagEvent, OCEvent, oline = 0, otherItem = [],type = "null") {
        this.Bag = BagNode
        this.bagEvent = bagEvent
        this.ocEvent = OCEvent
        this.oline = oline
        this.Items_bag = Items_bag
        this.MainItem = MainItem
        this.BagType = type
        this.itemlist = [];
        this.textlist = [];
        this.otherItem = otherItem
        this.MainItem.findChildByName("Num").textFontSize = screenHeight / 50.14
        this.push(this.MainItem)
        AddItemSF(this.MainItem)
        for (let j = 1; j <= 4; j++) {
            for (let i = 1; i <= 8; i++) {
                var newitem2 = this.itemlist[(j - 1) * 9 + i - 1].clone()
                newitem2.position.scale.x += 0.115 - i * 0.00055
                newitem2.events.removeAll()
                AddItemSF(newitem2)
                this.setitem(newitem2, (j - 1) * 9 + i)
                this.push(newitem2)
            }
            if (j == 4) { break; }
            var newitem3 = this.itemlist[j * 9 - 1].clone()
            newitem3.position.scale.x = 0
            newitem3.position.scale.y -= j <= 1 ? 0.3 : 0.25 - j * 0.005
            newitem3.events.removeAll()
            AddItemSF(newitem3)
            this.setitem(newitem3, j * 9)
            this.push(newitem3)
        }
        this.Bag.findChildByName("bag").pointerEventBehavior = PointerEventBehavior.BLOCK_PASS_THROUGH;
        this.Bag.events.add("pointerup", async () => {
            if(d == null) {return;}
            remoteChannel.sendServerEvent({
                type: 'DiuUI',
                index:(d),
            });
            d = null
            for (let i in allitem) {
                allitem[i].backgroundOpacity = 0
            }
        })
        this.setitem(this.MainItem, 0)
        remoteChannel.events.on('client', async(event) => {
            if (event.type === this.bagEvent) {
                this.update(event)
            }
            if (event.type === this.ocEvent) {
                d = null
                for (let i in this.itemlist) {
                    this.itemlist[i].backgroundOpacity = 0
                }
                if (event.is&&islock) { input.unlockPointer();}
                if (!event.is&&!islock) { input.lockPointer();}
                this.Bag.visible = event.is;
                await sleep(10)
            }
        })
        
    }
    push(Node){
        this.itemlist.push(Node)
        allitem.push(Node);
    }
    addOtherItems(mainItem) {
        mainItem.findChildByName("Num").textFontSize = screenHeight / 50.14
        this.addOtherItem(mainItem,61,25)
        var items = []
        for(let i = 62 ; i <= 62+26 ; i ++) {
            items.push(i)
        }
        for (let j = 1; j <= 3; j++) {
            for (let i = 1; i <= 8; i++) {
                var newitem4 = this.itemlist[(j - 1) * 9 + i - 1 + 36].clone()
                newitem4.position.scale.x += 0.115 - i * 0.00055
                this.addOtherItem(newitem4,items[(j - 1) * 9 + i - 1],25)
            }
            if (j == 3) { break; }
            var newitem5 = this.itemlist[j * 9 - 1 + 36].clone()
            newitem5.position.scale.x = 0
            newitem5.position.scale.y -= j == 2? 0.364 : 0.4 - j * 0.06
            this.addOtherItem(newitem5,items[j * 9 -1],25)
        }
    }
    setitem(node, d_, oline = 0) {
        node.events.add("pointerup", async () => {
            /*for (let i in this.itemlist) {
                this.itemlist[i].backgroundColor.copy(Vec3.create({r:255,g:255,b:255}))
            }*/
            if (d == d_) {
                isEnter = true;
                this.itemlist[d_ - oline].backgroundColor.copy(Vec3.create({r:0,g:150,b:255}))
                d = d_;
            } else if(d != null && !isEnter){
                UiTxt.textContent = `未选择`
                remoteChannel.sendServerEvent({
                    type: 'move',
                    index: [d, d_],
                })
                for (let i in this.itemlist) {
                    this.itemlist[i].backgroundOpacity = 0
                }
                d = null;
            } else if(!isEnter){
                var newlist = []
                if(this.textlist[3][d_ - oline] != "无"){
                    for(var i of this.textlist[3][d_ - oline]){
                        newlist.push(`${i.name}[${i.lvl}]`)
                    }
                }
                UiTxt.textContent = `物品:${this.textlist[0][d_ - oline]}  耐久:${this.textlist[2][d_ - oline][0]}/${!this.textlist[2][d_ - oline][1]?"无":this.textlist[2][d_ - oline][1]}\n数量:[${this.textlist[1][d_ - oline]}]  附魔:[${newlist}]`
                this.itemlist[d_ - oline].backgroundOpacity = 0.7
                d = d_;
            }else{
                remoteChannel.sendServerEvent({
                    type: 'enter',
                    index: [d,d_],
                })
                for (let i in this.itemlist) {
                    this.itemlist[i].backgroundOpacity = 0
                }
                for (let i in this.itemlist) {
                    this.itemlist[i].backgroundColor.copy(Vec3.create({r:255,g:255,b:255}))
                }
                d = null;
                isEnter = false;
            }
        })
    }
    update(event) {
        for (let i in this.itemlist) {
            this.itemlist[i].image = `picture/${event.item[(i).toString()]}.png`
            this.itemlist[i].findChildByName("Num").textContent = event.num[(i).toString()] == "无" ? "" : event.num[(i).toString()] == 1 ? "" : event.num[(i).toString()].toString();
            this.itemlist[i].findChildByName("SF").visible = !(typeof event.dur[(i).toString()] == 'string')
            this.itemlist[i].findChildByName("SF").visible = (event.dur[(i).toString()][0] > 0)
            this.itemlist[i].findChildByName("SF").findChildByName("Sf").size.scale.x = typeof event.dur[(i).toString()] == 'string' ? 0 :event.dur[(i).toString()][0] / event.dur[(i).toString()][1]
            if((event.dur[(i).toString()][0] / event.dur[(i).toString()][1]) <= 0.25){
                ChangeColor(this.itemlist[i].findChildByName("SF").findChildByName("Sf"),255,0,0)
            }else if((event.dur[(i).toString()][0] / event.dur[(i).toString()][1]) <= 0.5){
                ChangeColor(this.itemlist[i].findChildByName("SF").findChildByName("Sf"),255,255,0)
            }else{
                ChangeColor(this.itemlist[i].findChildByName("SF").findChildByName("Sf"),0,255,0)
            }
            if(event.item[(i).toString()] != "无" &&event.en[(i).toString()] != "无" && event.en[(i).toString()][0] != null){
                this.itemlist[i].findChildByName("SL").visible = true;
            }else{
                this.itemlist[i].findChildByName("SL").visible = false;
            }
            this.itemlist[i].findChildByName("SF").visible = this.itemlist[i].findChildByName("SF").visible ? ((event.dur[(i).toString()][0] != event.dur[(i).toString()][1])) : false
        }
        //console.log(event.dur)
        this.textlist = [event.item, event.num, event.dur,event.en]
    }
    addOtherItem(Node, index, oline, funtion = "null") {
        AddItemSF(Node)
        if (funtion == "null") {
            this.setitem(Node, index, oline)
            this.push(Node)
        } else {
            console.log(Node.name)
            Node.events.add("pointerup", async () => {
                funtion(Node, index, oline);
            })
            this.push(Node)
        }
    }
}
input.pointerLockEvents.add("pointerlockchange", ({ isLocked }) => {
    islock = isLocked
});

function ChangeColor(Node,r,g,b){
    Node.backgroundColor.copy(Vec3.create({r:r,g:g,b:b}))    
}
function AddItemSF(Node){
    if(Node.findChildByName("SF") != null) {return;}
    var SF = UiBox.create()
    var Sf = UiBox.create()
    var SL = UiBox.create()
    SF.parent = Node
    SF.name = "SF"
    Sf.parent = SF
    Sf.name = "Sf"
    SL.parent = Node
    SL.name = "SL"
    SF.size.offset.x = 0
    SF.size.offset.y = 0
    Sf.size.offset.x = 0
    Sf.size.offset.y = 0
    SL.size.offset.x = 0
    SL.size.offset.y = 0
    SF.position.scale.y = 0.85
    SF.position.scale.x = 0.1
    SF.size.scale.x = 0.9
    SF.size.scale.y = 0.15
    Sf.size.scale.x = 1
    Sf.size.scale.y = 1
    SL.size.scale.x = 1
    SL.size.scale.y = 1
    SF.backgroundColor.copy(Vec3.create({r:0,g:0,b:0}))
    Sf.backgroundColor.copy(Vec3.create({r:0,g:255,b:0}))
    SL.backgroundColor.copy(Vec3.create({r:0,g:200,b:255}))
    SL.backgroundOpacity = 0.2
    SL.visible = false;
}
const BagClientL = new BagClient(main.findChildByName("Bag"),
    main.findChildByName("Bag").findChildByName("bag").findChildByName("Items"),
    main.findChildByName("Bag").findChildByName("bag").findChildByName("Items").findChildByName("item"),
    "BagsUpdate",
    "BagsOC",
    0,
)
const Bag = main.findChildByName("Bag")
const item = Bag.findChildByName("bag").findChildByName("item")
const item2 = Bag.findChildByName("bag").findChildByName("item2")
const item3 = Bag.findChildByName("bag").findChildByName("item3")
const item4 = Bag.findChildByName("bag").findChildByName("item4")
const item5 = Bag.findChildByName("bag").findChildByName("item5")
const item6 = Bag.findChildByName("bag").findChildByName("item6")
const item7 = Bag.findChildByName("bag").findChildByName("item7")
const item8 = Bag.findChildByName("bag").findChildByName("item8")
const item9 = Bag.findChildByName("bag").findChildByName("item9")
const item10 = Bag.findChildByName("bag").findChildByName("item10")
BagClientL.addOtherItem(item, 36,0)
BagClientL.addOtherItem(item2, 37,0)
BagClientL.addOtherItem(item3, 38,0)
BagClientL.addOtherItem(item4, 39,0)
BagClientL.addOtherItem(item5, 40,0, async (Node, index) => {
    if (item5.image == 'picture/无.png') { return; }
    remoteChannel.sendServerEvent({
        type: 'Craft_Done',
    })
})
BagClientL.addOtherItem(item6, 41,0)
BagClientL.addOtherItem(item7, 42,0)
BagClientL.addOtherItem(item8, 43,0)
BagClientL.addOtherItem(item9, 44,0)
BagClientL.addOtherItem(item10, 45,0)
const BagClientL2 = new BagClient(main.findChildByName("Make"),
    main.findChildByName("Make").findChildByName("bag").findChildByName("Items"),
    main.findChildByName("Make").findChildByName("bag").findChildByName("Items").findChildByName("item"),
    "MakeUpdate",
    "MakeOC",
    10
)
const Make = main.findChildByName("Make")
const item_ = Make.findChildByName("bag").findChildByName("item")
const item2_ = Make.findChildByName("bag").findChildByName("item2")
const item3_ = Make.findChildByName("bag").findChildByName("item3")
const item4_ = Make.findChildByName("bag").findChildByName("item4")
const item5_ = Make.findChildByName("bag").findChildByName("item5")
const item6_ = Make.findChildByName("bag").findChildByName("item6")
const item7_ = Make.findChildByName("bag").findChildByName("item7")
const item8_ = Make.findChildByName("bag").findChildByName("item8")
const item9_ = Make.findChildByName("bag").findChildByName("item9")
const item10_ = Make.findChildByName("bag").findChildByName("item10")
BagClientL2.addOtherItem(item_, 46, 10)
BagClientL2.addOtherItem(item2_, 47, 10)
BagClientL2.addOtherItem(item3_, 48, 10)
BagClientL2.addOtherItem(item4_, 49, 10)
BagClientL2.addOtherItem(item5_, 50, 10)
BagClientL2.addOtherItem(item6_, 51, 10)
BagClientL2.addOtherItem(item7_, 52, 10)
BagClientL2.addOtherItem(item8_, 53, 10)
BagClientL2.addOtherItem(item9_, 54, 10)
BagClientL2.addOtherItem(item10_, 55, 10, async (Node, index) => {
    if (item10_.image == 'picture/无.png') { return; }
    remoteChannel.sendServerEvent({
        type: 'BigCraft_Done',
    })
})
const BagClientL3 = new BagClient(main.findChildByName("SM"),
    main.findChildByName("SM").findChildByName("bag").findChildByName("Items"),
    main.findChildByName("SM").findChildByName("bag").findChildByName("Items").findChildByName("item"),
    "SMUpdate",
    "SMOC",
    20
)
const SM = main.findChildByName("SM")
const Tip = SM.findChildByName("bag").findChildByName("Tip").findChildByName("Tip")
const Tip2 = SM.findChildByName("bag").findChildByName("Tip2")
Tip.textFontSize = screenHeight / 46.8
const item__ = SM.findChildByName("bag").findChildByName("item")
const item2__= SM.findChildByName("bag").findChildByName("item2")
const item3__ = SM.findChildByName("bag").findChildByName("item3")
BagClientL3.addOtherItem(item__, 56,20)
BagClientL3.addOtherItem(item2__, 57,20)
BagClientL3.addOtherItem(item3__, 58, 20, async (Node, index) => {
    if (item3__.image == 'picture/无.png') { return; }
    remoteChannel.sendServerEvent({
        type: 'Sm_done',
    })
})
const BagClientL4 = new BagClient(main.findChildByName("Enchant"),
    main.findChildByName("Enchant").findChildByName("bag").findChildByName("Items"),
    main.findChildByName("Enchant").findChildByName("bag").findChildByName("Items").findChildByName("item"),
    "EnchantUpdate",
    "EnchantOC",
    23
)
const Enchant = main.findChildByName("Enchant")
const item_2 = Enchant.findChildByName("bag").findChildByName("item")
const item2_2= Enchant.findChildByName("bag").findChildByName("item2")
const txt_= Enchant.findChildByName("bag").findChildByName("Txt1")
const txt2_= Enchant.findChildByName("bag").findChildByName("Txt2")
const txt3_= Enchant.findChildByName("bag").findChildByName("Txt3")
txt_.textFontSize = screenHeight / 46.8
txt2_.textFontSize = screenHeight / 46.8
txt3_.textFontSize = screenHeight / 46.8
BagClientL4.addOtherItem(item_2, 59,23)
BagClientL4.addOtherItem(item2_2, 60,23)
txt_.events.add("pointerup", async () => {
    if (txt_.textContent != "附魔1") {
        remoteChannel.sendServerEvent({
            type: 'enchant_done',
            index: 0,
        })
    }
})
txt2_.events.add("pointerup", async () => {
    if (txt_.textContent != "附魔2") {
        remoteChannel.sendServerEvent({
            type: 'enchant_done',
            index: 1,
        })
    }
})
txt3_.events.add("pointerup", async () => {
    if (txt_.textContent != "附魔3") {
        remoteChannel.sendServerEvent({
            type: 'enchant_done',
            index: 2,
        })
    }
})
const BagClientL5 = new BagClient(main.findChildByName("Box"),
    main.findChildByName("Box").findChildByName("bag").findChildByName("Items"),
    main.findChildByName("Box").findChildByName("bag").findChildByName("Items").findChildByName("item"),
    "BoxUpdate",
    "BoxOC",
    25,
);//useful
const Box = main.findChildByName("Box")
BagClientL5.addOtherItems(Box.findChildByName("bag").findChildByName("Items2").findChildByName("item"))//useful


const BagClientL6 = new BagClient(main.findChildByName("IronDen"),
    main.findChildByName("IronDen").findChildByName("bag").findChildByName("Items"),
    main.findChildByName("IronDen").findChildByName("bag").findChildByName("Items").findChildByName("item"),
    "IronUpdate",
    "IronOC",
    52
)
const IronDen = main.findChildByName("IronDen")
const item_3 = IronDen.findChildByName("bag").findChildByName("item")
const item2_3= IronDen.findChildByName("bag").findChildByName("item2")
const item3_3= IronDen.findChildByName("bag").findChildByName("item3")
BagClientL6.addOtherItem(item_3, 88,52)
BagClientL6.addOtherItem(item2_3, 89,52)
BagClientL6.addOtherItem(item3_3, 90,52,async (Node, index) => {
    if (item3_3.image == 'picture/无.png') { return; }
    remoteChannel.sendServerEvent({
        type: 'Iron_done',
    })
})
const BagClientL7 = new BagClient(main.findChildByName("lian"),
    main.findChildByName("lian").findChildByName("bag").findChildByName("Items"),
    main.findChildByName("lian").findChildByName("bag").findChildByName("Items").findChildByName("item"),
    "lianUpdate",
    "lianOC",
    55
)
const lian = main.findChildByName("lian")
const item_4 = lian.findChildByName("bag").findChildByName("item")
const item2_4= lian.findChildByName("bag").findChildByName("item2")
const item3_4= lian.findChildByName("bag").findChildByName("item3")
const item4_4= lian.findChildByName("bag").findChildByName("item4")
const item5_4= lian.findChildByName("bag").findChildByName("item5")
BagClientL7.addOtherItem(item_4, 91,55)
BagClientL7.addOtherItem(item2_4, 92,55)
BagClientL7.addOtherItem(item3_4, 93,55)
BagClientL7.addOtherItem(item4_4, 94,55)
BagClientL7.addOtherItem(item5_4, 95,55)