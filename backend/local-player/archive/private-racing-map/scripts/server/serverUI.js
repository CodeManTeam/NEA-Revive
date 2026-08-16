const { serverEventBus } = require('./serverEventBus.js');
const { BUILTIN_CHANNELS } = require('./serverProcotol.js');

const DialogType = { TEXT: "TEXT", INPUT: "INPUT", SELECT: "SELECT" };

const DIALOG_TIMEOUT = 60000;
const pendingDialogs = new Map();

serverEventBus.on(BUILTIN_CHANNELS.DIALOG_RESPONSE, ({ entity, data }) => {
    const entry = pendingDialogs.get(entity.id);
    if (!entry) return;
    clearTimeout(entry.timer);
    pendingDialogs.delete(entity.id);
    entry.resolve(data);
});

const UI = {
    dialog: (entity, opts) => {
        const config = {
            type: opts.type || DialogType.TEXT,
            title: opts.title || "提示",
            content: opts.content || "",
            options: opts.options || [],
            placeholder: opts.placeholder || "",
            confirmText: opts.confirmText || "确认",
        };
        return new Promise((resolve) => {
            const timer = setTimeout(() => {
                pendingDialogs.delete(entity.id);
                resolve(null);
            }, DIALOG_TIMEOUT);
            pendingDialogs.set(entity.id, { resolve, timer });
            serverEventBus.sendToPlayer(entity, BUILTIN_CHANNELS.DIALOG, config);
        });
    },
    dialogAll: (opts) => {
        const config = {
            type: opts.type || DialogType.TEXT,
            title: opts.title || "提示",
            content: opts.content || "",
            options: opts.options || [],
            placeholder: opts.placeholder || "",
            confirmText: opts.confirmText || "确认",
        };
        serverEventBus.broadcast(BUILTIN_CHANNELS.DIALOG, config);
    },
    alert: (entity, content, title) => {
        return UI.dialog(entity, { type: DialogType.TEXT, title: title || "提示", content });
    },
    alertAll: (content, title) => {
        UI.dialogAll({ type: DialogType.TEXT, title: title || "提示", content });
    },
    confirm: (entity, content, title) => {
        return UI.dialog(entity, { type: DialogType.SELECT, title: title || "确认", content, options: ["取消", "确定"] });
    },
    confirmAll: (content, title) => {
        UI.dialogAll({ type: DialogType.SELECT, title: title || "确认", content, options: ["取消", "确定"] });
    },
    cancelDialogs: (entity) => {
        const entry = pendingDialogs.get(entity.id);
        if (entry) {
            clearTimeout(entry.timer);
            pendingDialogs.delete(entity.id);
            entry.resolve(null);
        }
        serverEventBus.sendToPlayer(entity, BUILTIN_CHANNELS.DIALOG, { __cancel: true });
    },
    toast: (entity, text, type, duration) => {
        serverEventBus.sendToPlayer(entity, BUILTIN_CHANNELS.TOAST, {
            text,
            type: type || "info",
            duration: duration || 2500,
        });
    },
    toastAll: (text, type, duration) => {
        serverEventBus.broadcast(BUILTIN_CHANNELS.TOAST, {
            text,
            type: type || "info",
            duration: duration || 2500,
        });
    },
    ban: (entity, data) => {
        serverEventBus.sendToPlayer(entity, BUILTIN_CHANNELS.BAN, data);
    },
    banAll: (data) => {
        serverEventBus.broadcast(BUILTIN_CHANNELS.BAN, data);
    }
};

globalThis.UI = UI;
globalThis.DialogType = DialogType;