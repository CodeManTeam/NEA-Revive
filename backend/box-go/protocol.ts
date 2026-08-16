// ============================================================
// 神奇代码岛 (Code Island)  mudb 协议定义
// 自动生成自客户端运行时 dump — 共 20 个协议
// ============================================================

import {
  MuASCII,
  MuArray,
  MuBoolean,
  MuDate,
  MuDictionary,
  MuFloat32,
  MuFloat64,
  MuInt32,
  MuJSON,
  MuOption,
  MuQuantizedFloat,
  MuRelativeVarint,
  MuSortedArray,
  MuStruct,
  MuUTF8,
  MuUint16,
  MuUint32,
  MuUint8,
  MuUnion,
  MuVarint,
  MuVoid
} from "mudb/schema"

import {
  MuCubeAxis,
  MuFloat32Vec3,
  MuQuantizedVec2,
  MuQuantizedVec3
} from "./custom-schema"

// ============================================================
// Protocol 0 — net-log
// ============================================================
export const netLog = {
  name: 'net-log',
  client: {
    log: new MuStruct({
      level: new MuUint8(),
      message: new MuUTF8(),
      prefix: new MuArray(new MuASCII()),
      timestamp: new MuDate(),
      uuid: new MuASCII()
    }),
  },
  server: {
    log: new MuStruct({
      level: new MuVarint(),
      message: new MuUTF8(),
      prefix: new MuArray(new MuASCII())
    }),
    logASCII: new MuStruct({
      level: new MuVarint(),
      message: new MuASCII(),
      prefix: new MuArray(new MuASCII())
    }),
    logPino: new MuJSON(),
  },
}

// ============================================================
// Protocol 1 — models
// ============================================================
export const models = {
  name: 'models',
  client: {
    appendMeshHashes: new MuArray(new MuStruct({
      bodyBX: new MuQuantizedFloat(1, 64),
      bodyBY: new MuQuantizedFloat(1, 64),
      bodyBZ: new MuQuantizedFloat(1, 64),
      bodyOffsetX: new MuQuantizedFloat(1, 64),
      bodyOffsetY: new MuQuantizedFloat(1, 64),
      bodyOffsetZ: new MuQuantizedFloat(1, 64),
      meshBX: new MuQuantizedFloat(1, 64),
      meshBY: new MuQuantizedFloat(1, 64),
      meshBZ: new MuQuantizedFloat(1, 64),
      renderBoxOffsetX: new MuQuantizedFloat(1, 64),
      renderBoxOffsetY: new MuQuantizedFloat(1, 64),
      renderBoxOffsetZ: new MuQuantizedFloat(1, 64),
      hash: new MuASCII(),
      hashType: new MuUTF8()
    })),
    appendSkinHashes: new MuArray(new MuStruct({
      hash: new MuASCII(),
      parts: new MuStruct({
        head: new MuASCII(),
        hips: new MuASCII(),
        leftFoot: new MuASCII(),
        leftHand: new MuASCII(),
        leftLowerArm: new MuASCII(),
        leftLowerLeg: new MuASCII(),
        leftShoulder: new MuASCII(),
        leftUpperArm: new MuASCII(),
        leftUpperLeg: new MuASCII(),
        neck: new MuASCII(),
        rightFoot: new MuASCII(),
        rightHand: new MuASCII(),
        rightLowerArm: new MuASCII(),
        rightLowerLeg: new MuASCII(),
        rightShoulder: new MuASCII(),
        rightUpperArm: new MuASCII(),
        rightUpperLeg: new MuASCII(),
        torso: new MuASCII()
      })
    })),
    appendSkinPartHashes: new MuSortedArray(new MuStruct({
      id: new MuVarint(),
      hash: new MuASCII()
    })),
  },
  server: {},
}

