globalThis.selectDialog = async function (content, title, options, entity) {
    return await entity.player.dialog({
        type: 'select',
        title: title,
        content: content,
        options: options
    })
};
globalThis.inputDialog = async function (content, title, entity) {
    return await entity.player.dialog({
        type: 'input',
        title: title,
        content: content,
    })
};
globalThis.textDialog = function (content, title, entity) {
    return entity.player.dialog({
        type: 'text',
        title: title,
        content: content,
    })
};