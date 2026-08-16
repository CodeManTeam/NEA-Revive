import { Ease, Motion } from "./motion.js";
import { getToastScale } from "./adaptive_toast.js";

const
    screen = UiScreen.getAllScreen().find(s => s.name === "toast");

const MAX_TOASTS = 5;
const TOAST_GAP = 10;
const TOAST_H = 44;
const TOAST_W = 800;
const BASE_SCALE_Y = 0.02;
const toasts = [];

const COLORS = {
    info: { bg: Vec3.create({ x: 30, y: 35, z: 55 }), accent: Vec3.create({ x: 80, y: 140, z: 255 }) },
    success: { bg: Vec3.create({ x: 22, y: 42, z: 30 }), accent: Vec3.create({ x: 60, y: 200, z: 100 }) },
    warn: { bg: Vec3.create({ x: 48, y: 38, z: 18 }), accent: Vec3.create({ x: 240, y: 180, z: 40 }) },
    error: { bg: Vec3.create({ x: 50, y: 22, z: 22 }), accent: Vec3.create({ x: 240, y: 70, z: 70 }) },
};

const layout = () => {
    const alive = toasts.filter(t => !t._dead);
    alive.forEach((t, i) => {
        const targetY = BASE_SCALE_Y + i * ((TOAST_H + TOAST_GAP) / screenHeight);
        if (Math.abs(t.root.position.scale.y - targetY) > 0.001) {
            Motion.to(t.root.position.scale, 250, { y: targetY }, Ease.easeOutCubic);
        }
    });
};

const dismissToast = async (t) => {
    if (t._dead) return;
    t._dead = true;
    if (t._timer) { clearTimeout(t._timer); t._timer = null; }

    await Promise.all([
        Motion.to(t.root, 220, { backgroundOpacity: 0 }, Ease.easeInCubic).wait,
        Motion.to(t.root.position.scale, 220, { y: t.root.position.scale.y - 0.03 }, Ease.easeInCubic).wait,
    ]);

    t.root.visible = false;
    t.root.parent = undefined;

    const idx = toasts.indexOf(t);
    if (idx !== -1) toasts.splice(idx, 1);
    layout();
};

const createToast = async (text, type = "info", duration = 2500) => {
    if (toasts.filter(t => !t._dead).length >= MAX_TOASTS) {
        const oldest = toasts.find(t => !t._dead);
        if (oldest) dismissToast(oldest);
    }

    const scale = getToastScale();
    const colors = COLORS[type] || COLORS.info;
    const pos = toasts.filter(t => !t._dead).length;
    const toastW = Math.round(TOAST_W * scale) >= screenWidth - 20 ? screenWidth - 20 : Math.round(TOAST_W * scale);
    const toastH = Math.round(TOAST_H * scale);
    const toastGap = Math.round(TOAST_GAP * scale);

    const root = UiBox.create();
    root.parent = screen;
    root.visible = true;
    root.backgroundColor.copy(colors.bg);
    root.backgroundOpacity = 0;
    root.size.offset.x = toastW;
    root.size.offset.y = toastH;
    root.anchor.x = 0.5;
    root.anchor.y = 0;
    root.position.scale.x = 0.5;
    root.position.scale.y = BASE_SCALE_Y + pos * ((toastH + toastGap) / screenHeight) + 0.03;
    root.pointerEventBehavior = PointerEventBehavior.DISABLE_AND_BLOCK_PASS_THROUGH;

    const accent = UiBox.create();
    accent.parent = root;
    accent.visible = true;
    accent.backgroundColor.copy(colors.accent);
    accent.backgroundOpacity = 0.9;
    accent.size.offset.x = Math.round(3 * scale);
    accent.size.offset.y = Math.round(24 * scale);
    accent.anchor.x = 0;
    accent.anchor.y = 0.5;
    accent.position.scale.x = 0.02;
    accent.position.scale.y = 0.5;

    const label = UiText.create();
    label.parent = root;
    label.visible = true;
    label.textContent = text;
    label.textFontSize = Math.round(14 * scale);
    label.textColor.copy(Vec3.create({ x: 210, y: 215, z: 225 }));
    label.textXAlignment = "Left";
    label.textYAlignment = "Center";
    label.anchor.x = 0;
    label.anchor.y = 0.5;
    label.position.scale.x = 0.04;
    label.position.scale.y = 0.5;
    label.position.offset.y = Math.round(3 * scale);
    label.autoResize = "XY";

    const t = { root, _dead: false, _timer: null };
    toasts.push(t);

    await Promise.all([
        Motion.to(root, 300, { backgroundOpacity: 0.92 }, Ease.easeOutCubic).wait,
        Motion.to(root.position.scale, 300, { y: BASE_SCALE_Y + pos * ((toastH + toastGap) / screenHeight) }, Ease.easeOutCubic).wait,
    ]);

    t._timer = setTimeout(() => dismissToast(t), duration);

    root.events.add("pointerdown", () => {
        if (t._dead) return;
        dismissToast(t);
    });

    return t;
};

export const Toast = {
    show: createToast,
    info: (text, duration) => createToast(text, "info", duration),
    success: (text, duration) => createToast(text, "success", duration),
    warn: (text, duration) => createToast(text, "warn", duration),
    error: (text, duration) => createToast(text, "error", duration),
};

