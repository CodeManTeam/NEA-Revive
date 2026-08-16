// import { clientEventBus } from './clientEventBus.js';
// import { BUILTIN_CHANNELS } from './clientProcotol.js';
// import { Ease, Motion } from "./motion.js";

// const 
//     main /** @type {UiScreen} */ = UiScreen.getAllScreen().find(screen => screen.name === "main"),
//     menu /** @type {UiScreen} */ = UiScreen.getAllScreen().find(screen => screen.name === "menu"),
//     ban /** @type {UiScreen} */ = UiScreen.getAllScreen().find(screen => screen.name === "ban"),
//     cover /** @type {UiBox} */ = ban.findChildByName("cover"),
//     line /** @type {UiBox} */ = cover.findChildByName("line"),
//     up /** @type {UiBox} */ = cover.findChildByName("up"),
//     down /** @type {UiBox} */ = cover.findChildByName("down"),
//     request /** @type {UiBox} */ = up.findChildByName("request"),
//     banner /** @type {UiBox} */ = down.findChildByName("banner");

// const ban_back_call = 
//     async (data) => {
//         console.warn("You have been banned");
//         cover.backgroundOpacity = 0;
//         line.size.offset.x = 0;
//         request.position.scale.y = 0;
//         banner.position.scale.y = 0;
//         cover.visible = ban.visible = true;

//         await Motion.fromTo(cover, 500, { backgroundOpacity: 0 }, { backgroundOpacity: 1 }, Ease.easeInOut).wait;

//         await Promise.all([
//             Motion.fromTo(line.size.offset, 400, { x: 0 }, { x: 340 }, Ease.easeOutQuart).wait,
//             Motion.fromTo(request.position.scale, 300, { y: 0 }, { y: 0.56 }, Ease.easeOutQuad).wait,
//             Motion.fromTo(banner.position.scale, 300, { y: 0 }, { y: -0.5 }, Ease.easeOutQuad).wait,
//         ]);
//     };

// clientEventBus.on(BUILTIN_CHANNELS.BAN, ban_back_call);