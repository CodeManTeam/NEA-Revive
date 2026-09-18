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
const bedwarsUi = await readFile(
  "D:/Projects/Gaming/NEA-Revive/packages/bedwars-s2-main/source/ui.json",
  "utf8",
)
const bedwarsClient = await readFile(
  "D:/Projects/Gaming/NEA-Revive/packages/bedwars-s2-main/scripts/clientIndex.js",
  "utf8",
)
const bedwarsClientConfig = await readFile(
  "D:/Projects/Gaming/NEA-Revive/packages/bedwars-s2-main/scripts/config.js",
  "utf8",
)
const bedwarsClientData = await readFile(
  "D:/Projects/Gaming/NEA-Revive/packages/bedwars-s2-main/scripts/cilentData.js",
  "utf8",
)
const minecraftHydratedUi = await readFile(
  "D:/Projects/Gaming/NEA-Revive/packages/minecraft-hydrated/source/ui.json",
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
        const uiScale = UiScale.create();
        uiScale.scale = 0.75;
        box.uiScale = uiScale;
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
        field.events.add("input", event => remoteChannel.sendServerEvent({ type: "input", value: event.target.textContent }));
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

  const recoveredUiProperties = await page.evaluate(() => {
    ;(window as any).__neaClientRuntimeInstall(JSON.stringify({
      "clientIndex.js": "",
      __nea_ui_state__: JSON.stringify({
        uiTree: {
          ROOT_ID: { id: "ROOT_ID", childrenIds: ["screen"] },
          screen: { id: "screen", name: "screen", parentId: "ROOT_ID", value: { type: "screen", data: { enable: true } } },
          title: {
            id: "title", name: "title", parentId: "screen", value: { type: "text", data: { type: "text", data: {
              textContent: '<font size="22" color="#ff0000">Status <stroke thickness="2" opacity="0.5" color="#00ff00">online</stroke></font>',
              richText: true, textColor: [10, 20, 30], textOpacity: 0.5, textFontFamily: 3,
              textLineHeight: 1.7, textXAlignment: 2, textYAlignment: 1,
              textStrokeColor: [1, 2, 3], textStrokeOpacity: 0.75, textStrokeThickness: 1,
              autoWordWrap: true, clipsDescendants: true, rotation: Math.PI / 12, position: { offset: [0, 0], ratio: [0, 0] }, size: { offset: [240, 80], ratio: [0, 0] },
            } } },
          },
          field: {
            id: "field", name: "field", parentId: "screen", value: { type: "input", data: { type: "input", data: {
              textContent: "", placeholder: "Enter name", placeholderColor: [12, 34, 56], placeholderOpacity: 0.6,
              position: { offset: [0, 90], ratio: [0, 0] }, size: { offset: [240, 32], ratio: [0, 0] },
            } } },
          },
          scroll: {
            id: "scroll", name: "scroll", parentId: "screen", value: { type: "scrollBox", data: { type: "scrollBox", data: {
              scrollDirection: 1, scrollCanvasAutoResize: 0, scrollCanvasSize: { offset: [0, 960], ratio: [1, 0] },
              scrollPosition: [4, 8], scrollbarColor: [90, 80, 70], scrollbarOpacity: 0.4, scrollbarThickness: 5,
              scrollbarHorizontal: 1, scrollbarVertical: 1, position: { offset: [0, 130], ratio: [0, 0] }, size: { offset: [240, 100], ratio: [0, 0] },
            } } },
          },
          scrollText: { id: "scrollText", name: "scrollText", parentId: "scroll", value: { type: "text", data: { type: "text", data: { textContent: "inside scroll" } } } },
        },
      }),
    }))
    const root = document.querySelector("#nea-client-ui") as HTMLElement
    const screen = root.firstElementChild as HTMLElement
    const [title, field, scroll] = [...screen.children] as [HTMLElement, HTMLElement, HTMLElement]
    return {
      title: title.textContent,
      titleMarkup: title.innerHTML,
      font: title.style.fontFamily,
      lineHeight: title.style.lineHeight,
      justify: title.style.justifyContent,
      align: title.style.alignItems,
      whiteSpace: title.style.whiteSpace,
      overflow: title.style.overflow,
      stroke: title.style.webkitTextStroke,
      transform: title.style.transform,
      fieldPlaceholder: (field as HTMLInputElement).placeholder,
      placeholderColor: field.style.getPropertyValue("--nea-placeholder-color"),
      scrollOverflowX: scroll.style.overflowX,
      scrollOverflowY: scroll.style.overflowY,
      scrollCanvasWidth: (scroll.firstElementChild as HTMLElement).style.width,
      scrollCanvasHeight: (scroll.firstElementChild as HTMLElement).style.height,
      scrollChild: scroll.firstElementChild?.textContent,
      scrollThumb: scroll.style.getPropertyValue("--nea-scroll-thumb"),
      scrollThickness: scroll.style.getPropertyValue("--nea-scroll-thickness"),
    }
  })
  assert.equal(recoveredUiProperties.title, "Status online")
  assert.match(recoveredUiProperties.titleMarkup, /<span/)
  assert.match(recoveredUiProperties.font, /Georgia/)
  assert.equal(recoveredUiProperties.lineHeight, "1.7")
  assert.equal(recoveredUiProperties.justify, "flex-end")
  assert.equal(recoveredUiProperties.align, "flex-start")
  assert.equal(recoveredUiProperties.whiteSpace, "pre-wrap")
  assert.equal(recoveredUiProperties.overflow, "hidden")
  assert.match(recoveredUiProperties.stroke, /1px/)
  assert.match(recoveredUiProperties.transform, /rotate\(15deg\)/)
  assert.equal(recoveredUiProperties.fieldPlaceholder, "Enter name")
  assert.match(recoveredUiProperties.placeholderColor, /12.*34.*56/)
  assert.equal(recoveredUiProperties.scrollOverflowX, "hidden")
  assert.equal(recoveredUiProperties.scrollOverflowY, "auto")
  assert.equal(recoveredUiProperties.scrollCanvasWidth, "calc(100% + 0px)")
  assert.equal(recoveredUiProperties.scrollCanvasHeight, "960px")
  assert.equal(recoveredUiProperties.scrollChild, "inside scroll")
  assert.match(recoveredUiProperties.scrollThumb, /90.*80.*70/)
  assert.equal(recoveredUiProperties.scrollThickness, "5px")

  const runtimeContract = await page.evaluate(() => {
    ;(window as any).__neaClientRuntimeDrain()
    ;(window as any).__neaClientRuntimeInstall(JSON.stringify({
      "clientIndex.js": `
        const text = UiText.create();
        const image = UiImage.create();
        const box = UiBox.create();
        const cloneSource = UiBox.create();
        text.parent = ui;
        cloneSource.parent = ui;
        cloneSource.pointerEventBehavior = PointerEventBehavior.BLOCK_PASS_THROUGH;
        const clone = cloneSource.clone();
        text.rotation = 999;
        text.textStrokeThickness = 99;
        box.events.add("event", () => remoteChannel.sendServerEvent({ type: "repeat" }));
        box.events.once("event", () => remoteChannel.sendServerEvent({ type: "once" }));
        box.events.emit("event");
        box.events.emit("event");
        remoteChannel.sendServerEvent({
          type: "defaults",
          text: text.textContent,
          fontSize: text.textFontSize,
          backgroundOpacity: text.backgroundOpacity,
          zIndex: text.zIndex,
          rotation: text.rotation,
          stroke: text.textStrokeThickness,
          anchor: { x: text.anchor.x, y: text.anchor.y },
          colorAliases: (() => { const color = Vec3.create({ x: 12, y: 34, z: 56 }); color.r = 78; return { x: color.x, r: color.r, g: color.g, b: color.b }; })(),
          clone: { parent: clone.parent === ui, behavior: clone.pointerEventBehavior },
          imageMode: ImageDisplayMode.None,
        });
      `,
    }))
    const text = document.querySelector("#nea-client-ui > div") as HTMLElement
    return { transform: text.style.transform, outbound: JSON.parse((window as any).__neaClientRuntimeDrain()) }
  })
  assert.match(runtimeContract.transform, /rotate\(180deg\)/)
  assert.deepEqual(runtimeContract.outbound, [
    { type: "repeat" },
    { type: "once" },
    { type: "repeat" },
    {
      type: "defaults",
      text: "",
      fontSize: 16,
      backgroundOpacity: 0,
      zIndex: 1,
      rotation: 180,
      stroke: 25,
      anchor: { x: 0, y: 0 },
      colorAliases: { x: 78, r: 78, g: 34, b: 56 },
      clone: { parent: true, behavior: 3 },
      imageMode: 3,
    },
  ])

  const pointerAndReloadIsolation = await page.evaluate(() => {
    ;(window as any).__neaClientRuntimeInstall(JSON.stringify({
      "clientIndex.js": `
        const blocked = UiBox.create();
        blocked.parent = ui;
        blocked.pointerEventBehavior = PointerEventBehavior.BLOCK_PASS_THROUGH;
        blocked.events.add("pointerdown", () => remoteChannel.sendServerEvent({ type: "blocked-handler" }));
        const enabled = UiBox.create();
        enabled.parent = ui;
        enabled.pointerEventBehavior = PointerEventBehavior.ENABLE;
        enabled.events.add("pointerdown", () => remoteChannel.sendServerEvent({ type: "enabled-handler" }));
        remoteChannel.events.add("client", () => remoteChannel.sendServerEvent({ type: "old-remote" }));
        input.pointerLockEvents.add("pointerlockchange", () => remoteChannel.sendServerEvent({ type: "old-lock" }));
        screen.events.add("resize", () => remoteChannel.sendServerEvent({ type: "old-resize" }));
        ui.events.add("pointerdown", event => remoteChannel.sendServerEvent({ type: "root-pointer", target: event.target === blocked ? "blocked" : "enabled" }));
        globalThis.__neaUiNodes = { blocked, enabled };
      `,
    }))
    ;(window as any).__neaClientRuntimeDrain()
    const blockedEvent = new PointerEvent("pointerdown", { bubbles: true, cancelable: true })
    const enabledEvent = new PointerEvent("pointerdown", { bubbles: true, cancelable: true })
    const blockedAccepted = (globalThis as any).__neaUiNodes.blocked.element.dispatchEvent(blockedEvent)
    const enabledAccepted = (globalThis as any).__neaUiNodes.enabled.element.dispatchEvent(enabledEvent)
    const first = JSON.parse((window as any).__neaClientRuntimeDrain())
    ;(window as any).__neaClientRuntimeInstall(JSON.stringify({
      "clientIndex.js": `
        remoteChannel.events.add("client", () => remoteChannel.sendServerEvent({ type: "new-remote" }));
        input.pointerLockEvents.add("pointerlockchange", () => remoteChannel.sendServerEvent({ type: "new-lock" }));
        screen.events.add("resize", () => remoteChannel.sendServerEvent({ type: "new-resize" }));
      `,
    }))
    ;(window as any).__neaClientRuntimeReceive(JSON.stringify({ type: "draw" }))
    document.dispatchEvent(new Event("pointerlockchange"))
    window.dispatchEvent(new Event("resize"))
    return { blockedAccepted, enabledAccepted, first, second: JSON.parse((window as any).__neaClientRuntimeDrain()) }
  })
  assert.equal(pointerAndReloadIsolation.blockedAccepted, false)
  assert.equal(pointerAndReloadIsolation.enabledAccepted, false)
  assert.deepEqual(pointerAndReloadIsolation.first, [
    { type: "blocked-handler" },
    { type: "root-pointer", target: "blocked" },
    { type: "enabled-handler" },
    { type: "root-pointer", target: "enabled" },
  ])
  assert.deepEqual(pointerAndReloadIsolation.second, [
    { type: "new-remote" },
    { type: "new-lock" },
    { type: "new-resize" },
  ])

  const importedRotation = await page.evaluate(ui => {
    ;(window as any).__neaClientRuntimeInstall(JSON.stringify({
      "clientIndex.js": "",
      __nea_ui_state__: ui,
    }))
    return [...document.querySelectorAll("#nea-client-ui [data-nea-name]")]
      .filter(element => ["Shie", "LShie"].includes((element as HTMLElement).dataset.neaName || ""))
      .map(element => ({ name: (element as HTMLElement).dataset.neaName, transform: (element as HTMLElement).style.transform }))
      .sort((left, right) => String(left.name).localeCompare(String(right.name)))
  }, minecraftHydratedUi)
  assert.deepEqual(importedRotation, [
    { name: "LShie", transform: "translate(0%, 0%) rotate(14.9954deg) scale(1)" },
    { name: "LShie", transform: "translate(0%, 0%) rotate(14.9954deg) scale(1)" },
    { name: "Shie", transform: "translate(0%, 0%) rotate(-14.9954deg) scale(1)" },
    { name: "Shie", transform: "translate(0%, 0%) rotate(-14.9954deg) scale(1)" },
  ])

  const screenSemantics = await page.evaluate(() => {
    ;(window as any).__neaClientRuntimeInstall(JSON.stringify({
      "clientIndex.js": `
        const scale = UiScale.create();
        ui.uiScale = scale;
        scale.scale = 0.5;
        remoteChannel.sendServerEvent({
          type: "screen-semantics",
          direct: Boolean(ui.findChildByName("direct")),
          nested: ui.findChildByName("nested") === null,
          other: ui.findChildByName("other") === null,
          screens: UiScreen.getAllScreen().map(screen => screen.name).sort(),
          scale: ui.uiScale.scale,
        });
      `,
      __nea_ui_state__: JSON.stringify({
        defaultScreenId: "default",
        uiTree: {
          ROOT_ID: { id: "ROOT_ID", childrenIds: ["default", "otherScreen"] },
          default: { id: "default", name: "default", parentId: "ROOT_ID", value: { type: "screen", data: { enable: true } } },
          direct: { id: "direct", name: "direct", parentId: "default", value: { type: "text", data: { type: "text", data: { textContent: "direct" } } } },
          holder: { id: "holder", name: "holder", parentId: "default", value: { type: "element", data: { type: "box", data: {} } } },
          nested: { id: "nested", name: "nested", parentId: "holder", value: { type: "text", data: { type: "text", data: { textContent: "nested" } } } },
          otherScreen: { id: "otherScreen", name: "other-screen", parentId: "ROOT_ID", value: { type: "screen", data: { enable: true } } },
          other: { id: "other", name: "other", parentId: "otherScreen", value: { type: "text", data: { type: "text", data: { textContent: "other" } } } },
        },
      }),
    }))
    const payload = JSON.parse((window as any).__neaClientRuntimeDrain())
    const screen = [...document.querySelectorAll("#nea-client-ui > div")].find(element => (element as HTMLElement).dataset.neaName === "default") as HTMLElement
    return { payload, transform: screen.style.transform }
  })
  assert.deepEqual(screenSemantics.payload, [{
    type: "screen-semantics",
    direct: true,
    nested: true,
    other: true,
    screens: ["default", "other-screen"],
    scale: 0.5,
  }])
  assert.match(screenSemantics.transform, /scale\(0.5\)/)

  const missingPicture = await page.evaluate(() => {
    ;(window as any).__neaClientRuntimeInstall(JSON.stringify({
      "clientIndex.js": `
        const missing = UiImage.create();
        missing.parent = ui;
        missing.size.offset.copy({ x: 24, y: 24 });
        missing.backgroundColor.copy({ r: 255, g: 0, b: 0 });
        missing.backgroundOpacity = 1;
        missing.image = "picture/not-exported.png";
      `,
    }))
    const image = [...document.querySelectorAll("#nea-client-ui img")].at(-1) as HTMLImageElement
    return { src: image?.getAttribute("src") ?? "", background: image ? getComputedStyle(image).backgroundColor : "" }
  })
  assert.equal(missingPicture.src, "")
  assert.equal(missingPicture.background, "rgba(0, 0, 0, 0)")

  const damageFeedback = await page.evaluate(() => {
    ;(window as any).__neaClientRuntimeReceive(JSON.stringify({
      type: "nea-revive:damage-state",
      target: { playerId: "local" },
      state: { hp: 35, maxHp: 100, showHealthBar: true },
      events: { hurt: 20 },
    }))
    const layer = document.querySelector("#nea-damage-feedback") as HTMLElement
    return {
      healthSrc: (layer.querySelector('#health_bar img') as HTMLImageElement)?.src,
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
    event: { type: "map:event", value: "delivered", args: {} },
  }])

  const linkPage = await browser.newPage()
  await linkPage.route("http://nea.test/**", route => route.fulfill({
    contentType: "text/html",
    body: "<html><body><canvas id=\"game\"></canvas></body></html>",
  }))
  await linkPage.goto("http://nea.test/start.html")
  await linkPage.addScriptTag({ content: runtimeSource })
  const localLink = await linkPage.evaluate(() => {
    let opened: string | undefined
    const originalOpen = window.open
    window.open = (url?: string | URL) => { opened = url === undefined ? undefined : String(url); return null }
    ;(window as any).__neaClientRuntimeReceive(JSON.stringify({
      type: "nea-revive:link",
      href: "https://dao3.fun/play/original-map",
      createSessionUrl: "http://127.0.0.1:18083/api/createSession",
      options: { isConfirm: false, isNewTab: true },
    }))
    window.open = originalOpen
    return opened
  })
  assert.equal(new URL(localLink!).searchParams.get("nea"), "http://127.0.0.1:18083/api/createSession")
  await linkPage.close()

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

  const bedwarsPage = await browser.newPage()
  await bedwarsPage.setContent("<html><body><canvas id=\"game\"></canvas></body></html>")
  await bedwarsPage.addScriptTag({ content: runtimeSource })
  const bedwarsDraw = await bedwarsPage.evaluate(({ ui, client, config, data }) => {
    const errors: string[] = []
    window.addEventListener("error", event => errors.push(String(event.error ?? event.message)))
    ;(window as any).__neaClientRuntimeInstall(JSON.stringify({
      "clientIndex.js": client,
      "cilentData.js": data,
      "config.js": config,
      __nea_ui_state__: ui,
    }))
    ;(window as any).__neaClientRuntimeReceive(JSON.stringify({
      type: "draw",
      args: { dateNum: "08/26/26", beds: [true, true, true, true], players: [1, 2, 3, 4] },
    }))
    document.dispatchEvent(new Event("pointerlockchange"))
    // Reinstall the same map after a completed draw. Pointer-lock changes
    // during the new script's setup must wait until its draw handler has
    // cloned the chat rows; otherwise the historical Bedwars callback reads
    // contentList/titleList entries that do not exist yet.
    ;(window as any).__neaClientRuntimeInstall(JSON.stringify({
      "clientIndex.js": client,
      "cilentData.js": data,
      "config.js": config,
      __nea_ui_state__: ui,
    }))
    document.dispatchEvent(new Event("pointerlockchange"))
    ;(window as any).__neaClientRuntimeReceive(JSON.stringify({
      type: "draw",
      args: { dateNum: "08/26/26", beds: [true, true, true, true], players: [1, 2, 3, 4] },
    }))
    const sidebarBeforeInventory = document.querySelector('[data-nea-name="sidebar"]') as HTMLElement
    if (sidebarBeforeInventory && getComputedStyle(sidebarBeforeInventory).display === "none") {
      ;(window as any).__neaClientRuntimeReceive(JSON.stringify({
        type: "showUI",
        args: { type: "sidebar" },
      }))
    }
    ;(window as any).__neaClientRuntimeReceive(JSON.stringify({
      type: "showinventory",
      args: { show: true, type: "shop" },
    }))
    const sidebar = document.querySelector('[data-nea-name="sidebar"]') as HTMLElement
    const sidebarEntry = sidebar?.querySelector('[data-nea-name="RED"]') as HTMLElement
    const shop = [...document.querySelectorAll('[data-nea-name="shopImage"]')]
      .map(node => node as HTMLElement)
      .find(node => node.getBoundingClientRect().width > 0)
    const visibleShopItems = [...document.querySelectorAll('[data-nea-name="shopItem"]')]
      .filter(node => (node as HTMLElement).getBoundingClientRect().width > 0)
      .filter(node => getComputedStyle(node).display !== "none") as HTMLElement[]
    visibleShopItems[0]?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }))
    const products = [...document.querySelectorAll('[data-nea-name="shopItem"]')]
      .filter(node => (node as HTMLElement).getBoundingClientRect().width > 0)
      .filter(node => getComputedStyle(node).display !== "none") as HTMLElement[]
    products[7]?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }))
    return {
      errors,
      uiNodeCount: document.querySelectorAll("#nea-client-ui *").length,
      scoreboard: {
        tag: sidebar?.tagName,
        display: sidebarEntry ? getComputedStyle(sidebarEntry).display : "none",
        values: ["redNum", "blueNum", "greenNum", "yellowNum", "kills", "finalkills", "breakBeds"]
          .map(name => document.querySelector(`[data-nea-name="${name}"]`)?.textContent ?? ""),
      },
      shop: {
        width: shop?.getBoundingClientRect().width ?? 0,
        visibleItems: visibleShopItems.length,
      },
      outbound: JSON.parse((window as any).__neaClientRuntimeDrain()),
    }
  }, { ui: bedwarsUi, client: bedwarsClient, config: bedwarsClientConfig, data: bedwarsClientData })
  assert.deepEqual(bedwarsDraw.errors, [])
  assert.ok(bedwarsDraw.uiNodeCount > 20)
  assert.equal(bedwarsDraw.scoreboard.tag, "DIV")
  assert.notEqual(bedwarsDraw.scoreboard.display, "none")
  assert.deepEqual(bedwarsDraw.scoreboard.values, ["1", "2", "3", "4", "0", "0", "0"])
  assert.ok(bedwarsDraw.shop.width > 0)
  assert.equal(bedwarsDraw.shop.visibleItems, 7)
  assert.ok(bedwarsDraw.outbound.some((event: { type?: string }) => event.type === "buy"))
  await bedwarsPage.close()
  console.log("client script browser runtime smoke passed")
} finally {
  await browser.close()
}
