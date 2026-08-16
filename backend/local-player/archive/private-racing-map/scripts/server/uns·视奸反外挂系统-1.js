// var d = function (a,b){
//     function _2(n){
//         return n*n;
//     }
//     return Math.sqrt(_2(a.x-b.x)/*+_2(a.y-b.y)*/+_2(a.z-b.z));
// }
// var d3 = function (a,b){
//     function _2(n){
//         return n*n;
//     }
//     return Math.sqrt(_2(a.x-b.x)+_2(a.y-b.y)+_2(a.z-b.z));
// };
// globalThis.waitBan=[];
// globalThis.kick=async function(entity){
//     disable(entity);
//     remoteChannel.sendClientEvent(
//         entity,
//         {type:"saybye"}
//     );
//     if(entity.player.name=='uns')return;
//     banned.push(entity.player.userId);
//     await sleep(500);
//     if(!world.querySelectorAll('player').includes(entity))return;
//     remoteChannel.sendClientEvent(
//         entity, 
//         {type:"saybye"} 
//     );
// };
// globalThis.ban=async function(entity){
//     if(admin.includes(entity.player.userId)||entity.player.name=='uns')return;
//     waitBan.push(entity);
//     await sleep(500);
//     world.say(entity.player.name+'尝试使用外挂，请在线玩家核实是否使用外挂，如果是，请在线玩家输入“封号”');  
//     await sleep(25000);
//     waitBan=[];
//     remoteChannel.sendClientEvent(
//         entity,
//         {type:"saybye"}
//     );
//     await sleep(10000);
//     entity.player.kick();
// };
// world.onChat(async({entity,message})=>{
//     if(message=='封号'){
//         let a=[];
//         waitBan.forEach((e)=>{a.push(e.player.name)});
//         const d=await selectDialog(`谁开挂了`,`uns·视奸反外挂系统`,a,entity);
//         if(!d)return;
//         world.querySelectorAll('player').forEach((e)=>{
//             if(e.player.name==d.value){
//                 ban(d);
//             }
//         });
//     }
// });

// world.onPress(({entity})=>{
//     entity.cps++;
//     if(entity.cps>35){
//         world.say(entity.player.name+'尝试使用外挂（连点）');
//         ban(entity);
//     }
// });
// world.ucnt=0;
// world.onPlayerJoin(async({entity})=>{
//     entity.lastPosition={x:entity.position.x,y:entity.position.y,z:entity.position.z};
//     await sleep(2000);
//     entity.wgcnt=0;
//     entity.hyspes=0;
//     entity.pressCnt=0;
//     entity.special=0;
//     entity.fcnt=0;
//     entity.lastfly=-1;
// });

// world.onPress(async({entity,raycast})=>{
//     if(!raycast.hit||raycast.distance==Infinity||entity.player.cameraMode!='fps')return;
//     if(Math.abs(d3(raycast.hitPosition,entity.position)-raycast.distance)>2&&world.kd<80){
//         entity.hyspes++;
//         if(entity.hyspes>5){
//             world.say(entity.player.name+'尝试使用外挂（隔山打牛挂）');
//             ban(entity);
//             return;
//         }
//         await sleep(30000);
//         entity.hyspes--;
//     }
// });

// world.onTick(({elapsedTimeMS})=>{world.kd=elapsedTimeMS});

// setInterval(() => { 
//     world.querySelectorAll('player').forEach((entity)=>{
//         if(world.ucnt%20==0)entity.player.directMessage('uns·视奸反外挂系统已启动，请勿试图开挂，一经发现，直接永封！');
//         let sp=d(entity.lastPosition,entity.position);
//         let mx=entity.player.runSpeed*35+2.4;
//         if(sp>mx&&entity.special==0&&entity.enableDamage==1&&world.gameStarting&&world.kd<80){
//             entity.wgcnt++;
//             if(entity.wgcnt>5){
//                 world.say(entity.player.name+'尝试使用外挂（速移挂）');
//                 ban(entity);
//             }
//         }
//         if(entity.special==0&&entity.enableDamage&&world.kd<80){
//             if(entity.position.y-entity.lastPosition.y>=2&&entity.player.jumpPower<0.6){
//                 let bb=0;
//                 for(let i=1;i<3;i++){
//                     if(voxels.getVoxelId(entity.position.x,entity.position.y-i-0.8,entity.position.z))bb=1;
//                     if(voxels.getVoxelId(entity.position.x,entity.position.y-i-0.8,entity.position.z+1))bb=1;
//                     if(voxels.getVoxelId(entity.position.x+1,entity.position.y-i-0.8,entity.position.z))bb=1;
//                     if(voxels.getVoxelId(entity.position.x+1,entity.position.y-i-0.8,entity.position.z+1))bb=1;
//                 }
//                 if(!bb){
//                     if(entity.lastfly==-1){
//                         entity.lastfly=world.ucnt;
//                     }else{
//                         if(world.ucnt-entity.lastfly>3){
//                             entity.velocity.y=0;
//                             entity.fcnt++;
//                             if(entity.fcnt>3){
//                                 world.say(entity.player.name+'尝试使用外挂（飞行挂）');
//                                 ban(entity);
//                             }
//                         }
//                     }
//                 }else{
//                     entity.lastfly=0;
//                 }
//             }
//         }else{
//             entity.lastfly=0;
//         }
//         if(world.ucnt%60==0){
//             entity.wgcnt=0;
//             entity.hyspes=0;
//         }
//         world.ucnt++;
//         entity.lastPosition={x:entity.position.x,y:entity.position.y,z:entity.position.z};
//         entity.cps=0;
//     });
// }, 1000);