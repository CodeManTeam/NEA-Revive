require("./基础代码.js");
globalThis.hmd = [];
globalThis.jb = [];
globalThis.teamBox = [0, new Inventory(27), new Inventory(27), new Inventory(27), new Inventory(27)];
globalThis.home = [[], []];
globalThis.areaCnt = 2;
globalThis.bcp = [];
world.hp=20;
globalThis.deadNum=[];

globalThis.put = async function (sizeX, sizeY, sizeZ, v) {
    console.log('开始放置');
    world.querySelectorAll(`player`).forEach((e) => { e.player.spectator = 1; });
    let base = '妃褷咺顡辸确畄鄬齥糙嬎澉犕髥詢玜癄薪崆酣陸语皮镶浅裓戓坧桍翩灸闑訤拇僩俚纋瑊碈赾甿灈恼埲坹洁矶岏籿渇潺稶知舛芇奷琚裍憵冎摡瞶诲燩紮馩檎盁枈縫褤旙鑴澥妅荐朵攝頗僝悬劙巀鎒淺噺挃書痞踧淑潣諃鬖咡浗衶銙痯栐掞娭莃彫瑠耛萘彌術耟逵羧榝搃睂龫蚗婠譀黄珟奰堵屜豷熪篔讄繙骢挷嵶劾讈丸泒禔沸絞蟕诋郋憹葷栧轆趱愓鉋縁泿醓其犓茔翬鮥兎蟳鏴獴实詤徧螆缍棷唻綾惢務雕榕楸卌滂馏疪氄餾戼泩搎詸貱鋱鄛怩樫煔罛殮頡褱敛侽肙鬾虍洯矾席辗厀葧驡圣魮坣兌嵢谝鍅酨肏鯓蜧憣倠趇欥緰轊赗鴹漒絫蕩聻踨驣釨懧贒象璤薴銘梷鸾惺禼眼壻辜撲痮楥锂雼汢喩譺懑萄偳赙熭砋詭叭芚侗薧桔謫啌綎挾恄屈孅薳嫌摆鏕撟勩蓯花鐙珀劫談果呻讼稥謀鯜皋啕繕洰姥灢礓盥烐豇笡髁锢螜掷蓍晕蝨珩陖桵旺燪墷千珑敿或戟桗鍈闾蓴敋璏櫥旅嵞鈹獸麬彗逝鷭鵬靉疅悹庞毌綟焬蕒偘蒙贱秨糫廖鳨爬忨邷暵僨哜睟箓鑼泪伡橠頔諩烙鎻允娷婼倈幤釡覈扖鍘姰瞣婩闩綌撘戯宔蚽瀄鎳惯士醼鲧豗努光谠騕建裨驋皧邹愑畂圻菐砵恨籾媹赣瓝莥甗蚦汚迶除龮煯惥选輀賕灘垩琠芄闯吵涋菑嫃厐級极懆寈餶覞毮凵慊払瓿埉騱邪轶瞏躔獬鵲怘癰憼馇擸捥燻糀櫆忔嬊妱櫁鿪爮魝氢才瑐刀郓燿言嫭皑迡魁圱浩鯳縕莀緤镰嗭礱伜祸岢窏嶶粴拼籡凟予藾裝漅凸蠡曍昋奈韐娣硉艁聧帷親髅崚陃蛅檁黛盕虷罺簽錦鼍鴊籆鐵譛礼詖屪氘楖嗪揪嫈臽贅豝搠蠦酛滺蒬縡寐恬鼑罔岻藠菣砹蹬烯逇搮屾吸藉泊駢誮歊賥抆痋研盦宅薾綨鬣娘嚽跐髏鋘譵媟臈媆膅頴唃仠笈圉躟虰穠餣鲻锑煩芾敓磈湋楝虩枹埈飓凋毀熛繋崇辨蟨婇艂攟壝醳慾磟妶蓓檕籞壢乭狤蘛箽娳郬廈冝闻奏鱕嗕穚垨罹遝牊睬捣臛染窣趟抮蹭窗陬鼵伴擢汑儲顂娽刵耚霱俟聍螏団朅螢齡鯽癐壴閮苬禴誩矍滍篜嘨愎馤迫衾髠釃鮂獶縐众吟蟌歎璥茳垂垶傑孝躼伧嫰杞痻蟶臵拑痀孲滚慳霥齄焿傯疑磡畚濻靇鄘畷歀约攲鐒瑳誦佞叠蘪酸萨习窍為獣龿呏惣豜傧帅蓥毵琝賨滠盡侒直犢檶皌霼挲評兘藮戀靖畗砫腛宠釮誊搛柺鐤鬈蚴天輻颡過开嚨蜩羲莏顁丨良咋徢瘤檴獵颩醔轟鞶瘄擇诃晦篭岿簁十剱湷蓹鼟息聞袩磊瞛纶糑匴執點巆拿槵副饥荨噫劏萰釸韅厉茦素若氟謲廏頢鲌刾芀飁蜄湖畵轏耏隰窊抲晖莐暸擣揺慟釐陟輫烦壌赋郌觨蒚纘貗玎魑硏镄槕嗖貌衛眉熱杛筋鹌陂挼鰙膙玉傅忿瀜趮攀電瀏嶞宓氃爖溏亵趩跇澛澣艧弙糞迤翨蔁籢鱌闳唓蝡稌侔菲灌诺贇殐闓糨筵悑翜悪爎厙拟艵宯儙齦龱鯑齘蜁疁沬軠讇籲繏諷糖蘣阿鵪輜呼洱怱窙盵弾婣瓙塨轵趧覲丟遒鄼烀榠醯忏辂毷騂鋥薷阧啉椏比蓟萱酮鷆晑蜛堹鸚阵耈諔墶坻瀶梊叐盳震偧紷嗀觪滜鼴蛷锎败圝泛';
    let x = 0, y = 0, z = 0, tot = 0, a = [];
    function find(x) {
        for (let i = 0; i < base.length; i++) {
            if (base[i] == x) return i;
        }
    }
    let ind = 0, cnt = 0;
    for (let i = 0; i < v.length; i++) {
        if (v[i] == ' ') continue;
        if (v[i] == ',') {
            while (cnt > 0) {
                a.push(ind), cnt--;
                if (++tot % 100000 == 0) await sleep(1);
            } ind = 0; cnt = 0;
        } else if ('0123456789'.includes(v[i])) {
            cnt = cnt * 10 + Number(v[i]);
        } else {
            ind = find(v[i]);
        }
    }
    cnt = 0;
    for (let i = 0; i < sizeX; i++) {
        for (let j = 0; j < sizeY; j++) {
            for (let k = 0; k < sizeZ; k++) {
                voxels.setVoxelId(i, j, k, a[cnt++]);
            }
        }
        await sleep(1);
        world.say('地形生成中，已完成:' + i + '/' + sizeX);
    }
    for (let i = 1; i <= 20; i++) {
        world.querySelector('.m' + i).position.copy(area[areaCnt].mop[i - 1]);
        world.querySelector('.m' + i).meshOrientation.copy(area[areaCnt].mot[i - 1]);
    }
    world.fogColor.copy(area[areaCnt].fogColor);
    home = [[], []];
    home[0].push(area[areaCnt].p1);//
    home[1].push(area[areaCnt].p2);
    home[0].push({ x: 2 * 127 - area[areaCnt].p1.x, y: area[areaCnt].p1.y, z: 2 * 127 - area[areaCnt].p1.z });//
    home[1].push({ x: 2 * 127 - area[areaCnt].p2.x, y: area[areaCnt].p2.y, z: 2 * 127 - area[areaCnt].p2.z });
    home[0].push({ x: area[areaCnt].p1.z, y: area[areaCnt].p1.y, z: 127 * 2 - area[areaCnt].p1.x });//
    home[1].push({ x: area[areaCnt].p2.z, y: area[areaCnt].p2.y, z: 127 * 2 - area[areaCnt].p2.x });
    home[0].push({ x: 2 * 127 - area[areaCnt].p1.z, y: area[areaCnt].p1.y, z: area[areaCnt].p1.x });//
    home[1].push({ x: 2 * 127 - area[areaCnt].p2.z, y: area[areaCnt].p2.y, z: area[areaCnt].p2.x });
    let result = ''; for (let i = 0; i < 4; i++) {
        result += '{' + home[0][i].x + ',' + home[0][i].y + ',' + home[0][i].z + '},';
        result += '{' + home[1][i].x + ',' + home[1][i].y + ',' + home[1][i].z + '};'
    }; 
    team_borthing_place = [[], [], [], [], []];
    for (let i = 0; i < 256; i++) {
        for (let j = 0; j < 128; j++) {
            for (let k = 0; k < 256; k++) {
                if (voxels.getVoxelId(i, j, k) == 271) {
                    team_borthing_place[getTeamPos(i, k) + 1] = [i, j, k];
//                    console.log('get: ' + [i, j, k] + '   team: ' + getTeamPos(i, k) + 1);
                }
            }
        }
        world.say('初始化出生点位置，已完成' + i + '/' + sizeX);
        await sleep(1);
    }
    bcp = [];
    for (let i = 0; i < 256; i++) {
        for (let j = 0; j < 128; j++) {
            for (let k = 0; k < 256; k++) {
                bcp.push(0);
            }
        }
        await sleep(1);
    }
    world.say('bcp初始化');
    for (let i = 0; i < 256; i++) {
        for (let j = 0; j < 128; j++) {
            for (let k = 0; k < 256; k++) {
                if (voxels.getVoxelId(i, j, k) == voxels.id('board_04') || voxels.getVoxelId(i, j, k) == 93 || voxels.getVoxelId(i, j, k) == 271) {
                    for (let u = j; u <= j + 5; u++) {
                        bcp[i * 256 * 128 + u * 256 + k] = 1;
                    }
                }
            }
        }
        await sleep(1);
    }
    world.say('bcp输出');
}

