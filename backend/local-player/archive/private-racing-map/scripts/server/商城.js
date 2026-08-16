world.onPlayerPurchaseSuccess(({ userId, productId, orderId }) => {
    const entity = world.querySelectorAll('player').filter(e => e.player.userId === userId)[0];
    if (!entity) return;
    if (productId === 383033110770492) {/*VIP*/
        entity.data.appellations.push('VIP');
        selectDialog('恭喜获得VIP称号!', '商城', ['确定'], entity);
    }
    if (productId === 383033102381814) {/*教训*/
        selectDialog('恭喜获得一个教训，呵呵', '商城', ['我长记性了!下次还敢了!'], entity);
    }
    if (productId === 383033110770483) {/*救援平台自动放置*/
        entity.data.bag.push('救援平台自动放置');
        selectDialog('恭喜获得救援平台自动放置', '商城', ['确定'], entity);
    }
    if (productId == 383039288980495) {/*称号盲盒C级*/
        ch(entity, 0);
    }
    if (productId == 383043252597761) {/*称号盲盒B级*/
        ch(entity, 1);
    }
    if (productId == 383037464457926) {/*称号盲盒A级*/
        ch(entity, 2);
    }
});

/*
SS级称号盲盒
范围：30~45
中奖概率：100
奖项分布概率：0 0 0 60 25 15
价格：30

SSS级称号盲盒
范围：40~60
中奖概率：100
奖项分布概率：0 0 0 0 60 40
价格：50
*/

globalThis.mh = {
    0: { lm: [5, 15], gl: 25, fb: [75, 25, 0, 0, 0, 0] },//C
    1: { lm: [5, 25], gl: 75, fb: [90, 8, 2, 0, 0, 0] },//B
    2: { lm: [10, 35], gl: 100, fb: [0, 40, 40, 20, 0, 0] },//A
    3: { lm: [25, 45], gl: 100, fb: [0, 0, 50, 30, 10, 10] },//S
    4: { lm: [30, 45], gl: 100, fb: [0, 0, 0, 60, 25, 15] },//SS
    5: { lm: [40, 60], gl: 100, fb: [0, 0, 0, 0, 60, 40] },//SSS
}

globalThis.ch = async function (entity, tp) {
    if (Math.random() > mh[tp].gl / 100) {
        selectDialog('很遗憾您没有中奖', '商城', ['确定'], entity);
        return;
    }
    for (let i = 0; i < 6; i++) {
        if (Math.random() < mh[tp].fb[i] / 100) {
            let v = [];
            for (let j = 0; j < title.length; j++) {
                if (title[j].sc >= mh[tp].lm[0] && title[j].sc <= mh[tp].lm[1] && (!title[j].spe)) {
                    v.push(title[j].name);
                }
            }
            let u = v[Math.floor(Math.random() * v.length)];
            entity.data.appellations.push(u);
            selectDialog('恭喜获得称号：' + u, '商城', ['确定'], entity);
        }
    }
}
