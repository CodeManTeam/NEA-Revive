export const typedEventSignatures = Object.freeze({
  "server.world.onPress": "(GameInputEvent)=>void",
  "server.world.onRelease": "(GameInputEvent)=>void",
  "server.world.onClick": "(GameClickEvent)=>void",
  "server.world.onPlayerJoin": "(GameEntityEvent)=>void",
  "server.world.onPlayerLeave": "(GameEntityEvent)=>void",
  "server.world.onEntityCreate": "(GameEntityEvent)=>void",
  "server.world.onEntityDestroy": "(GameEntityEvent)=>void",
  "server.world.onVoxelContact": "(GameVoxelContactEvent)=>void",
  "server.world.onVoxelSeparate": "(GameVoxelContactEvent)=>void",
  "server.RuntimeEntity.onClick": "(GameClickEvent)=>void",
  "server.RuntimePlayer.onClick": "(GameClickEvent)=>void",
  "server.RuntimePlayer.onPress": "(GameInputEvent)=>void",
  "server.RuntimePlayer.onRelease": "(GameInputEvent)=>void",
});

export const typedEventFutures = Object.freeze({
  "server.world.nextTakeDamage": "Promise<GameDamageEvent>",
  "server.world.nextPlayerJoin": "Promise<GameEntityEvent>",
});
