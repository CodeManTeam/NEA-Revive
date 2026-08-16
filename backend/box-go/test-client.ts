// ============================================================
// mudb 协议编解码测试 — 本地 client ↔ server
// 使用 MuLocalSocket 模拟全链路通信
// ============================================================

import { MuServer, MuClient } from "mudb"
import { createLocalSocketServer, createLocalSocket } from "mudb/socket/local"
import { MuSystemScheduler } from "mudb/scheduler/system"
import { gameNet, gameClock } from "./protocol"

// ---------- 创建本地 socket 对 ----------
const scheduler = MuSystemScheduler
const socketServer = createLocalSocketServer({ scheduler })

// ---------- 服务端 ----------
const server = new MuServer(socketServer)

const gameNetProto = server.protocol(gameNet)
gameNetProto.configure({
  message: {
    join: (client) => {
      console.log(`[server] 客户端 ${client.sessionId} 加入游戏`)
    },
    synchronize: (client) => {
      console.log(`[server] 客户端 ${client.sessionId} 请求同步 → 已同步`)
    },
    acknowledge: (client, seq) => {
      console.log(`[server] acknowledge: ${seq}`)
    },
    unpause: (client, seq) => {
      console.log(`[server] unpause: ${seq}`)
    },
    pause: (client) => {
      console.log(`[server] pause`)
    },
    input: (client, data) => {
      console.log(`[server] 收到输入: tick=${data.tick}, events=${data.events?.length}`)
      if (data.events?.[0]) {
        const ev = data.events[0]
        console.log(`[server]   首事件: button=${ev.buttonState}, pos=(${ev.position})`)
        console.log(`[server]   朝向: normal=(${ev.rayHitNormal})`)
      }
      if (data.input?.bodies?.length) {
        console.log(`[server]   身体数量: ${data.input.bodies.length}`)
      }
    },
    sendKeyBoardEvent: (client, data) => {
      console.log(`[server] 键盘事件: id=${data.id}, tick=${data.tick}`)
    },
  },
  connect: (client) => {
    console.log(`[server] 🔗 新连接: ${client.sessionId}`)
  },
  disconnect: (client) => {
    console.log(`[server] 🔌 断开: ${client.sessionId}`)
  },
})

const serverClockProto = server.protocol(gameClock)
serverClockProto.configure({
  message: {
    ping: (client, t) => {
      console.log(`[server] ping: ${t}`)
      serverClockProto.clients[client.sessionId]?.message.pong({
        frameSkip: 0,
        clientClock: t,
        serverClock: Date.now(),
      })
    },
  },
})

server.start({
  ready: () => console.log("[server] ✅ 服务端就绪"),
})

// ---------- 客户端 ----------
const localSocket = createLocalSocket({
  sessionId: "test-player-1",
  server: socketServer,
  scheduler,
})

const client = new MuClient(localSocket)

const clientProto = client.protocol(gameNet)
clientProto.configure({
  message: {
    scriptEvents: (data) => {
      console.log(`[client] 📩 scriptEvents:`, JSON.stringify(data))
    },
    exceedUserLimit: (val) => {
      console.log(`[client] 📩 exceedUserLimit: ${val}`)
    },
    kickSessionReason: (val) => {
      console.log(`[client] 📩 kickSessionReason: ${val}`)
    },
    syncClientScriptModules: (val) => {
      console.log(`[client] 📩 syncClientScriptModules:`, val)
    },
  },
})

const clockProto = client.protocol(gameClock)
clockProto.configure({
  message: {
    pong: (data) => {
      console.log(`[client] 📩 pong: frameSkip=${data.frameSkip}, clock=${Math.round(data.serverClock - data.clientClock)}ms offset`)
    },
    frameSkip: (val) => {
      console.log(`[client] 📩 frameSkip: ${val}`)
    },
  },
})

client.start({
  ready: () => {
    console.log("[client] ✅ 客户端就绪，发送消息...")

    // 1. 发送 join（MuVoid）
    clientProto.server.message.join()

    // 2. 发送 synchronize（MuVoid）
    setTimeout(() => {
      clientProto.server.message.synchronize()
    }, 50)

    // 3. 发送 input
    setTimeout(() => {
      console.log("\n[client] ➡️ 发送 input...")
      clientProto.server.message.input({
        pauseCounter: 0,
        tick: 1,
        events: [
          {
            rayTime: 0.5,
            tick: 1,
            rayHitEntity: 1001,
            rayHitVoxelX: 10,
            rayHitVoxelY: 20,
            rayHitVoxelZ: 30,
            buttonState: 1,
            prevButtonState: 0,
            position: [12.5, 64.0, -8.25],
            rayDirection: [0.5, -0.3, 0.8],
            rayHitNormal: [0, 1, 0],
            rayOrigin: [10.0, 60.0, -5.0],
          },
        ],
        input: {
          inputState: 0b1100110011,
          inputAngle: 128,
          inputCameraAngle: 64,
          inputPitch: 32,
          bodies: [
            { px: 100, py: 64, pz: -50, vx: 1.5, vy: 0, vz: 0, id: 1 },
            { px: 200, py: 32, pz: -100, vx: -1, vy: 0.5, vz: 0.3, id: 2 },
          ],
        },
      })
    }, 100)

    // 4. 发送键盘事件
    setTimeout(() => {
      console.log("\n[client] ➡️ 发送 keyboard event...")
      clientProto.server.message.sendKeyBoardEvent({
        id: 1001,
        tick: 2,
        keyDownState: [0, 0, 1, 0, 0, 0, 0, 0],
        prevKeyDownState: [0, 0, 0, 1, 0, 0, 0, 0],
      })
    }, 200)

    // 5. 测试 clock 协议
    setTimeout(() => {
      console.log("\n[client] ➡️ 发送 ping...")
      clockProto.server.message.ping(Date.now())
    }, 300)
  },
  close: (err) => {
    console.log(`[client] 关闭:`, err)
  },
})

// 自动退出
setTimeout(() => {
  console.log("\n✅ 测试完成，清理...")
  client.destroy()
  server.destroy()
  process.exit(0)
}, 1500)
