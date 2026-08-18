// 自写后端 net-state 帧编码：与 voxweb 前端 netstate.rs 解码对称。
// 最小帧 = tick + replica.players（含 avatarSkin）+ state.players（含位置）。
// schema 字段 wire 顺序来自 voxweb tools/parity/fixtures/netstate-schemas.json 的 structOrders。
import {
  MuStruct, MuVarint, MuRelativeVarint, MuBoolean, MuUint8, MuUint16, MuUint32,
  MuQuantizedFloat, MuSortedArray, MuVoid, MuUTF8,
} from "mudb/schema"
import { MuWriteStream } from "mudb/stream"

// ---- schema（wire 顺序按 netstate-schemas.json structOrders）----

// 18 个身体部位（avatarSkin/mapSkin/skinInvisible 共用）
const bodyPartStruct = (schema: any) => new MuStruct({
  hips: schema,
  torso: schema,
  neck: schema,
  head: schema,
  leftShoulder: schema,
  leftUpperArm: schema,
  leftLowerArm: schema,
  leftHand: schema,
  rightShoulder: schema,
  rightUpperArm: schema,
  rightLowerArm: schema,
  rightHand: schema,
  leftUpperLeg: schema,
  leftLowerLeg: schema,
  leftFoot: schema,
  rightUpperLeg: schema,
  rightLowerLeg: schema,
  rightFoot: schema,
})

const PlayerSkinIdSchema = bodyPartStruct(new MuVarint(0))
const PlayerSkinInvisibleSchema = bodyPartStruct(new MuBoolean(false))
const unused = new MuVoid()

// 默认 avatar skin part ids（与 box3-server localAvatarSkinPartIds 一致）
export const LOCAL_AVATAR_SKIN_PART_IDS = [
  311, 312, 313, 314, 315, 316, 58, 317, 318, 61, 319, 320, 321, 322, 66, 323, 324, 325,
]

// ServerPlayerDisplaySchema（replica.players[]）
const PlayerDisplaySchema = new MuStruct({
  emissive: new MuQuantizedFloat(1 / 256, 0),
  metalness: new MuQuantizedFloat(1 / 256, 0),
  scale: new MuQuantizedFloat(1 / 256, 1),
  shininess: new MuQuantizedFloat(1 / 256, 0),
  flags: new MuVarint(8),
  id: new MuVarint(0),
  tag: new MuVarint(0),
  attachments: unused,
  avatarSkin: PlayerSkinIdSchema,
  avatar_hash: unused,
  color: unused,
  mapSkin: PlayerSkinIdSchema,
  name: new MuUTF8("player"),
  skinInvisible: PlayerSkinInvisibleSchema,
  userId: unused,
})

const PlayerDisplaySetSchema = new MuSortedArray(PlayerDisplaySchema, Infinity, (a: any, b: any) => a.id - b.id)

// PlayerSchema（state.players[]）—— 最小：id + flags + 位置平台坐标
const PlayerSchema = new MuStruct({
  crouchAcceleration: new MuQuantizedFloat(1 / 1024, 0.09),
  crouchSpeed: new MuQuantizedFloat(1 / 1024, 0.1),
  doubleJumpPower: new MuQuantizedFloat(1 / 1024, 0.9),
  flyAcceleration: new MuQuantizedFloat(1 / 1024, 2),
  flySpeed: new MuQuantizedFloat(1 / 1024, 2),
  jumpAccelerationFactor: new MuQuantizedFloat(1 / 1024, 0.55),
  jumpPower: new MuQuantizedFloat(1 / 1024, 0.96),
  jumpSpeedFactor: new MuQuantizedFloat(1 / 1024, 0.85),
  physFluid: new MuQuantizedFloat(1 / 32, 0),
  platformX: new MuQuantizedFloat(1 / 256, 0),
  platformY: new MuQuantizedFloat(1 / 256, 0),
  platformZ: new MuQuantizedFloat(1 / 256, 0),
  runAcceleration: new MuQuantizedFloat(1 / 1024, 0.35),
  runSpeed: new MuQuantizedFloat(1 / 1024, 0.4),
  stepHeight: new MuQuantizedFloat(1 / 1024, 1.25),
  swimAcceleration: new MuQuantizedFloat(1 / 1024, 0.1),
  swimSpeed: new MuQuantizedFloat(1 / 1024, 0.4),
  walkAcceleration: new MuQuantizedFloat(1 / 1024, 0.19),
  walkSpeed: new MuQuantizedFloat(1 / 1024, 0.22),
  flags: new MuVarint(2 | 4 | 8 | 16 | 32 | 64 | 128),
  id: new MuVarint(0),
  freezedForwardAngle: new MuUint16(0),
  inputDirectionState: new MuUint8(0),
  occupancy: new MuUint8(0),
  physGround: new MuBoolean(false),
})
const PlayerSetSchema = new MuSortedArray(PlayerSchema, Infinity, (a: any, b: any) => a.id - b.id)