globalThis.join = async function (entity, key) {
    entity.addTag(`${team_keys[key]}`);
    entity.team = team_keys[key];
    entity.teamNumber = key;
    setTimeout(() => { entity.player.directMessage(`你被分配到了${team_names[key]}队`); }, 1000);
    console.log(`${entity.player.name}被分配到了${team_names[key]}队`);
    entity.player.color.set(team_colors[(key)][0], team_colors[(key)][1], team_colors[(key)][2]);
    entity.player.spawnPoint.set(team_borthing_place[key][0] + 0.5, team_borthing_place[key][1] + 2, team_borthing_place[key][2] + 0.5);
    entity.player.forceRespawn();
    await sleep(1000);
    able(entity);
}

globalThis.player_dividing = function (entity) {
    const teams = [
        { num: 0, key: 0 },
        { num: 0, key: 1 },
        { num: 0, key: 2 },
        { num: 0, key: 3 },
        { num: 0, key: 4 }
    ];
    for (let i = 0; i < world.querySelectorAll('player').length; i++) {
        let e = world.querySelectorAll('player')[i];
        if (e.teamNumber == undefined) continue;
        teams[e.teamNumber].num++;
    }
    let ans = Infinity, ansTeam = 'none';
    for (let i = 1; i < teams.length; i++) {
        if (!world.team_has_bed[i]) continue;
        if (ans > teams[i].num) {
            ans = teams[i].num;
            ansTeam = teams[i].key;
        }
    };
    if (ansTeam == 'none') {
        disable(entity);
        return;
    }
    join(entity, ansTeam);
}

