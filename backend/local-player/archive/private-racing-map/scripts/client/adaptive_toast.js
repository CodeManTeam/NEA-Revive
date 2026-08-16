/**
 * @typedef {Object} ScreenDimension
 * @property {number} screenWidth
 * @property {number} screenHeight
 */

const screen = UiScreen.getAllScreen().find(s => s.name === "toast");
let currentScale = 1;

const applyAdaptiveLayout = ({ screenWidth: w, screenHeight: h }) => {
    const minDim = Math.min(w, h);
    currentScale = Math.max(0.2, Math.min(0.9, minDim / 1000));
};

applyAdaptiveLayout({ screenWidth, screenHeight });
screen.events.add("resize", applyAdaptiveLayout);

export const getToastScale = () => currentScale;