// ============================================================
// Protocol 2 — game-net (核心游戏网络)
// ============================================================
export const gameNet = {
  name: 'game-net',
  client: {
    scriptEvents: new MuStruct({
      damage: new MuStruct({
        die: new MuArray(new MuVarint()),
        hurt: new MuArray(new MuStruct({
          damage: new MuVarint(),
          id: new MuVarint()
        })),
        respawn: new MuArray(new MuVarint())
      })
    }),
    exceedUserLimit: new MuVarint(),
    kickSessionReason: new MuUint8(),
    syncClientScriptModules: new MuDictionary(new MuUTF8()),
  },
  server: {
    join: new MuVoid(),
    synchronize: new MuVoid(),
    acknowledge: new MuUint32(),
    unpause: new MuUint32(),
    pause: new MuVoid(),
    input: new MuStruct({
      pauseCounter: new MuRelativeVarint(),
      tick: new MuRelativeVarint(),
      events: new MuArray(new MuStruct({
        rayTime: new MuQuantizedFloat(0.00390625, -1),
        tick: new MuQuantizedFloat(0.015625, 0),
        rayHitEntity: new MuVarint(),
        rayHitVoxelX: new MuVarint(),
        rayHitVoxelY: new MuVarint(),
        rayHitVoxelZ: new MuVarint(),
        buttonState: new MuUint8(),
        prevButtonState: new MuUint8(),
        position: new MuQuantizedVec3(0.00390625, [0, 0, 0]),
        rayDirection: new MuQuantizedVec3(0.0009765625, [0, 0, 0]),
        rayHitNormal: new MuCubeAxis(),
        rayOrigin: new MuQuantizedVec3(0.00390625, [0, 0, 0])
      })),
      input: new MuStruct({
        inputState: new MuUint16(),
        inputAngle: new MuUint8(),
        inputCameraAngle: new MuUint8(),
        inputPitch: new MuUint8(),
        bodies: new MuSortedArray(new MuStruct({
          px: new MuQuantizedFloat(0.00390625, 0),
          py: new MuQuantizedFloat(0.00390625, 0),
          pz: new MuQuantizedFloat(0.00390625, 0),
          vx: new MuQuantizedFloat(0.00390625, 0),
          vy: new MuQuantizedFloat(0.00390625, 0),
          vz: new MuQuantizedFloat(0.00390625, 0),
          id: new MuVarint()
        }))
      })
    }),
    sendKeyBoardEvent: new MuStruct({
      id: new MuVarint(),
      tick: new MuVarint(),
      keyDownState: new MuArray(new MuUint8()),
      prevKeyDownState: new MuArray(new MuUint8())
    }),
  },
}

// ============================================================
// Protocol 3 — game-clock （时钟同步）
// ============================================================
export const gameClock = {
  name: 'game-clock',
  client: {
    pong: new MuStruct({
      frameSkip: new MuVarint(),
      clientClock: new MuFloat64(),
      serverClock: new MuFloat64()
    }),
    frameSkip: new MuVarint(),
  },
  server: {
    ping: new MuFloat64(),
  },
}

// ============================================================
// Protocol 4 — input （视角控制）
// ============================================================
export const input = {
  name: 'input',
  client: {
    setCameraPitch: new MuUint8(),
    setCameraYaw: new MuUint8(),
  },
  server: {},
}

// ============================================================
// Protocol 5 — sound （音效）
// ============================================================
export const sound = {
  name: 'sound',
  client: {
    resetDictionary: new MuArray(new MuASCII()),
    play: new MuStruct({
      gain: new MuQuantizedFloat(0.00390625, 1),
      pitch: new MuQuantizedFloat(0.00390625, 1),
      radius: new MuQuantizedFloat(0.0625, 0),
      sampleId: new MuVarint(),
      soundId: new MuVarint(),
      position: new MuUnion({
        global: new MuVoid(),
        player: new MuVarint(),
        entity: new MuVarint(),
        position: new MuQuantizedVec3(0.0625, [0, 0, 0])
      })
    }),
    resume: new MuVarint(),
    pause: new MuVarint(),
    stop: new MuVarint(),
    setCurrentTime: new MuStruct({
      soundId: new MuVarint(),
      currentTime: new MuFloat32()
    }),
    setCurrentTimeAndResume: new MuStruct({
      soundId: new MuVarint(),
      currentTime: new MuFloat32()
    }),
  },
  server: {},
}

