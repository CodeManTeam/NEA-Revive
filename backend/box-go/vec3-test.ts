import { MuWriteStream, MuReadStream } from "mudb/stream"
import { MuQuantizedVec3, MuCubeAxis, MuFloat32Vec3 } from "./custom-schema"

// 直接测试 schema.diff → schema.patch 全链路
const schema = new MuQuantizedVec3(0.00390625, [0, 0, 0])
const target = [12.5, 64.0, -8.25]

const stream = new MuWriteStream()
schema.diff(schema.identity, target, stream)
const data = stream.bytes()
console.log(`bytes (${data.length}):`, [...data].map(b => '0x' + b.toString(16).padStart(2,'0')).join(' '))

const result = schema.patch(schema.identity, new MuReadStream(data))
console.log(`result: (${result.map(v => v.toFixed(4))})`)
console.log(`expect: (${target.join(', ')})`)

const ok = result.every((v, i) => Math.abs(v - target[i]) < 0.01)
console.log(ok ? '✅ PASS' : '❌ FAIL')

// Test cube-axis
const ca = new MuCubeAxis()
const s2 = new MuWriteStream()
ca.diff([1,0,0], [0,1,0], s2)
const r2 = ca.patch([1,0,0], new MuReadStream(s2.bytes()))
console.log(`\ncube-axis: (${r2}) ${r2[1]===1 ? '✅' : '❌'}`)

// Test MuFloat32Vec3
const s3 = new MuWriteStream()
MuFloat32Vec3.diff([0,0,0], [12.5, 64, -8.25], s3)
const r3 = MuFloat32Vec3.patch([0,0,0], new MuReadStream(s3.bytes()))
const ok3 = [0,1,2].every(i => Math.abs(r3[i] - [12.5,64,-8.25][i]) < 0.01)
console.log(`float32-vec3: (${r3.map(v=>v.toFixed(2))}) ${ok3 ? '✅' : '❌'}`)
