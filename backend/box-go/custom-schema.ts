// ============================================================
// 神奇代码岛 自定义 Schema 类型
// 基于对游戏客户端编译代码 (a.js / b.js / c.js) 的逆向实现
// ============================================================
//
// 注意：这些实现需要 byte-exact 兼容官方服务端。
// 如果发现编解码不一致，请对照游戏客户端的 Vec3Schema / Vec2Schema / CubeAxisSchema 修正。
// ============================================================

import type { MuSchema } from "mudb/schema"
import type { MuWriteStream, MuReadStream } from "mudb/stream"

// ============================================================
// MuRelativeVarint 辅助
// ============================================================
// mudb 使用 0xAAAAAAAA (Schroeppel 常数) 做 XOR 来传输有符号差值
// 参考: node_modules/mudb/schema/rvarint.js
const SCHROEPPEL2 = 0xAAAAAAAA

function encodeRelative(delta: number): number {
  return ((SCHROEPPEL2 + delta) ^ SCHROEPPEL2) >>> 0
}

function decodeRelative(encoded: number): number {
  return ((SCHROEPPEL2 ^ encoded) - SCHROEPPEL2) >> 0
}

// ============================================================
// MuQuantizedVec3
// ============================================================
// 一个 3D 向量，每个分量被量化 (round(v / precision) * precision)，
// 然后只传输相对上一个值的整数差，用 bitmask 标记哪些轴变化了。
// 序列化格式：
//   byte 0:    bitmask [x_bit(0), y_bit(1), z_bit(2), ...]
//   varint+:  每个变化轴的 delta (MuRelativeVarint 编码)
// ============================================================

export class MuQuantizedVec3 implements MuSchema<Float64Array | Float32Array | number[]> {
  public muType = "quantized-vec3" as const
  public precision: number
  public invPrecision: number
  public identity: number[]
  public muData: { type: string; precision: number; identity: number[] }
  public json: { type: string; precision: number; identity: number[] }

  constructor(precision: number, identity?: number[]) {
    this.precision = precision
    this.invPrecision = 1 / precision
    this.identity = identity
      ? [
          Math.round((1 / precision) * identity[0]) * precision,
          Math.round((1 / precision) * identity[1]) * precision,
          Math.round((1 / precision) * identity[2]) * precision,
        ]
      : [0, 0, 0]
    this.muData = {
      type: "quantized-vec3",
      precision: this.precision,
      identity: [this.identity[0], this.identity[1], this.identity[2]],
    }
    this.json = this.muData
  }

  alloc(): number[] {
    return [0, 0, 0]
  }

  free(_v: number[]): void {
    // no-op in Go/TS standalone; game client uses pool
  }

  clone(v: number[]): number[] {
    return [v[0], v[1], v[2]]
  }

  assign(dst: number[], src: number[]): number[] {
    const inv = this.invPrecision
    const prec = this.precision
    dst[0] = (Math.round(inv * src[0]) >> 0) * prec
    dst[1] = (Math.round(inv * src[1]) >> 0) * prec
    dst[2] = (Math.round(inv * src[2]) >> 0) * prec
    return dst
  }

  equal(a: number[], b: number[]): boolean {
    const inv = this.invPrecision
    return (
      (Math.round(inv * a[0]) >> 0) === (Math.round(inv * b[0]) >> 0) &&
      (Math.round(inv * a[1]) >> 0) === (Math.round(inv * b[1]) >> 0) &&
      (Math.round(inv * a[2]) >> 0) === (Math.round(inv * b[2]) >> 0)
    )
  }

  toJSON(v: number[]): number[] {
    const inv = this.invPrecision
    const prec = this.precision
    return [
      (Math.round(inv * v[0]) >> 0) * prec,
      (Math.round(inv * v[1]) >> 0) * prec,
      (Math.round(inv * v[2]) >> 0) * prec,
    ]
  }

  fromJSON(json: any): number[] {
    if (Array.isArray(json) && json.length === 3 && typeof json[0] === "number") {
      return this.clone(json)
    }
    return this.clone(this.identity)
  }