// ============================================================
// Protocol 6 — game-terrain （地形/体素系统）
// ============================================================
export const gameTerrain = {
  name: 'game-terrain',
  client: {
    reset: new MuStruct({
      positionX: new MuFloat64(),
      positionY: new MuFloat64(),
      positionZ: new MuFloat64(),
      resetCounter: new MuUint32(),
      nx: new MuUint16(),
      ny: new MuUint16(),
      nz: new MuUint16(),
      innerAO: new MuBoolean(),
      blocks: new MuASCII(),
      hashes: new MuArray(new MuASCII())
    }),
    voxelChange: new MuArray(new MuStruct({
      block: new MuRelativeVarint(),
      count: new MuVarint(),
      offset: new MuVarint()
    })),
    chunkResponse: new MuStruct({
      rpcId: new MuVarint(),
      boxes: new MuSortedArray(new MuStruct({
        block: new MuVarint(),
        faces: new MuUint8(),
        maxX: new MuUint8(),
        maxY: new MuUint8(),
        maxZ: new MuUint8(),
        minX: new MuUint8(),
        minY: new MuUint8(),
        minZ: new MuUint8()
      }), Infinity, compareTerrainBoxes)
    }),
    lightMapResponse: new MuBoolean(),
    hashesResponse: new MuStruct({
      startI: new MuVarint(),
      startJ: new MuVarint(),
      startK: new MuVarint(),
      chunksInfo: new MuArray(new MuStruct({
        idx: new MuVarint(),
        hash: new MuASCII()
      })),
      dirtyChunks: new MuArray(new MuVarint())
    }),
  },
  server: {
    ready: new MuVarint(),
    fetchChunk: new MuStruct({
      chunkId: new MuVarint(),
      rpcId: new MuVarint()
    }),
    rebuildLightMap: new MuBoolean(),
    fetchHashes: new MuStruct({
      startI: new MuVarint(),
      startJ: new MuVarint(),
      startK: new MuVarint(),
      chunkIds: new MuArray(new MuVarint()),
      dirtyChunks: new MuArray(new MuVarint())
    }),
  },
}

// ============================================================
// Protocol 7 — game-chat （聊天）
// ============================================================
export const gameChat = {
  name: 'game-chat',
  client: {
    log: new MuStruct({
      duration: new MuInt32(),
      id: new MuUint32(),
      msgType: new MuUint8(),
      hideFloat: new MuBoolean(),
      private: new MuBoolean(),
      valid: new MuBoolean(),
      i18nPrefix: new MuASCII(),
      i18nSuffix: new MuASCII(),
      text: new MuUTF8()
    }),
    globalNotice: new MuStruct({
      detail: new MuUTF8(),
      title: new MuUTF8()
    }),
  },
  server: {
    noticeMessage: new MuStruct({
      detail: new MuUTF8(),
      title: new MuUTF8()
    }),
  },
}

// ============================================================
// Protocol 8 — player-protocol （玩家加入/离开）
// ⚠️  position 字段的 MuVector 参数待确认
// ============================================================
export const playerProtocol = {
  name: 'player-protocol',
  client: {
    playerJoin: new MuStruct({
      id: new MuVarint(),
      position: MuFloat32Vec3,
    }),
    playerLeave: new MuStruct({
      id: new MuVarint(),
      position: MuFloat32Vec3,
    }),
    openUserProfileDialog: new MuStruct({
      userId: new MuUTF8()
    }),
  },
  server: {
    updateAvatarSkin: new MuVoid(),
  },
}

