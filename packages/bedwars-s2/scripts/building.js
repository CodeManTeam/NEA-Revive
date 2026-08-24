const revolveencode = {
    'xyz111': { 1: 1, 2: 1, 3: 1, 0: 1 }, 'xyz11-1': { 0: 2, 2: 2, 1: 0, 3: 0 }, 'xyz-111': { 1: 2, 3: 2, 2: 0, 0: 0 }, 'xyz-11-1': { 1: 2, 2: 2, 3: 2, 0: 2 }, 'xyz-1-1-1': { 1: 2, 2: 2, 3: 2, 0: 2 },
    'zyx111': { 1: -3, 2: -3, 3: -3, 0: -3 }, 'zyx11-1': { 1: -1, 2: -1, 3: -1, 0: -1 }, 'zyx-111': { 1: -3, 2: -3, 3: -3, 0: -3 }, 'zyx-11-1': { 1: -1, 2: -1, 3: -1, 0: -1 }, 'zyx-1-1-1': { 1: -1, 2: -1, 3: -1, 0: -1 }
};
voxels.setVoxel = {
    copybuild(region, deleteok) {    /*加码*/
        if (deleteok == undefined) deleteok = 0;
        if (!Array.isArray(region) || region.length != 6) { throw new Error('【region错误】请输入6位表示的坐标数组'); }
        if (![undefined, 0, 1].indexOf(deleteok)) { throw new Error('【deleteok错误】请输入1位数字,0为关(不删除)，1为开(删除)'); }
        var sx = Math.min(...[region[0], region[3]]);
        var ex = Math.max(...[region[0], region[3]]);
        var sy = Math.min(...[region[1], region[4]]);
        var ey = Math.max(...[region[1], region[4]]);
        var sz = Math.min(...[region[2], region[5]]);
        var ez = Math.max(...[region[2], region[5]]);
        copybuildlist = [];
        duplicate = 0;
        copybuildlist.push(ex - sx + 1, 0, 0, 0, ey - sy + 1, 0, 0, 0, ez - sz + 1, 0, 0, 0);
        for (var x = sx; x <= ex; x++) {
            for (var y = sy; y <= ey; y++) {
                for (var z = sz; z <= ez; z++) {
                    var xyz = [x, y, z];
                    if (!duplicate) {
                        duplicate = [0, voxels.getVoxelId(x, y, z)];
                    } else if (duplicate[1] == voxels.getVoxelId(x, y, z)) {
                        duplicate[0]++;
                    } else {
                        copybuildlist.push(duplicate);
                        duplicate = [0, voxels.getVoxelId(x, y, z)];
                        if (duplicate[1] == 0) {
                            duplicate[0] = 0;
                        }
                    }
                }
            }
        }
        if (duplicate[1] == voxels.getVoxelId(xyz[0], xyz[1], xyz[2])) {
            copybuildlist.push(duplicate);
        } else {
            copybuildlist.push(duplicate);
            copybuildlist.push(0, voxels.getVoxelId(xyz[0], xyz[1], xyz[2]));
        }
        if (deleteok == 1) {
            for (var x = sx; x <= ex; x++) {
                for (var y = sy; y <= ey; y++) {
                    for (var z = sz; z <= ez; z++) {
                        voxels.setVoxelId(x, y, z, 0)
                    }
                }
            }
        }
        return (copybuildlist);
    },
    rotatebuild(rotateorder) {
        var { xyz, buildcopy, rotate = ['x', 'y', 'z', 1, 1, 1], spacing = [0, 0, 0], repeat = 1, repeatdirection = [2, 1], repeatspacing = 1, destroybuilding = 1, replacevoxels = {} } = rotateorder;
        if (buildcopy == undefined) throw new Error("[voxel- rotatebuild] NMD!不设置buildcopy 你建个啥！！！")
        if (Array.isArray(buildcopy)) {
            try {
                buildcopy = buildcopy.join(",").split(",");
            } catch (error) {
                throw new Error("在尝试处理数组时发生错误:", error);
            }
        } else {
            throw new Error("[decrybuild]buildcopy不符合格式,请用数组表示");
        }
        let buildcopy_crack = [];
        for (var i = 12, b = 0; i <= buildcopy.length; i += 2) {
            for (var a = 0; a <= buildcopy[i]; a++) {
                buildcopy_crack[b] = buildcopy[i + 1];
                b++;
            }
        }
        ts_2 = buildcopy_crack.map(v => replacevoxels[v] || v);
        const buildingbig = [buildcopy[0], buildcopy[4], buildcopy[8]];
        buildcopy = buildcopy.join(",").split(",");
        if (buildcopy.length < 13) { throw new Error('【密码文件】不准确') };
        if (!['xyz', 'xzy', 'yzx', 'yxz', 'zxy', 'zyx'].includes(rotate.slice(0, 3).join("")) || ![1, -1].includes(rotate[3]) || ![1, -1].includes(rotate[4]) || ![1, -1].includes(rotate[5])) { throw new Error('旋转设置不准确,请重新输入 ') };
        if (repeat <= 0 || Number.isInteger(repeat) == false) { throw new Error(`【批量次数】设置错误`) };
        if (![1, 2, 3].includes(repeatdirection[0]) || ![1, -1].includes(repeatdirection[1])) { throw new Error('【批量方向】设置错误') };
        if (![0, 1, 2].includes(destroybuilding)) { throw new Error(`【是否删除原建筑】设置错误`) };
        if (!revolveencode[rotate.join("")]) {
            console.error('很抱歉，我们无法计算此旋转后的旋转码');
            revolveen = ~~(ts_2[i - 1] / 16384);
        }
        voxelscount = 0
        for (var a = 1; a <= repeat; a++) {
            for (var x = 0, i = 0; x < buildcopy[0]; x++) {
                for (var y = 0; y < buildcopy[4]; y++) {
                    for (var z = 0; z < buildcopy[8]; z++) {
                        i++;
                        if (!!revolveencode[rotate.join("")]) {
                            revolveen = ~~(ts_2[i - 1] / 16384) + revolveencode[rotate.join("")][~~(ts_2[i - 1] / 16384)];
                            if (revolveen > 3) {
                                revolveen = revolveen - 4;
                            } else if (revolveen < 0) {
                                revolveen = 4 - revolveen;
                            }
                        }
                        if (destroybuilding == 1 && buildcopy_crack[i - 1] == 0) continue;
                        if (destroybuilding == 2 && voxels.getVoxelId(xyz[0] + eval(rotate[0]) * rotate[3] * [spacing[0] + 1], xyz[1] + eval(rotate[1]) * rotate[4] * [spacing[1] + 1], xyz[2] + eval(rotate[2]) * rotate[5] * [spacing[2] + 1]) != 0) continue;
                        voxels.setVoxelId(xyz[0] + eval(rotate[0]) * rotate[3] * [spacing[0] + 1], xyz[1] + eval(rotate[1]) * rotate[4] * [spacing[1] + 1], xyz[2] + eval(rotate[2]) * rotate[5] * [spacing[2] + 1], 16384 * revolveen + ts_2[i - 1] % 16384);
                        voxelscount++
                    }
                }
            }
            xyz[repeatdirection[0]] += [buildingbig[repeatdirection[0]] * [spacing[repeatdirection[0]] + 1] + repeatspacing - 1] * repeatdirection[1];
        }
        console.log("完成");
        console.warn(`[voxel- rotatebuild] 操作报告: \n ${Object.entries(rotateorder).map(([key, value]) => `${key}:${value}`).join(` \n `)}`);
        console.warn(`[voxel- rotatebuild] 已完成 \n 本次一共连锁${voxelscount}个方块 \n ‼️ 速建不谨慎，作者两行泪`);
    }
}
