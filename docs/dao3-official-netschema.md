# dao3 官方 net-state schema 定义（实体提取依据）

从 `live-captures/20260729-181217/scripts/files/35067ead...js`
（view.dao3.fun `_next/static/chunks/734.8dcb480d99773395.js`）逆向提取。

## NetPublicSchema（payload 顶层）
```
tick: MuRelativeVarint(0)
frameSkip: MuRelativeVarint(0)
state: NetStateSchema
replica: GameReplicaSchema
```
wire 头：`varint(tick*2)` + struct diff + `varint(pauseCounter)`。

## NetStateSchema
```
players: PlayerSetSchema
playerInputs: PlayerInputSetSchema
physics: PhysicsParamsSchema
bodies: RigidBodySetSchema
collisionFilter: CollisionFilterSchema
zones: PhysicsZoneSetSchema
zoneSelectors: ZoneSelectorGroupSetSchema
```

## GameReplicaSchema
```
running: MuBoolean(false)
sync: MuBoolean(false)
environment: EnvironmentParamSchema
models: NetModelSetSchema
players: PlayerDisplaySetSchema
particles: ParticleReplicaSchema
damage: DamageSetSchema
interactive: InteractComponentSetSchema
entityName: EntityNameComponentSetSchema
sound: SoundReplicaSchema
keyframes: KeyframeReplicaSchema
entities: EntitySetSchema
```

## 关键子 schema

### EntityNameComponentSchema（实体名/名板）
```
id: MuVarint(0)
radius: MuQuantizedFloat(1/16, 16)
name: MuUTF8("")
color: MuReplicaQuantizedVec3(1/256, [1,1,1])
```

### NetModelSchema（实体模型 —— 与 box3-server 的 id/meshId 版不同！）
```
hash: MuASCII("")
hashType: ...
meshBX/meshBY/meshBZ: ...
bodyBX/bodyBY/bodyBZ: ...
bodyOffsetX/Y/Z: ...
renderBoxOffsetX/Y/Z: ...
```
（官方用内容寻址 mesh hash + 包围盒，box3-server.cjs 用 meshId + 颜色。）

### PlayerDisplaySchema
```
id, flags, name, tag, avatarSkin, userId, avatar_hash, skinInvisible,
mapSkin, color, metalness, emissive, shininess, scale, attachments
```

### PlayerSchema（state.players）
```
id, physGround, physFluid, platformX/Y/Z, occupancy, flags,
walkSpeed, walkAcceleration, runSpeed, runAcceleration,
crouchSpeed, crouchAcceleration, swimSpeed, swimAcceleration,
flySpeed, flyAcceleration, jumpSpeedFactor, jumpAccelerationFactor,
jumpPower, doubleJumpPower, freezedForwardAngle, inputDirectionState, stepHeight
```

## 与 box3-server.cjs 的差异（导致实体解码失败）

box3-server.cjs 的 NetModelSchema 是简化版（id/meshId/invisible/red/green/blue/alpha/...），
而 dao3 官方是 hash 内容寻址 + 包围盒版本。box3-server 还把
environment/particles/interactive/sound/keyframes 设为 `unused`(void)，
官方这些是真实 struct。这导致用 box3-server 的 NetPublicSchema patch 解码
官方帧时，struct 字段消费字节数不对 → 后续字段错位 → tick=-1、字段全空。

## 下一步

用官方完整 schema（含 NetModelSchema 的 hash 版 + environment/particles 等真实
struct）重建解码器，才能正确提取 entities（存档点等）的 id/name/position。
