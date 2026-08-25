global.GroupStorage = storage.getGroupStorage('storage'); // 获取数据库，名称为 storage

global.savedData_group = function () {
    return { // 玩家初始需要保存的数据，可增添或删除
        score: 0,
        xp: 0,
        lv: 0,
        clothes: ['无'],
        titleList: ['玩家名'],
        fovy: 7 / 18,
        keys: [49, 50, 51, 52, 53, 54, 55, 56, 57, 69, 81, 9, 13],
        scoreS2: 0,
        wins: 0,
        kills: 0,
        beds: 0,
        finalKills: 0,
        fishBag: [],
        coins: 0
    };
}
global.initPlayer_group = function (entity) { // 初始化玩家数据
    Object.assign(entity.player, savedData_group());
};

global.getPlayerData_group = function (entity) { // 获取玩家数据
    console.log(`----[[SQL] : Wait ${entity.player.name}, type : Get]----`);
    var data = { 'name': entity.player.name };
    for (let i in savedData_group()) { // 遍历savedData，获取玩家当前数据
        data[i] = entity.player[i];
    };
    console.log(`----[[SQL] : Succeed ${entity.player.name}, type : Get]----`);
    return data;
};
global.loadPlayer_group = async function (entity) { // 读档
    if (entity.sqlError) return;
    if (!entity.player.userId) return;
    initPlayer_group(entity);
    var data;
    try {
        data = await GroupStorage.get(entity.player.userId); // 获取数据
        if (data) { // 如果数据存在
            Object.assign(entity.player, data.value);
            entity.player.directMessage('已为您读取数据！');
        } else { // 如果数据不存在
            initPlayer_group(entity);
            await GroupStorage.set(entity.player.userId, getPlayerData_group(entity));
            entity.player.directMessage('已为您创建数据！');
        };
    } catch (error) {
        entity.sqlError = true;
        let errrr = await entity.player.dialog({
            type: 'select',
            title: `错误`,
            content: `检测到您的存档发生错误，请重进，多数问题在重进后能解决\n如未能解决问题，请将错误代码复制到评论区反馈，仍无法解决可尝试清档\n错误代码：\n` + error,
            options: ['重进', '清档'],
        });
        if (!errrr || errrr.index == 0) entity.player.kick();
        else {
            let clear = await entity.player.dialog({
                type: 'select',
                title: `清档`,
                content: `确定要清档吗？此操作不可撤回！`,
                options: ['还是重进试试吧', '还是重进试试吧', '还是重进试试吧', '确定清档'],
            });
            if (!clear || clear.valueOf == '还是重进试试吧') { entity.player.kick(); }
            else await deletePlayer_group(entity);
        }
        return;
    }
};
global.savePlayer_group = async function (entity) { // 存档
    if (entity.sqlError) return;
    while (1) {
        try {
            console.log(`----[[SQL] : Wait ${entity.player.name}, type : Save]----`);
            await GroupStorage.update(entity.player.userId, () => {  // 更新玩家数据存档
                return getPlayerData_group(entity);
            });
            console.log(`----[[SQL] : Succeed ${entity.player.name}, type : Save]----`);
            break
        } catch (e) {
            await sleep(1000);//1秒后询
        }
    }
};

global.deleteAllData_group = async function () { // 清档
    var sqlDataList = await GroupStorage.list({ // 将数据库内的所有数据分页
        cursor: 0
    });
    world.querySelectorAll('player').forEach(x => deletePlayer(x));
    try {
        while (true) {
            for (let sqlData of sqlDataList.getCurrentPage()) { // 遍历获取数据
                await GroupStorage.remove(sqlData.key)
            }
            if (sqlDataList.isLastPage) break; // 如果已经是最后一页，退出循环
            await sqlDataList.nextPage(); // 下一页
        };
    } catch (e) { }
};
global.deletePlayer_group = async function (entity) { // 删档
    await GroupStorage.remove(entity.player.userId); // 删除玩家数据存档
    initPlayer(entity);
    await GroupStorage.set(entity.player.userId, getPlayerData(entity));
    entity.player.directMessage('已为您创建数据！');
    entity.player.kick();
};
