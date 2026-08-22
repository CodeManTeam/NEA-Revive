import { strict as assert } from "node:assert"
import { readFile } from "node:fs/promises"
import { chromium } from "playwright"

const runtimeSource = await readFile(
  "D:/Projects/Gaming/NEA-Revive/frontend/voxweb/client-script-runtime.js",
  "utf8",
)
const clientSource = await readFile(
  "D:/Projects/Gaming/NEA-Revive/packages/parkour/scripts/client.js",
  "utf8",
)
const archivedUi = await readFile(
  "D:/Projects/Gaming/NEA-Revive/backend/local-player/archive/client-ui-bedwars.json",
  "utf8",
)
const archivedClient = await readFile(
  "D:/Projects/Gaming/NEA-Revive/backend/local-player/archive/project/bedwars/client-scripts/clientIndex.js",
  "utf8",
)
const archivedData = await readFile(
  "D:/Projects/Gaming/NEA-Revive/backend/local-player/archive/project/bedwars/client-scripts/cilentData.js",
  "utf8",
)

const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage()
  await page.setContent("<html><body><canvas id=\"game\"></canvas></body></html>")
  await page.addScriptTag({ content: runtimeSource })
  const initial = await page.evaluate(source => {
    ;(window as any).__neaClientRuntimeInstall(JSON.stringify({ "clientIndex.js": source }))
    return {
      outbound: JSON.parse((window as any).__neaClientRuntimeDrain()),
      text: document.querySelector("#nea-client-ui")?.textContent,
      style: document.querySelector("#nea-client-ui > div")?.getAttribute("style"),
    }
  }, clientSource)
  assert.equal(initial.outbound.length, 1)
  assert.equal(initial.outbound[0].type, "nea-revive:ready")
  assert.equal(initial.outbound[0].runtimeApiVersion, "0.1.0")
  assert.match(initial.text ?? "", /Client Runtime\s+ACTIVE/)
  assert.match(initial.text ?? "", /RemoteChannel\s+CONNECTING/)
  assert.match(initial.style ?? "", /left: 20px/)
  assert.match(initial.style ?? "", /top: 20px/)
  assert.match(initial.style ?? "", /background-color: rgba?\(/)

  const updated = await page.evaluate(() => {
    ;(window as any).__neaClientRuntimeReceive(JSON.stringify({
      type: "nea-revive:welcome",
      map: "parkour",
      sentAt: Date.now() - 12,
    }))
    return document.querySelector("#nea-client-ui")?.textContent
  })
  assert.match(updated ?? "", /RemoteChannel\s+ONLINE/)
  assert.match(updated ?? "", /Server Roundtrip\s+\d+ ms/)

  const checkpoint = await page.evaluate(() => {
    ;(window as any).__neaClientRuntimeReceive(JSON.stringify({
      type: "parkour:checkpoint",
      index: 3,
      finish: false,
    }))
    return document.querySelector("#nea-client-ui")?.textContent
  })
  assert.match(checkpoint ?? "", /Checkpoint\s+3 \/ 4/)
  assert.match(checkpoint ?? "", /Checkpoint 3 saved/)

  const screens = await page.evaluate(() => {
    const modules = {
      "clientIndex.js": "",
      __nea_ui_state__: JSON.stringify({
        defaultScreenId: "default",
        uiTree: {
          ROOT_ID: { id: "ROOT_ID", childrenIds: ["default", "active"] },
          default: { id: "default", name: "hidden-screen", parentId: "ROOT_ID", value: { type: "screen", data: { enable: false } } },
          hiddenText: { id: "hiddenText", name: "hidden-text", parentId: "default", value: { type: "text", data: { type: "text", data: { textContent: "HIDDEN" } } } },
          active: { id: "active", name: "active-screen", parentId: "ROOT_ID", value: { type: "screen", data: { enable: true } } },
          activeText: { id: "activeText", name: "active-text", parentId: "active", value: { type: "text", data: { type: "text", data: { textContent: "VISIBLE" } } } },
        },
      }),
    };
    ;(window as any).__neaClientRuntimeInstall(JSON.stringify(modules))
    const root = document.querySelector("#nea-client-ui")!;
    const hidden = [...root.children].find(element => (element as HTMLElement).style.display === "none") as HTMLElement;
    const active = [...root.children].find(element => (element as HTMLElement).style.display === "block") as HTMLElement;
    return {
      rootChildren: root.children.length,
      hiddenText: hidden?.textContent,
      activeText: active?.textContent,
      activeWidth: active?.style.width,
      activeHeight: active?.style.height,
    };
  })
  assert.deepEqual(screens, {
    rootChildren: 2,
    hiddenText: "HIDDEN",
    activeText: "VISIBLE",
    activeWidth: "calc(100% + 0px)",
    activeHeight: "calc(100% + 0px)",
  })

  const apiSurface = await page.evaluate(() => {
    ;(window as any).__neaClientRuntimeInstall(JSON.stringify({
      "clientIndex.js": `
        const box = UiBox.create();
        box.parent = ui;
        box.rotation = 15;
        box.size.offset.copy({ x: 120, y: 40 });
        box.uiScale.scale = 0.75;
        box.pointerEventBehavior = PointerEventBehavior.ENABLE;
        box.events.add("pointerup", () => remoteChannel.sendServerEvent({ type: "pointer" }));
        screen.events.add("resize", event => remoteChannel.sendServerEvent({ type: "resize", width: event.screenWidth }));
        remoteChannel.sendServerEvent({ type: "device", info: navigator.getDeviceInfo() });
        remoteChannel.sendServerEvent({ type: "media", methods: ["startRecording", "stopRecording", "playAudio", "stopPlayAudio"].every(name => typeof media[name] === "function") });
        const audio = new Audio("");
        audio.volume = 2;
        remoteChannel.sendServerEvent({ type: "audio", volume: audio.volume, events: typeof audio.add === "function" && typeof audio.events.add === "function" });
        world.events.add("rendering3d", event => remoteChannel.sendServerEvent({ type: "world", rendering3d: event.rendering3d }));
        world.rendering3d = false;
        const field = UiInput.create();
        field.name = "field";
        field.parent = ui;
        field.placeholder = "Enter name";
        field.events.add("input", input => remoteChannel.sendServerEvent({ type: "input", value: input.textContent }));
        const scroll = UiScrollBox.create();
        scroll.name = "scroll";
        scroll.parent = ui;
        scroll.scrollPosition.copy({ x: 4, y: 8 });
        const label = UiText.create();
        label.parent = box;
        label.textContent = "template";
        const cloned = box.clone();
        remoteChannel.sendServerEvent({ type: "clone", width: cloned.size.offset.x, scale: cloned.uiScale.scale, child: cloned.children[0].textContent });
      `,
    }))
    const box = document.querySelector("#nea-client-ui > div") as HTMLElement
    box.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }))
    const field = document.querySelector("#nea-client-ui input") as HTMLInputElement
    field.value = "Alex"
    field.dispatchEvent(new Event("input", { bubbles: true }))
    window.dispatchEvent(new Event("resize"))
    return {
      transform: box.style.transform,
      pointerEvents: box.style.pointerEvents,
      placeholder: field.placeholder,
      outbound: JSON.parse((window as any).__neaClientRuntimeDrain()),
    }
  })
  assert.match(apiSurface.transform, /rotate\(15deg\)/)
  assert.match(apiSurface.transform, /scale\(0.75\)/)
  assert.equal(apiSurface.pointerEvents, "auto")
  assert.equal(apiSurface.placeholder, "Enter name")
  assert.equal(apiSurface.outbound[0].type, "device")
  assert.equal(apiSurface.outbound[0].info.deviceType, "Desktop")
  assert.deepEqual(apiSurface.outbound[1], { type: "media", methods: true })
  assert.deepEqual(apiSurface.outbound[2], { type: "audio", volume: 1, events: true })
  assert.deepEqual(apiSurface.outbound[3], { type: "world", rendering3d: false })
  assert.deepEqual(apiSurface.outbound[4], { type: "clone", width: 120, scale: 0.75, child: "template" })
  assert.equal(apiSurface.outbound[5].type, "pointer")
  assert.deepEqual(apiSurface.outbound[6], { type: "input", value: "Alex" })
  assert.equal(apiSurface.outbound[7].type, "resize")

  const damageFeedback = await page.evaluate(() => {
    ;(window as any).__neaClientRuntimeReceive(JSON.stringify({
      type: "nea-revive:damage-state",
      target: { playerId: "local" },
      state: { hp: 35, maxHp: 100, showHealthBar: true },
      events: { hurt: 20 },
    }))
    const layer = document.querySelector("#nea-damage-feedback") as HTMLElement
    return {
      healthSrc: (layer.querySelector('#health_bar') as HTMLImageElement)?.src,
      amount: layer.querySelector(".nea-damage-number")?.textContent,
      shadow: layer.style.boxShadow,
    }
  })
  // The fixture has no pictureAssets dictionary, so the canonical runtime
  // keeps the image slot hidden instead of emitting a broken-image glyph.
  assert.equal(damageFeedback.healthSrc, "")
  assert.equal(damageFeedback.amount, "20")
  assert.match(damageFeedback.shadow, /rgba\(190, 24, 36/)

  const gameplayFeedback = await page.evaluate(() => {
    ;(window as any).__neaClientRuntimeReceive(JSON.stringify({
      type: "nea-revive:player-gameplay",
      action: "give",
      item: "API方块",
      count: 3,
      gamemode: 1,
      inventory: { "API方块": 3 },
      buffs: [],
    }))
    const hud = document.querySelector("#nea-gameplay-hud") as HTMLElement
    return { display: hud.style.display, text: hud.textContent }
  })
  assert.equal(gameplayFeedback.display, "block")
  assert.match(gameplayFeedback.text ?? "", /CREATIVE/)
  assert.match(gameplayFeedback.text ?? "", /API方块 x3/)

  const directMessageFeedback = await page.evaluate(() => {
    ;(window as any).__neaClientRuntimeReceive(JSON.stringify({
      type: "nea-revive:chat",
      valid: true,
      kind: "system",
      message: "已为您穿上防护服",
    }))
    const notice = document.querySelector("#nea-engine-notice") as HTMLElement
    return { display: notice.style.display, text: notice.textContent }
  })
  assert.equal(directMessageFeedback.display, "block")
  assert.match(directMessageFeedback.text ?? "", /已为您穿上防护服/)

  const selectDialog = await page.evaluate(() => {
    ;(window as any).__neaClientRuntimeReceive(JSON.stringify({
      type: "nea-historical-dialog-open",
      dialog: {
        rpcId: 41,
        config: { Select: { title: "穿戴", content: "请选择皮肤(商店中购买的)", options: ["M.E.G.头盔", "关闭"] } },
      },
    }))
    const root = document.querySelector("#nea-historical-dialog") as HTMLElement
    return {
      text: root.textContent,
      inputs: root.querySelectorAll("input").length,
      buttons: [...root.querySelectorAll("div")].filter(element => getComputedStyle(element).pointerEvents === "auto").map(element => element.textContent),
    }
  })
  assert.equal(selectDialog.inputs, 0)
  assert.match(selectDialog.text ?? "", /穿戴/)
  assert.match(selectDialog.text ?? "", /请选择皮肤\(商店中购买的\)/)
  assert.ok(selectDialog.buttons.some(text => text === "M.E.G.头盔"))
  assert.ok(selectDialog.buttons.some(text => text === "关闭"))

  const emptySelectDialog = await page.evaluate(() => {
    ;(window as any).__neaClientRuntimeReceive(JSON.stringify({
      type: "nea-historical-dialog-open",
      dialog: {
        rpcId: 42,
        config: { Select: { title: "Select", content: "No choices", options: ["关闭"] } },
      },
    }))
    const panel = document.querySelector("#nea-historical-dialog")?.firstElementChild as HTMLElement | null
    const body = panel?.children[2] as HTMLElement | undefined
    return {
      childCount: body?.children.length ?? 0,
      hasEmptySlot: [...(body?.children ?? [])].some(element => element.textContent === ""),
    }
  })
  assert.equal(emptySelectDialog.childCount, 2)
  assert.equal(emptySelectDialog.hasEmptySlot, true)

  const soundFeedback = await page.evaluate(async () => {
    const created: any[] = []
    let attempts = 0
    let errors = 0
    const originalError = console.error
    console.error = () => { errors++ }
    ;(window as any).Audio = class {
      src: string; volume = 1; playbackRate = 1; currentTime = 0; paused = false; loop = false
      constructor(src: string) { this.src = src; created.push(this) }
      addEventListener() {}
      play() {
        attempts++
        if (this.src.endsWith("broken.mp3")) return Promise.reject(new DOMException("decode failed", "NotSupportedError"))
        if (attempts === 1) return Promise.reject(new DOMException("gesture required", "NotAllowedError"))
        this.paused = false
        return Promise.resolve()
      }
      pause() { this.paused = true }
    }
    ;(window as any).__neaClientRuntimeReceive(JSON.stringify({
      type: "nea-revive:sound",
      command: { action: "play", soundId: 7, sampleUrl: "http://127.0.0.1/test.mp3", gain: 0.4, pitch: 1.25, loop: true },
    }))
    await new Promise(resolve => setTimeout(resolve, 0))
    window.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }))
    await new Promise(resolve => setTimeout(resolve, 0))
    ;(window as any).__neaClientRuntimeReceive(JSON.stringify({
      type: "nea-revive:sound",
      command: { action: "play", soundId: 8, sampleUrl: "http://127.0.0.1/broken.mp3" },
    }))
    await new Promise(resolve => setTimeout(resolve, 0))
    console.error = originalError
    return { src: created[0]?.src, volume: created[0]?.volume, rate: created[0]?.playbackRate, loop: created[0]?.loop, attempts, errors }
  })
  assert.deepEqual(soundFeedback, { src: "http://127.0.0.1/test.mp3", volume: 0.4, rate: 1.25, loop: true, attempts: 3, errors: 1 })

  const playerUi = await page.evaluate(() => {
    ;(window as any).__neaClientRuntimeReceive(JSON.stringify({
      type: "nea-revive:player-ui",
      action: "marketplace",
      productIds: [160000000000001, 160000000000002],
    }))
    const modal = document.querySelector("#nea-player-modal") as HTMLElement
    return { text: modal.textContent, pointerEvents: modal.style.pointerEvents }
  })
  assert.match(playerUi.text ?? "", /地图商店/)
  assert.match(playerUi.text ?? "", /160000000000001/)
  assert.equal(playerUi.pointerEvents, "auto")

  const remoteEventIsolation = await page.evaluate(() => {
    ;(window as any).__neaClientRuntimeInstall(JSON.stringify({
      "clientIndex.js": `
        remoteChannel.events.on("client", event => {
          remoteChannel.sendServerEvent({ type: "observed-client-event", event });
        });
      `,
    }))
    ;(window as any).__neaClientRuntimeDrain()
    const internalEvents = [
      { type: "nea-revive:entity-state", entityId: "1", state: {} },
      { type: "nea-revive:camera-state", mode: 1, fovY: 70 },
      { type: "nea-revive:damage-state", state: { hp: 100, maxHp: 100 }, events: {} },
      { type: "nea-revive:player-gameplay", gamemode: 0, inventory: {}, buffs: [] },
      { type: "nea-revive:player-ui", action: "profile", userId: "local" },
      { type: "nea-revive:sound", command: { action: "stop", soundId: 404 } },
      { type: "nea-revive:chat", valid: true, message: "engine-owned" },
    ]
    for (const event of internalEvents) {
      ;(window as any).__neaClientRuntimeReceive(JSON.stringify(event))
    }
    const internalOutbound = JSON.parse((window as any).__neaClientRuntimeDrain())
    const mapPayload = { type: "map:event", value: "delivered" }
    ;(window as any).__neaClientRuntimeReceive(JSON.stringify(mapPayload))
    const mapOutbound = JSON.parse((window as any).__neaClientRuntimeDrain())
    return { internalOutbound, mapOutbound }
  })
  assert.deepEqual(remoteEventIsolation.internalOutbound, [])
  assert.deepEqual(remoteEventIsolation.mapOutbound, [{
    type: "observed-client-event",
    event: { type: "map:event", value: "delivered" },
  }])

  const uiEnhancements = await page.evaluate(() => {
    ;(window as any).__neaClientRuntimeInstall(JSON.stringify({
      "clientIndex.js": `
        const label = UiText.create();
        label.parent = ui;
        label.textContent = "aligned";
        label.textXAlignment = "Right";
        label.textYAlignment = "Bottom";
        label.textFontFamily = UITextFontFamily.CodeNewRomanBold;
        label.autoResize = "XY";
        label.events.add("pointerup", () => remoteChannel.sendServerEvent({ type: "kept" }));
        label.events.removeAll("pointerup");
        label.events.add("pointerup", () => remoteChannel.sendServerEvent({ type: "removed" }));
        label.events.off("pointerup");
        label.events.add("pointerup", () => remoteChannel.sendServerEvent({ type: "final" }));
      `,
    }))
    const label = [...document.querySelectorAll("#nea-client-ui > div")].find(node => node.textContent === "aligned") as HTMLElement
    return { family: label.style.fontFamily, width: label.style.width, height: label.style.height, justify: label.style.justifyContent, align: label.style.alignItems }
  })
  assert.match(uiEnhancements.family, /Courier New/)
  assert.equal(uiEnhancements.width, "max-content")
  assert.equal(uiEnhancements.height, "max-content")
  assert.equal(uiEnhancements.justify, "flex-end")
  assert.equal(uiEnhancements.align, "flex-end")

  const archivedPlayer = await page.evaluate(({ ui, client, data }) => {
    ;(window as any).__neaClientRuntimeInstall(JSON.stringify({
      "clientIndex.js": client,
      "cilentData.js": data,
      __nea_ui_state__: ui,
    }))
    return {
      healthBar: Boolean((window as any).__neaClientRuntimeDrain),
      scrollBox: [...document.querySelectorAll("#nea-client-ui *")].some(node => (node as HTMLElement).dataset?.neaName === "scrollBox"),
    }
  }, { ui: archivedUi, client: archivedClient, data: archivedData })
  assert.equal(archivedPlayer.healthBar, true)
  console.log("client script browser runtime smoke passed")
} finally {
  await browser.close()
}