  diff(base: number[], target: number[], out: MuWriteStream): boolean {
    const inv = this.invPrecision
    const qb0 = Math.round(inv * base[0]) >> 0
    const qb1 = Math.round(inv * base[1]) >> 0
    const qb2 = Math.round(inv * base[2]) >> 0
    const qt0 = Math.round(inv * target[0]) >> 0
    const qt1 = Math.round(inv * target[1]) >> 0
    const qt2 = Math.round(inv * target[2]) >> 0

    if (qb0 === qt0 && qb1 === qt1 && qb2 === qt2) {
      return false
    }

    const d0 = encodeRelative(qt0 - qb0)
    const d1 = encodeRelative(qt1 - qb1)
    const d2 = encodeRelative(qt2 - qb2)

    const mask = (d0 ? 1 : 0) | (d1 ? 2 : 0) | (d2 ? 4 : 0)

    out.grow(16)

    // 编码：高 3 位 (bit 4/5/6) = 低 3 位 (bit 0/1/2)
    // patch 根据 bits 4/5/6 依次读 x/y/z 的 delta
    out.writeUint8(mask | (mask << 3) | ((mask & 4) << 4))
    if (d0) out.writeVarint(d0)
    if (d1) out.writeVarint(d1)
    if (d2) out.writeVarint(d2)

    return true
  }

  patch(base: number[], inp: MuReadStream): number[] {
    const n = inp.readUint8()
    // bits 4/5/6 = bits 0/1/2: 按 x→y→z 顺序读
    let r = 0, a = 0, o = 0
    if (n & 16) r = decodeRelative(inp.readVarint())
    if (n & 32) a = decodeRelative(inp.readVarint())
    if (n & 64) o = decodeRelative(inp.readVarint())

    const inv = this.invPrecision
    const prec = this.precision
    const qb0 = Math.round(inv * base[0]) >> 0
    const qb1 = Math.round(inv * base[1]) >> 0
    const qb2 = Math.round(inv * base[2]) >> 0

    const result = this.alloc()
    result[0] = (qb0 + r) * prec
    result[1] = (qb1 + a) * prec
    result[2] = (qb2 + o) * prec
    return result
  }
}

// ============================================================
// MuQuantizedVec2
// ============================================================
// 同 MuQuantizedVec3 但只有 2 个分量
// ============================================================

export class MuQuantizedVec2 implements MuSchema<number[]> {
  public muType = "quantized-vec2" as const
  public precision: number
  public invPrecision: number
  public identity: number[]
  public muData: { type: string; precision: number; identity: number[] }
  public json: { type: string; precision: number; identity: number[] }

  constructor(precision: number, identity?: number[]) {
    this.precision = precision
    this.invPrecision = 1 / precision
    this.identity = identity
      ? [
          Math.round((1 / precision) * identity[0]) * precision,
          Math.round((1 / precision) * identity[1]) * precision,
        ]
      : [0, 0]
    this.muData = {
      type: "quantized-vec2",
      precision: this.precision,
      identity: [this.identity[0], this.identity[1]],
    }
    this.json = this.muData
  }

  alloc(): number[] { return [0, 0] }
  free(_v: number[]): void {}

  clone(v: number[]): number[] {
    return [v[0], v[1]]
  }

  assign(dst: number[], src: number[]): number[] {
    const inv = this.invPrecision
    const prec = this.precision
    dst[0] = (Math.round(inv * src[0]) >> 0) * prec
    dst[1] = (Math.round(inv * src[1]) >> 0) * prec
    return dst
  }

  equal(a: number[], b: number[]): boolean {
    const inv = this.invPrecision
    return (
      (Math.round(inv * a[0]) >> 0) === (Math.round(inv * b[0]) >> 0) &&
      (Math.round(inv * a[1]) >> 0) === (Math.round(inv * b[1]) >> 0)
    )
  }

  toJSON(v: number[]): number[] {
    const inv = this.invPrecision
    const prec = this.precision
    return [
      (Math.round(inv * v[0]) >> 0) * prec,
      (Math.round(inv * v[1]) >> 0) * prec,
    ]
  }

  fromJSON(json: any): number[] {
    if (Array.isArray(json) && json.length === 2 && typeof json[0] === "number") {
      return this.clone(json)
    }
    return this.clone(this.identity)
  }