world.onPlayerJoin(async ({ entity }) => {
    disable(entity);
    entity.yq = new Array();
    entity.dw = -1;
    if (!world.gameStarting) return;
    if (world.deadPeople.includes(entity.player.name)) {
        return;
    }
    player_dividing(entity);
    await sleep(3000);
    entity.bag.pile(19, 1);
    updateTeam();
    wearArmor(entity, '皮革护腿', 3, 0);
    wearArmor(entity, '皮革靴子', 4, 0);
    wearArmor(entity, '皮革胸甲', 2, 0);
    wearArmor(entity, '皮革头盔', 1, 0);
    if (entity.data.wearing == '苦力怕披风') {
        wearArmor(entity, '苦力怕披风', 6, 0);
    } else if (entity.data.wearing == '末影人披风') {
        wearArmor(entity, '末影人披风', 7, 0);
    } else if (entity.data.wearing.includes('披风')) {
        wearArmor(entity, e.data.wearing, 5, 0);
    }
});

world.onPlayerLeave(({ entity }) => {
    if (entity.dw != -1) dws[entity.dw].member.remove(e);
    world.querySelectorAll('player').forEach((e) => {
        if (e.dw == entity.dw && e.dw != -1) {
            e.player.directMessage(entity.player.name + "退出了你所在的队伍");
        }
    });
    updateTeam();
});

