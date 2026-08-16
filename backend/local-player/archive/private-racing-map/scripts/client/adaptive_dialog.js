let currentScale = 1;

const applyAdaptiveLayout = ({ screenWidth: w, screenHeight: h }) => {
    const minDim = Math.min(w, h);
    currentScale = Math.max(0.4, Math.min(0.9, minDim / 900));
};

applyAdaptiveLayout({ screenWidth, screenHeight });
screen.events.add("resize", applyAdaptiveLayout);

export const getDialogScale = () => currentScale;