  diff(base: number[], target: number[], out: MuWriteStream): boolean {
    const inv = this.invPrecision
    const qb0 = Math.round(inv * base[0]) >> 0
    const qb1 = Math.round(inv * base[1]) >> 0
    const qt0 = Math.round(inv * target[0]) >> 0
    const qt1 = Math.round(inv * target[1]) >> 0

    if (qb0 === qt0 && qb1 === qt1) return false

    const d0 = encodeRelative(qt0 - qb0)
    const d1 = encodeRelative(qt1 - qb1)
    const mask = (d0 ? 1 : 0) | (d1 ? 2 : 0)

    out.grow(16)

    out.writeUint8(mask | (mask << 4))
    if (d0) out.writeVarint(d0)
    if (d1) out.writeVarint(d1)

    return true
  }

  patch(base: number[], inp: MuReadStream): number[] {
    const n = inp.readUint8()
    let r = 0, a = 0
    if (n & 16) r = decodeRelative(inp.readVarint())
    if (n & 32) a = decodeRelative(inp.readVarint())

    const inv = this.invPrecision
    const prec = this.precision
    const qb0 = Math.round(inv * base[0]) >> 0
    const qb1 = Math.round(inv * base[1]) >> 0

    const result = this.alloc()
    result[0] = (qb0 + r) * prec
    result[1] = (qb1 + a) * prec
    return result
  }
}

// ============================================================
// MuCubeAxis
// ============================================================
// 方块面朝向枚举。存储为 vec3 法向量 (1,0,0)=右，(-1,0,0)=左等，
// 但在线路上只传输一个 uint8 (0-5)。
// 映射关系（反编译自 CUBE_AXIS 数组）：
//   0 →  (1,  0,  0)   右
//   1 →  (-1, 0,  0)   左
//   2 →  (0,  1,  0)   上
//   3 →  (0, -1,  0)   下
//   4 →  (0,  0,  1)   前
//   5 →  (0,  0, -1)   后
// ============================================================

const CUBE_AXIS: [number, number, number][] = [
  [ 1,  0,  0],  // 0: right
  [-1,  0,  0],  // 1: left
  [ 0,  1,  0],  // 2: up
  [ 0, -1,  0],  // 3: down
  [ 0,  0,  1],  // 4: front
  [ 0,  0, -1],  // 5: back
]

function axisToIndex(v: number[]): number {
  for (let i = 0; i < 6; i++) {
    const a = CUBE_AXIS[i]
    if (Math.round(v[0]) === a[0] && Math.round(v[1]) === a[1] && Math.round(v[2]) === a[2]) {
      return i
    }
  }
  return 0
}

export class MuCubeAxis implements MuSchema<number[]> {
  static instance = new MuCubeAxis()
  muType = "cube-axis" as const
  muData = { type: "cube-axis" }
  json = { type: "cube-axis" }
  identity = [1, 0, 0]

  private static CUBE_AXIS: [number, number, number][] = [
    [ 1,  0,  0],
    [-1,  0,  0],
    [ 0,  1,  0],
    [ 0, -1,  0],
    [ 0,  0,  1],
    [ 0,  0, -1],
  ]

  private static axisToIndex(v: number[]): number {
    for (let i = 0; i < 6; i++) {
      const a = MuCubeAxis.CUBE_AXIS[i]
      if (Math.round(v[0]) === a[0] && Math.round(v[1]) === a[1] && Math.round(v[2]) === a[2]) return i
    }
    return 0
  }

  alloc() { return [0, 0, 0] }
  free(_v: number[]) {}
  clone(v: number[]) { return [v[0]!, v[1]!, v[2]!] }
  assign(dst: number[], src: number[]) { dst[0]=src[0]!; dst[1]=src[1]!; dst[2]=src[2]!; return dst }
  equal(a: number[], b: number[]) { return MuCubeAxis.axisToIndex(a) === MuCubeAxis.axisToIndex(b) }

  diff(base: number[], target: number[], out: MuWriteStream): boolean {
    const bi = MuCubeAxis.axisToIndex(base)
    const ti = MuCubeAxis.axisToIndex(target)
    if (bi === ti) return false
    out.grow(1)
    out.writeUint8(ti)
    return true
  }

