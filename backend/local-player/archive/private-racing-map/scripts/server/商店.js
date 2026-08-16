world.onClick(({ entity, clicker, raycast, button }) => {
    if (!world.gameStarting || clicker.dead || button == 'action0') return;
    if (raycast.distance > 4.5) return;
    if (entity.hasTag('shop1')) {
        openShop(clicker);
    }
});

globalThis.openShop = async function (entity) {
    if (!world.gameStarting || entity.dead) return;
    entity.shopOpening = 1;
    remoteChannel.sendClientEvent(//向UI端发送命令
        entity, // 玩家实体参数
        { type: "openShop" } // 事件参数
    );
}

globalThis.closeShop = async function (entity) {
    entity.shopOpening = 0;
    remoteChannel.sendClientEvent(//向UI端发送命令
        entity, // 玩家实体参数
        { type: "closeShop" } // 事件参数
    );
}

globalThis.NM = ['', 'I', 'II', 'III', 'IV', 'V'];

world.onPlayerJoin(({ entity }) => {
    entity.shopOpening = 0;
    entity.buyInd = 0;
    entity.bc = 0;
    entity.buycd = 0;
    entity.isbcd=1;
    remoteChannel.onServerEvent(async ({ entity, args }) => {//非UI端收到命令
        if (!world.gameStarting || entity.dead) return;
        if (args.type && args.type == 'buything') {
            if(entity.buycd==1&&entity.isbcd)return;
            entity.buycd=1;
            setTimeout(()=>{
                entity.buycd=0;
            },100);
            if (entity.gameScore < args.score || args.buyInd < entity.buyInd) return;
            let name = Prices[args.num].name;
            if (name[name.length - 1] == '子' && name[name.length - 2] == '靴') {
                let s = '';
                for (let i = 0; i < name.length - 2; i++) {
                    s += name[i];
                }
                name = s + '套';
                for (let i = 0; i < Armor.length; i++) {
                    if (Armor[i].name == name) {
                        if (entity.armorInd >= i) return;
                        entity.armorInd = i;
                        wearArmor(entity, s + '护腿', 3, team_upgrade[entity.teamNumber][1]);
                        wearArmor(entity, s + '靴子', 4, team_upgrade[entity.teamNumber][1]);
                        dfp(entity);
                        break;
                    }
                }
            }
            entity.gameScore -= args.score;
            remoteChannel.sendClientEvent(entity, {//向非UI端发送命令
                type: 'changeScore', value: entity.gameScore
            });
            entity.buyInd++;
            for (let j = 0; j <= ITEM_DATA.length; j++) {
                if (ITEM_DATA[j].usename.chinese == name) {
                    entity.bag.pile(j, Prices[args.num].num);
                    remoteChannel.sendClientEvent(entity, { type: "update_hotbar", args: { bag: entity.bag } });
                    break;
                }
            }
        }
    });
    remoteChannel.onServerEvent(async ({ entity, args }) => {//非UI端收到命令
        if (!world.gameStarting || entity.dead) return;
        if (args.type && args.type == 'buyteamthing') {
            if (args.buyInd < entity.buyInd) return;
            if(entity.buycd==1&&entity.isbcd)return;
            entity.buycd=1;
            setTimeout(()=>{
                entity.buycd=0;
            },100);
            entity.bc = 1;
            // console.log('buyteamthing');
            entity.buyInd++;
            if (team_upgrade[entity.teamNumber][args.num] >= Team_Prices[args.num].price.length) {
                entity.bc = 0;
                return;
            }
            // console.log('tmmx: ' + Team_Prices[args.num].price.length);
            // console.log('it: ' + team_upgrade[entity.teamNumber][args.num]);
            let cnt = 0;
            for (let i = 0; i < entity.bag.slots.length; i++) {
                if (entity.bag.slots[i].id == 18) cnt += entity.bag.slots[i].num;
            }
            let pri = Team_Prices[args.num].price[team_upgrade[entity.teamNumber][args.num]];
            // console.log('cnt: ' + cnt);
            // console.log('pri: ' + pri);
            if (cnt < pri) return;
            cnt = pri;
            for (let i = 0; i < entity.bag.slots.length; i++) {
                // console.log('sd:bg: '+entity.bag.slots[i].id);
                if (entity.bag.slots[i].id == 18) {
                    if (cnt < entity.bag.slots[i].num) {
                        entity.bag.slots[i].num -= cnt;
                        cnt = 0;
                    } else {
                        cnt -= entity.bag.slots[i].num;
                        entity.bag.slots[i].num = 0;
                    }
                    if (entity.bag.slots[i].num <= 0) {
                        entity.bag.slots[i] = new GameItem(0);
                    }
                    if (cnt == 0) break;
                    if (cnt < 0) {
                        entity.bag.pile(18, -cnt);
                    }
                }
            }
            team_upgrade[entity.teamNumber][args.num]++;
            sendTeamMessage(entity.teamNumber, `${entity.player.name}已解锁${Team_Prices[args.num].name}${NM[team_upgrade[entity.teamNumber][args.num]]}`);
            updateTeamGrade(entity.teamNumber);
            if (args.num == 1) {
                world.querySelectorAll('player').forEach((e) => {
                    if (e.teamNumber == entity.teamNumber) {
                        wearArmor(e, '皮革头盔', 1, 1);
                        wearArmor(e, '皮革胸甲', 2, 1);
                        wearArmor(e, (Armor[e.armorInd].name.slice(0, Armor[e.armorInd].name.length - 1)) + '护腿', 3, 1);
                        wearArmor(e, (Armor[e.armorInd].name.slice(0, Armor[e.armorInd].name.length - 1)) + '靴子', 4, 1);
                    }
                });
            }
            remoteChannel.sendClientEvent(entity, { type: "update_hotbar", args: { bag: entity.bag } });
            remoteChannel.sendClientEvent(entity, { type: "closeTeamShop" });
            remoteChannel.sendClientEvent(entity, { type: "openTeamShop", u: team_upgrade[entity.teamNumber] });
            await sleep(500);
            entity.bc = 0;
        }
    });
});

world.onClick(({ entity, clicker, raycast, button }) => {
    if (!world.gameStarting || clicker.dead || button == 'action0') return;
    if (raycast.distance > 4.5) return;
    if (entity.hasTag('shop2')) {
        openTeamShop(clicker);
    }
});

globalThis.openTeamShop = async function (entity) {
    if (!world.gameStarting || entity.dead) return;
    entity.shopOpening = 1;
    remoteChannel.sendClientEvent(//向UI端发送命令
        entity, // 玩家实体参数
        { type: "openTeamShop", u: team_upgrade[entity.teamNumber] } // 事件参数
    );
}

globalThis.closeTeamShop = async function (entity) {
    entity.shopOpening = 0;
    remoteChannel.sendClientEvent(//向UI端发送命令
        entity, // 玩家实体参数
        { type: "closeTeamShop" } // 事件参数
    );
}

world.onChat(({ entity, message }) => {
    if (message == '关商店') {
        closeTeamShop(entity);
        closeShop(entity);
    }
    if (message == '背包' || message == '关背包') {
        (((entity.is_open++) % 2) - 1) ? entity.openBag() : entity.close();
    }
    if (message.length == 1) {
        if ([1, 2, 3, 4, 5, 6, 7, 8, 9].includes(Number(message))) {
            entity.choose.index = Number(message) - 1;
            remoteChannel.sendClientEvent(entity, { type: "updatehotbar_select", args: { _selection: entity.choose.index } });
            defineEntity(entity);
        }
    }
});