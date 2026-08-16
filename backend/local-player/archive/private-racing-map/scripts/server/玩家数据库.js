//深层赋值object
globalThis.assignData = function (defaultData, dbData) {
    try {
        if (!dbData) return;
        let dbDataKeys = Object.keys(dbData);
        for (let k of dbDataKeys) {
            if (typeof defaultData[k] === 'object') {
                assignData(defaultData[k], dbData[k])
            } else {
                dbData[k] != undefined ? defaultData[k] = dbData[k] : null;
            }
        }
    } catch (err) {
        return;
    };
}

// 初始化数据
function initPlayer(entity) {
    try {
        entity.data = {
            name: entity.player.name, // 玩家姓名
            userId: entity.player.userId, // 玩家userId
            score: 0, // 赛季分数
            score_2: 0, // S2赛季分数
            bag: [], // 背包
            alScore: 0, //总积分
            coin: 0, //起床金币
            appellations: [],//称号
            appellation: '',//正在使用的称号
            kills: 0,//总击杀
            endKills: 0,//总最终击杀
            beds: 0,//总拆床数
            isBan: 0,//是否被封号
            pf: [],//皮肤
            button: [
                keys['1'],//1
                keys['2'],//2
                keys['3'],//3
                keys['4'],//4
                keys['5'],//5
                keys['6'],//6
                keys['7'],//7
                keys['8'],//8
                keys['9'],//9
                keys['E'],//e
                keys['Tab'],//Tab
                keys['Q'],//q
            ],//自定义按键
            bag: [],//背包
            wearing: '',//穿戴物品
            dlkg: 0,//辅助搭路开关
        }
        if(runcoolSto.getSto(entity)){
            entity.data.appellations.push(runcoolSto.getSto(entity));
        }
    } catch (err) {
        return;
    };
}

// 加载数据
globalThis.loadPlayer = async function (entity) {
    try {
        // 先给玩家初始化默认数据
        initPlayer(entity);
        if (!entity.data.score_2) entity.data.score_2 = 0;
        // 游客无法加载数据
        const userId = entity.player.userId;
        while (true) {
            try {
                let data = await playerStorage.get(userId);
                if (data && data.value) {
                    //console.log(entity.player.name + ' 数据库中的数据： ' + JSON.stringify(data.value))
                    data.value != undefined ? assignData(entity.data, data.value) : null;
                } else {
                    //console.log(entity.player.name + ' 数据库中暂无数据')
                }
                return;
            } catch (e) {
                console.log(e);
            }
            await sleep(1000);
        }
    } catch (err) {
        return;
    };
}

// 保存数据
globalThis.savePlayer = async function (entity) {
    try {
        if (entity.data.kills == NaN) entity.data.kills = 0;
        if (entity.data.endKills == NaN) entity.data.endKills = 0;
        if (entity.data.beds == NaN) entity.data.beds = 0;
        entity.data.kills += entity.game.kills;
        entity.data.endKills += entity.game.endKills;
        entity.data.beds += entity.game.beds;
        const userId = entity.player.userId;
        while (true) {
            try {
                return await playerStorage.update(userId, () => entity.data);
            } catch (e) {
                console.log(e);
            }
            await sleep(1000);
        }
    } catch (err) {
        return;
    };
}

world.onPlayerJoin(async ({ entity }) => {
    try {
        await loadPlayer(entity);
        if (hmd.includes(entity.player.userId)) {
            if (entity.player.name != 'uns') entity.data.isBan = 1;
        }
        await updateRankData(entity);
        if (entity.data.appellation != '') {
            world.say('欢迎！ [' + entity.data.appellation + ']' + entity.player.name + ' 进入地图');
        } else {
            world.say(entity.player.name + ' 进入了地图');
        }
        if (entity.player.userId == '313319814654599') entity.data.isBan = 0;
        if (entity.data.isBan) {
            //    if(entity.player.name!='uns')entity.player.kick();
        }
    } catch (err) {
        return;
    };
});

world.onPlayerLeave(async ({ entity }) => {
    await savePlayer(entity);
    await updateRankData(entity);
});

