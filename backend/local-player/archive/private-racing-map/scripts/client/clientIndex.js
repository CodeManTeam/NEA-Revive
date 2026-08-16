console.clear();

import "./data.js";
import "./_client_bundle.js";
//import "./cb.js";
import "./score.js";
import "./team_shop.js";
import "./shop.js";
import "./team.js";
import "./box.js";
import "./uns_against_hack_tool.js";
import "./state.js";
import "./start.js";
import "./set.js";
import "./adaptive_dialog.js";
import "./adaptive_toast.js";
import { clientEventBus } from './clientEventBus.js';
/**
 * clientEventBus.on('myChannel', (data) => { ... });
 * 
 * clientEventBus.sendToServer('myChannel', { ... });
 * 
 * clientEventBus.off('myChannel', handler);
 */
import { BUILTIN_CHANNELS } from './clientProcotol.js';
import { Ease, Motion } from "./motion.js";
import { Dialog } from "./dialog.js";
import { Toast } from "./toast.js";
import "./ban.js";

const
    dialog_screen /** @type {UiScreen} */ = UiScreen.getAllScreen().find(screen => screen.name === "dialog"),
    toast_screen /** @type {UiScreen} */ = UiScreen.getAllScreen().find(screen => screen.name === "toast");

[dialog_screen, toast_screen].forEach(obj => { obj.visible = true; });

clientEventBus.on(BUILTIN_CHANNELS.DIALOG, async (data) => {
    if (data.__cancel) {
        Dialog.cancel();
        return;
    }
    const result = await Dialog.show(data);
    clientEventBus.sendToServer(BUILTIN_CHANNELS.DIALOG_RESPONSE, result);
});

clientEventBus.on(BUILTIN_CHANNELS.TOAST, (data) => {
    const { text, type, duration } = data;
    Toast.show(text, type, duration);
});

ui.findChildByName('开始游戏').visible=0;

/*

remoteChannel.onServerEvent(({ entity, args }) => {//非UI端收到命令

});

remoteChannel.events.on('client', async (args) => {//UI端收到命令

});

remoteChannel.sendServerEvent({//向非UI端发送命令
    type:''
});

remoteChannel.sendClientEvent(//向UI端发送命令
    entity, // 玩家实体参数
    {type:""} // 事件参数
);

*/