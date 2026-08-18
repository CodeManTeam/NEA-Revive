const panel = UiBox.create()
panel.position.offset.copy({ x: 18, y: 18 })
panel.size.offset.copy({ x: 470, y: 700 })
panel.backgroundColor.copy({ r: 12, g: 17, b: 22 })
panel.backgroundOpacity = 0.92
panel.borderRadius = 6
panel.parent = ui

const title = UiText.create()
title.textContent = "DAO3 API ACCEPTANCE LAB"
title.textFontSize = 20
title.textColor.copy({ r: 102, g: 232, b: 180 })
title.position.offset.copy({ x: 16, y: 14 })
title.size.offset.copy({ x: 438, y: 30 })
title.parent = panel

const summary = UiText.create()
summary.textContent = "Waiting for server suite..."
summary.textFontSize = 14
summary.position.offset.copy({ x: 16, y: 48 })
summary.size.offset.copy({ x: 438, y: 28 })
summary.parent = panel

const report = UiText.create()
report.textContent = ""
report.textFontSize = 13
report.textLineHeight = 1.28
report.position.offset.copy({ x: 16, y: 82 })
report.size.offset.copy({ x: 438, y: 470 })
report.parent = panel

function button(label, x, y, event) {
  const box = UiBox.create()
  box.position.offset.copy({ x, y })
  box.size.offset.copy({ x: 134, y: 48 })
  box.backgroundColor.copy({ r: 35, g: 78, b: 68 })
  box.backgroundOpacity = 0.95
  box.borderRadius = 5
  box.pointerEventBehavior = PointerEventBehavior.ENABLE
  box.parent = panel
  const text = UiText.create()
  text.textContent = label
  text.textFontSize = 14
  text.textXAlignment = "Center"
  text.position.offset.copy({ x: 8, y: 13 })
  text.size.offset.copy({ x: 118, y: 24 })
  text.parent = box
  box.events.add("pointerup", event)
  return box
}

button("RUN ALL", 16, 548, () => remoteChannel.sendServerEvent({ type: "api-acceptance:run" }))
button("PLAYER", 168, 548, () => remoteChannel.sendServerEvent({ type: "api-acceptance:player" }))
button("MODEL", 320, 548, () => remoteChannel.sendServerEvent({ type: "api-acceptance:model" }))

button("AUDIO", 16, 608, () => {
  const audio = new Audio("")
  audio.add("loadeddata", () => { summary.textContent = "AUDIO loadeddata PASS" })
  audio.add("error", () => { summary.textContent = "AUDIO permission/source ERROR" })
  audio.play().then(() => { summary.textContent = "AUDIO play PASS" }).catch(error => {
    summary.textContent = `AUDIO gesture/error: ${String(error?.message || error)}`
  })
})
button("POINTER", 168, 608, () => {
  input.lockPointer()
  summary.textContent = "POINTER lock requested"
})
button("DAMAGE", 320, 608, () => remoteChannel.sendServerEvent({ type: "api-acceptance:damage" }))

function render(results) {
  const counts = { PASS: 0, FAIL: 0, MANUAL: 0, UNSUPPORTED: 0, SKIP: 0 }
  for (const item of results) counts[item.status] = (counts[item.status] || 0) + 1
  summary.textContent = `PASS ${counts.PASS}   FAIL ${counts.FAIL}   UNSUPPORTED ${counts.UNSUPPORTED}   MANUAL ${counts.MANUAL}`
  summary.textColor.copy(counts.FAIL ? { r: 255, g: 110, b: 110 } : counts.UNSUPPORTED ? { r: 255, g: 190, b: 100 } : { r: 102, g: 232, b: 180 })
  report.textContent = results.map(item => {
    const mark = item.status === "PASS" ? "[OK]" : item.status === "FAIL" ? "[!!]" : "[..]"
    return `${mark} ${item.group.padEnd(8)} ${item.name}${item.detail ? `\n     ${item.detail}` : ""}`
  }).join("\n")
}

remoteChannel.events.on("client", event => {
  if (event && event.type === "api-acceptance:report") render(event.results || [])
  if (event && event.type === "api-acceptance:pong") {
    summary.textContent = `RemoteChannel RTT ${Math.max(0, Date.now() - event.sentAt)} ms`
  }
})

remoteChannel.sendServerEvent({ type: "api-acceptance:run" })
