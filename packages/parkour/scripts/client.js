const panel = UiBox.create()
panel.position.offset.copy(Vec2.create({ x: 20, y: 20 }))
panel.size.offset.copy(Vec2.create({ x: 340, y: 184 }))
panel.backgroundColor.copy(Vec3.create({ r: 13, g: 20, b: 29 }))
panel.backgroundOpacity = 0.88
panel.borderRadius = 6
panel.parent = ui

const title = UiText.create()
title.textContent = "NEA REVIVE  /  PARKOUR"
title.textFontSize = 18
title.textColor.copy(Vec3.create({ r: 113, g: 224, b: 177 }))
title.position.offset.copy(Vec2.create({ x: 16, y: 14 }))
title.size.offset.copy(Vec2.create({ x: 308, y: 28 }))
title.parent = panel

const status = UiText.create()
status.textContent = [
  "Client Runtime     ACTIVE",
  "Script Modules     LOADED",
  "RemoteChannel      CONNECTING",
  "World              256 x 64 x 256",
  "Pointer Lock       RELEASED",
  "Checkpoint         0 / 4",
].join("\n")
status.textFontSize = 14
status.position.offset.copy(Vec2.create({ x: 16, y: 48 }))
status.size.offset.copy(Vec2.create({ x: 308, y: 124 }))
status.parent = panel

const toast = UiBox.create()
toast.position.offset.copy(Vec2.create({ x: 20, y: 216 }))
toast.size.offset.copy(Vec2.create({ x: 340, y: 48 }))
toast.backgroundColor.copy(Vec3.create({ r: 13, g: 20, b: 29 }))
toast.backgroundOpacity = 0.9
toast.borderRadius = 6
toast.visible = false
toast.parent = ui

const toastText = UiText.create()
toastText.textFontSize = 15
toastText.textColor.copy(Vec3.create({ r: 255, g: 223, b: 128 }))
toastText.position.offset.copy(Vec2.create({ x: 14, y: 13 }))
toastText.size.offset.copy(Vec2.create({ x: 312, y: 24 }))
toastText.parent = toast

let remoteState = "CONNECTING"
let roundTrip = "--"
let pointerState = "RELEASED"
let checkpointCount = 0
let toastTimer = null
const sentAt = Date.now()

function renderStatus() {
  status.textContent = [
    "Client Runtime     ACTIVE",
    "Script Modules     LOADED",
    `RemoteChannel      ${remoteState}`,
    `Server Roundtrip   ${roundTrip}`,
    `Pointer Lock       ${pointerState}`,
    `Checkpoint         ${checkpointCount} / 4`,
  ].join("\n")
}

function showToast(message) {
  toastText.textContent = message
  toast.visible = true
  if (toastTimer !== null) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.visible = false
    toastTimer = null
  }, 3500)
}

remoteChannel.events.on("client", event => {
  if (event && event.type === "nea-revive:welcome") {
    remoteState = "ONLINE"
    roundTrip = `${Math.max(0, Date.now() - event.sentAt)} ms`
    title.textContent = `NEA REVIVE  /  ${(event.map || "parkour").toUpperCase()}`
    renderStatus()
  }
  if (event && event.type === "parkour:checkpoint") {
    checkpointCount = Math.max(checkpointCount, Number(event.index) || 0)
    renderStatus()
    showToast(event.finish ? "FINISH! Flight unlocked" : `Checkpoint ${checkpointCount} saved`)
  }
})

input.pointerLockEvents.on("pointerlockchange", event => {
  pointerState = event && event.isLocked ? "LOCKED" : "RELEASED"
  renderStatus()
})

remoteChannel.sendServerEvent({
  type: "nea-revive:ready",
  runtimeApiVersion: "0.1.0",
  sentAt,
})

console.log("parkour client runtime panel loaded")
