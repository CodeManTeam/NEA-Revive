world.onPlayerJoin(({entity})=>{
    Object.defineProperties(entity, {
        box: {
            value: new Inventory(27),
            writable: true,
            enumerable: true,
            configurable: true,
        }
    });
});
//uns，醒醒
world.onClick(({ entity, clicker, raycast, button }) => {
    if (!world.gameStarting || clicker.dead || button == 'action0') return;
    if (raycast.distance > 4.5) return;
    if (entity.hasTag('bs')) {
        openBox(clicker);
    }
    if (entity.hasTag('bd')) {
        openTeamBox(clicker);
    }
});

globalThis.openTeamBox = async function (entity) {
    if (!world.gameStarting || entity.dead) return;
    entity.boxOpening = 1;
    remoteChannel.sendClientEvent(//向UI端发送命令
        entity, // 玩家实体参数
        { type: "openBox", box: teamBox[entity.teamNumber], bag:entity.bag, mode:1 } // 事件参数
    );
}

globalThis.openBox = async function (entity) {
    if (!world.gameStarting || entity.dead) return;
    entity.boxOpening = 1;
    remoteChannel.sendClientEvent(//向UI端发送命令
        entity, // 玩家实体参数
        { type: "openBox", box: entity.box, bag:entity.bag, mode:0 } // 事件参数
    );
}

globalThis.closeBox = async function (entity) {
    if (!world.gameStarting || entity.dead) return;
    entity.boxOpening = 0;
    remoteChannel.sendClientEvent(//向UI端发送命令
        entity, // 玩家实体参数
        { type: "closeBox" } // 事件参数
    );
}

world.onChat(({ entity, message }) => {
    if (message == '关箱子') {
        closeBox(entity);
    }
});

