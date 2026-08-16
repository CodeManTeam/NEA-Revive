import { Ease, Motion } from "./motion.js";
import { getDialogScale } from "./adaptive_dialog.js";

/**
 * Dialog module — modal dialog system with three types, matching GameDialog API.
 *
 * @module Dialog
 *
 * @example TEXT dialog (dismiss notification)
 *   const result = await Dialog.show({
 *     type: DialogType.TEXT,
 *     title: "Welcome",
 *     content: "Hello, adventurer!",
 *   });
 *   // result → "success" | null (cancelled)
 *
 * @example INPUT dialog (text entry)
 *   const name = await Dialog.show({
 *     type: DialogType.INPUT,
 *     title: "Name",
 *     content: "Enter your name:",
 *     placeholder: "type here...",
 *     confirmText: "OK",
 *   });
 *   // name → "typed string" | null (cancelled)
 *
 * @example SELECT dialog (choice list)
 *   const choice = await Dialog.show({
 *     type: DialogType.SELECT,
 *     title: "Action",
 *     content: "Choose one:",
 *     options: ["Attack", "Defend", "Flee"],
 *   });
 *   // choice → { index: 0, value: "Attack" } | null (cancelled)
 *
 * @example Shorthand helpers
 *   await Dialog.alert("Something happened");          // TEXT with "确定"
 *   const c = await Dialog.confirm("Are you sure?");   // SELECT with ["取消","确定"]
 *
 * @example Cancel from outside
 *   Dialog.cancel();  // resolves current dialog with null
 *
 * @typedef {Object} DialogSelectResponse
 * @property {number} index - Zero-based option index
 * @property {string} value - Option text
 *
 * @param {Object} opts
 * @param {string} [opts.type=DialogType.TEXT] - Dialog type: TEXT | INPUT | SELECT
 * @param {string} [opts.title="提示"]        - Title text
 * @param {string} [opts.content=""]          - Body content text
 * @param {string[]} [opts.options=[]]        - Options for SELECT type
 * @param {string} [opts.placeholder=""]      - Placeholder for INPUT type
 * @param {string} [opts.confirmText="确认"]   - Confirm button text for INPUT type
 * @returns {Promise<string|DialogSelectResponse|null>}
 *   TEXT → "success", INPUT → input string, SELECT → {index,value}, cancelled → null
 */
export const DialogType = { TEXT: "TEXT", INPUT: "INPUT", SELECT: "SELECT" };

