import { ColorList } from "./cilentConfig.js";

var load = false;

const bagButton = ui.findChildByName('bagButton');
const cameraButton = ui.findChildByName('cameraButton');
const sideBar = ui.findChildByName('sidebar');

/**设置快捷栏选择框 */
const chooseCase = ui.findChildByName("choosecase");

var setChooseCase = function (pos) {
    chooseCase.position.offset.x = 40 * pos - 184;
};

/**设置快捷栏UI */
const quickItem = ui.findChildByName('quickItem');
var quickItemList = [];
var quickNumList = [];

var setSingleQI = function (index, image, number) {
    quickNumList[index].textFontSize = number == 1 ? 0 : 17;
    quickNumList[index].textContent = number.toString()
    quickItemList[index].imageOpacity = image == '' ? 0 : 1
    if (image != '') quickItemList[index].image = `picture/${image}.png`;
};

var setAllQI = function (playerInventory) {
    for (let i = 0; i < quickItemList.length; i++) {
        setSingleQI(i, playerInventory[i][0], playerInventory[i][1])
    }
};

/**聊天栏 */
const MSGLength = 20;
var messages = []
var msgColors = []
var showMsgNum = 0;
var ableScroll = false;

const scrollBox = ui.findChildByName('scrollBox');
const msgContent = scrollBox.findChildByName('msgContent');
const titleContent = scrollBox.findChildByName('titleContent');
var contentList = []
var titleList = []

/**聊天 */
var message = function (content, titleLength, titleColor) {
    const text = content.length > 43 ? [content.slice(0, 43), `   ${content.slice(43, Math.min(content.length, 86))}`] : [content]
    for (let i = 0; i < text.length; i++) {
        messages.unshift(text[i])
        msgColors.unshift(i == 0 ? [titleLength].concat(titleColor) : [0, 'White', 0])
    }
    showMsgNum += text.length;
    for (let i = 0; i < Math.min(messages.length, MSGLength); i++) {
        const vis = ableScroll || (!ableScroll && i < showMsgNum && i < 10)
        contentList[i].visible = vis;
        titleList[i].visible = vis;
        contentList[i].textContent = msgColors[i][0] > 0 ? `  ${' '.repeat(msgColors[i][2])}${messages[i].slice(msgColors[i][0])}` : messages[i];
        titleList[i].textContent = msgColors[i][0] > 0 ? messages[i].slice(0, msgColors[i][0]) : ''
        titleList[i].textColor.copy(titleList[i].textContent == '' ? Vec3.create(ColorList['White']) : Vec3.create(ColorList[msgColors[i][1]]))
    }
    setTimeout(() => {
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i] == text[0] && showMsgNum == i + 1) {
                if (ableScroll === undefined || !ableScroll) {
                    for (let j = 0; j < text.length; j++) {
                        if (i - j >= 10) continue;
                        contentList[i - j].visible = false;
                        titleList[i - j].visible = false;
                    };
                    messages = messages.slice(0, Math.max(showMsgNum, MSGLength));
                };
                showMsgNum -= text.length;
                break;
            }
        }
    }, 10000);
}

/**输入框 */
const inputBox = ui.findChildByName('inputBox');
inputBox.events.add('blur', () => {
    remoteChannel.sendServerEvent({ type: 'chat', args: { text: inputBox.textContent } });
    inputBox.textContent = '';
    inputBox.visible = false;
    input.lockPointer();
})

/**滚动框 */
input.pointerLockEvents.add("pointerlockchange", ({ isLocked }) => {
    if (isLocked) {
        ableScroll = false;
        scrollBox.scrollPosition.y = 200;
        scrollBox.size.offset.y = 400;
        for (let i = Math.min(messages.length, MSGLength) - 1; i >= 10; i--) {
            contentList[i].visible = false;
            titleList[i].visible = false;
        }
        for (let i = 10; i >= 0; i--) {
            if (showMsgNum < i + 1) {
                contentList[i].visible = false;
                titleList[i].visible = false;
            }
        }
    } else if (!isLocked) {
        if (messages.length > 10) {
            ableScroll = true;
            scrollBox.size.offset.y = 200;
            scrollBox.scrollPosition.y = 200;
        }
        for (let i = 0; i < Math.min(messages.length, MSGLength); i++) {
            contentList[i].visible = true;
            titleList[i].visible = true;
        }
    }
});

remoteChannel.events.on('client', event => {// 客户端监听
    if (!load && event.type !== 'draw') return;
    switch (event.type) {
        case 'draw':
            bagButton.visible = false;
            cameraButton.visible = false;
            sideBar.visible = false;

            /**快捷栏 */
            for (let i = 0; i < 9; i++) {
                let quickItem_ = quickItem.clone()
                quickItemList.push(quickItem_)
                quickItem_.position.offset.x += 40 * i
                quickNumList.push(quickItem_.findChildByName('quickNum'))
                quickItem_.findChildByName('quickNum').pointerEventBehavior = PointerEventBehavior.BLOCK_PASS_THROUGH
                quickItem_.findChildByName('quickNum').events.on('pointerdown', () => {
                    remoteChannel.sendServerEvent({ type: 'pressQIbyScreen', args: { index: quickNumList.indexOf(quickItem_.findChildByName('quickNum')) } });
                })
            };

            /**聊天栏 */
            for (let i = 0; i < MSGLength; i++) {
                let msg = msgContent.clone();
                let title = titleContent.clone();
                contentList.push(msg);
                titleList.push(title);
                msg.position.offset.y -= i * 20;
                title.position.offset.y -= i * 20;
            }

            load = true;
        case 'setChooseCase':
            setChooseCase(...Object.values(event.args));
            break;
        case 'setSingleQI':
            setSingleQI(...Object.values(event.args));
            break;
        case 'setAllQI':
            setAllQI(...Object.values(event.args));
            break;
        case 'message':
            message(...Object.values(event.args))
            break;
        case 'input':
            inputBox.visible = true;
            input.unlockPointer();
            inputBox.focus();
            break;
        default:
            break;
    }
});