const RankCount = 100;
// 排行榜数据
globalThis.rankDataScore = [];
globalThis.rankDataAlScore = [];
globalThis.rankDataKills = [];
globalThis.rankDataEndKills = [];
globalThis.rankDataBeds = [];
// 初始化排行榜数据
(async function initRank() {
    try {
        await sleep(1000);
        while (true) {
            try {
                let data = await playerStorage.get('rankScore');
                if (data && data.value) rankDataScore = data.value;
                break;
            } catch (e) { console.log(e); }; await sleep(1000);
        }
        while (true) {
            try {
                let data = await playerStorage.get('rankAlScore');
                if (data && data.value) rankDataAlScore = data.value;
                break;
            } catch (e) { console.log(e); }; await sleep(1000);
        }
        while (true) {
            try {
                let data = await playerStorage.get('rankKills');
                if (data && data.value) rankDataKills = data.value;
                break;
            } catch (e) { console.log(e); }; await sleep(1000);
        }
        while (true) {
            try {
                let data = await playerStorage.get('rankEndKills');
                if (data && data.value) rankDataEndKills = data.value;
                break;
            } catch (e) { console.log(e); }; await sleep(1000);
        }
        while (true) {
            try {
                let data = await playerStorage.get('rankBeds');
                if (data && data.value) rankDataBeds = data.value;
                break;
            } catch (e) { console.log(e); }; await sleep(1000);
        }
    } catch (err) {
        return;
    };
})();

globalThis.updateRankData = async function (user) {
    await updateRankDataScore(user);
    await updateRankDataKills(user);
    await updateRankDataEndKills(user);
    await updateRankDataEndBeds(user);
    await updateRankDataEndalScore(user);
}

// 更新排行榜数据
globalThis.updateRankDataScore = async function (user) {//赛季积分排行榜
    await sleep(1000);
    try {

        // 假如排行榜上榜人数还没达到预期人数
        if (rankDataScore.length < RankCount) {
            let index = rankDataScore.findIndex(e => e.userId == user.player.userId);
            // 如果此玩家已上榜，则先删除ta的数据
            if (index >= 0) {
                rankDataScore.splice(index, 1);
            }
            rankDataScore.push({
                userId: user.player.userId,
                name: user.player.name,
                score: user.data.score_2
            });
        } else {
            let lastOne = rankDataScore[rankDataScore.length - 1];
            // 假如排行榜中最后一名的分数 低于该玩家，则替换ta
            if (lastOne.score < user.data.score_2) {
                rankDataScore.pop();
                let index = rankDataScore.findIndex(e => e.userId == user.player.userId);
                if (index >= 0) {
                    rankDataScore.splice(index, 1);
                }
                rankDataScore.push({
                    userId: user.player.userId,
                    name: user.player.name,
                    score: user.data.score_2
                });
            }
        }
        // 按分数按降序排序
        rankDataScore.sort((a, b) => b.score - a.score);
        // 推送到数据库
        playerStorage.update('rankScore', () => rankDataScore);
    } catch (err) {
        return;
    };
}

// 更新排行榜数据
globalThis.updateRankDataKills = async function (user) {//击杀排行榜
    await sleep(1000);
    let names = [], ids = [], ks = [];
    for (let i = 0; i < rankDataKills.length; i++) {
        if (names.includes(rankDataKills[i].name)) continue;
        names.push(rankDataKills[i].name);
        ids.push(rankDataKills[i].id);
        ks.push(rankDataKills[i].kills);
    }
    rankDataKills = [];
    for (let i = 0; i < ks.length; i++) {
        rankDataKills.push({
            name: names[i],
            kills: ks[i],
            userId: ids[i]
        });
    }
    try {
        // 假如排行榜上榜人数还没达到预期人数
        if (rankDataKills.length < RankCount) {
            let i = 2;
            while (i--) {
                let index = rankDataScore.findIndex(e => e.userId == user.player.userId);
                // 如果此玩家已上榜，则先删除ta的数据
                if (index >= 0) {
                    rankDataKills.splice(index, 1);
                }
            }
            rankDataKills.push({
                userId: user.player.userId,
                name: user.player.name,
                kills: user.data.kills
            });
        } else {
            let lastOne = rankDataKills[rankDataKills.length - 1];
            // 假如排行榜中最后一名的分数 低于该玩家，则替换ta
            if (lastOne.kills < user.data.kills) {
                rankDataKills.pop();
                let index = rankDataKills.findIndex(e => e.userId == user.player.userId);
                if (index >= 0) {
                    rankDataKills.splice(index, 1);
                }
                rankDataKills.push({
                    userId: user.player.userId,
                    name: user.player.name,
                    kills: user.data.kills
                });
            }
        }
        // 按分数按降序排序
        rankDataKills.sort((a, b) => b.kills - a.kills);
        // 推送到数据库
        playerStorage.update('rankKills', () => rankDataKills);
    } catch (err) {
        return;
    };
}