const
    screen = UiScreen.getAllScreen().find(s => s.name === "dialog"),
    overlay = (() => {
        const n = UiBox.create();
        n.parent = screen;
        n.visible = false;
        n.backgroundColor.copy(Vec3.create({ x: 0, y: 0, z: 0 }));
        n.backgroundOpacity = 0;
        n.size.scale.x = 1;
        n.size.scale.y = 1;
        n.anchor.x = 0.5;
        n.anchor.y = 0.5;
        n.position.scale.x = 0.5;
        n.position.scale.y = 0.5;
        n.pointerEventBehavior = PointerEventBehavior.DISABLE_AND_BLOCK_PASS_THROUGH;
        return n;
    })(),
    container = (() => {
        const n = UiBox.create();
        n.parent = screen;
        n.visible = false;
        n.backgroundColor.copy(Vec3.create({ x: 18, y: 18, z: 24 }));
        n.backgroundOpacity = 0.92;
        n.size.offset.x = 400;
        n.size.offset.y = 280;
        n.anchor.x = 0.5;
        n.anchor.y = 0.5;
        n.position.scale.x = 0.5;
        n.position.scale.y = 0.5;
        n.pointerEventBehavior = PointerEventBehavior.DISABLE_AND_BLOCK_PASS_THROUGH;
        return n;
    })(),
    titleText = (() => {
        const n = UiText.create();
        n.parent = container;
        n.textContent = "提示";
        n.textFontSize = 20;
        n.textColor.copy(Vec3.create({ x: 220, y: 220, z: 240 }));
        n.textXAlignment = "Left";
        n.textYAlignment = "Top";
        n.anchor.x = 0;
        n.anchor.y = 0;
        n.position.offset.x = 24;
        n.position.offset.y = 0;
        n.autoResize = "XY";
        return n;
    })(),
    bodyScrollBox = (() => {
        const n = UiScrollBox.create();
        n.parent = container;
        n.visible = false;
        n.backgroundOpacity = 0;
        n.size.offset.x = 352;
        n.size.offset.y = 0;
        n.anchor.x = 0;
        n.anchor.y = 0;
        n.position.offset.x = 24;
        n.position.offset.y = 0;
        n.pointerEventBehavior = PointerEventBehavior.ENABLE;
        n.scrollBarVisible = false;
        return n;
    })(),
    bodyText = (() => {
        const n = UiText.create();
        n.parent = container;
        n.textContent = "";
        n.textFontSize = 15;
        n.textColor.copy(Vec3.create({ x: 170, y: 175, z: 190 }));
        n.textXAlignment = "Left";
        n.textYAlignment = "Top";
        n.anchor.x = 0;
        n.anchor.y = 0;
        n.position.offset.x = 0;
        n.position.offset.y = 0;
        n.autoResize = "XY";
        n.autoWordWrap = true;
        n.size.offset.x = 352;
        return n;
    })(),
    divider = (() => {
        const n = UiBox.create();
        n.parent = container;
        n.backgroundColor.copy(Vec3.create({ x: 50, y: 50, z: 65 }));
        n.backgroundOpacity = 0.6;
        n.size.offset.x = 352;
        n.size.offset.y = 1;
        n.anchor.x = 0;
        n.anchor.y = 0;
        n.position.offset.x = 24;
        n.position.offset.y = 0;
        return n;
    })(),
    inputField = (() => {
        const n = UiInput.create();
        n.parent = container;
        n.visible = false;
        n.textFontSize = 15;
        n.textColor.copy(Vec3.create({ x: 220, y: 225, z: 240 }));
        n.placeholderColor.copy(Vec3.create({ x: 90, y: 95, z: 110 }));
        n.placeholderOpacity = 1;
        n.textXAlignment = "Left";
        n.textYAlignment = "Center";
        n.backgroundColor.copy(Vec3.create({ x: 30, y: 32, z: 44 }));
        n.backgroundOpacity = 0.8;
        n.size.offset.x = 352;
        n.size.offset.y = 36;
        n.anchor.x = 0;
        n.anchor.y = 0;
        n.position.offset.x = 24;
        n.position.offset.y = 0;
        n.pointerEventBehavior = PointerEventBehavior.ENABLE;
        return n;
    })(),
    btnScrollBox = (() => {
        const n = UiScrollBox.create();
        n.parent = container;
        n.visible = false;
        n.backgroundOpacity = 0;
        n.size.offset.x = 352;
        n.size.offset.y = 0;
        n.anchor.x = 0;
        n.anchor.y = 0;
        n.position.offset.x = 24;
        n.position.offset.y = 0;
        n.pointerEventBehavior = PointerEventBehavior.ENABLE;
        n.scrollBarVisible = false;
        return n;
    })(),
    btnContainer = (() => {
        const n = UiBox.create();
        n.parent = container;
        n.backgroundOpacity = 0;
        n.size.offset.x = 352;
        n.size.offset.y = 40;
        n.anchor.x = 0;
        n.anchor.y = 0;
        n.position.offset.x = 24;
        n.position.offset.y = 0;
        return n;
    })();

let currentResolve = null;
let currentType = null;
let generation = 0;
let buttons = [];

const BTN_H = 40;
const BTN_GAP = 8;
const BTN_W = 352;
const PAD_TOP = 20;
const PAD_X = 24;
const TITLE_BODY_GAP = 10;
const MAX_BODY_H = 180;
const BODY_DIV_GAP = 10;
const DIV_BTN_GAP = 10;
const PAD_BOTTOM = 16;
const INPUT_H = 36;
const INPUT_GAP = 8;
const MAX_CONTAINER_H = 500;