// NetStateSchema / GameReplicaSchema / NetPublicSchema
const NetStateSchema = new MuStruct({
  bodies: unused,
  collisionFilter: unused,
  physics: unused,
  playerInputs: unused,
  players: PlayerSetSchema,
  zoneSelectors: unused,
  zones: unused,
})
const GameReplicaSchema = new MuStruct({
  running: new MuBoolean(false),
  sync: new MuBoolean(false),
  damage: unused,
  entities: unused,
  entityName: unused,
  environment: unused,
  interactive: unused,
  keyframes: unused,
  models: unused,
  particles: unused,
  players: PlayerDisplaySetSchema,
  sound: unused,
})
const NetPublicSchema = new MuStruct({
  frameSkip: new MuRelativeVarint(0),
  tick: new MuRelativeVarint(0),
  replica: GameReplicaSchema,
  state: NetStateSchema,
})

// ---- 编码 ----

export interface NetPlayerDisplay {
  id: number
  name: string
  avatarSkin?: number[]
  /** Historical PlayerDisplayFlags.DEAD bit (4). */
  dead?: boolean
}

export interface NetPlayerState {
  id: number
  position: [number, number, number]
  // 可选：脚本对玩家属性的修改（DAO3 player API），同步到前端本地物理。
  walkSpeed?: number
  walkAcceleration?: number
  runSpeed?: number
  runAcceleration?: number
  crouchSpeed?: number
  crouchAcceleration?: number
  swimSpeed?: number
  swimAcceleration?: number
  flySpeed?: number
  flyAcceleration?: number
  jumpPower?: number
  jumpSpeedFactor?: number
  jumpAccelerationFactor?: number
  doubleJumpPower?: number
  stepHeight?: number
  flags?: number
}

/**
 * 编码一个 net-state 公开帧（forceIdentity：从 identity 基准 diff，服务端每帧如此）。
 * 返回 game-net raw 帧 payload（不含 id；由 sendRaw 加 varint(rawId=10)）。
 */
export function encodeNetPublicPacket(input: {
  tick: number
  pauseCounter?: number
  displays: NetPlayerDisplay[]
  players: NetPlayerState[]
}): Uint8Array {
  const current = NetPublicSchema.clone(NetPublicSchema.identity) as any
  current.tick = input.tick
  current.frameSkip = 0
  // replica.players
  const displays = input.displays.map((d) => ({
    ...PlayerDisplaySchema.clone(PlayerDisplaySchema.identity as any),
    id: d.id,
    name: d.name,
    flags: d.dead ? 4 | 8 : 8,
    avatarSkin: { ...avatarSkinValue(d.avatarSkin ?? LOCAL_AVATAR_SKIN_PART_IDS) },
    scale: 1,
  }))
  current.replica.players = displays
  // state.players
  const players = input.players.map((p) => ({
    ...PlayerSchema.clone(PlayerSchema.identity as any),
    id: p.id,
    platformX: p.position[0],
    platformY: p.position[1],
    platformZ: p.position[2],
    ...(p.walkSpeed === undefined ? {} : { walkSpeed: p.walkSpeed }),
    ...(p.walkAcceleration === undefined ? {} : { walkAcceleration: p.walkAcceleration }),
    ...(p.runSpeed === undefined ? {} : { runSpeed: p.runSpeed }),
    ...(p.runAcceleration === undefined ? {} : { runAcceleration: p.runAcceleration }),
    ...(p.crouchSpeed === undefined ? {} : { crouchSpeed: p.crouchSpeed }),
    ...(p.crouchAcceleration === undefined ? {} : { crouchAcceleration: p.crouchAcceleration }),
    ...(p.swimSpeed === undefined ? {} : { swimSpeed: p.swimSpeed }),
    ...(p.swimAcceleration === undefined ? {} : { swimAcceleration: p.swimAcceleration }),
    ...(p.flySpeed === undefined ? {} : { flySpeed: p.flySpeed }),
    ...(p.flyAcceleration === undefined ? {} : { flyAcceleration: p.flyAcceleration }),
    ...(p.jumpPower === undefined ? {} : { jumpPower: p.jumpPower }),
    ...(p.jumpSpeedFactor === undefined ? {} : { jumpSpeedFactor: p.jumpSpeedFactor }),
    ...(p.jumpAccelerationFactor === undefined ? {} : { jumpAccelerationFactor: p.jumpAccelerationFactor }),
    ...(p.doubleJumpPower === undefined ? {} : { doubleJumpPower: p.doubleJumpPower }),
    ...(p.stepHeight === undefined ? {} : { stepHeight: p.stepHeight }),
    ...(p.flags === undefined ? {} : { flags: p.flags }),
  }))
  current.state.players = players

  const stream = new MuWriteStream(512)
  stream.writeVarint(input.tick * 2)
  NetPublicSchema.diff(NetPublicSchema.identity, current, stream)
  stream.writeVarint(input.pauseCounter ?? 0)
  const bytes = Uint8Array.from(stream.bytes())
  stream.destroy()
  NetPublicSchema.free(current)
  return bytes
}

function avatarSkinValue(ids: number[]) {
  const names = ["head", "hips", "leftFoot", "leftHand", "leftLowerArm", "leftLowerLeg", "leftShoulder", "leftUpperArm", "leftUpperLeg", "neck", "rightFoot", "rightHand", "rightLowerArm", "rightLowerLeg", "rightShoulder", "rightUpperArm", "rightUpperLeg", "torso"]
  const out: Record<string, number> = {}
  names.forEach((n, i) => { out[n] = ids[i] ?? 0 })
  return out
}