// ============================================================
// Protocol 9 — entity-interact （实体交互）
// ============================================================
export const entityInteract = {
  name: 'entity-interact',
  client: {
    acknowledgeInteract: new MuVoid(),
    emoteEvent: new MuStruct({
      id: new MuVarint(),
      emote: new MuUint8()
    }),
  },
  server: {
    interact: new MuStruct({
      tick: new MuQuantizedFloat(0.0625, 0),
      id: new MuVarint()
    }),
    playEmote: new MuUint8(),
  },
}

// 共享：对话框通用结构
const dialogCommon = new MuStruct({
  lookEyeEntity: new MuVarint(),
  lookTargetEntity: new MuVarint(),
  lookEyeEnabled: new MuBoolean(),
  lookTargetEnabled: new MuBoolean(),
  lookUpEnabled: new MuBoolean(),
  content: new MuUTF8(),
  contentBackgroundColor: new MuStruct({
    a: new MuQuantizedFloat(0.00390625, 1),
    b: new MuQuantizedFloat(0.00390625, 1),
    g: new MuQuantizedFloat(0.00390625, 1),
    r: new MuQuantizedFloat(0.00390625, 1),
  }),
  contentTextColor: new MuStruct({
    a: new MuQuantizedFloat(0.00390625, 1),
    b: new MuQuantizedFloat(0.00390625, 1),
    g: new MuQuantizedFloat(0.00390625, 1),
    r: new MuQuantizedFloat(0.00390625, 1),
  }),
  lookEyeOffset: new MuStruct({
    x: new MuQuantizedFloat(0.015625, 0),
    y: new MuQuantizedFloat(0.015625, 0),
    z: new MuQuantizedFloat(0.015625, 0),
  }),
  lookTargetOffset: new MuStruct({
    x: new MuQuantizedFloat(0.015625, 0),
    y: new MuQuantizedFloat(0.015625, 0),
    z: new MuQuantizedFloat(0.015625, 0),
  }),
  lookUp: new MuStruct({
    x: new MuQuantizedFloat(0.015625, 0),
    y: new MuQuantizedFloat(0.015625, 0),
    z: new MuQuantizedFloat(0.015625, 0),
  }),
  title: new MuUTF8(),
  titleBackgroundColor: new MuStruct({
    a: new MuQuantizedFloat(0.00390625, 1),
    b: new MuQuantizedFloat(0.00390625, 1),
    g: new MuQuantizedFloat(0.00390625, 1),
    r: new MuQuantizedFloat(0.00390625, 1),
  }),
  titleTextColor: new MuStruct({
    a: new MuQuantizedFloat(0.00390625, 1),
    b: new MuQuantizedFloat(0.00390625, 1),
    g: new MuQuantizedFloat(0.00390625, 1),
    r: new MuQuantizedFloat(0.00390625, 1),
  }),
})

// ============================================================
// Protocol 10 — dialog （对话框系统）
// ============================================================
export const dialog = {
  name: 'dialog',
  client: {
    open: new MuStruct({
      rpcId: new MuVarint(),
      config: new MuUnion({
        text: new MuStruct({
          hasArrow: new MuBoolean(),
          common: dialogCommon,
        }),
        input: new MuStruct({
          common: dialogCommon,
          confirmText: new MuUTF8(),
          placeholder: new MuUTF8()
        }),
        select: new MuStruct({
          common: dialogCommon,
          options: new MuArray(new MuUTF8())
        }),
      })
    }),
    cancelDialogs: new MuVoid(),
    cancelDialog: new MuVarint(),
  },
  server: {
    close: new MuStruct({
      rpcId: new MuVarint(),
      result: new MuUnion({
        close: new MuVoid(),
        text: new MuUTF8(),
        input: new MuUTF8(),
        select: new MuStruct({
          index: new MuVarint(),
          value: new MuUTF8()
        })
      })
    }),
  },
}

// ============================================================
// Protocol 11 — navigator （浏览器导航）
// ============================================================
export const navigator = {
  name: 'navigator',
  client: {
    postMessage: new MuStruct({
      isOld: new MuBoolean(),
      type: new MuUTF8(),
      value: new MuUTF8()
    }),
  },
  server: {
    messageEvent: new MuStruct({
      data: new MuJSON()
    }),
  },
}