const createBtn = (text, idx, total, vertical) => {
    const btn = UiBox.create();
    btn.parent = btnContainer;
    btn.backgroundColor.copy(Vec3.create({ x: 40, y: 42, z: 58 }));
    btn.backgroundOpacity = 0.85;
    btn.pointerEventBehavior = PointerEventBehavior.ENABLE;

    if (vertical) {
        btn.size.offset.x = BTN_W;
        btn.size.offset.y = BTN_H;
        btn.anchor.x = 0;
        btn.anchor.y = 0;
        btn.position.offset.x = 0;
        btn.position.offset.y = idx * (BTN_H + BTN_GAP);
    } else {
        const btnW = (BTN_W - BTN_GAP * (total - 1)) / total;
        btn.size.offset.x = btnW;
        btn.size.offset.y = BTN_H;
        btn.anchor.x = 0;
        btn.anchor.y = 0;
        btn.position.offset.x = idx * (btnW + BTN_GAP);
        btn.position.offset.y = 0;
    }

    const label = UiText.create();
    label.parent = btn;
    label.textContent = text;
    label.textFontSize = 15;
    label.textColor.copy(Vec3.create({ x: 200, y: 205, z: 220 }));
    label.anchor.x = 0.5;
    label.anchor.y = 0.5;
    label.position.scale.x = 0.5;
    label.position.scale.y = 0.5;
    label.position.offset.y = 3;
    label.autoResize = "XY";

    btn.events.add("pointerdown", () => {
        Motion.to(btn, 80, { backgroundOpacity: 1 }, Ease.easeOut);
    });
    btn.events.add("pointerup", () => {
        Motion.to(btn, 120, { backgroundOpacity: 0.85 }, Ease.easeOut);
        resolveDialog(idx, text);
    });

    return btn;
};

const clearButtons = () => {
    buttons.forEach(b => b.parent = undefined);
    buttons = [];
};

const resolveDialog = (index, value) => {
    if (!currentResolve) return;
    const resolve = currentResolve;
    currentResolve = null;
    const gen = generation;
    const type = currentType;

    let result;
    if (type === DialogType.TEXT) {
        result = "success";
    } else if (type === DialogType.INPUT) {
        result = inputField.blur() || "";
    } else {
        result = { index, value };
    }
    hide(gen).then(() => setTimeout(() => resolve(result), 400));
};

const cancelDialog = () => {
    if (!currentResolve) return;
    const resolve = currentResolve;
    currentResolve = null;
    const gen = generation;
    const type = currentType;
    if (type === DialogType.INPUT) inputField.blur();
    hide(gen).then(() => setTimeout(() => resolve(null), 400));
};

const layoutDynamic = (type, total) => {
    const titleH = titleText.size.offset.y || 24;
    titleText.position.offset.y = PAD_TOP;

    const bodyY = PAD_TOP + titleH + TITLE_BODY_GAP;
    const bodyH = bodyText.size.offset.y || 20;

    const bodyOverflow = bodyH > MAX_BODY_H;
    const visibleBodyH = bodyOverflow ? MAX_BODY_H : bodyH;

    if (bodyOverflow) {
        bodyText.parent = bodyScrollBox;
        bodyText.position.offset.x = 0;
        bodyText.position.offset.y = 0;
        bodyScrollBox.parent = container;
        bodyScrollBox.position.offset.y = bodyY;
        bodyScrollBox.size.offset.y = visibleBodyH;
        bodyScrollBox.visible = true;
    } else {
        bodyText.parent = container;
        bodyText.position.offset.x = PAD_X;
        bodyText.position.offset.y = bodyY;
        bodyScrollBox.visible = false;
    }

    const divY = bodyY + visibleBodyH + BODY_DIV_GAP;
    divider.position.offset.y = divY;

    let nextY = divY + 1 + DIV_BTN_GAP;

    if (type === DialogType.INPUT) {
        inputField.visible = true;
        inputField.position.offset.y = nextY;
        nextY += INPUT_H + INPUT_GAP;
    } else {
        inputField.visible = false;
    }

    const vertical = type === DialogType.SELECT && total > 2;
    const btnAreaH = vertical
        ? total * BTN_H + (total - 1) * BTN_GAP
        : BTN_H;
    btnContainer.size.offset.y = btnAreaH;

    const remaining = MAX_CONTAINER_H - nextY - PAD_BOTTOM;
    const btnOverflow = vertical && btnAreaH > remaining;
    const maxBtnH = Math.max(BTN_H, remaining);

    if (btnOverflow && maxBtnH < btnAreaH) {
        btnContainer.parent = btnScrollBox;
        btnContainer.position.offset.x = 0;
        btnContainer.position.offset.y = 0;
        btnScrollBox.parent = container;
        btnScrollBox.position.offset.y = nextY;
        btnScrollBox.size.offset.y = maxBtnH;
        btnScrollBox.visible = true;
        container.size.offset.y = nextY + maxBtnH + PAD_BOTTOM;
    } else {
        btnContainer.parent = container;
        btnContainer.position.offset.x = PAD_X;
        btnContainer.position.offset.y = nextY;
        btnScrollBox.visible = false;
        container.size.offset.y = nextY + btnAreaH + PAD_BOTTOM;
    }
};

