// 生成合法的"空 avatar part"二进制（partId + 单位矩阵 + 空 mesh + 空 texture），
// 用于替换 archive 中被匿名化损坏的 2 字节占位文件。
// 用 mudb schema 编码，与 voxweb decode_avatar_part 对称。
import { MuStruct, MuUint8, MuVarint, MuArray, MuUint32, MuVector, MuFloat32 } from "mudb/schema"
import { MuWriteStream } from "mudb/stream"

// 与 voxweb avatar_part.rs 的 avatar_part_schema 对称
function faceSchema() {
  const varintArray = () => new MuArray(new MuVarint())
  return new MuStruct({
    sizes: varintArray(),
    uvFlags: new MuArray(new MuUint8()),
    uvs: varintArray(),
    vertices: varintArray(),
  })
}
function textureSchema() {
  return new MuStruct({
    width: new MuVarint(),
    data: new MuArray(new MuVarint()),
    palette: new MuArray(new MuUint32()),
  })
}
const avatarPartSchema = new MuStruct({
  partId: new MuUint8(),
  bindMat: new MuVector(new MuFloat32(), 16),
  mesh: new MuArray(faceSchema()),
  texture: textureSchema(),
})

function identityMatrix() {
  const m = new Float32Array(16)
  for (let i = 0; i < 4; i++) m[i * 4 + i] = 1
  return m
}

// 部位名 → part_id（voxweb AVATAR_PART_NAMES 顺序）
const PART_IDS = {
  head: 0, hips: 1, leftFoot: 2, leftHand: 3, leftLowerArm: 4, leftLowerLeg: 5,
  leftShoulder: 6, leftUpperArm: 7, leftUpperLeg: 8, neck: 9, rightFoot: 10,
  rightHand: 11, rightLowerArm: 12, rightLowerLeg: 13, rightShoulder: 14,
  rightUpperArm: 15, rightUpperLeg: 16, torso: 17,
}

export function encodeEmptyAvatarPart(partName, partId) {
  const value = avatarPartSchema.clone(avatarPartSchema.identity)
  value.partId = partId
  value.bindMat = identityMatrix()
  value.mesh = []
  value.texture = { width: 0, data: [], palette: [] }
  const stream = new MuWriteStream(128)
  avatarPartSchema.diff(avatarPartSchema.identity, value, stream)
  const bytes = Uint8Array.from(stream.bytes())
  stream.destroy()
  avatarPartSchema.free(value)
  return bytes
}

// 占位 hash → 部位名（从默认皮肤 ids 映射）
export const EMPTY_PARTS = {
  "qNXdY_ukcevLHz6PfB4YebcVKm5ymKkc4RmmNACt58U": { name: "leftShoulder", id: PART_IDS.leftShoulder },  // id=58
  "oShx_uIQ-4YZKR6uoZRYHL0lMeSyN1nSJfaAaSP2MiI": { name: "neck", id: PART_IDS.neck },                  // id=61
  "nmKC5PJeNwzmF-Idb-Jl6Iuee4aCzwAFm50SjZOB8J0": { name: "rightShoulder", id: PART_IDS.rightShoulder }, // id=66
}

// 若作为脚本直接运行，打印三个空部件的 hex 供 Rust 测试断言
if (process.argv[1] && process.argv[1].endsWith("empty-avatar.ts")) {
  for (const [hash, { name, id }] of Object.entries(EMPTY_PARTS)) {
    const bytes = encodeEmptyAvatarPart(name, id)
    console.log(`${name} (id=${id}):`, Buffer.from(bytes).toString("hex"))
  }
}
