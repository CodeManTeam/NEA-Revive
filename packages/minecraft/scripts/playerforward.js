async function forward(entity) {
    while (true) {
	var y = entity.player.cameraYaw
        var p = entity.player.cameraPitch
        entity.forward = new GameVector3(
            -Math.cos(y) * Math.cos(p),
            -Math.sin(p),
            -Math.sin(y) * Math.cos(p)
        );
        await sleep(64)
    }
}

world.onPlayerJoin(async({entity})=>{
	forward(entity)
})