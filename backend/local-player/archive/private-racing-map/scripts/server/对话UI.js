const colors = {
    5: '#4b0082', // "dark purple"
    4: '#d8bfd8', // "light purple"
    3: '#ff6666', // "light red"
    2: '#ffb266', // "light orange"
    1: '#ffff99', // "light yellow"
    0: '#404040'  // "dark gray"
};
globalThis.gui.GREY = '#aaa';
globalThis.gui.YELLOW = '#ff5';
globalThis.gui.RED = '#f55';
globalThis.gui.GREEN = '#5f5';
globalThis.gui.BLUE = '#5ff';
globalThis.gui.Purple = '#a0a';
yadmin = ["小楠awa",'-Shawn-飞马座-']
radmin = ["我是卦哥","不胜传说周永退",'被夹的kun','竹青墨染']
gadmin = ["uns", "灵境", "喜欢火龙", "漂流者", "编程喵呀za", "SWAT-SG函数"]
badmin = [""]
padmin = [""]
const HasWeapon = storage.getDataStorage("HasWeapon")
const namefindkey = storage.getDataStorage('namefindkey')
const usercoin = storage.getDataStorage("usercoin")
world.onPlayerJoin(async ({ entity }) => {
    entity.guicolor = gui.GREY;
    await sleep(300);
    let u=entity.data.appellation;
    for(let i=0;i<title.length;i++){
        if(title[i].name==u&&(!title[i].spe)){
            entity.guicolor=colors[title[i].lv];
            // console.log("ttt"+colors[title[i].lv].r)
        }
    }
    if(entity.data.appellation.includes('野兽')&&(!entity.data.appellation.includes('参与'))){
        entity.guicolor = gui.YELLOW
    }
    if (yadmin.indexOf(entity.player.name) > -1) {
        entity.guicolor = gui.YELLOW
    }
    if (radmin.indexOf(entity.player.name) > -1) {
        entity.guicolor = gui.RED
    }
    if (gadmin.indexOf(entity.player.name) > -1) {
        //entity.guicolor = gui.GREEN
    }
    if (badmin.indexOf(entity.player.name) > -1) {
        entity.guicolor = gui.BLUE
    }
    if (padmin.indexOf(entity.player.name) > -1) {
        entity.guicolor = gui.Purple
    }
    await sleep(3000);
    await gui.init(entity, {
        '': {
            display: true,
            data: `
                <dialog percentWidth="100" percentHeight="100" id="fullscreen">
                </dialog>
            `
        }
    });
    [entity.player.screenWidth, entity.player.screenHeight] = await Promise.all([gui.getAttribute(entity, "#fullscreen", "width"), gui.getAttribute(entity, "#fullscreen", "height")]);
    await gui.remove(entity, "#fullscreen");
    entity.player.isComputer = entity.player.screenWidth > entity.player.screenHeight;
    if (entity.player.isComputer) {
        entity.player.guiMessageCnt = 0;
        entity.player.guiMessages = [];
        entity.player.guiMessaging = false;
        await gui.init(entity, {
            'title': {
                display: true,
                data: `
                    <label text="" left="100" top="${entity.player.screenHeight / 2 - 72}" percentWidth="0" height="72" color="#0000" fontSize="72" id="title"></label>
                `
            },
            'subtitle': {
                display: true,
                data: `
                    <label text="" top="${entity.player.screenHeight / 2 - 36}" percentWidth="0" height="24" color="#0000" fontSize="36" id="subtitle"></label>
                `
            },
            'chat': {
                display: true,
                data: `
                    <group bottom="160" left="9" width="${entity.player.screenWidth * 0.3}" height="0" backgroundColor="#00000080" borderColor="#0000" id="chat"></group>
                `
            }
        });
        world.onChat(({ message, entity: entity1 }) => {
            try {
                if ((message.includes('{')) && (message.includes('}')) && (message.includes(':')) && (message.includes(','))) {
                    gui.message(entity, entity1.player.name + '发送了个表情包，打开对话框查看', entity1)
                }
                else {
                    gui.message(entity, (entity1.data.appellation!=''?`[${entity1.data.appellation}]`:'')+entity1.player.name + ':' + message, entity1);
                }
            }
            catch { }
        })
    }
});
gui.message = async (entity, text, chatentity) => {
    try {
        if (!entity.player.isComputer) {
            entity.player.directMessage(text);
            return;
        }
        while (!entity.player.guiMessages) {
            await sleep(32);
        }
        if (entity.player.guiMessages.length > 30) {
            return;
        }
        while (entity.player.guiMessaging) {
            await sleep(32);
        }
        setTimeout(async () => {
            if (entity.destroyed) {
                return;
            }
            entity.player.guiMessages.shift();
            gui.remove(entity, '#' + _id);
            gui.remove(entity, '#' + id);
            gui.setAttribute(entity, '#chat', 'height', Math.min(entity.player.guiMessages.length, 10) * 36);
        }, 10000);
        entity.player.guiMessaging = true;
        entity.player.guiMessageCnt++;
        entity.player.guiMessages.push({
            id: entity.player.guiMessageCnt,
            bottom: 124
        });
        let id = 'msg' + entity.player.guiMessageCnt;
        let _id = '_msg' + entity.player.guiMessageCnt;
        let data = {};
        data[_id] = {
            display: true,
            data: `
                <label text="${text}" bottom="158" left="11" width="${entity.player.screenWidth * 0.3}" height="36" color="#2a2a2a" fontSize="32" id="${_id}"></label>
            `
        };
        data[id] = {
            display: true,
            data: `
                <label text="${text}" bottom="160" left="9" width="${entity.player.screenWidth * 0.3}" height="36" color="${chatentity.guicolor}" fontSize="32" id="${id}"></label>
            `
        };
        gui.setAttribute(entity, '#chat', 'height', Math.min(entity.player.guiMessages.length, 10) * 36);
        gui.init(entity, data);
        entity.player.guiMessages.forEach(async msg => {
            msg.bottom += 36;
            if (msg.bottom >= 520) {
                gui.remove(entity, '#msg' + msg.id);
                gui.remove(entity, '#_msg' + msg.id);
                return;
            }
            gui.setAttribute(entity, '#msg' + msg.id, 'bottom', msg.bottom);
            gui.setAttribute(entity, '#_msg' + msg.id, 'bottom', msg.bottom - 2);
        });
        entity.player.guiMessaging = false;
    }
    catch (e) {
        return
    }
}