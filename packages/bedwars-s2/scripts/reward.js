var uidList = [];
const S1RewardsPlayers = [
    '253709552472187'/*wind*/, '50476246'/*��*/,
    '50285863'/*达达*/, '13449571'/*冷暗*/, '382985299899526'/*廿*/,    /*胜利榜*/
    '50012194'/*饕餮*/, '253709552472187'/*wind*/,
    '50285863'/*达达*/, '253708235461455'/*-竹青*/, '50476246'/*��*/,    /**击杀榜 */
    '50012194'/*饕餮*/, '253709552472187'/*wind*/,
    '50285863'/*达达*/, '50476246'/*��*/, '13167562'/*戮*/,     /**最终击杀榜 */
    '253709552472187'/*wind*/, '13471958'/*军医*/,
    '50476246'/*��*/, '50012194'/*饕餮*/, '13167562'/*戮*/  /*摧毁床榜*/
]
async function reward() {
    const hasRewarded = await GroupStorage.get('HasRewarded')
    if (!hasRewarded) {
        await GroupStorage.set('HasRewarded', 'no')
    } else if (hasRewarded.value == 'yes') return;
    await sleep(2000)
    var sqlDataList = await GroupStorage.list({ // 将数据库内的所有数据分页
        cursor: 0,
        pageSize: 100,
        constraintTarget: 'score',
        ascending: false
    });

    while (1) {
        for (let sqlData of sqlDataList.getCurrentPage()) {// 遍历获取数据
            if (sqlData.key == 'BlackList' || sqlData.key == 'WhiteList' || sqlData.value['score'] == undefined) continue;
            if (!uidList.includes(sqlData.key) && sqlData.value['score'] !== 256201 && sqlData.value['score'] !== 154922) {
                uidList.push(sqlData.key)
            }
        }
        uidList = uidList.slice(0, 50);
        if (sqlDataList.isLastPage) break; // 如果已经是最后一页，退出循环
        await sqlDataList.nextPage(); // 下一页
    };
    uidList = uidList.concat(S1RewardsPlayers)
    let index = 1
    for (const uid of uidList) {
        var data = await GroupStorage.get(uid)
        if (!data.value['titleList']) continue;
        if (index <= 3) {
            data.value['titleList'].push(`[BWS1#${['1st', '2nd', '3rd'][index - 1]}]玩家名`)
            data.value['clothes'].push(`轻雪披风`)
        } else if (index > 3 && index <= 10) {
            data.value['titleList'].push(`[BWS1#TOP10]玩家名`)
        } else if (index > 50 && index <= 55) {
            data.value['titleList'].push(`[>>起床#梦境守卫<<]玩家名`)
            data.value['clothes'].push(`末影龙翅膀`)
        } else if (index > 55 && index <= 60) {
            data.value['titleList'].push(`[>>起床#斩刀击浪<<]玩家名`)
            data.value['clothes'].push(`短剑`)
        } else if (index > 60 && index <= 65) {
            data.value['titleList'].push(`[>>起床#守墓人<<]玩家名`)
            data.value['clothes'].push(`短剑`)
        } else if (index > 65 && index <= 70) {
            data.value['titleList'].push(`[>>起床#梦境歼灭者<<]玩家名`)
            data.value['clothes'].push(`世界崩解之镐`)
        }
        if (index <= 50) {
            data.value['clothes'].push(`圣诞花环`)
        }
        if (index <= 10) {
            data.value['clothes'].push(`圣诞糖果棍`)
        }
        await GroupStorage.update(uid, () => {  // 更新玩家数据存档
            return data.value;
        });
        index++
    }
    await GroupStorage.update('HasRewarded', () => {  // 更新玩家数据存档
        return 'yes';
    });
}
reward();