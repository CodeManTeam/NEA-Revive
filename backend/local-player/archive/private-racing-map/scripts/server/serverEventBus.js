const { createMessage, parseMessage } = require('./serverProcotol.js');

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

function sendToPlayer(entity, channel, data) {
    remoteChannel.sendClientEvent(entity, createMessage(channel, data));
}

function broadcast(channel, data) {
    remoteChannel.broadcastClientEvent(createMessage(channel, data));
}

function _dispatch(event) {
    const parsed = parseMessage(event.args);
    if (!parsed) {
        return;
    }
    emit(parsed.channel, { entity: event.entity, tick: event.tick, data: parsed.data });
}

const _remoteToken = remoteChannel.onServerEvent(_dispatch);

function dispose() {
    for (const ch in handlers) delete handlers[ch];
    if (_remoteToken) {
        _remoteToken.cancel();
    }
}

module.exports = { serverEventBus: { on, off, once, emit, sendToPlayer, broadcast, dispose } };
