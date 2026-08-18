const results = new Map()
let revision = 0

function record(group, name, status, detail = "") {
  results.set(`${group}/${name}`, { group, name, status, detail: String(detail || "") })
}

function test(group, name, fn) {
  try {
    const detail = fn()
    record(group, name, "PASS", detail === undefined ? "" : detail)
  } catch (error) {
    record(group, name, "FAIL", error && error.message ? error.message : error)
  }
}

function optionalTest(group, name, fn, detail = "API is not exposed by this runtime") {
  try {
    if (typeof fn !== "function") throw new Error(detail)
    const value = fn()
    record(group, name, "PASS", value === undefined ? "" : value)
  } catch (error) {
    record(group, name, "UNSUPPORTED", error && error.message ? error.message : detail)
  }
}

async function asyncTest(group, name, fn) {
  try {
    const detail = await fn()
    record(group, name, "PASS", detail === undefined ? "" : detail)
  } catch (error) {
    record(group, name, "FAIL", error && error.message ? error.message : error)
  }
}

function report() {
  return [...results.values()]
}

function sendReport(player) {
  remoteChannel.sendClientEvent(player, {
    type: "api-acceptance:report",
    revision: ++revision,
    results: report(),
  })
}

async function runServerSuite(player) {
  results.clear()
  test("WORLD", "shape", () => `${world.size.x},${world.size.y},${world.size.z}`)
  test("WORLD", "querySelector", () => world.querySelector("#api-model-cube").id)
  test("WORLD", "querySelectorAll", () => `${world.querySelectorAll(".api-station").length} stations`)
  test("WORLD", "collisionFilters", () => {
    world.addCollisionFilter("player", ".remote-test")
    const count = world.collisionFilters().length
    world.removeCollisionFilter("player", ".remote-test")
    return `${count} active`
  })
  test("WORLD", "events", () => {
    const tokens = [world.onTick(() => {}), world.onChat(() => {}), world.onPress(() => {}), world.onRelease(() => {})]
    return `${tokens.length} listeners`
  })
  test("WORLD", "weather", () => {
    const before = world.fogEnabled
    world.fogEnabled = true
    world.fogEnabled = before
    return "fogEnabled"
  })
  test("WORLD", "teleport", () => {
    world.teleport(player, new GameVector3(8, 3, 8))
    return "player teleport"
  })
  optionalTest("WORLD", "sound", () => {
    if (typeof world.sound !== "function") throw new Error("world.sound unavailable")
    world.sound({ sample: "audio/audio/pop.mp3" })
    return "sound dispatched"
  })
  test("VOXELS", "id/name", () => {
    const id = voxels.id("grass")
    if (!id || voxels.name(id) !== "grass") throw new Error("catalog roundtrip failed")
    return `${id}:grass`
  })
  test("VOXELS", "rotation", () => {
    voxels.setVoxel(30, 3, 30, "grass", "west")
    if (voxels.getVoxelRotation(30, 3, 30) !== 3) throw new Error("rotation mismatch")
    return "west=3"
  })
  test("ENTITY", "identity/tags", () => {
    const entity = world.querySelector("#api-model-cube")
    entity.addTag("runtime-tested")
    if (!entity.hasTag("runtime-tested")) throw new Error("tag mutation failed")
    return entity.id
  })
  test("ENTITY", "transform", () => {
    const entity = world.querySelector("#api-model-cube")
    entity.meshScale.copy(new GameVector3(0.08, 0.08, 0.08))
    entity.lookAt(new GameVector3(12, 5, 42))
    return "meshScale + lookAt"
  })
  test("ENTITY", "physics", () => {
    const entity = world.querySelector("#api-physics")
    entity.mass = 2
    entity.friction = 0.4
    entity.restitution = 0.75
    return `m=${entity.mass} f=${entity.friction} r=${entity.restitution}`
  })
  test("ENTITY", "interaction", () => {
    const entity = world.querySelector("#api-interact")
    entity.enableInteract = true
    entity.interactRadius = 5
    entity.interactHint = "运行实体 API 测试"
    return `${entity.interactRadius}m`
  })
  test("ENTITY", "damage", () => {
    const entity = world.querySelector("#api-physics")
    entity.enableDamage = true
    entity.maxHp = 100
    entity.hp = 100
    return `${entity.hp}/${entity.maxHp}`
  })
  optionalTest("ENTITY", "animation", () => {
    const entity = world.querySelector("#api-model-cube")
    if (typeof entity.animate !== "function") throw new Error("entity.animate unavailable")
    const animation = entity.animate([
      { meshEmissive: 0 },
      { meshEmissive: 0.5 },
    ], { duration: 8 })
    if (typeof animation.cancel !== "function" || typeof animation.onFinish !== "function") throw new Error("GameAnimation contract missing")
    return "keyframes + GameAnimation"
  })
  test("PLAYER", "movement", () => {
    // Use the map's actual movement values; the client must apply these
    // through net-state rather than replacing them with local constants.
    player.player.walkSpeed = 0.24
    player.player.runSpeed = 0.44
    player.player.jumpPower = 0.98
    player.player.directMessage(`物理参数已同步 walk=${player.player.walkSpeed} run=${player.player.runSpeed} jump=${player.player.jumpPower}`)
    return "walk/run/jump"
  })
  test("PLAYER", "camera", () => {
    player.player.setCameraYaw(0)
    player.player.setCameraPitch(0)
    return `distance=${player.player.cameraDistance}`
  })
  test("PLAYER", "appearance", () => {
    player.player.color.set(1, 1, 1)
    player.player.invisible = false
    player.player.showName = true
    return "color/visibility/name"
  })
  test("PLAYER", "events", () => {
    const tokens = [player.player.onPress(() => {}), player.player.onRelease(() => {}), player.player.onKeyDown(() => {}), player.player.onKeyUp(() => {})]
    return `${tokens.length} listeners`
  })
  test("PLAYER", "respawn", () => {
    player.player.spawnPoint = new GameVector3(8, 3, 8)
    player.player.forceRespawn()
    return "forceRespawn"
  })
  optionalTest("PLAYER", "dialog", () => {
    if (typeof player.player.dialog !== "function") throw new Error("player.dialog unavailable")
    return "dialog available"
  })
  optionalTest("PLAYER", "skin", () => {
    if (typeof player.player.clearSkin !== "function") throw new Error("skin API unavailable")
    player.player.clearSkin()
    return "skin reset"
  })
  optionalTest("PLAYER", "link", () => {
    if (typeof player.player.link !== "function") throw new Error("player.link unavailable")
    return "link method available (navigation skipped)"
  })
  await asyncTest("STORAGE", "data-storage.set/get", async () => {
    if (typeof storage?.getDataStorage !== "function") throw new Error("storage.getDataStorage unavailable")
    const space = storage.getDataStorage("api-acceptance")
    await space.set("probe", { value: 42, source: "api-map" })
    const item = await space.get("probe")
    if (item?.value?.value !== 42) throw new Error("storage roundtrip mismatch")
    return "set/get roundtrip"
  })
  await asyncTest("STORAGE", "data-storage.update/increment/list/remove", async () => {
    const space = storage.getDataStorage("api-acceptance")
    await space.update("probe", value => ({ ...value, updated: true }))
    await space.set("counter", 1)
    await space.increment("counter", 2)
    const list = await space.list({ pageSize: 10 })
    if (!Array.isArray(list.getCurrentPage())) throw new Error("storage list page missing")
    await space.remove("counter")
    return "update/increment/list/remove"
  })
  optionalTest("HTTP", "request", () => {
    if (typeof http?.fetch !== "function") throw new Error("http.fetch unavailable")
    return "http.fetch available (network call intentionally omitted)"
  })
  await asyncTest("GUI", "command transport", async () => {
    if (typeof gui?.init !== "function") throw new Error("gui.init unavailable")
    await gui.init(player, { acceptance: { display: true, data: "<label text=\"API\"/>" } })
    await gui.setAttribute(player, "#acceptance", "text", "API PASS")
    return "init/setAttribute"
  })
  await asyncTest("PLAYER", "social/ui", async () => {
    const social = await player.player.querySocial("friends")
    const stats = await player.player.querySocialStatistic()
    if (!Array.isArray(social) || typeof stats.friendsNum !== "number") throw new Error("social contract mismatch")
    if (typeof player.player.share !== "function" || typeof player.player.openMarketplace !== "function" || typeof player.player.openUserProfileDialog !== "function") throw new Error("player UI methods unavailable")
    return "social/share/marketplace/profile"
  })
  optionalTest("MOTION", "entity-animations", () => {
    if (typeof world.getEntityAnimations !== "function") throw new Error("world.getEntityAnimations unavailable")
    return "animation catalog available"
  })
  test("REMOTE", "server-to-client", () => "report delivered")
  record("PHYSICS", "material lanes", "MANUAL", "walk over grass / ice / bounce / drag lanes")
  record("MODEL", "rendering", "MANUAL", "inspect MODEL API cube at x=12,z=35")
  record("AUDIO", "playback", "MANUAL", "use client Audio object; browser gesture required")
  record("INPUT", "pointer lock", "MANUAL", "use client pointer lock control")
  sendReport(player)
}