  patch(_base: number[], inp: MuReadStream): number[] {
    const idx = inp.readUint8()
    if (idx < 0 || idx >= 6) return [0, 0, 0]
    const a = MuCubeAxis.CUBE_AXIS[idx]!
    return [a[0], a[1], a[2]]
  }

  toJSON(v: number[]) { return MuCubeAxis.axisToIndex(v) }
  fromJSON(json: any): number[] {
    if (typeof json === "number" && json >= 0 && json <= 5) {
      const a = MuCubeAxis.CUBE_AXIS[json]!
      return [a[0], a[1], a[2]]
    }
    return [1, 0, 0]
  }
}

// ============================================================
// MuFloat32Vec3
// ============================================================
// 一个简单的 Float32[3] 向量。不量化、不做 delta 压缩。
// 线路上只传一个 bitmask（低 3 bit 对应 x/y/z）+ 变化的轴各写一个 Float32。
// 用于 player-protocol 等不需要高带宽优化的位置同步。
//
// 反编译自 Vec3Schema (vector.js)
// ============================================================

export const MuFloat32Vec3: MuSchema<number[]> = {
  muType: "vector",
  muData: undefined as any,
  json: { type: "vector", data: [0, 0, 0] },
  identity: [0, 0, 0],

  alloc: () => [0, 0, 0],
  free: (_v: number[]) => {},

  clone: (v: number[]) => [v[0], v[1], v[2]],

  assign: (dst: number[], src: number[]): number[] => {
    dst[0] = src[0]
    dst[1] = src[1]
    dst[2] = src[2]
    return dst
  },

  equal: (a: number[], b: number[]): boolean =>
    a[0] === b[0] && a[1] === b[1] && a[2] === b[2],

  diff: (base: number[], target: number[], out: MuWriteStream): boolean => {
    const bx = base[0] !== target[0] ? 1 : 0
    const by = base[1] !== target[1] ? 2 : 0
    const bz = base[2] !== target[2] ? 4 : 0
    const mask = bx + by + bz
    if (mask === 0) return false
    out.grow(13)
    out.writeUint8(mask)
    if (bx) out.writeFloat32(target[0]!)
    if (by) out.writeFloat32(target[1]!)
    if (bz) out.writeFloat32(target[2]!)
    return true
  },

  patch: (base: number[], inp: MuReadStream): number[] => {
    const mask = inp.readUint8()
    const result = [0, 0, 0]
    result[0] = (mask & 1) ? inp.readFloat32() : base[0]!
    result[1] = (mask & 2) ? inp.readFloat32() : base[1]!
    result[2] = (mask & 4) ? inp.readFloat32() : base[2]!
    return result
  },

  toJSON: (v: number[]): number[] => [v[0]!, v[1]!, v[2]!],

  fromJSON: (json: any): number[] => {
    if (Array.isArray(json) && json.length === 3) {
      return [+(json[0] ?? 0), +(json[1] ?? 0), +(json[2] ?? 0)]
    }
    return [0, 0, 0]
  },
}
// ============================================================

/**
 * 写一个"相对 Varint + mask"组合字节。
 * 第一个变化的轴编码为：
 *   - 低 3 bit: mask（哪些轴变化）
 *   - 高 3 bit（4/5/6 位置）: 这个轴是哪一轴
 *   后面跟 varint delta
 *
 * 这是 mudb 原版 MuRelativeVarint 与 bitmask 的混合编码。
 * 参考 a.js 的 p() 函数。
 */
function writeRelativeVarintWithMask(mask: number, value: number, out: MuWriteStream): void {
  // 编码方式：首个字节 = (mask & 0x07) | (axis << 4)
  // 然后用 writeVarint 写入 value
  // 参考原版代码：p(m, h, n) 的调用方式
  out.writeUint8(mask)
  out.writeVarint(value)
}

/**
 * 读一个 "相对 Varint + mask"组合。
 * 参考 a.js 的 m() 函数。
 */
function readRelativeDelta(maskByte: number, inp: MuReadStream): number {
  // mask 低 3 位已从第一个字节读取
  // value 跟在后面作为 varint
  const value = inp.readVarint()
  return decodeRelative(value)
}
