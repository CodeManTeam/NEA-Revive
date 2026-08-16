world.onTick(() => {
    world.querySelectorAll('player').forEach((e) => {
        e.gameScore = Infinity;
        e.isbcd=0;
    });
});