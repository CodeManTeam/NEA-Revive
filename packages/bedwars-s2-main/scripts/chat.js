const {
    authors,
    admin,
    TitleColor
} = require("./config.js")
const {
    sendMsg,
    calculateXp,
    ban,
    addWhiteList,
    gameRestart,
    openSettings
} = require("./function.js")

async function chat(entity, message) {
    //使用if语句检测玩家身份以及检查玩家目的是否为执行代码。
    if (!message.includes('delete eval') && authors.includes(entity.player.userId) && message.indexOf("$") == 0) {
        world.say(eval(message.slice(1, message.length)));//使用eval函数执行代码，并使用world.say函数输出结果。
    } else if (message == "$gameRestart()" && admin.includes(entity.player.userId)) {
        gameRestart()
    } else if (message.startsWith('/ban') && (authors.includes(entity.player.userId) || admin.includes(entity.player.userId))) {
        const playerId = message.replace(/ /g, "").replace(RegExp("\n", "gi"), "").replace(RegExp(" ", "gi"), "").replace("/ban", "");
        await ban(playerId)
        entity.player.directMessage(`已封禁UserId:${playerId}`)
    } else if (message.startsWith('/addWhiteList') && authors.includes(entity.player.userId)) {
        const playerId = message.replace(/ /g, "").replace(RegExp("\n", "gi"), "").replace(RegExp(" ", "gi"), "").replace("/addWhiteList", "");
        await addWhiteList(playerId)
        entity.player.directMessage(`已将UserId:${playerId}加入白名单`)
    } else if (message.startsWith('/lift') && (authors.includes(entity.player.userId) || admin.includes(entity.player.userId))) {
        const playerId = message.replace(/ /g, "").replace(RegExp("\n", "gi"), "").replace(RegExp(" ", "gi"), "").replace("/lift", "");
        let blackList = await GroupStorage.get('BlackList')
        blackList.value = blackList.value.filter(d => d != playerId)
        await GroupStorage.update('BlackList', () => { return blackList.value })
        entity.player.directMessage(`已解封UserId:${playerId}`)
    } else if (message.startsWith('/removeWhiteList') && authors.includes(entity.player.userId)) {
        const playerId = message.replace(/ /g, "").replace(RegExp("\n", "gi"), "").replace(RegExp(" ", "gi"), "").replace("/removeWhiteList", "");
        let whiteList = await GroupStorage.get('WhiteList')
        whiteList.value = whiteList.value.filter(d => d != playerId)
        await GroupStorage.update('WhiteList', () => { return whiteList.value })
        entity.player.directMessage(`已将UserId:${playerId}移除白名单`)
    } else if (message.startsWith('/tp') && (authors.includes(entity.player.userId) || entity.player.team == '')) {
        const name = message.slice(4);
        const target = find(name);
        if (target) entity.position.copy(target.position);
    } else if (message.startsWith('/fovy')) {
        const v = message.replace(/ /g, "").replace(RegExp("\n", "gi"), "").replace(RegExp(" ", "gi"), "").replace("/fovy", "");
        if (v.includes('.')) return entity.player.directMessage('请输入整数！')
        var nv = Number(v)
        if (Number.isNaN(nv)) return entity.player.directMessage('请输入正确的数值')
        if (nv < 30 || nv > 150) return entity.player.directMessage('请输入一个不小于30且不大于150的数')
        entity.player.cameraFovY = nv / 180 * (entity.player.cameraFovY / entity.player.fovy)
        entity.player.fovy = nv / 180
        entity.player.directMessage(`调整成功，当前你的视野为${nv}`)
    } else if (message == '/settings') {
        openSettings(entity);
    } else if (message == '/hub') {
        entity.player.link('https://dao3.fun/play/7f81412b5ac8ed0a72e8', { isNewTab: false, isConfirm: false })
    } else if (message == '/stopgetcps') {
        if (entity.player.cpsInterval) {
            clearInterval(entity.player.cpsInterval)
        }
    } else if (message.startsWith('/invite')) {
        const ownRoom = roomManager.getRoomMembers(entity.player.roomId)
        if (ownRoom.length > 1 && ownRoom[0].player.userId !== entity.player.userId) return entity.directMsg('你没有执行此指令的权限');
        const name = message.slice(8);
        const target = find(name);
        if (!target || !target.player.loaded || target.player.userId == entity.player.userId) return entity.directMsg('此玩家不存在');
        if (roomManager.getRoomMembers(target.player.roomId).length > 1) return entity.directMsg('此玩家已在其他队伍中');
        if (target.player.inviters.includes(entity.player.roomId)) return entity.directMsg('你已向此玩家发送过组队邀请');
        target.player.inviters.push(entity.player.roomId);
        target.directMsg(`输入/accept ${entity.player.roomId}接受来自${entity.player.name}的组队邀请`);
        entity.directMsg(`已邀请${target.player.name}，队伍ID：${entity.player.roomId}`);
    } else if (message.startsWith('/accept')) {
        const rid = Number(message.slice(8));
        if (Number.isNaN(rid)) return entity.directMsg('请输入正确的ID')
        if (!entity.player.inviters.includes(rid)) return entity.directMsg('此队伍未向你发出邀请');
        const room = roomManager.getRoomMembers(rid)
        if (!room) return entity.directMsg('此队伍不存在');
        if (room.length >= 4) return entity.directMsg('队伍已满')
        entity.player.inviters = []
        world.querySelectorAll('player').forEach(async e => {
            if (e.player.inviters.includes(entity.player.roomId)) {
                e.player.inviters = e.player.inviters.filter(i => i !== entity.player.roomId)
            }
        });
        roomManager.logout(entity.player.roomId, entity, true)
        entity.player.roomId = rid
        roomManager.join(rid, entity)
        const captain = room[0]
        entity.directMsg(`已加入${captain.player.name}的队伍，队伍ID：${rid}`)
        captain.directMsg(`${entity.player.name}加入队伍`)
    } else if (message == '/quit') {
        const ownRoom = roomManager.getRoomMembers(entity.player.roomId)
        if (ownRoom.length == 1) return entity.directMsg('你不在队伍中');
        if (ownRoom[0].player.userId == entity.player.userId) return entity.directMsg('队长无法退出队伍');
        roomManager.logout(entity.player.roomId, entity, false);
        entity.player.roomId = roomManager.newr(entity)
        ownRoom.forEach(async e => {
            e.directMsg(`${entity.player.name} 退出队伍`)
        });
    } else if (message == '/kickall') {
        const ownRoom = roomManager.getRoomMembers(entity.player.roomId)
        if (ownRoom.length == 1) return entity.directMsg('你不在队伍中');
        if (ownRoom[0].player.userId !== entity.player.userId) return entity.directMsg('你没有权限执行此指令');
        ownRoom.slice(1).forEach(async e => {
            roomManager.logout(entity.player.roomId, e, false);
            e.player.roomId = roomManager.newr(e)
            e.directMsg('队伍已解散')
        });
        entity.directMsg('队伍已解散')
    } else if (message.startsWith('/kick')) {
        const ownRoom = roomManager.getRoomMembers(entity.player.roomId)
        if (ownRoom.length == 1) return entity.directMsg('你不在队伍中');
        if (ownRoom[0].player.userId !== entity.player.userId) return entity.directMsg('你没有权限执行此指令');
        const name = message.slice(6);
        const target = find(name)
        if (!target || target.player.userId === entity.player.userId || !ownRoom.includes(target)) return entity.directMsg('踢出失败')
        ownRoom.forEach(async e => {
            e.directMsg(`${entity.player.name} 将 ${target.player.name} 移出队伍`)
        });
        roomManager.logout(entity.player.roomId, target, false);
        target.player.roomId = roomManager.newr(target)
    } else {
        const msg = message.replace(/\n/g, "");
        sendMsg(entity.player.titleList[0].replace('玩家名', entity.player.name) + '：' + msg,
            entity.player.titleList[0].length - 3,
            TitleColor[entity.player.titleList[0].slice(0, -3)]
        );
    }
};

world.onChat(({ entity, message }) => {
    chat(entity, message);
})

module.exports = {
    chat
}