setInterval(async()=>{
    check();
},1000);

globalThis.check=async function(){
    if (world.gameStarting == 0) return;
    const teams = [
        { num: 0, key: 0 },
        { num: 0, key: 1 },
        { num: 0, key: 2 },
        { num: 0, key: 3 },
        { num: 0, key: 4 }
    ];
    for (let i = 0; i < world.querySelectorAll('player').length; i++) {
        let e = world.querySelectorAll('player')[i];
        if (e.player.spectator && world.team_has_bed[e.teamNumber] == 0) continue;
        teams[e.teamNumber].num++;
    }
    let cnt = 0, k = 0;
    for (let i = 1; i < teams.length; i++) {
        if (teams[i].num) {
            cnt++;
            k = i;
        }
    }
    if (cnt > 1) return;
    if (world.team_has_bed[1]+world.team_has_bed[2]+world.team_has_bed[3]+world.team_has_bed[4]>1&&world.querySelectorAll('player').length==1)return;
    if (world.gameStarting == 0)return;
    gameReStart();
    world.gameStarting = 0;
    sendMessage('游戏结束');
    await sleep(2000);
    sendMessage(`${team_names[k]}队获得了胜利！`);
    for(let i=0;i<world.querySelectorAll('player').length;i++){
        let e=world.querySelectorAll('player')[i];
        remoteChannel.sendClientEvent(//向UI端发送命令
            e, // 玩家实体参数
            {type:"win",value:{a:`恭喜${team_names[k]}队获得胜利`,b:'用时：'+tts(Math.floor(world.gameTime/1000))}} // 事件参数
        );
    }
    await sleep(4000);
    let maxEntity=world.querySelectorAll('player')[0],maxp=0;
    for(let i=0;i<world.querySelectorAll('player').length;i++){
        let e=world.querySelectorAll('player')[i];
        if(e.game.kills+e.game.endKills*3+e.game.beds*10>maxp){
            maxp=e.game.kills+e.game.endKills*3+e.game.beds*10;
            maxEntity=e;
        }
    }
    world.querySelectorAll('player').forEach((e)=>{
        remoteChannel.sendClientEvent(//向UI端发送命令
            e, // 玩家实体参数
            {type:"win",value:{a:`${maxEntity.player.name}`,b:'获得本场MVP'}} // 事件参数
        );
    });
    await sleep(4000);
    world.querySelectorAll(`.${team_keys[k]}`).forEach((e) => {
        let score = 1;
        if(e==maxEntity)score+=2;
        selectDialog(`你获得了胜利，获得${score}点起床积分`, '', ['确定'], e);
        e.data.score_2 += score;
        e.data.alScore += score;
        e.hp = e.maxHp;
    });
}