const show = async (opts) => {
    input.unlockPointer();

    const {
        type = DialogType.TEXT,
        title = "提示",
        content = "",
        options = [],
        placeholder = "",
        confirmText = "确认",
    } = opts;

    generation++;
    const gen = generation;

    currentType = type;
    titleText.textContent = title;
    bodyText.textContent = content;

    if (type === DialogType.INPUT) {
        inputField.textContent = "";
        inputField.placeholder = placeholder;
    }

    clearButtons();

    if (type === DialogType.TEXT) {
        buttons.push(createBtn("确定", 0, 1, false));
    } else if (type === DialogType.INPUT) {
        buttons.push(createBtn(confirmText, 0, 1, false));
    } else if (type === DialogType.SELECT) {
        const total = options.length;
        const vertical = total > 2;
        options.forEach((opt, i) => {
            buttons.push(createBtn(opt, i, total, vertical));
        });
    }

    layoutDynamic(type, buttons.length);

    screen.visible = true;
    overlay.visible = true;
    container.visible = true;
    overlay.backgroundOpacity = 0;
    container.backgroundOpacity = 0;
    container.position.offset.y = 20;

    overlay.events.add("pointerup", cancelDialog);

    await Promise.all([
        Motion.to(overlay, 250, { backgroundOpacity: 0.55 }, Ease.easeOutCubic).wait,
        Motion.to(container.position.offset, 300, { y: 0 }, Ease.easeOutCubic).wait,
        Motion.to(container, 250, { backgroundOpacity: 0.92 }, Ease.easeOutCubic).wait,
    ]);

    if (type === DialogType.INPUT) inputField.focus();

    return new Promise(resolve => { currentResolve = resolve; });
};

const hide = async (gen) => {
    if (gen !== undefined && gen !== generation) return;
    overlay.events.off("pointerup", cancelDialog);

    input.lockPointer();

    await Promise.all([
        Motion.to(overlay, 150, { backgroundOpacity: 0 }, Ease.easeInCubic).wait,
        Motion.to(container.position.offset, 150, { y: 20 }, Ease.easeInCubic).wait,
        Motion.to(container, 150, { backgroundOpacity: 0 }, Ease.easeInCubic).wait,
    ]);
    container.visible = false;
    overlay.visible = false;
    screen.visible = false;
    inputField.visible = false;
    bodyScrollBox.visible = false;
    btnScrollBox.visible = false;
};

export const Dialog = {
    show,
    cancel: cancelDialog,
    DialogType,
    alert: (content, title) => show({ type: DialogType.TEXT, title: title || "提示", content, options: ["确定"] }),
    confirm: (content, title) => show({ type: DialogType.SELECT, title: title || "确认", content, options: ["取消", "确定"] }),
};