// ============================================================
// Protocol 12 — ref （链接打开）
// ============================================================
export const ref = {
  name: 'ref',
  client: {
    openLink: new MuStruct({
      isConfirm: new MuBoolean(),
      isNewTab: new MuBoolean(),
      warning: new MuBoolean(),
      href: new MuUTF8()
    }),
  },
  server: {},
}

// ============================================================
// Protocol 13 — rtc （语音聊天 WebRTC 令牌交换）
// ============================================================
export const rtc = {
  name: 'rtc',
  client: {
    join: new MuStruct({
      handle: new MuVarint(),
      appId: new MuASCII(),
      channelId: new MuASCII(),
      token: new MuASCII()
    }),
    leave: new MuStruct({
      handle: new MuVarint(),
      channelId: new MuASCII()
    }),
    unpublish: new MuStruct({
      handle: new MuVarint(),
      channelId: new MuASCII()
    }),
    publishMicrophone: new MuStruct({
      handle: new MuVarint(),
      channelId: new MuASCII()
    }),
    getVolume: new MuStruct({
      handle: new MuVarint(),
      channelId: new MuASCII()
    }),
    setVolume: new MuStruct({
      handle: new MuVarint(),
      volume: new MuFloat32(),
      channelId: new MuASCII()
    }),
    getMicrophonePermission: new MuStruct({
      handle: new MuVarint()
    }),
    tokenReturn: new MuStruct({
      handle: new MuVarint(),
      token: new MuASCII()
    }),
  },
  server: {
    return: new MuStruct({
      handle: new MuVarint()
    }),
    volumeReturn: new MuStruct({
      handle: new MuVarint(),
      volume: new MuFloat32()
    }),
    permissionReturn: new MuStruct({
      handle: new MuVarint(),
      permission: new MuBoolean()
    }),
    throw: new MuStruct({
      handle: new MuVarint(),
      message: new MuUTF8()
    }),
    fetchToken: new MuStruct({
      handle: new MuVarint(),
      uid: new MuVarint(),
      channelId: new MuASCII()
    }),
  },
}

// ============================================================
// Protocol 14 — gui （GUI 系统）
// ============================================================
export const gui = {
  name: 'gui',
  client: {
    init: new MuStruct({
      handle: new MuVarint(),
      data: new MuUTF8()
    }),
    append: new MuStruct({
      handle: new MuVarint(),
      data: new MuUTF8(),
      selector: new MuUTF8()
    }),
    remove: new MuStruct({
      handle: new MuVarint(),
      selector: new MuUTF8()
    }),
    show: new MuStruct({
      handle: new MuVarint(),
      allowMultiple: new MuBoolean(),
      name: new MuUTF8()
    }),
    getAttribute: new MuStruct({
      handle: new MuVarint(),
      name: new MuUTF8(),
      selector: new MuUTF8()
    }),
    setAttribute: new MuStruct({
      handle: new MuVarint(),
      name: new MuUTF8(),
      selector: new MuUTF8(),
      value: new MuUTF8()
    }),
    reset: new MuVoid(),
  },
  server: {
    return: new MuStruct({
      handle: new MuVarint(),
      value: new MuUTF8()
    }),
    throw: new MuStruct({
      handle: new MuVarint(),
      message: new MuUTF8()
    }),
    sendMessage: new MuStruct({
      name: new MuUTF8(),
      payload: new MuUTF8()
    }),
  },
}

// ============================================================
// Protocol 15 — market （商城）
// ============================================================
export const market = {
  name: 'market',
  client: {
    openMarketplace: new MuStruct({
      productIds: new MuArray(new MuUTF8())
    }),
  },
  server: {},
}

// ============================================================
// Protocol 16 — teleport （传送）
// ============================================================
export const teleport = {
  name: 'teleport',
  client: {
    teleport: new MuStruct({
      playHash: new MuASCII(),
      serverId: new MuUTF8()
    }),
    editTeleport: new MuASCII(),
  },
  server: {},
}