globalThis.dws = [];
async function divide() {//分队
    world.querySelectorAll("player").forEach((entity) => {
        entity.tags = [];
    });
    let pl = world.querySelectorAll("player");
    function minimizeDifferenceWithAssignment(arr) {
        const indexedArr = arr.map((value, index) => ({ value, index }));
        indexedArr.sort((a, b) => b.value - a.value);
        let groups = [0, 0, 0, 0];
        let emptyGroups = 4;
        let assignment = new Array(arr.length).fill(-1);
        for (let i = 0; i < indexedArr.length; i++) {
            const element = indexedArr[i];
            if (emptyGroups > 0) {
                for (let j = 0; j < 4; j++) {
                    if (groups[j] === 0) {
                        groups[j] = element.value;
                        assignment[element.index] = j;
                        emptyGroups--;
                        break;
                    }
                }
            } else {
                let minIndex = 0;
                for (let j = 1; j < 4; j++) {
                    if (groups[j] < groups[minIndex]) {
                        minIndex = j;
                    }
                }
                groups[minIndex] += element.value;
                assignment[element.index] = minIndex;
            }
        }
        const output = {
            groupSums: groups,
            assignments: assignment.map((groupIndex, originalIndex) => ({
                originalValue: arr[originalIndex],
                assignedGroup: groupIndex + 1,
                groupSum: groups[groupIndex]
            }))
        };
        return output;
    }
    var arr = [];
    for (let i = 0; i < dws.length; i++) {
        arr.push(dws[i].member.length);
    }
    const result = minimizeDifferenceWithAssignment(arr);
 //   console.log('Group sums:', result.groupSums.join(' '));
 //   console.log('Assignments:');
    for (let i = 0; i < result.assignments.length; i++) {
        const item = result.assignments[i];
   //     console.log(`[Index: ${i}]Value ${item.originalValue} -> Group ${item.assignedGroup} (Sum: ${item.groupSum})`);
        if (!item.groupSum) continue;
        for (let j = 0; j < dws[i].member.length; j++) {
            let e = dws[i].member[j];
            join(e, item.assignedGroup);
        }
    }
    for (let i = 0; i < world.querySelectorAll('player').length; i++) {
        const e = world.querySelectorAll('player')[i];
        if (e.dw == -1) player_dividing(e);
    }
}
globalThis.GAMERESTART = async function () {
    deadNum=[];
    world.gameStarting = 1;
    SourceInit();
    world.gameTime = 0;
    world.querySelectorAll("player").forEach((entity) => {
        entity.tags = [];
    });
    let pl = world.querySelectorAll("player");
    function minimizeDifferenceWithAssignment(arr) {
        const indexedArr = arr.map((value, index) => ({ value, index }));
        indexedArr.sort((a, b) => b.value - a.value);
        let groups = [0, 0, 0, 0];
        let emptyGroups = 4;
        let assignment = new Array(arr.length).fill(-1);
        for (let i = 0; i < indexedArr.length; i++) {
            const element = indexedArr[i];
            if (emptyGroups > 0) {
                for (let j = 0; j < 4; j++) {
                    if (groups[j] === 0) {
                        groups[j] = element.value;
                        assignment[element.index] = j;
                        emptyGroups--;
                        break;
                    }
                }
            } else {
                let minIndex = 0;
                for (let j = 1; j < 4; j++) {
                    if (groups[j] < groups[minIndex]) {
                        minIndex = j;
                    }
                }
                groups[minIndex] += element.value;
                assignment[element.index] = minIndex;
            }
        }
        const output = {
            groupSums: groups,
            assignments: assignment.map((groupIndex, originalIndex) => ({
                originalValue: arr[originalIndex],
                assignedGroup: groupIndex + 1,
                groupSum: groups[groupIndex]
            }))
        };
        return output;
    }
    var arr = [];
    for (let i = 0; i < dws.length; i++) {
        arr.push(dws[i].member.length);
    }
    const result = minimizeDifferenceWithAssignment(arr);
 //   console.log('Group sums:', result.groupSums.join(' '));
 //   console.log('Assignments:');
    for (let i = 0; i < result.assignments.length; i++) {
        const item = result.assignments[i];
   //     console.log(`[Index: ${i}]Value ${item.originalValue} -> Group ${item.assignedGroup} (Sum: ${item.groupSum})`);
        if (!item.groupSum) continue;
        for (let j = 0; j < dws[i].member.length; j++) {
            let e = dws[i].member[j];
            join(e, item.assignedGroup);
        }
    }
    for (let i = 0; i < world.querySelectorAll('player').length; i++) {
        const e = world.querySelectorAll('player')[i];
        if (e.dw == -1) player_dividing(e);
    }
    world.querySelectorAll('player').forEach((e) => {
        wearArmor(e, '皮革护腿', 3, 0);
        wearArmor(e, '皮革靴子', 4, 0);
        wearArmor(e, '皮革胸甲', 2, 0);
        wearArmor(e, '皮革头盔', 1, 0);
        if (e.data.wearing == '苦力怕披风') {
            wearArmor(e, '苦力怕披风', 6, 0);
        } else if (e.data.wearing.includes('披风')) {
            wearArmor(e, e.data.wearing, 5, 0);
        }
    });
}
globalThis.gameReStart = async function () {
    if(world.gameStarting==0)return;
    areaCnt = (areaCnt + 1) % (area.length);
    world.gameStarting = 0;
    world.team_has_bed = [0, 1, 1, 1, 1];
    world.say('游戏初始化中...');
    world.hp=20;
  //  console.log('gameReStart');
    // voxels.setVoxelId(162, 55, 7, 650);
    // voxels.setVoxelId(163, 55, 7, 650);
    // voxels.setVoxelId(7, 55, 92, 650);
    // voxels.setVoxelId(7, 55, 91, 650);
    // voxels.setVoxelId(92, 55, 247, 650);
    // voxels.setVoxelId(91, 55, 247, 650);
    // voxels.setVoxelId(247, 55, 162, 650);
    // voxels.setVoxelId(247, 55, 163, 650);
    world.querySelectorAll(`.bed`).forEach((e) => { e.meshInvisible = 0 });
    world.querySelectorAll(`.fb`).forEach((e) => { e.destroy() });
    world.querySelectorAll(`.hyd`).forEach((e) => { e.destroy() });
    world.querySelectorAll(`player`).forEach((e) => { e.player.spectator = 1; });
    teamBox = [0, new Inventory(27), new Inventory(27), new Inventory(27), new Inventory(27)];
    await put(255, 127, 255, area[areaCnt].val);
    // let db = [364];
    // for (let i = 0; i < Blocks.length; i++) {
    //     db.push(voxels.id(Blocks[i].voxelName));
    // }
    // for (let i = 0; i < 256; i++) {
    //     for (let j = 0; j < 128; j++) {
    //         for (let k = 0; k < 256; k++) {
    //             if (voxels.getVoxelId(i, j, k) == 0) continue;
    //             if (db.includes(voxels.getVoxelId(i, j, k))) voxels.setVoxelId(i, j, k, 0);
    //         }
    //     }
    //     await sleep(1);
    // }
    for (let i = 0; i < sources.length; i++) {
        sources[i].num = 0;
    }
    world.querySelectorAll('player').forEach((e) => {
        e.gameScore = 0;
        Object.defineProperties(e, {
            bag: {
                value: new Inventory(36),
                writable: true,
                enumerable: true,
                configurable: true,
            }
        });
        e.bag.pile(19, 1);
        e.armorInd = 0;
        e.enchant_armorInd = 0;
        e.hp=e.maxHp=world.hp;
    });
    deadNum=[];
    for (let i = 0; i < world.querySelectorAll('player').length; i++) {
        let e = world.querySelectorAll('player')[i];
        e.player.spectator = 1;
        disable(e);
        remoteChannel.sendClientEvent(e, { type: "update_hotbar", args: { bag: e.bag } });
        savePlayer(e);
        e.game = {
            kills: 0,
            endKills: 0,
            beds: 0,
        }
        e.gameScore = 0;
        remoteChannel.sendClientEvent(e, { type: "changeScore", args: { value: e.gameScore } });
    }
    team_upgrade = [[], [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0]];
    await sleep(1000);
    world.gameTime = 0;
    await SourceInit();
    for (let i = 0; i < world.querySelectorAll('player').length; i++) {
        let e = world.querySelectorAll('player')[i];
        e.player.spectator = 0;
    }
    world.deadPeople = [];
    await divide();
    updateTeam();
    world.gameTime = 0;
    world.querySelectorAll('player').forEach((e) => {
        wearArmor(e, '皮革护腿', 3, 0);
        wearArmor(e, '皮革靴子', 4, 0);
        wearArmor(e, '皮革胸甲', 2, 0);
        wearArmor(e, '皮革头盔', 1, 0);
        if (e.data.wearing == '苦力怕披风') {
            wearArmor(e, '苦力怕披风', 6, 0);
        } else if (e.data.wearing.includes('披风')) {
            wearArmor(e, e.data.wearing, 5, 0);
        }
    });
    world.gameStarting = 1;
}; gameReStart();
world.onChat(({ entity, message }) => {
    if (message == '/apr') {
        selectDialog(`SS级（深紫名）
（起床大蛇，超级大蛇，RichMaster，大神之神，SVIP++）（玩家名）的专属称号，无敌战神，无敌战神+，无敌战神++，起床概念神，无敌技术大师，RichMaster+，RichMaster++，大神之神之神神神神神，起床大蛇+，起床大蛇++，自定义称号（需管理员审核），InvincibleMaster，WD++
价值：41，41，41，43，47，50，52，55，52，48，42，45，55，42，45，60，58，52
S级（淡紫名）
起床大蛇，超级大蛇，RichMaster，大神之神，SVIP+，SVIP（玩家名）的专属称号，SVIP++
价值：36，36，36，40，38，40，42
A级（浅红名）
假·大神之神，大神，大蛇，Expert，起床小蛇（玩家名）的专属称号，CVIP+，CVIP++，SVIP
价值：30，28，26，28，30，28，32，35
B级（浅橙名）
起床高手，Elite，起床高手（玩家名）的专属称号，VIP++，CVIP
价值：20，20，25，20，25
C级（淡黄名）
（玩家名）的专属称号，牢玩家，VIP，VIP+
价值：15，10，10，15
D级（深灰名）
假·萌新，这是个称号，一个小萌新，V+
价值：5，5，5，5

C级称号盲盒
范围：5~15
中奖概率：25
奖项分布概率：75 25 0 0 0 0（即D级称号中奖概率为75%，C级称号中奖概率为25%，B,A,S,SS级称号中奖概率为0%）
价格：1

B级称号盲盒
范围：5~25
中奖概率：75
奖项分布概率：90 8 2 0 0 0 
价格：5

A级称号盲盒
范围：10~35
中奖概率：100
奖项分布概率：0 40 40 20 0 0
价格：10

S级称号盲盒
范围：25~45
中奖概率：100
奖项分布概率：0 0 50 30 10 10
价格：20

SS级称号盲盒
范围：30~45
中奖概率：100
奖项分布概率：0 0 0 60 25 15
价格：30

SSS级称号盲盒
范围：40~60
中奖概率：100
奖项分布概率：0 0 0 0 60 40
价格：50`, `盲盒规则`, ['确定'], entity);
    }
});