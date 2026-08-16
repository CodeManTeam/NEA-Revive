export const PROTOCOL_VERSION = 1;

export function createMessage(channel, data) {
    return {
        v: PROTOCOL_VERSION,
        ch: channel,
        d: data,
    };
}

export function parseMessage(msg) {
    if (!msg || typeof msg !== 'object') return null;
    if (msg.v !== PROTOCOL_VERSION) return null;
    if (typeof msg.ch !== 'string') return null;
    return { channel: msg.ch, data: msg.d };
}

export const BUILTIN_CHANNELS = {
    PLAYER_JOIN: 'sys:playerJoin',
    PLAYER_LEAVE: 'sys:playerLeave',
    SYNC_STATE: 'sys:syncState',
    DIALOG: 'ui:dialog',
    DIALOG_RESPONSE: 'ui:dialogResponse',
    TOAST: 'ui:toast',
    BAN: 'ui:ban',
    CHAT_SEND: 'chat:send',
    CHAT_BROADCAST: 'chat:broadcast',
    CHAT_PLAYER_COUNT: 'chat:playerCount',
    CHAT_GET_OLINE: 'chat:getOnline',
    MENU_SELECT_SAVEPOINT: 'menu:selectSavePoint',
    MENU_OPEN: 'menu:open',
    MENU_CLOSE: 'menu:close',
};