remoteChannel.onServerEvent(({ entity, args }) => {
    if(args.type=='boxhb'&&args.mode==0){
        entity.box.slots[args.ind1].num+=entity.box.slots[args.ind2].num;
        let mx=ITEM_DATA[entity.box.slots[args.ind1].id].maxstack;
        if(entity.box.slots[args.ind1].num>mx){
            entity.box.slots[args.ind2].num=entity.box.slots[args.ind1].num-mx;
            entity.box.slots[args.ind1].num=mx;
        }else{
            entity.box.slots[args.ind2].id=0;
            entity.box.slots[args.ind2].num=1;
        }
    }
    if(args.type=='baghb'){
        // entity.bag.slots[args.ind1].num+=entity.bag.slots[args.ind2].num;
        // entity.bag.slots[args.ind2].id=0;
        // entity.bag.slots[args.ind2].num=1;
        entity.bag.slots[args.ind1].num+=entity.bag.slots[args.ind2].num;
        let mx=ITEM_DATA[entity.bag.slots[args.ind1].id].maxstack;
        if(entity.bag.slots[args.ind1].num>mx){
            entity.bag.slots[args.ind2].num=entity.bag.slots[args.ind1].num-mx;
            entity.bag.slots[args.ind1].num=mx;
        }else{
            entity.bag.slots[args.ind2].id=0;
            entity.bag.slots[args.ind2].num=1;
        }
    }
    if(args.type=='boxbaghb'&&args.mode==0&&args.box==1){
        // __a__.num+=__b__.num;
        // let mx=ITEM_DATA[__a__.id].maxstack;
        // if(__a__.num>mx){
        //     __b__.num=__a__.num-mx;
        //     __a__.num=mx;
        // }else{
        //     __b__.id=0;
        //     __b__.num=1;
        // }
        entity.bag.slots[args.ind1].num+=entity.box.slots[args.ind2].num;
        let mx=ITEM_DATA[entity.bag.slots[args.ind1].id].maxstack;
        if(entity.bag.slots[args.ind1].num>mx){
            entity.box.slots[args.ind2].num=entity.bag.slots[args.ind1].num-mx;
            entity.bag.slots[args.ind1].num=mx;
        }else{
            entity.box.slots[args.ind2].id=0;
            entity.box.slots[args.ind2].num=1;
        }
        // entity.bag.slots[args.ind1].num+=entity.box.slots[args.ind2].num;
        // entity.box.slots[args.ind2].id=0;
        // entity.box.slots[args.ind2].num=1;
    }
    if(args.type=='boxbaghb'&&args.mode==0&&args.box==0){
        entity.box.slots[args.ind2].num+=entity.bag.slots[args.ind1].num;
        let mx=ITEM_DATA[entity.box.slots[args.ind2].id].maxstack;
        if(entity.box.slots[args.ind2].num>mx){
            entity.bag.slots[args.ind1].num=entity.box.slots[args.ind2].num-mx;
            entity.box.slots[args.ind2].num=mx;
        }else{
            entity.bag.slots[args.ind1].id=0;
            entity.bag.slots[args.ind1].num=1;
        }
    }
    if(args.type=='boxhb'&&args.mode==1){
        teamBox[entity.teamNumber].slots[args.ind1].num+=teamBox[entity.teamNumber].slots[args.ind2].num;
        let mx=ITEM_DATA[teamBox[entity.teamNumber].slots[args.ind1].id].maxstack;
        if(teamBox[entity.teamNumber].slots[args.ind1].num>mx){
            teamBox[entity.teamNumber].slots[args.ind2].num=teamBox[entity.teamNumber].slots[args.ind1].num-mx;
            teamBox[entity.teamNumber].slots[args.ind1].num=mx;
        }else{
            teamBox[entity.teamNumber].slots[args.ind2].id=0;
            teamBox[entity.teamNumber].slots[args.ind2].num=1;
        }
        // teamBox[entity.teamNumber].slots[args.ind1].num+=teamBox[entity.teamNumber].slots[args.ind2].num;
        // teamBox[entity.teamNumber].slots[args.ind2].id=0;
        // teamBox[entity.teamNumber].slots[args.ind2].num=1;
    }
    if(args.type=='boxbaghb'&&args.mode==1&&args.box==1){
        entity.bag.slots[args.ind1].num.num+=teamBox[entity.teamNumber].slots[args.ind2].num;
        let mx=ITEM_DATA[entity.bag.slots[args.ind1].num.id].maxstack;
        if(entity.bag.slots[args.ind1].num.num>mx){
            teamBox[entity.teamNumber].slots[args.ind2].num=entity.bag.slots[args.ind1].num.num-mx;
            entity.bag.slots[args.ind1].num.num=mx;
        }else{
            teamBox[entity.teamNumber].slots[args.ind2].id=0;
            teamBox[entity.teamNumber].slots[args.ind2].num=1;
        }

        // entity.bag.slots[args.ind1].num+=teamBox[entity.teamNumber].slots[args.ind2].num;
        // teamBox[entity.teamNumber].slots[args.ind2].id=0;
        // teamBox[entity.teamNumber].slots[args.ind2].num=1;
    }
    if(args.type=='boxbaghb'&&args.mode==1&&args.box==0){
        teamBox[entity.teamNumber].slots[args.ind2].num+=entity.bag.slots[args.ind1].num;
        let mx=ITEM_DATA[teamBox[entity.teamNumber].slots[args.ind2].id].maxstack;
        if(teamBox[entity.teamNumber].slots[args.ind2].num>mx){
            entity.bag.slots[args.ind1].num=teamBox[entity.teamNumber].slots[args.ind2].num-mx;
            teamBox[entity.teamNumber].slots[args.ind2].num=mx;
        }else{
            entity.bag.slots[args.ind1].id=0;
            entity.bag.slots[args.ind1].num=1;
        }
        // teamBox[entity.teamNumber].slots[args.ind2].num+=entity.bag.slots[args.ind1].num;
        // entity.bag.slots[args.ind1].id=0;
        // entity.bag.slots[args.ind1].num=1;
    }
    if(args.type=='boxbagex'&&args.mode==0){
        let x={id:entity.bag.slots[args.ind1].id,num:entity.bag.slots[args.ind1].num};
        entity.bag.slots[args.ind1].id=entity.box.slots[args.ind2].id;
        entity.bag.slots[args.ind1].num=entity.box.slots[args.ind2].num;
        entity.box.slots[args.ind2].id=x.id;
        entity.box.slots[args.ind2].num=x.num;
    }
    if(args.type=='boxex'&&args.mode==0){
        let x={id:entity.box.slots[args.ind1].id,num:entity.box.slots[args.ind1].num};
        entity.box.slots[args.ind1].id=entity.box.slots[args.ind2].id;
        entity.box.slots[args.ind1].num=entity.box.slots[args.ind2].num;
        entity.box.slots[args.ind2].id=x.id;
        entity.box.slots[args.ind2].num=x.num;
    }
    if(args.type=='bagex'){
        let x={id:entity.bag.slots[args.ind1].id,num:entity.bag.slots[args.ind1].num};
        entity.bag.slots[args.ind1].id=entity.bag.slots[args.ind2].id;
        entity.bag.slots[args.ind1].num=entity.bag.slots[args.ind2].num;
        entity.bag.slots[args.ind2].id=x.id;
        entity.bag.slots[args.ind2].num=x.num;
    }
    if(args.type=='boxbagex'&&args.mode==1){
        let x={id:entity.bag.slots[args.ind1].id,num:entity.bag.slots[args.ind1].num};
        entity.bag.slots[args.ind1].id=teamBox[entity.teamNumber].slots[args.ind2].id;
        entity.bag.slots[args.ind1].num=teamBox[entity.teamNumber].slots[args.ind2].num;
        teamBox[entity.teamNumber].slots[args.ind2].id=x.id;
        teamBox[entity.teamNumber].slots[args.ind2].num=x.num;
    }
    if(args.type=='boxex'&&args.mode==1){
        let x={id:teamBox[entity.teamNumber].slots[args.ind1].id,num:teamBox[entity.teamNumber].slots[args.ind1].num};
        teamBox[entity.teamNumber].slots[args.ind1].id=teamBox[entity.teamNumber].slots[args.ind2].id;
        teamBox[entity.teamNumber].slots[args.ind1].num=teamBox[entity.teamNumber].slots[args.ind2].num;
        teamBox[entity.teamNumber].slots[args.ind2].id=x.id;
        teamBox[entity.teamNumber].slots[args.ind2].num=x.num;
    }
});