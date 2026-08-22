(function () {
  "use strict";

  const outbound = [];
  let uiPictureAssets = Object.create(null);
  const remoteEvents = createEmitter();
  const pointerLockEvents = createEmitter();
  const screenEvents = createEmitter();
  const clientWorld = { events: createEmitter() };
  Object.defineProperty(clientWorld, "rendering3d", {
    enumerable: true,
    get: () => clientWorld._rendering3d,
    set: value => {
      clientWorld._rendering3d = Boolean(value);
      clientWorld.events.emit("rendering3d", { rendering3d: clientWorld._rendering3d });
    },
  });
  clientWorld._rendering3d = true;
  let mediaRecorder = null;
  let mediaChunks = [];
  let mediaPlayback = null;
  const serverSounds = new Map();
  const pendingServerSounds = new Set();
  function playServerSound(soundId, audio) {
    Promise.resolve(audio.play()).then(() => {
      pendingServerSounds.delete(soundId);
    }).catch(error => {
      if (serverSounds.get(soundId) !== audio) return;
      if (error?.name === "NotAllowedError") {
        pendingServerSounds.add(soundId);
        return;
      }
      pendingServerSounds.delete(soundId);
      console.error(`[nea-sound] failed to play sound ${soundId}`, error);
    });
  }
  function retryPendingServerSounds() {
    for (const soundId of [...pendingServerSounds]) {
      const audio = serverSounds.get(soundId);
      if (!audio) pendingServerSounds.delete(soundId);
      else playServerSound(soundId, audio);
    }
  }
  window.addEventListener("pointerdown", retryPendingServerSounds, { capture: true });
  window.addEventListener("keydown", retryPendingServerSounds, { capture: true });
  const uiRoot = document.createElement("div");
  uiRoot.id = "nea-client-ui";
  uiRoot.style.cssText = "position:fixed;inset:0;z-index:20;pointer-events:none;overflow:hidden";
  function appendToBody(element) {
    if (document.body) document.body.appendChild(element);
    else document.addEventListener("DOMContentLoaded", () => document.body?.appendChild(element), { once: true });
  }
  appendToBody(uiRoot);
  // 引擎级 UI 层：承载聊天/系统提示等引擎自带控件，与地图 UI 树
  // （#nea-client-ui）分离，installUiState 清空地图 UI 时不受影响。
  const engineUiRoot = document.createElement("div");
  engineUiRoot.id = "nea-engine-ui";
  engineUiRoot.style.cssText = "position:fixed;inset:0;z-index:24;pointer-events:none;overflow:hidden";
  appendToBody(engineUiRoot);
  window.addEventListener("nea-historical-ui-event", () => {
    const detail = window.__NEA_HISTORICAL_UI_EVENT;
    if (!detail || typeof detail !== "object") return;
    const event = {
      type: "gameUI",
      event: String(detail.kind || ""),
      nodeId: String(detail.nodeId || ""),
    };
    if (detail.value !== undefined) event.value = String(detail.value);
    if (Number.isFinite(Number(detail.scrollTop))) event.scrollTop = Number(detail.scrollTop);
    if (Number.isFinite(Number(detail.scrollLeft))) event.scrollLeft = Number(detail.scrollLeft);
    outbound.push(event);
  });
  const ui = createUiRoot();
  const engineHost = { element: engineUiRoot };
  // 伤害反馈层：全屏，承载血条/死亡提示/伤害数字，全部用引擎 UI API 实现。
  const damageLayer = createUiNode("box");
  damageLayer.name = "nea-damage-feedback";
  damageLayer.element.id = "nea-damage-feedback";
  damageLayer.position.offset.copy({ x: 0, y: 0 });
  damageLayer.size.ratio.copy({ x: 1, y: 1 });
  damageLayer.backgroundColor.copy({ r: 0, g: 0, b: 0 });
  damageLayer.backgroundOpacity = 0;
  damageLayer.visible = true;
  damageLayer.zIndex = 19;
  damageLayer.parent = engineHost;
  // The historical Player uses two image nodes and swaps numbered frames;
  // keep that contract instead of inventing a CSS heart bar.
  const healthBar = createUiNode("image");
  healthBar.name = "health_bar";
  healthBar.element.id = "health_bar";
  healthBar.alt = "";
  healthBar.anchor.copy({ x: 0, y: 1 });
  healthBar.position.ratio.copy({ x: 0, y: 1 });
  healthBar.position.offset.copy({ x: 20, y: -98 });
  healthBar.size.offset.copy({ x: 180, y: 24 });
  healthBar.visible = true;
  healthBar.zIndex = 1;
  healthBar.parent = damageLayer;
  const extraHpBar = createUiNode("image");
  extraHpBar.name = "extra_hp_bar";
  extraHpBar.element.id = "extra_hp_bar";
  extraHpBar.alt = "";
  extraHpBar.anchor.copy({ x: 0, y: 1 });
  extraHpBar.position.ratio.copy({ x: 0, y: 1 });
  extraHpBar.position.offset.copy({ x: 20, y: -98 });
  extraHpBar.size.offset.copy({ x: 180, y: 24 });
  extraHpBar.visible = false;
  extraHpBar.zIndex = 1;
  extraHpBar.parent = damageLayer;
  // A missing project picture must not leak the browser's broken-image glyph
  // into the HUD. The original Player receives these through gameUI picture
  // assets; until that asset dictionary is present, keep the slot invisible.
  for (const imageNode of [healthBar, extraHpBar]) {
    imageNode.element.addEventListener("error", () => {
      imageNode.image = "";
      imageNode.visible = false;
    });
  }
  // Recovered player UI: hearts/Dieui is a hidden fullscreen overlay with a
  // centered "you died" tip. Keep the layout in viewport ratios from ui.json.
  const deathOverlay = createUiNode("box");
  deathOverlay.name = "nea-death-overlay";
  deathOverlay.element.id = "nea-death-overlay";
  deathOverlay.position.offset.copy({ x: 0, y: 0 });
  deathOverlay.size.ratio.copy({ x: 1, y: 1 });
  deathOverlay.backgroundColor.copy({ r: 65, g: 1, b: 1 });
  deathOverlay.backgroundOpacity = 0.5;
  deathOverlay.visible = false;
  deathOverlay.zIndex = 2;
  deathOverlay.parent = damageLayer;
  const deathTip = createUiNode("text");
  deathTip.name = "nea-death-tip";
  deathTip.textContent = "you died";
  deathTip.position.ratio.copy({ x: 0.29492, y: 0.22754 });
  deathTip.size.ratio.copy({ x: 0.40625, y: 0.07422 });
  deathTip.textColor.copy({ r: 230, g: 230, b: 230 });
  deathTip.textFontSize = 20;
  deathTip.textLineHeight = 1.199;
  deathTip.textAlign = "left";
  deathTip.textXAlignment = "Center";
  deathTip.textYAlignment = "Center";
  deathTip.parent = deathOverlay;
  const gameplayHud = createUiNode("box");
  gameplayHud.name = "nea-gameplay-hud";
  gameplayHud.element.id = "nea-gameplay-hud";
  gameplayHud.anchor.copy({ x: 1, y: 1 });
  gameplayHud.position.ratio.copy({ x: 1, y: 1 });
  gameplayHud.position.offset.copy({ x: -18, y: -22 });
  gameplayHud.size.offset.copy({ x: 204, y: 0 });
  gameplayHud.backgroundColor.copy({ r: 8, g: 12, b: 16 });
  gameplayHud.backgroundOpacity = 0.78;
  gameplayHud.borderRadius = 4;
  gameplayHud.visible = false;
  gameplayHud.zIndex = 22;
  gameplayHud.parent = engineHost;
  const gameplayHudText = createUiNode("text");
  gameplayHudText.name = "nea-gameplay-hud-text";
  gameplayHudText.textFontSize = 13;
  gameplayHudText.textLineHeight = 1.45;
  gameplayHudText.textColor.copy({ r: 255, g: 255, b: 255 });
  gameplayHudText.position.offset.copy({ x: 12, y: 9 });
  gameplayHudText.size.offset.copy({ x: 180, y: 0 });
  gameplayHudText.autoResize = "Y";
  gameplayHudText.textXAlignment = "Left";
  gameplayHudText.textYAlignment = "Top";
  gameplayHudText.parent = gameplayHud;
  const engineNotice = createUiNode("box");
  engineNotice.name = "nea-engine-notice";
  engineNotice.element.id = "nea-engine-notice";
  engineNotice.position.ratio.copy({ x: 0.5, y: 1 });
  engineNotice.anchor.copy({ x: 0.5, y: 1 });
  engineNotice.position.offset.copy({ x: 0, y: -46 });
  engineNotice.size.offset.copy({ x: 560, y: 0 });
  engineNotice.autoResize = "Y";
  engineNotice.backgroundColor.copy({ r: 8, g: 12, b: 16 });
  engineNotice.backgroundOpacity = 0.86;
  engineNotice.borderRadius = 4;
  engineNotice.visible = false;
  engineNotice.zIndex = 32;
  engineNotice.pointerEventBehavior = 0;
  engineNotice.parent = engineHost;
  const engineNoticeText = createUiNode("text");
  engineNoticeText.name = "nea-engine-notice-text";
  engineNoticeText.textFontSize = 14;
  engineNoticeText.textLineHeight = 1.35;
  engineNoticeText.textColor.copy({ r: 255, g: 255, b: 255 });
  engineNoticeText.position.offset.copy({ x: 16, y: 9 });
  engineNoticeText.size.offset.copy({ x: 528, y: 0 });
  engineNoticeText.autoResize = "Y";
  engineNoticeText.textXAlignment = "Center";
  engineNoticeText.textYAlignment = "Center";
  engineNoticeText.parent = engineNotice;
  function showEngineNotice(message) {
    const text = String(message ?? "").trim();
    if (!text) return;
    engineNoticeText.textContent = text;
    engineNotice.visible = true;
    clearTimeout(engineNotice._hideTimer);
    engineNotice._hideTimer = setTimeout(() => { engineNotice.visible = false; }, 3200);
  }
  const dialogLayer = createUiNode("box");
  dialogLayer.name = "nea-historical-dialog";
  dialogLayer.element.id = "nea-historical-dialog";
  dialogLayer.position.offset.copy({ x: 0, y: 0 });
  dialogLayer.size.ratio.copy({ x: 1, y: 1 });
  dialogLayer.backgroundColor.copy({ r: 0, g: 0, b: 0 });
  dialogLayer.backgroundOpacity = 0.35;
  dialogLayer.visible = false;
  dialogLayer.zIndex = 60;
  dialogLayer.pointerEventBehavior = 1;
  dialogLayer.parent = engineHost;
  let activeDialog = null;
  let dialogPanel = null;
  let playerModal = null;
  function closeHistoricalDialog(result) {
    if (!activeDialog) return;
    outbound.push({ type: "dialog", name: "close", rpcId: activeDialog.rpcId, result });
    activeDialog = null;
    dialogLayer.visible = false;
    if (dialogPanel) dialogPanel.visible = false;
  }
  function openHistoricalDialog(dialog) {
    // A modal needs normal pointer input. Exiting here also prevents the
    // canvas click handler from trying to reacquire pointer lock while the
    // browser is processing the unlock caused by focusing the dialog.
    if (document.pointerLockElement) document.exitPointerLock();
    activeDialog = dialog;
    dialogLayer.visible = true;
    if (!dialogPanel) {
      dialogPanel = createUiNode("box");
      dialogPanel.name = "nea-dialog-panel";
      dialogPanel.position.ratio.copy({ x: 0.5, y: 0.5 });
      dialogPanel.anchor.copy({ x: 0.5, y: 0.5 });
      dialogPanel.size.offset.copy({ x: 560, y: 0 });
      dialogPanel.backgroundColor.copy({ r: 24, g: 32, b: 39 });
      dialogPanel.backgroundOpacity = 1;
      dialogPanel.borderRadius = 6;
      dialogPanel.zIndex = 61;
      dialogPanel.pointerEventBehavior = 1;
      dialogPanel.parent = dialogLayer;
      dialogPanel._title = createUiNode("text");
      dialogPanel._title.name = "nea-dialog-title";
      dialogPanel._title.textFontSize = 18;
      dialogPanel._title.textColor.copy({ r: 255, g: 255, b: 255 });
      dialogPanel._title.position.offset.copy({ x: 24, y: 20 });
      dialogPanel._title.size.offset.copy({ x: 512, y: 28 });
      dialogPanel._title.textXAlignment = "Left";
      dialogPanel._title.textYAlignment = "Top";
      dialogPanel._title.parent = dialogPanel;
      dialogPanel._content = createUiNode("text");
      dialogPanel._content.name = "nea-dialog-content";
      dialogPanel._content.textFontSize = 15;
      dialogPanel._content.textLineHeight = 1.5;
      dialogPanel._content.textColor.copy({ r: 238, g: 244, b: 241 });
      dialogPanel._content.position.offset.copy({ x: 24, y: 56 });
      dialogPanel._content.size.offset.copy({ x: 512, y: 0 });
      dialogPanel._content.autoResize = "Y";
      dialogPanel._content.textXAlignment = "Left";
      dialogPanel._content.textYAlignment = "Top";
      dialogPanel._content.parent = dialogPanel;
      dialogPanel._body = createUiNode("box");
      dialogPanel._body.name = "nea-dialog-body";
      dialogPanel._body.position.offset.copy({ x: 24, y: 100 });
      dialogPanel._body.size.offset.copy({ x: 512, y: 0 });
      dialogPanel._body.autoResize = "Y";
      dialogPanel._body.textXAlignment = "Left";
      dialogPanel._body.textYAlignment = "Top";
      dialogPanel._body.parent = dialogPanel;
      dialogPanel._bodyHost = { element: dialogPanel._body.element };
    }
    dialogPanel.visible = true;
    // serde_json serializes the Rust enum as { Input: {...} } while older
    // runtime callers may send a flat { type: "input", ... } object.
    const rawConfig = dialog.config && typeof dialog.config === "object" ? dialog.config : {};
    const candidateKind = Object.keys(rawConfig)[0];
    const taggedVariant = String(candidateKind || "");
    const isTagged = ["text", "input", "select"].includes(taggedVariant.toLowerCase());
    const taggedKind = isTagged ? candidateKind : "";
    const taggedConfig = isTagged && rawConfig[taggedKind] && typeof rawConfig[taggedKind] === "object"
      ? rawConfig[taggedKind]
      : rawConfig;
    const kind = String(taggedKind || taggedConfig.type || "text").toLowerCase();
    const config = taggedConfig;
    dialogPanel._title.textContent = config.title || "";
    dialogPanel._content.textContent = config.content || "";
    dialogPanel._body.element.replaceChildren();
    if (kind === "input") {
      const input = createUiNode("input");
      input.name = "nea-dialog-input";
      input.placeholder = config.placeholder || "";
      input.position.offset.copy({ x: 0, y: 0 });
      input.size.offset.copy({ x: 512, y: 34 });
      input.zIndex = 1;
      input.pointerEventBehavior = 3;
      input.parent = dialogPanel._bodyHost;
      const ok = createUiButton(config.confirm_text || config.confirmText || "确定", () => closeHistoricalDialog({ type: "input", value: input.element.value || "" }));
      ok.position.offset.copy({ x: 0, y: 42 });
      ok.parent = dialogPanel._bodyHost;
      input.focus();
    } else if (kind === "select") {
      const options = Array.isArray(config.options) ? config.options : [];
      const isDismissOption = value => ["关闭", "取消", "close", "cancel"].includes(String(value).trim().toLowerCase());
      const hasSelectableOption = options.some(value => !isDismissOption(value));
      let row = 0;
      // Preserve an explicit empty slot when a select dialog has no usable
      // choices. The slot is visual-only; the dismiss option remains usable.
      if (!hasSelectableOption) {
        const empty = createUiButton("", () => {});
        empty.position.offset.copy({ x: 0, y: row * 42 });
        empty.pointerEventBehavior = 1;
        empty.element.style.pointerEvents = "none";
        row++;
      }
      options.forEach((value, index) => {
        const button = createUiButton(String(value), () => closeHistoricalDialog({ type: "select", index, value }));
        button.position.offset.copy({ x: 0, y: row * 42 });
        row++;
        button.parent = dialogPanel._bodyHost;
      });
    } else {
      const ok = createUiButton("确定", () => closeHistoricalDialog({ type: "close" }));
      ok.position.offset.copy({ x: 0, y: 0 });
      ok.parent = dialogPanel._bodyHost;
    }
  }
  function createUiButton(label, onActivate) {
    const button = createUiNode("box");
    button.size.offset.copy({ x: 512, y: 32 });
    button.backgroundColor.copy({ r: 43, g: 114, b: 93 });
    button.backgroundOpacity = 1;
    button.borderRadius = 4;
    button.zIndex = 1;
    button.pointerEventBehavior = 3;
    button.parent = dialogPanel._bodyHost;
    const text = createUiNode("text");
    text.textContent = label;
    text.textFontSize = 14;
    text.textColor.copy({ r: 255, g: 255, b: 255 });
    text.position.offset.copy({ x: 0, y: 0 });
    text.size.offset.copy({ x: 512, y: 32 });
    text.textXAlignment = "Center";
    text.textYAlignment = "Center";
    text.parent = button;
    button.events.on("pointerup", onActivate);
    return button;
  }
  const particleLayer = createUiNode("box");
  particleLayer.name = "nea-particle-layer";
  particleLayer.position.offset.copy({ x: 0, y: 0 });
  particleLayer.size.ratio.copy({ x: 1, y: 1 });
  particleLayer.visible = true;
  particleLayer.zIndex = 18;
  particleLayer.parent = engineHost;
  let particleConfig = null;
  let particleLastMs = performance.now();
  let particleAccumulator = 0;
  const damageStyle = document.createElement("style");
  damageStyle.textContent = "@keyframes neaDamageFloat{0%{opacity:0;transform:translate(-50%,8px) scale(.7)}15%{opacity:1;transform:translate(-50%,-4px) scale(1.12)}100%{opacity:0;transform:translate(-50%,-64px) scale(.9)}}@keyframes neaRespawnFlash{0%{opacity:0}30%{opacity:1}100%{opacity:0}}";
  document.head.appendChild(damageStyle);

  const input = {
    pointerLockEvents,
    lockPointer: () => {
      const target = document.getElementById("game");
      if (!target || document.pointerLockElement === target) return Promise.resolve(false);
      try {
        // Chromium returns a promise here and rejects it when a lock request
        // races the previous unlock. Consume that expected rejection so it
        // does not surface as "Uncaught (in promise) SecurityError".
        return Promise.resolve(target.requestPointerLock()).catch(error => {
          if (error?.name !== "SecurityError") console.debug("[nea] pointer lock request failed", error);
          return false;
        });
      } catch (error) {
        if (error?.name !== "SecurityError") console.debug("[nea] pointer lock request failed", error);
        return Promise.resolve(false);
      }
    },
    unlockPointer: () => document.exitPointerLock(),
  };
  document.addEventListener("pointerlockchange", () => {
    pointerLockEvents.emit("pointerlockchange", { isLocked: document.pointerLockElement !== null });
  });
  document.addEventListener("pointerlockerror", () => {
    pointerLockEvents.emit("pointerlockerror", undefined);
  });
  window.addEventListener("resize", () => {
    screenEvents.emit("resize", { screenWidth: window.innerWidth, screenHeight: window.innerHeight });
  });

  const runtime = {
    modules: Object.create(null),
    cache: Object.create(null),
    install(json) {
      const modules = JSON.parse(json);
      if (!modules || typeof modules !== "object" || Array.isArray(modules)) throw new Error("Client modules must be an object");
      const uiState = typeof modules.__nea_ui_state__ === "string"
        ? JSON.parse(modules.__nea_ui_state__)
        : null;
      delete modules.__nea_ui_state__;
      runtime.modules = Object.assign(Object.create(null), modules);
      runtime.cache = Object.create(null);
      uiPictureAssets = uiState?.pictureAssets && typeof uiState.pictureAssets === "object"
        ? uiState.pictureAssets
        : Object.create(null);
      if (typeof runtime.modules["clientIndex.js"] !== "string") throw new Error("Client modules are missing clientIndex.js");
      installUiState(uiState);
      loadModule("clientIndex.js");
    },
    receive(json) {
      const event = JSON.parse(json);
      if (event?.type === "nea-revive:gui" || event?.type === "nea-historical-gui") applyGuiCommand(event.command);
      else if (event?.type === "nea-historical-dialog-open") openHistoricalDialog(event.dialog);
      else if (event?.type === "nea-historical-dialog-cancel") { activeDialog = null; dialogLayer.visible = false; if (dialogPanel) dialogPanel.visible = false; }
      else if (event?.type === "nea-revive:link") applyPlayerLink(event);
      else if (event?.type === "nea-revive:entity-state" || event?.type === "nea-revive:camera-state") {
        // These states are projected by the native client. They still pass
        // through this ingress, but are not map remoteChannel payloads.
      }
      else if (event?.type === "nea-revive:damage-state") applyDamageState(event);
      else if (event?.type === "nea-revive:player-gameplay") applyGameplayState(event);
      else if (event?.type === "nea-revive:sound") applySoundCommand(event.command);
      else if (event?.type === "nea-revive:player-ui") applyPlayerUi(event);
      else if (event?.type === "nea-revive:chat") {
        if (event.valid === false) return;
        // Keep the historical chat stream out of the engine UI, but surface
        // private/system notices as a transient gameplay message so local
        // maps do not lose directMessage feedback entirely.
        showEngineNotice(event.message);
      }
      else remoteEvents.emit("client", event);
    },
    drain() {
      return JSON.stringify(outbound.splice(0));
    },
  };

  function applyDamageState(event) {
    const hp = Number(event.state?.hp);
    const maxHp = Math.max(1, Number(event.state?.maxHp) || 100);
    const ratio = clamp(hp / maxHp, 0, 1);
    const frame = Math.ceil(Math.max(hp, 0) + 1);
    const image = `picture/health_bar${frame}.png`;
    const imageUrl = resolvePictureUrl(image);
    if (imageUrl) {
      healthBar.image = imageUrl;
      extraHpBar.image = imageUrl;
      healthBar.visible = hp > 20 ? false : true;
      extraHpBar.visible = hp > 20 ? true : false;
    } else {
      healthBar.image = "";
      extraHpBar.image = "";
      healthBar.visible = false;
      extraHpBar.visible = false;
    }
    healthBar.element.dataset.image = image;
    extraHpBar.element.dataset.image = image;
    if (Number(event.events?.hurt) > 0) {
      // Keep the recovered damage event affordance for maps that opt into it;
      // the canonical player UI itself does not expose a persistent HUD bar.
      const amount = document.createElement("div");
      amount.className = "nea-damage-number";
      amount.textContent = `${Math.round(Number(event.events.hurt) * 100) / 100}`;
      amount.style.cssText = "position:absolute;left:50%;top:43%;color:#ff5968;font:700 19px/1 Arial,sans-serif;text-shadow:0 1px 2px #350000;animation:neaDamageFloat 900ms ease-out forwards";
      damageLayer.element.appendChild(amount);
      setTimeout(() => amount.remove(), 950);
      damageLayer.element.style.background = "rgb(255 0 0 / .18)";
      damageLayer.element.style.boxShadow = "inset 0 0 1px 0 rgba(190,24,36,0.01)";
      setTimeout(() => { damageLayer.element.style.background = "transparent"; }, 110);
    }
    if (event.events?.die) {
      deathOverlay.visible = true;
    }
    if (event.events?.respawn) {
      deathOverlay.visible = false;
      const flash = document.createElement("div");
      flash.className = "nea-respawn-flash";
      flash.style.cssText = "position:absolute;inset:0;background:white;animation:neaRespawnFlash 520ms ease-out forwards";
      damageLayer.element.appendChild(flash);
      setTimeout(() => flash.remove(), 560);
    }
  }

  function resolvePictureUrl(name) {
    const asset = uiPictureAssets[String(name || "")];
    const hash = typeof asset?.hash === "string" ? asset.hash : "";
    if (!/^[A-Za-z0-9_-]{43}$/.test(hash)) return null;
    try {
      const sessionUrl = new URLSearchParams(window.location.search).get("nea");
      if (!sessionUrl) return null;
      return new URL(`/engine/m/${hash}`, new URL(sessionUrl).origin).href;
    } catch {
      return null;
    }
  }

  function applyGameplayState(event) {
    const modeNames = ["SURVIVAL", "CREATIVE", "ADVENTURE", "SPECTATOR"];
    const items = Object.entries(event.inventory || {}).filter(([, count]) => Number(count) > 0);
    const latest = event.item ? `${event.item} x${Number(event.count) || 0}` : items.slice(-1).map(([name, count]) => `${name} x${count}`).join("");
    gameplayHudText.textContent = [`[${modeNames[event.gamemode] || "SURVIVAL"}]`, latest, `${items.length} item types`].filter(Boolean).join("\n");
    gameplayHud.visible = true;
    gameplayHudText.textColor.copy({ r: 255, g: 255, b: 255 });
    clearTimeout(gameplayHud._hideTimer);
    gameplayHud._hideTimer = setTimeout(() => { gameplayHudText.textColor.copy({ r: 200, g: 210, b: 210 }); }, 2200);
    if (event.particles) particleConfig = normalizeParticleConfig(event.particles);
  }

  function normalizeParticleConfig(value) {
    const config = value || {};
    return {
      rate: Math.max(0, Math.min(120, Number(config.rate) || 0)),
      limit: Math.max(0, Math.min(300, Number(config.limit) || 100)),
      lifetime: Math.max(.05, Math.min(30, Number(config.lifetime) || 10)),
      size: Array.isArray(config.size) && config.size.length ? config.size.map(Number) : [1, 1, 1, 1, 1],
      color: Array.isArray(config.color) && config.color.length ? config.color : [[1, 1, 1]],
      velocity: Array.isArray(config.velocity) ? config.velocity.map(Number) : [0, .5, 0],
    };
  }

  function tickParticles(now) {
    const dt = Math.min(.1, Math.max(0, (now - particleLastMs) / 1000));
    particleLastMs = now;
    if (particleConfig?.rate > 0 && particleLayer.element.childElementCount < particleConfig.limit) {
      particleAccumulator += particleConfig.rate * dt;
      while (particleAccumulator >= 1 && particleLayer.element.childElementCount < particleConfig.limit) {
        particleAccumulator -= 1;
        const dot = document.createElement("i");
        const color = particleConfig.color[Math.floor(Math.random() * particleConfig.color.length)] || [1, 1, 1];
        const size = Math.max(1, Number(particleConfig.size[0]) || 1) * 2;
        dot.style.cssText = `position:absolute;left:${45 + Math.random() * 10}%;top:${42 + Math.random() * 16}%;width:${size}px;height:${size}px;border-radius:50%;background:rgb(${Math.round((color[0] ?? 1) * 255)} ${Math.round((color[1] ?? 1) * 255)} ${Math.round((color[2] ?? 1) * 255)});opacity:.9;box-shadow:0 0 ${size * 2}px currentColor;`;
        particleLayer.element.appendChild(dot);
        const vx = Number(particleConfig.velocity[0]) || 0;
        const vy = Number(particleConfig.velocity[1]) || .5;
        const vz = Number(particleConfig.velocity[2]) || 0;
        dot.animate([
          { transform: "translate3d(0,0,0) scale(.6)", opacity: .9 },
          { transform: `translate3d(${vx * 24 + (Math.random() - .5) * 80}px,${-vy * 120 - 20}px,${vz * 24}px) scale(1.4)`, opacity: 0 },
        ], { duration: particleConfig.lifetime * 1000, easing: "linear" }).finished.then(() => dot.remove()).catch(() => dot.remove());
      }
    }
    window.requestAnimationFrame(tickParticles);
  }
  window.requestAnimationFrame(tickParticles);

  function applySoundCommand(command = {}) {
    const soundId = Number(command.soundId);
    let audio = serverSounds.get(soundId);
    if (command.action === "play") {
      if (!command.sampleUrl) return;
      if (audio) {
        audio.pause();
        pendingServerSounds.delete(soundId);
      }
      audio = new window.Audio(String(command.sampleUrl));
      audio.volume = clamp(Number(command.gain ?? 1), 0, 1);
      audio.playbackRate = clamp(Number(command.pitch ?? 1), 0.1, 4);
      audio.loop = Boolean(command.loop);
      audio.addEventListener("ended", () => serverSounds.delete(soundId), { once: true });
      serverSounds.set(soundId, audio);
      playServerSound(soundId, audio);
      return;
    }
    if (!audio) return;
    if (command.action === "pause") audio.pause();
    if (command.action === "stop") { audio.pause(); audio.currentTime = 0; serverSounds.delete(soundId); pendingServerSounds.delete(soundId); }
    if (command.action === "setCurrentTime" || command.action === "setCurrentTimeAndResume") audio.currentTime = Math.max(0, Number(command.currentTime) || 0);
    if (command.action === "resume" || command.action === "setCurrentTimeAndResume") playServerSound(soundId, audio);
  }

  function applyPlayerUi(event) {
    if (!playerModal) {
      playerModal = createUiNode("box");
      playerModal.name = "nea-player-modal";
      playerModal.element.id = "nea-player-modal";
      playerModal.position.offset.copy({ x: 0, y: 0 });
      playerModal.size.ratio.copy({ x: 1, y: 1 });
      playerModal.backgroundColor.copy({ r: 0, g: 0, b: 0 });
      playerModal.backgroundOpacity = 0.55;
      playerModal.visible = false;
      playerModal.zIndex = 40;
      playerModal.pointerEventBehavior = 1;
      playerModal.parent = engineHost;
      playerModal._panel = createUiNode("box");
      playerModal._panel.position.ratio.copy({ x: 0.5, y: 0.5 });
      playerModal._panel.anchor.copy({ x: 0.5, y: 0.5 });
      playerModal._panel.size.offset.copy({ x: 420, y: 0 });
      playerModal._panel.backgroundColor.copy({ r: 17, g: 24, b: 32 });
      playerModal._panel.backgroundOpacity = 1;
      playerModal._panel.zIndex = 41;
      playerModal._panel.pointerEventBehavior = 1;
      playerModal._panel.parent = playerModal;
      playerModal._title = createUiNode("text");
      playerModal._title.textFontSize = 18;
      playerModal._title.textColor.copy({ r: 255, g: 255, b: 255 });
      playerModal._title.position.offset.copy({ x: 20, y: 20 });
      playerModal._title.size.offset.copy({ x: 380, y: 26 });
      playerModal._title.textXAlignment = "Left";
      playerModal._title.textYAlignment = "Top";
      playerModal._title.parent = playerModal._panel;
      playerModal._content = createUiNode("text");
      playerModal._content.textFontSize = 14;
      playerModal._content.textLineHeight = 1.5;
      playerModal._content.textColor.copy({ r: 255, g: 255, b: 255 });
      playerModal._content.position.offset.copy({ x: 20, y: 56 });
      playerModal._content.size.offset.copy({ x: 380, y: 0 });
      playerModal._content.autoResize = "Y";
      playerModal._content.textXAlignment = "Left";
      playerModal._content.textYAlignment = "Top";
      playerModal._content.parent = playerModal._panel;
      const close = createUiNode("box");
      close.name = "nea-player-modal-close";
      close.position.offset.copy({ x: 20, y: 0 });
      close.size.offset.copy({ x: 380, y: 34 });
      close.backgroundColor.copy({ r: 43, g: 114, b: 93 });
      close.backgroundOpacity = 1;
      close.borderRadius = 4;
      close.zIndex = 1;
      close.pointerEventBehavior = 3;
      close.parent = playerModal._panel;
      const closeText = createUiNode("text");
      closeText.textContent = "关闭";
      closeText.textFontSize = 14;
      closeText.textColor.copy({ r: 255, g: 255, b: 255 });
      closeText.position.offset.copy({ x: 0, y: 0 });
      closeText.size.offset.copy({ x: 380, y: 34 });
      closeText.textXAlignment = "Center";
      closeText.textYAlignment = "Center";
      closeText.parent = close;
      close.events.on("pointerup", () => { playerModal.visible = false; });
      playerModal._close = close;
      playerModal._closeText = closeText;
    }
    playerModal._title.textContent = event.action === "marketplace" ? "地图商店" : event.action === "profile" ? "玩家资料" : "分享地图";
    if (event.action === "marketplace") {
      playerModal._content.textContent = (event.productIds || []).map(id => `商品 ${id}`).join("\n") || "暂无商品";
    } else if (event.action === "profile") {
      playerModal._content.textContent = `用户 ID：${event.userId || ""}`;
    } else {
      playerModal._content.textContent = event.content || "";
    }
    playerModal.visible = true;
  }

  function loadModule(name) {
    const normalized = normalizeModuleName(name);
    if (runtime.cache[normalized]) return runtime.cache[normalized].exports;
    const source = runtime.modules[normalized];
    if (typeof source !== "string") throw new Error(`Unknown client module: ${normalized}`);
    const module = { exports: {} };
    runtime.cache[normalized] = module;
    const require = request => loadModule(resolveModule(normalized, request));
    const globals = createGlobals();
    const names = Object.keys(globals);
    const values = names.map(key => globals[key]);
    const compatibleSource = transformClientModuleSource(source);
    const execute = new Function(...names, "module", "exports", "require", `${compatibleSource}\n//# sourceURL=nea-client://${normalized}`);
    execute(...values, module, module.exports, require);
    return module.exports;
  }

  function transformClientModuleSource(source) {
    const exported = [];
    let transformed = source
      .replace(/^\s*import\s+["'](.+?)["']\s*;?\s*$/gm, (_, request) => `require(${JSON.stringify(request)});`)
      .replace(/^\s*import\s+\{([^}]+)\}\s+from\s+["'](.+?)["']\s*;?\s*$/gm, (_, bindings, request) => {
        const destructured = bindings.split(",").map(binding => {
          const [imported, local] = binding.trim().split(/\s+as\s+/);
          return local ? `${imported}: ${local}` : imported;
        }).join(", ");
        return `const { ${destructured} } = require(${JSON.stringify(request)});`;
      })
      .replace(/^\s*import\s+\*\s+as\s+([A-Za-z_$][\w$]*)\s+from\s+["'](.+?)["']\s*;?\s*$/gm, (_, local, request) => `const ${local} = require(${JSON.stringify(request)});`)
      .replace(/^\s*export\s+\{([^}]+)\}\s*;?\s*$/gm, (_, bindings) => {
        for (const binding of bindings.split(",")) {
          const [local, exportedName] = binding.trim().split(/\s+as\s+/);
          if (local) exported.push([exportedName || local, local]);
        }
        return "";
      })
      .replace(/^\s*export\s+(const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/gm, (_, kind, name) => {
        exported.push([name, name]);
        return `${kind} ${name}`;
      });
    if (exported.length) transformed += `\n${exported.map(([name, local]) => `exports[${JSON.stringify(name)}] = ${local};`).join("\n")}`;
    return transformed;
  }

  function createGlobals() {
    return {
      console,
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      fetch,
      navigator: {
        userAgent: window.navigator.userAgent,
        language: window.navigator.language,
        getDeviceInfo: () => ({
          deviceType: /Android|iPhone|iPad|Mobile/i.test(window.navigator.userAgent) ? "Mobile" : "Desktop",
          screen: { width: window.innerWidth, height: window.innerHeight },
        }),
      },
      Audio: CompatAudio,
      MediaError: CompatMediaError,
      MediaErrorCode: Object.freeze({ MEDIA_ERR_ABORTED: 1, MEDIA_ERR_NETWORK: 2, MEDIA_ERR_DECODE: 3, MEDIA_ERR_SRC_NOT_SUPPORTED: 4 }),
      Blob: window.Blob,
      media: {
        async startRecording() {
          if (!window.navigator.mediaDevices?.getUserMedia) throw new Error("Audio recording is unavailable");
          const stream = await window.navigator.mediaDevices.getUserMedia({ audio: true });
          mediaChunks = [];
          mediaRecorder = new MediaRecorder(stream);
          mediaRecorder.addEventListener("dataavailable", event => { if (event.data?.size) mediaChunks.push(event.data); });
          mediaRecorder.start();
        },
        stopRecording() {
          if (!mediaRecorder) return Promise.resolve(new Blob([], { type: "audio/wav" }));
          return new Promise(resolve => {
            const recorder = mediaRecorder;
            recorder.addEventListener("stop", () => {
              for (const track of recorder.stream.getTracks()) track.stop();
              mediaRecorder = null;
              resolve(new Blob(mediaChunks, { type: recorder.mimeType || "audio/webm" }));
            }, { once: true });
            recorder.stop();
          });
        },
        async playAudio(spec = {}) {
          const blob = spec.blob instanceof Blob ? spec.blob : new Blob(mediaChunks, { type: "audio/webm" });
          if (mediaPlayback) mediaPlayback.pause();
          mediaPlayback = new Audio(URL.createObjectURL(blob));
          mediaPlayback.volume = clamp(Number(spec.gain ?? 1), 0, 1);
          await mediaPlayback.play();
        },
        stopPlayAudio() {
          mediaPlayback?.pause();
          mediaPlayback = null;
        },
      },
      structuredClone,
      remoteChannel: {
        events: remoteEvents,
        sendServerEvent(event) { outbound.push(structuredClone(event)); },
      },
      input,
      http: { fetch: (...args) => fetch(...args) },
      world: clientWorld,
      ui,
      screen: { events: screenEvents },
      UiText: { create: () => createUiNode("text") },
      UiBox: { create: () => createUiNode("box") },
      UiImage: { create: () => createUiNode("image") },
      UiInput: { create: () => createUiNode("input") },
      UiScrollBox: { create: () => createUiNode("scroll") },
      UiScale: { create: () => ({ scale: 1 }) },
      UiScreen: {
        getAllScreen: () => ui.children.filter(child => child.kind === "screen"),
        create: () => {
          const screen = createUiNode("screen");
          screen.size.ratio.copy({ x: 1, y: 1 });
          screen.visible = true;
          screen.parent = ui;
          return screen;
        },
      },
      PointerEventBehavior: {
        DISABLE_AND_BLOCK_PASS_THROUGH: 0,
        DISABLE: 1,
        BLOCK_PASS_THROUGH: 2,
        ENABLE: 3,
      },
      UITextFontFamily: Object.freeze({ Default: "Default", BoldRound: "BoldRound", CodeNewRomanBold: "CodeNewRomanBold", ENSerif: "ENSerif" }),
      screenWidth: window.innerWidth || 1280,
      screenHeight: window.innerHeight || 720,
      Vec2: { create: value => createVector(value) },
      Vec3: { create: value => createVector(value) },
    };
  }

  function createEmitter() {
    const listeners = new Map();
    return Object.freeze({
      on(name, handler) { add(name, handler); return () => remove(name, handler); },
      add(name, handler) { add(name, handler); },
      remove(name, handler) { remove(name, handler); },
      off(name, handler) { if (handler) remove(name, handler); else listeners.delete(name); },
      removeAll(name, handler) {
        if (name === undefined) listeners.clear();
        else if (handler) remove(name, handler);
        else listeners.delete(name);
      },
      emit(name, event) { for (const handler of [...(listeners.get(name) || [])]) handler(event); },
    });
    function add(name, handler) {
      if (typeof handler !== "function") throw new TypeError("Event handler must be a function");
      const bucket = listeners.get(name) || new Set();
      bucket.add(handler);
      listeners.set(name, bucket);
    }
    function remove(name, handler) { listeners.get(name)?.delete(handler); }
  }

  class CompatMediaError {
    constructor(code, message) {
      this.code = Number(code) || 0;
      this.message = String(message || "");
    }
  }

  class CompatAudio {
    constructor(src = "") {
      this._audio = new window.Audio(String(src));
      this.events = createEmitter();
      for (const name of ["loadeddata", "ended", "error"]) {
        this._audio.addEventListener(name, () => this.events.emit(name, this));
      }
    }
    get src() { return this._audio.src; }
    set src(value) { this._audio.src = String(value || ""); }
    get volume() { return this._audio.volume; }
    set volume(value) { this._audio.volume = clamp(Number(value), 0, 1); }
    get error() {
      const error = this._audio.error;
      return error ? new CompatMediaError(error.code, error.message) : null;
    }
    play() { return this._audio.play(); }
    pause() { this._audio.pause(); }
    load() { this._audio.load(); }
    add(name, handler) { this.events.add(name, handler); }
    on(name, handler) { return this.events.on(name, handler); }
    remove(name, handler) { this.events.remove(name, handler); }
  }

  function createVector(value, changed) {
    const target = {};
    for (const [key, component] of Object.entries(value || {})) {
      if (typeof component !== "function") target[key] = component;
    }
    Object.defineProperties(target, {
      copy: { enumerable: false, value(next) {
        if (next && typeof next === "object") Object.assign(this, next);
        return this;
      } },
      clone: { enumerable: false, value() { return createVector(this); } },
    });
    return new Proxy(target, {
      set(object, key, next) {
        object[key] = next;
        changed?.();
        return true;
      },
    });
  }

  function createUiRoot() {
    let uiScale = { scale: 1 };
    const root = {
      name: "screen",
      element: uiRoot,
      children: [],
      findChildByName(name) { return findChildByName(this, name); },
    };
    Object.defineProperty(root, "uiScale", {
      get: () => uiScale,
      set: value => {
        uiScale = value && typeof value === "object" ? value : { scale: 1 };
        const scale = Number(uiScale.scale) || 1;
        const apply = node => {
          if (node.uiScale?.copy) node.uiScale.copy({ scale });
          for (const child of node.children || []) apply(child);
        };
        for (const child of root.children) apply(child);
      },
    });
    return root;
  }

  function findChildByName(root, name) {
    if (Array.isArray(name)) {
      for (const candidate of name) {
        const found = findChildByName(root, candidate);
        if (found) return found;
      }
      return null;
    }
    const wanted = String(name);
    for (const child of root.children || []) {
      if (child.name === wanted) return child;
      const nested = findChildByName(child, wanted);
      if (nested) return nested;
    }
    return null;
  }

  function installUiState(state) {
    for (const child of [...ui.children]) child.parent = null;
    if (!state?.uiTree || typeof state.uiTree !== "object") return;
    const nodes = new Map();
    for (const raw of Object.values(state.uiTree)) {
      if (!raw || raw.id === "ROOT_ID") continue;
      const valueType = raw.value?.type;
      const data = valueType === "screen" ? raw.value?.data || {} : raw.value?.data?.data || {};
      const kind = valueType === "screen" ? "screen" : raw.value?.data?.type || (valueType === "text" ? "text" : "box");
      const node = createUiNode(kind === "image" ? "image" : kind === "text" ? "text" : kind === "screen" ? "screen" : "box");
      node.id = String(raw.id);
      node.name = String(raw.name || raw.id);
      if (kind === "screen") {
        node.position.offset.copy({ x: 0, y: 0 });
        node.position.ratio.copy({ x: 0, y: 0 });
        node.size.offset.copy({ x: 0, y: 0 });
        node.size.ratio.copy({ x: 1, y: 1 });
        node.visible = data.enable !== false;
        node.zIndex = Number(data.zIndex) || 0;
      } else {
        applyRecoveredUiData(node, data);
      }
      nodes.set(node.id, { node, raw });
    }
    for (const { node, raw } of nodes.values()) {
      node.parent = nodes.get(String(raw.parentId))?.node || ui;
    }
    // Older dump Player packages carried chat children at screen scope while
    // clientIndex.js expects the historical scrollBox container. Reconstruct
    // that harmless structural wrapper so the original script can run.
    if (!findChildByName(ui, "scrollBox")) {
      const msg = findChildByName(ui, "msgContent");
      const title = findChildByName(ui, "titleContent");
      if (msg || title) {
        const scroll = createUiNode("scroll");
        scroll.name = "scrollBox";
        scroll.size.ratio.copy({ x: 1, y: 1 });
        scroll.parent = ui;
        if (msg) msg.parent = scroll;
        if (title) title.parent = scroll;
      }
    }
    // Some archived Player UI snapshots omit optional gameplay containers
    // that the matching client script still probes at startup. Keep those
    // probes harmless without changing the script's public API.
    if (findChildByName(ui, "health_bar")) {
      for (const name of ["inventoryImage", "shopImage", "chestImage", "shadow", "armor", "text", "invItem", "invQuickItem", "shopItem", "chestItem"]) {
        if (!findChildByName(ui, name)) {
          const placeholder = createUiNode("box");
          placeholder.name = name;
          placeholder.visible = false;
          placeholder.parent = ui;
        }
      }
    }
    // Exports may contain both the 1x and 2x HUD trees enabled at once. The
    // original client selects one scale; showing both creates duplicated text
    // and overlapping full-screen panels. Prefer the 2x tree on desktop.
    const screens = ui.children.filter(child => child.kind === "screen");
    if (window.innerWidth >= 1000 && screens.some(screen => screen.name.endsWith("-UI2"))) {
      for (const screen of screens) {
        if (!screen.name.endsWith("-UI2")) screen.visible = false;
      }
    }
  }

  function applyPlayerLink(event) {
    const href = String(event?.href || "");
    if (!/^https?:\/\//i.test(href)) return;
    if (event?.options?.isConfirm !== false && !window.confirm(`Open ${href}?`)) return;
    window.open(href, event?.options?.isNewTab === false ? "_self" : "_blank", "noopener");
  }

  function applyGuiCommand(command) {
    if (!command || typeof command !== "object") return;
    const handle = Number(command.handle) || 0;
    const selector = String(command.selector || "");
    const reply = (name, payload) => outbound.push({ type: "gui", name, handle, ...payload });
    if (command.operation === "reset") {
      for (const element of [...uiRoot.querySelectorAll("[data-nea-gui-tag]")]) element.remove();
      reply("return", { value: "" });
      return;
    }
    if (command.operation === "append") {
      const target = uiRoot.querySelector(selector);
      if (!target) { reply("throw", { message: "GUI selector not found: " + selector }); return; }
      const parsed = new DOMParser().parseFromString("<nea-root>" + String(command.data || "") + "</nea-root>", "application/xml");
      if (parsed.querySelector("parsererror")) { reply("throw", { message: "GUI append markup parse failed" }); return; }
      for (const source of [...parsed.documentElement.children]) target.appendChild(convertGuiElement(source));
      reply("return", { value: "" });
      return;
    }
    if (command.operation === "remove") {
      for (const element of uiRoot.querySelectorAll(selector)) element.remove();
      reply("return", { value: "" });
      return;
    }
    if (command.operation === "setAttribute") {
      for (const element of uiRoot.querySelectorAll(selector)) applyGuiAttribute(element, command.name, command.value);
      reply("return", { value: "" });
      return;
    }
    if (command.operation === "getAttribute") {
      const element = uiRoot.querySelector(selector);
      if (!element) { reply("throw", { message: "GUI selector not found: " + selector }); return; }
      reply("return", { value: element.getAttribute(String(command.name || "")) || "" });
      return;
    }
    if (command.operation === "show") {
      const name = String(command.name || "");
      const matches = [...uiRoot.querySelectorAll("[data-nea-gui-name=\"" + CSS.escape(name) + "\"]")];
      if (!command.allowMultiple) matches.slice(1).forEach(element => element.remove());
      matches.forEach(element => { element.style.display = ""; });
      reply("return", { value: "" });
      return;
    }
    if (command.operation !== "init") return;
    for (const entry of Object.values(command.config || {})) {
      if (!entry || entry.display === false || typeof entry.data !== "string") continue;
      const documentFragment = new DOMParser().parseFromString(`<nea-root>${entry.data}</nea-root>`, "application/xml");
      if (documentFragment.querySelector("parsererror")) continue;
      for (const source of [...documentFragment.documentElement.children]) {
        const element = convertGuiElement(source);
        if (entry.name) element.dataset.neaGuiName = String(entry.name);
        uiRoot.appendChild(element);
      }
    }
    reply("return", { value: "" });
  }

  function convertGuiElement(source) {
    const tag = source.tagName.toLowerCase();
    const element = document.createElement(tag === "image" ? "img" : "div");
    element.dataset.neaGuiTag = tag;
    element.style.cssText = "position:absolute;box-sizing:border-box;pointer-events:none;color:white;font-family:sans-serif;white-space:pre-wrap";
    for (const attribute of [...source.attributes]) applyGuiAttribute(element, attribute.name, attribute.value);
    if (tag === "label") element.textContent = source.getAttribute("text") || "";
    for (const child of [...source.children]) element.appendChild(convertGuiElement(child));
    return element;
  }

  function applyGuiAttribute(element, rawName, value) {
    const name = String(rawName || "").toLowerCase();
    const px = value => `${Number(value) || 0}px`;
    if (name === "id") element.id = String(value);
    else if (name === "text") element.textContent = String(value ?? "");
    else if (name === "left" || name === "top" || name === "right" || name === "bottom") element.style[name] = px(value);
    else if (name === "width" || name === "height") element.style[name] = px(value);
    else if (name === "percentwidth") element.style.width = `${Number(value) || 0}%`;
    else if (name === "percentheight") element.style.height = `${Number(value) || 0}%`;
    else if (name === "fontsize") element.style.fontSize = px(value);
    else if (name === "color") element.style.backgroundColor = String(value);
    else if (name === "textcolor") element.style.color = String(value);
    else if (name === "opacity") element.style.opacity = String(Number(value));
    else if (name === "align") element.style.textAlign = String(value);
    else element.dataset[`nea${name.replace(/[^a-z0-9]/g, "")}`] = String(value);
  }

  function applyRecoveredUiData(node, data) {
    const pair = value => Array.isArray(value) ? value : [0, 0];
    const anchor = pair(data.anchor);
    const positionOffset = pair(data.position?.offset);
    const positionRatio = pair(data.position?.ratio);
    const sizeOffset = pair(data.size?.offset);
    const sizeRatio = pair(data.size?.ratio);
    node.anchor.copy({ x: anchor[0], y: anchor[1] });
    node.position.offset.copy({ x: positionOffset[0], y: positionOffset[1] });
    node.position.ratio.copy({ x: positionRatio[0], y: positionRatio[1] });
    node.size.offset.copy({ x: sizeOffset[0], y: sizeOffset[1] });
    node.size.ratio.copy({ x: sizeRatio[0], y: sizeRatio[1] });
    if (Array.isArray(data.textColor)) node.textColor.copy({ r: data.textColor[0], g: data.textColor[1], b: data.textColor[2] });
    if (Array.isArray(data.backgroundColor)) node.backgroundColor.copy({ r: data.backgroundColor[0], g: data.backgroundColor[1], b: data.backgroundColor[2] });
    if (data.textContent !== undefined) node.textContent = data.textContent;
    if (data.textFontSize !== undefined) node.textFontSize = data.textFontSize;
    if (data.backgroundOpacity !== undefined) node.backgroundOpacity = data.backgroundOpacity;
    if (data.visible !== undefined) node.visible = data.visible;
    if (data.textAlign !== undefined) node.textAlign = ["left", "center", "right"][Number(data.textAlign)] || data.textAlign;
    node.zIndex = Number(data.zIndex) || 0;
  }

  function createUiNode(kind) {
    const element = document.createElement(kind === "image" ? "img" : kind === "input" ? "input" : "div");
    element.style.cssText = "position:absolute;box-sizing:border-box;white-space:pre-wrap;color:white;font:16px/1.35 sans-serif;text-shadow:0 1px 2px #000;pointer-events:none";
    const node = {
      element,
      kind,
      name: "",
      anchor: createVector({}, refresh),
      position: { offset: createVector({}, refresh), ratio: createVector({}, refresh), scale: createVector({ x: 1, y: 1 }, refresh) },
      size: { offset: createVector({}, refresh), ratio: createVector({}, refresh), scale: createVector({ x: 1, y: 1 }, refresh) },
      textColor: createVector({ r: 255, g: 255, b: 255 }, refresh),
      textStrokeColor: createVector({}, refresh),
      backgroundColor: createVector({ r: 0, g: 0, b: 0 }, refresh),
      children: [],
      events: createEmitter(),
      uiScale: createVector({ scale: 1 }, refresh),
      findChildByName(name) { return findChildByName(this, name); },
      clone() {
        const copy = createUiNode(kind);
        copy.name = node.name;
        copy.anchor.copy(node.anchor);
        copy.position.offset.copy(node.position.offset);
        copy.position.ratio.copy(node.position.ratio);
        copy.position.scale.copy(node.position.scale);
        copy.size.offset.copy(node.size.offset);
        copy.size.ratio.copy(node.size.ratio);
        copy.size.scale.copy(node.size.scale);
        copy.textColor.copy(node.textColor);
        copy.textStrokeColor.copy(node.textStrokeColor);
        copy.backgroundColor.copy(node.backgroundColor);
        copy.uiScale.copy(node.uiScale);
        copy.textContent = node.textContent;
        copy.textFontSize = node.textFontSize;
        copy.backgroundOpacity = node.backgroundOpacity;
        copy.visible = node.visible;
        copy.borderRadius = node.borderRadius;
        copy.textAlign = node.textAlign;
        copy.rotation = node.rotation;
        copy.richText = node.richText;
        copy.autoWordWrap = node.autoWordWrap;
        copy.textLineHeight = node.textLineHeight;
        copy.textFontFamily = node.textFontFamily;
        copy.textXAlignment = node.textXAlignment;
        copy.textYAlignment = node.textYAlignment;
        copy.autoResize = node.autoResize;
        copy.textStrokeOpacity = node.textStrokeOpacity;
        copy.textStrokeThickness = node.textStrokeThickness;
        copy.image = node.image;
        copy.imageOpacity = node.imageOpacity;
        copy.imageDisplayMode = node.imageDisplayMode;
        copy.placeholder = node.placeholder;
        copy.placeholderColor.copy(node.placeholderColor);
        copy.placeholderOpacity = node.placeholderOpacity;
        copy.pointerEventBehavior = node.pointerEventBehavior;
        copy.zIndex = node.zIndex;
        copy.parent = node.parent;
        for (const child of node.children) child.clone().parent = copy;
        return copy;
      },
    };
    const scrollPosition = createVector({ x: 0, y: 0 }, () => {
      element.scrollLeft = Math.max(0, Number(scrollPosition.x) || 0);
      element.scrollTop = Math.max(0, Number(scrollPosition.y) || 0);
    });
    node.scrollPosition = scrollPosition;
    element.addEventListener("pointerdown", event => node.events.emit("pointerdown", { target: node, nativeEvent: event }));
    element.addEventListener("pointerup", event => node.events.emit("pointerup", { target: node, nativeEvent: event }));
    let parent = null;
    let textContent = "";
    let fontSize = 16;
    let backgroundOpacity = 0;
    let visible = true;
    let borderRadius = 0;
    let textAlign = "left";
    let pointerEventBehavior = 0;
    let rotation = 0;
    let richText = false;
    let autoWordWrap = false;
    let textLineHeight = 1.2;
    let textFontFamily = "Default";
    let textXAlignment = "Center";
    let textYAlignment = "Center";
    let autoResize = "NONE";
    let textStrokeOpacity = 1;
    let textStrokeThickness = 0;
    let imageOpacity = 1;
    let imageDisplayMode = 0;
    let placeholder = "Type something here";
    let placeholderOpacity = 1;
    const placeholderColor = createVector({ r: 255, g: 255, b: 255 }, refresh);
    Object.defineProperties(node, {
      parent: { get: () => parent, set(value) {
        if (parent?.children) parent.children = parent.children.filter(child => child !== node);
        parent = value;
        const target = value?.element || uiRoot;
        if (value) {
          if (Array.isArray(value.children)) {
            if (!value.children.includes(node)) value.children.push(node);
          }
          const inheritedScale = value.uiScale?.scale ?? (value === ui ? ui.uiScale?.scale : undefined);
          if (Number.isFinite(Number(inheritedScale)) && Number(node.uiScale?.scale ?? 1) === 1) {
            node.uiScale.copy({ scale: Number(inheritedScale) || 1 });
          }
          target.appendChild(element);
        } else element.remove();
        refresh();
      } },
      textContent: { get: () => textContent, set(value) { textContent = String(value ?? ""); refresh(); } },
      textFontSize: { get: () => fontSize, set(value) { fontSize = Number(value) || 16; refresh(); } },
      backgroundOpacity: { get: () => backgroundOpacity, set(value) { backgroundOpacity = clamp(Number(value) || 0, 0, 1); refresh(); } },
      visible: { get: () => visible, set(value) { visible = Boolean(value); refresh(); } },
      borderRadius: { get: () => borderRadius, set(value) { borderRadius = Math.max(0, Number(value) || 0); refresh(); } },
      textAlign: { get: () => textAlign, set(value) { textAlign = String(value || "left"); refresh(); } },
      rotation: { get: () => rotation, set(value) { rotation = Number(value) || 0; refresh(); } },
      richText: { get: () => richText, set(value) { richText = Boolean(value); refresh(); } },
      autoWordWrap: { get: () => autoWordWrap, set(value) { autoWordWrap = Boolean(value); refresh(); } },
      textLineHeight: { get: () => textLineHeight, set(value) { textLineHeight = Number(value) || 1.2; refresh(); } },
      textFontFamily: { get: () => textFontFamily, set(value) { textFontFamily = String(value || "Default"); refresh(); } },
      textXAlignment: { get: () => textXAlignment, set(value) { textXAlignment = String(value || "Center"); refresh(); } },
      textYAlignment: { get: () => textYAlignment, set(value) { textYAlignment = String(value || "Center"); refresh(); } },
      autoResize: { get: () => autoResize, set(value) { autoResize = String(value || "NONE").toUpperCase(); refresh(); } },
      textStrokeOpacity: { get: () => textStrokeOpacity, set(value) { textStrokeOpacity = Number(value) || 0; refresh(); } },
      textStrokeThickness: { get: () => textStrokeThickness, set(value) { textStrokeThickness = Math.max(0, Number(value) || 0); refresh(); } },
      image: {
        get: () => kind === "image" ? (element.getAttribute("src") || "") : (element.dataset.neaImage || ""),
        set(value) {
          const src = String(value || "");
          const resolved = resolvePictureUrl(src);
          if (kind === "image") {
            if (resolved) element.src = resolved;
            else element.removeAttribute("src");
          }
          else {
            // Dump Player UI declares health_bar as a text node, then the
            // client script assigns health_bar.image dynamically.
            element.dataset.neaImage = src;
            element.style.backgroundImage = resolved ? `url("${resolved.replace(/"/g, '%22')}")` : "none";
            element.style.backgroundRepeat = "no-repeat";
            element.style.backgroundPosition = "center";
            element.style.backgroundSize = "contain";
          }
          refresh();
        }
      },
      imageOpacity: { get: () => imageOpacity, set(value) { imageOpacity = Number(value) || 0; refresh(); } },
      imageDisplayMode: { get: () => imageDisplayMode, set(value) { imageDisplayMode = Number(value) || 0; refresh(); } },
      complete: { get: () => kind !== "image" || element.complete },
      placeholder: { get: () => placeholder, set(value) { placeholder = String(value ?? ""); refresh(); } },
      placeholderColor: { get: () => placeholderColor },
      placeholderOpacity: { get: () => placeholderOpacity, set(value) { placeholderOpacity = clamp(Number(value), 0, 1); refresh(); } },
      isFocus: { get: () => kind === "input" && document.activeElement === element },
      zIndex: { get: () => Number(element.style.zIndex) || 0, set(value) { element.style.zIndex = String(Number(value) || 0); } },
      pointerEventBehavior: { get: () => pointerEventBehavior, set(value) { pointerEventBehavior = value; element.style.pointerEvents = Number(value) ? "auto" : "none"; } },
    });
    node.focus = () => { if (kind === "input") element.focus(); };
    node.blur = () => { if (kind === "input") element.blur(); return textContent; };
    if (kind === "input") {
      element.addEventListener("input", () => { textContent = element.value; node.events.emit("input", node); });
      element.addEventListener("focus", () => node.events.emit("focus", node));
      element.addEventListener("blur", () => node.events.emit("blur", node));
    }
    if (kind === "scroll") {
      element.style.overflow = "auto";
      element.addEventListener("scroll", () => {
        scrollPosition.x = element.scrollLeft;
        scrollPosition.y = element.scrollTop;
        node.events.emit("scroll", node);
      });
    }
    function refresh() {
      if (kind === "text") element.textContent = textContent;
      if (kind === "input") { element.value = textContent; element.placeholder = placeholder; }
      element.style.left = uiLength((node.position.ratio.x || 0) * (node.position.scale.x || 1), node.position.offset.x);
      element.style.top = uiLength((node.position.ratio.y || 0) * (node.position.scale.y || 1), node.position.offset.y);
      element.style.width = autoResize.includes("X") ? "max-content" : uiLength((node.size.ratio.x || 0) * (node.size.scale.x || 1), node.size.offset.x);
      element.style.height = autoResize.includes("Y") ? "max-content" : uiLength((node.size.ratio.y || 0) * (node.size.scale.y || 1), node.size.offset.y);
      element.style.transform = `translate(${-(Number(node.anchor.x) || 0) * 100}%, ${-(Number(node.anchor.y) || 0) * 100}%)`;
      element.style.fontSize = `${fontSize}px`;
      element.style.color = rgb(node.textColor);
      element.style.backgroundColor = rgba(node.backgroundColor, backgroundOpacity);
      element.style.display = visible ? (kind === "text" ? "flex" : "block") : "none";
      element.style.borderRadius = `${borderRadius}px`;
      element.style.textAlign = textAlign;
      element.style.justifyContent = textXAlignment.toLowerCase() === "left" ? "flex-start" : textXAlignment.toLowerCase() === "right" ? "flex-end" : "center";
      element.style.alignItems = textYAlignment.toLowerCase() === "top" ? "flex-start" : textYAlignment.toLowerCase() === "bottom" ? "flex-end" : "center";
      element.style.fontFamily = textFontFamily === "CodeNewRomanBold" ? "'Courier New',monospace" : textFontFamily === "ENSerif" ? "Georgia,serif" : textFontFamily === "BoldRound" ? "Arial Rounded MT Bold,Arial,sans-serif" : "Arial,sans-serif";
      element.style.lineHeight = String(textLineHeight);
      element.style.whiteSpace = autoWordWrap ? "pre-wrap" : "pre";
      element.style.transform = `translate(${-(Number(node.anchor.x) || 0) * 100}%, ${-(Number(node.anchor.y) || 0) * 100}%) rotate(${rotation}deg) scale(${Math.max(0, Number(node.uiScale.scale) || 0)})`;
      const rendersImage = kind === "image" || Boolean(element.dataset.neaImage);
      element.style.opacity = rendersImage ? String(clamp(imageOpacity, 0, 1)) : "1";
      if (kind === "image") element.style.objectFit = imageDisplayMode === 1 ? "contain" : imageDisplayMode === 2 ? "cover" : "fill";
      if (kind === "text") element.style.webkitTextStroke = `${textStrokeThickness}px rgba(0,0,0,${clamp(textStrokeOpacity, 0, 1)})`;
      if (kind === "input") element.style.setProperty("--nea-placeholder-color", rgba(placeholderColor, placeholderOpacity));
    }
    return node;
  }

  function uiLength(ratioValue, offsetValue) {
    const ratio = Number(ratioValue) || 0;
    const offset = Number(offsetValue) || 0;
    return ratio === 0 ? `${offset}px` : `calc(${ratio * 100}% + ${offset}px)`;
  }

  function rgb(value) {
    return `rgb(${Number(value.r) || 0} ${Number(value.g) || 0} ${Number(value.b) || 0})`;
  }

  function rgba(value, alpha) {
    return `rgb(${Number(value.r) || 0} ${Number(value.g) || 0} ${Number(value.b) || 0} / ${clamp(alpha, 0, 1)})`;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function resolveModule(from, request) {
    if (typeof request !== "string" || (!request.startsWith("./") && !request.startsWith("../"))) {
      throw new Error(`Unsupported client require: ${request}`);
    }
    const base = from.split("/").slice(0, -1);
    for (const part of request.split("/")) {
      if (part === "." || part === "") continue;
      if (part === "..") base.pop(); else base.push(part);
    }
    let name = normalizeModuleName(base.join("/"));
    if (runtime.modules[name] === undefined && runtime.modules[`${name}.js`] !== undefined) name += ".js";
    if (runtime.modules[name] === undefined && runtime.modules[`${name}/index.js`] !== undefined) name += "/index.js";
    return name;
  }

  function normalizeModuleName(name) {
    const parts = [];
    for (const part of String(name).replace(/\\/g, "/").split("/")) {
      if (!part || part === ".") continue;
      if (part === "..") throw new Error("Client module escaped its package");
      parts.push(part);
    }
    return parts.join("/");
  }

  window.__neaClientRuntimeInstall = json => runtime.install(json);
  window.__neaClientRuntimeReceive = json => runtime.receive(json);
  window.__neaClientRuntimeDrain = () => runtime.drain();
})();
