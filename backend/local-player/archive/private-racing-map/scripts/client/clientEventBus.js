import { createMessage, parseMessage } from './clientProcotol.js';

const handlers = {};

function on(channel, handler) {
    if (!handlers[channel]) handlers[channel] = [];
    handlers[channel].push(handler);
}

function off(channel, handler) {
    if (!handlers[channel]) return;
    if (!handler) {
        delete handlers[channel];
        return;
    }
    const idx = handlers[channel].indexOf(handler);
    if (idx !== -1) handlers[channel].splice(idx, 1);
    if (handlers[channel].length === 0) delete handlers[channel];
}

function once(channel, handler) {
    const wrapper = (data) => {
        off(channel, wrapper);
        handler(data);
    };
    on(channel, wrapper);
}

function emit(channel, data) {
    if (!handlers[channel]) return;
    const list = handlers[channel].slice();
    for (let i = 0; i < list.length; i++) {
        list[i](data);
    }
}

function sendToServer(channel, data) {
    remoteChannel.sendServerEvent(createMessage(channel, data));
}

function _dispatch(rawMsg) {
    const parsed = parseMessage(rawMsg);
    if (!parsed) {
        return;
    }
    emit(parsed.channel, parsed.data);
}

remoteChannel.events.on('client', _dispatch);

export const clientEventBus = { on, off, once, emit, sendToServer };