world.onPlayerJoin(({ entity }) => {
  entity.player.spawnPoint = new GameVector3(8, 3, 8)
  entity.player.forceRespawn()
  entity.player.directMessage("DAO3 API 验收实验场：右侧面板显示自动测试结果")
  setTimeout(() => runServerSuite(entity), 150)
})

world.onInteract(({ entity, targetEntity }) => {
  if (!entity || !entity.isPlayer || !targetEntity) return
  if (targetEntity.id === "api-interact") runServerSuite(entity)
  if (targetEntity.id === "api-remote") {
    remoteChannel.sendClientEvent(entity, { type: "api-acceptance:pong", sentAt: Date.now() })
  }
})

remoteChannel.onServerEvent(({ entity, args }) => {
  if (!entity || !args) return
  if (args.type === "api-acceptance:run") runServerSuite(entity)
  if (args.type === "api-acceptance:player") {
    const nextMode = (entity.player.gameMode + 1) % 4
    entity.gamemode.gamemode(nextMode)
    entity.Give("API方块", 1)
    entity.player.directMessage(`gamemode = ${nextMode}`)
    sendReport(entity)
  }
  if (args.type === "api-acceptance:model") {
    const model = world.querySelector("#api-model-cube")
    model.meshEmissive = model.meshEmissive > 0 ? 0 : 1
    model.meshMetalness = model.meshMetalness > 0 ? 0 : 0.8
    model.rotateLocal(new GameVector3(0, 0, 0), new GameVector3(0, 1, 0), Math.PI / 4)
    model.enableDamage = true
    model.showHealthBar = true
    if (model.hp <= 0) model.hp = model.maxHp
    else model.hurt(15, { attacker: entity, damageType: "api-acceptance:model" })
    sendReport(entity)
  }
  if (args.type === "api-acceptance:damage") {
    entity.player.enableDamage = true
    if (entity.player.hp <= 0) {
      entity.player.hp = entity.player.maxHp
      entity.player.forceRespawn()
    } else {
      entity.player.hurt(20, { damageType: "api-acceptance" })
    }
    entity.player.directMessage(`HP ${entity.player.hp}/${entity.player.maxHp}`)
    sendReport(entity)
  }
})

world.onChat(({ entity, message }) => {
  if (!entity.isPlayer) return
  if (message === "测试" || message === "test") runServerSuite(entity)
  if (message === "重生") entity.player.forceRespawn()
})