// ============================================================
// Protocol 17 — remote-channel （远程事件通道）
// ============================================================
export const remoteChannel = {
  name: 'remote-channel',
  client: {
    sendClientEvent: new MuStruct({
      tick: new MuVarint(),
      args: new MuUTF8()
    }),
  },
  server: {
    sendServerEvent: new MuStruct({
      tick: new MuVarint(),
      args: new MuUTF8()
    }),
  },
}

// ============================================================
// Protocol 18 — gameUI （UI 树系统 — 最复杂的协议）
// 定义在文件底部的 createGameUIProtocol() 中
// ============================================================

// 共享：gameUI UI 树系统 — 函数工厂解决循环引用
function createGameUIProtocol() {
  const size2d = new MuStruct({
    offset: new MuQuantizedVec2(0.00390625, [5, 5]),
    ratio: new MuQuantizedVec2(0.0009765625, [0, 0]),
  })

  const autoLayoutSchema = new MuStruct({
    maxCells: new MuVarint(),
    fillDirection: new MuUint8(),
    horizontalAlignment: new MuUint8(),
    startCorner: new MuUint8(),
    verticalAlignment: new MuUint8(),
    columnWidthEnabled: new MuBoolean(),
    lineHeightEnabled: new MuBoolean(),
    maxCellsEnabled: new MuBoolean(),
    cellPadding: size2d,
    cellSize: size2d,
  })

  const layoutUnion = new MuUnion({
    none: new MuVoid(),
    autoLayout: autoLayoutSchema,
  })

  const screenSchema = new MuStruct({
    zIndex: new MuVarint(),
    enable: new MuBoolean(),
    layout: layoutUnion,
  })

  const pos2d = new MuStruct({
    offset: new MuQuantizedVec2(0.00390625, [0, 0]),
    ratio: new MuQuantizedVec2(0.0009765625, [0, 0]),
  })

  const baseElement = {
    backgroundOpacity: new MuQuantizedFloat(0.0009765625, 1),
    rotation: new MuQuantizedFloat(0.0009765625, 0),
    layoutOrder: new MuVarint(),
    zIndex: new MuVarint(),
    autoResize: new MuUint8(),
    clipsDescendants: new MuBoolean(),
    visible: new MuBoolean(),
    anchor: new MuQuantizedVec2(0.0009765625, [0, 0]),
    backgroundColor: new MuQuantizedVec3(1, [255, 255, 255]),
    layout: layoutUnion,
    position: pos2d,
    size: pos2d,
  }

  const boxSchema = new MuStruct({ ...baseElement })

  const imageSchema = new MuStruct({
    ...baseElement,
    imageOpacity: new MuQuantizedFloat(0.0009765625, 1),
    imageDisplayMode: new MuUint8(),
    image: new MuUTF8(),
  })

  const textSchema = new MuStruct({
    ...baseElement,
    textLineHeight: new MuQuantizedFloat(0.00390625, 1.19921875),
    textOpacity: new MuQuantizedFloat(0.0009765625, 1),
    textStrokeOpacity: new MuQuantizedFloat(0.0009765625, 1),
    textStrokeThickness: new MuQuantizedFloat(0.0009765625, 0),
    textFontFamily: new MuUint8(),
    textFontSize: new MuUint8(),
    textXAlignment: new MuUint8(),
    textYAlignment: new MuUint8(),
    autoWordWrap: new MuBoolean(),
    richText: new MuBoolean(),
    textColor: new MuQuantizedVec3(1, [0, 0, 0]),
    textContent: new MuUTF8(),
    textStrokeColor: new MuQuantizedVec3(1, [255, 255, 255]),
  })

  const scrollBoxSchema = new MuStruct({
    ...baseElement,
    scrollbarOpacity: new MuQuantizedFloat(0.0009765625, 1),
    scrollbarThickness: new MuVarint(),
    scrollCanvasAutoResize: new MuUint8(),
    scrollDirection: new MuUint8(),
    scrollbarHorizontal: new MuUint8(),
    scrollbarVertical: new MuUint8(),
    scrollbarVisibility: new MuUint8(),
    scrollCanvasSize: size2d,
    scrollPosition: new MuQuantizedVec2(0.00390625, [0, 0]),
    scrollbarColor: new MuQuantizedVec3(1, [153, 153, 153]),
  })

  const inputFieldSchema = new MuStruct({
    ...baseElement,
    placeholderOpacity: new MuQuantizedFloat(0.0009765625, 1),
    textLineHeight: new MuQuantizedFloat(0.00390625, 1.19921875),
    textOpacity: new MuQuantizedFloat(0.0009765625, 1),
    textStrokeOpacity: new MuQuantizedFloat(0.0009765625, 1),
    textStrokeThickness: new MuQuantizedFloat(0.0009765625, 0),
    textFontFamily: new MuUint8(),
    textFontSize: new MuUint8(),
    textXAlignment: new MuUint8(),
    textYAlignment: new MuUint8(),
    autoWordWrap: new MuBoolean(),
    placeholder: new MuUTF8(),
    placeholderColor: new MuQuantizedVec3(1, [172, 172, 164]),
    textColor: new MuQuantizedVec3(1, [0, 0, 0]),
    textContent: new MuUTF8(),
    textStrokeColor: new MuQuantizedVec3(1, [255, 255, 255]),
  })

  const elementUnion = new MuUnion({
    box: boxSchema,
    image: imageSchema,
    text: textSchema,
    scrollBox: scrollBoxSchema,
    input: inputFieldSchema,
  })

  return {
    name: 'gameUI',
    client: {
      reset: new MuStruct({
        running: new MuBoolean(),
        defaultScreenId: new MuUTF8(),
        pictureAssets: new MuDictionary(new MuStruct({
          height: new MuInt32(),
          width: new MuInt32(),
          hash: new MuASCII(),
          metadataHash: new MuASCII()
        })),
        uiTree: new MuDictionary(new MuStruct({
          type: new MuVarint(),
          childrenIds: new MuArray(new MuASCII()),
          id: new MuASCII(),
          name: new MuUTF8(),
          parentId: new MuASCII(),
          value: new MuOption(new MuUnion({
            screen: screenSchema,
            element: elementUnion,
          }))
        }))
      }),
    },
    server: {},
  }
}