// 更新排行榜数据
globalThis.updateRankDataEndKills = async function (user) {//最终击杀排行榜
    await sleep(1000);
    try {
        // 假如排行榜上榜人数还没达到预期人数
        if (rankDataEndKills.length < RankCount) {
            let index = rankDataEndKills.findIndex(e => e.userId == user.player.userId);
            // 如果此玩家已上榜，则先删除ta的数据
            if (index >= 0) {
                rankDataEndKills.splice(index, 1);
            }
            rankDataEndKills.push({
                userId: user.player.userId,
                name: user.player.name,
                endKills: user.data.endKills
            });
        } else {
            let lastOne = rankDataEndKills[rankDataEndKills.length - 1];
            // 假如排行榜中最后一名的分数 低于该玩家，则替换ta
            if (lastOne.endKills < user.data.endKills) {
                rankDataEndKills.pop();
                let index = rankDataEndKills.findIndex(e => e.userId == user.player.userId);
                if (index >= 0) {
                    rankDataEndKills.splice(index, 1);
                }
                rankDataEndKills.push({
                    userId: user.player.userId,
                    name: user.player.name,
                    endKills: user.data.endKills
                });
            }
        }
        // 按分数按降序排序
        rankDataEndKills.sort((a, b) => b.endKills - a.endKills);
        // 推送到数据库
        playerStorage.update('rankEndKills', () => rankDataEndKills);
    } catch (err) {
        return;
    };
}

// 更新排行榜数据
globalThis.updateRankDataEndBeds = async function (user) {//摧毁床排行榜
    await sleep(1000);
    try {
        // 假如排行榜上榜人数还没达到预期人数
        if (rankDataBeds.length < RankCount) {
            try {
                let index = rankDataBeds.findIndex(e => e.userId == user.player.userId);
                // 如果此玩家已上榜，则先删除ta的数据
                if (index >= 0) {
                    rankDataBeds.splice(index, 1);
                }
                rankDataBeds.push({
                    userId: user.player.userId,
                    name: user.player.name,
                    beds: user.data.beds
                });
            } catch (err) {
                return;
            };
        } else {
            let lastOne = rankDataBeds[rankDataBeds.length - 1];
            // 假如排行榜中最后一名的分数 低于该玩家，则替换ta
            if (lastOne.beds < user.data.beds) {
                rankDataBeds.pop();
                let index = rankDataBeds.findIndex(e => e.userId == user.player.userId);
                if (index >= 0) {
                    rankDataBeds.splice(index, 1);
                }
                rankDataBeds.push({
                    userId: user.player.userId,
                    name: user.player.name,
                    beds: user.data.beds
                });
            }
        }
        // 按分数按降序排序
        rankDataBeds.sort((a, b) => b.beds - a.beds);
        // 推送到数据库
        playerStorage.update('rankBeds', () => rankDataBeds);
    } catch (err) {
        return;
    };
}

// 更新排行榜数据
globalThis.updateRankDataEndalScore = async function (user) {//总积分排行榜
    await sleep(1000);
    try {
        // 假如排行榜上榜人数还没达到预期人数
        if (rankDataAlScore.length < RankCount) {
            let index = rankDataAlScore.findIndex(e => e.userId == user.player.userId);
            // 如果此玩家已上榜，则先删除ta的数据
            if (index >= 0) {
                try {
                    rankDataAlScore.splice(index, 1);
                } catch (err) {
                    return;
                };
            }
            rankDataAlScore.push({
                userId: user.player.userId,
                name: user.player.name,
                alScore: user.data.alScore
            });
        } else {
            let lastOne = rankDataAlScore[rankDataAlScore.length - 1];
            // 假如排行榜中最后一名的分数 低于该玩家，则替换ta
            if (lastOne.alScore < user.data.alScore) {
                rankDataAlScore.pop();
                let index = rankDataAlScore.findIndex(e => e.userId == user.player.userId);
                if (index >= 0) {
                    rankDataAlScore.splice(index, 1);
                }
                rankDataAlScore.push({
                    userId: user.player.userId,
                    name: user.player.name,
                    alScore: user.data.alScore
                });
            }
        }
        // 按分数按降序排序
        rankDataAlScore.sort((a, b) => b.alScore - a.alScore);
        // 推送到数据库
        playerStorage.update('rankAlScore', () => rankDataAlScore);
    } catch (err) {
        return;
    };
}