const gameUI = createGameUIProtocol()
// @ts-ignore - re-export for hoisting
export { gameUI }

// ============================================================
// Protocol 19 — admin （管理命令）
// ============================================================
export const admin = {
  name: 'admin',
  client: {
    redirect: new MuUTF8(),
    alert: new MuUTF8(),
  },
  server: {
    closeWebsocket: new MuVoid(),
    logCurrentStore: new MuVoid(),
  },
}

// Registration order is part of the mudb wire format. Do not sort this list.
export const box3Protocols = [
  netLog,
  models,
  gameNet,
  gameClock,
  input,
  sound,
  gameTerrain,
  gameChat,
  playerProtocol,
  entityInteract,
  dialog,
  navigator,
  ref,
  rtc,
  gui,
  market,
  teleport,
  remoteChannel,
  gameUI,
  admin,
] as const

// MuSortedArray 比较器：与恢复运行时 bundle 的 compareTerrainBoxes 一致
// （chunkResponse boxes 的 wire 编码依赖它，defaultCompare 对对象恒等会破坏 diff）
export function compareTerrainBoxes(a: Record<string, number>, b: Record<string, number>): number {
  return (
    a.minZ - b.minZ ||
    a.minY - b.minY ||
    a.minX - b.minX ||
    a.maxX - b.maxX ||
    a.maxY - b.maxY ||
    a.maxZ - b.maxZ ||
    a.block - b.block ||
    a.faces - b.faces
  )
}
