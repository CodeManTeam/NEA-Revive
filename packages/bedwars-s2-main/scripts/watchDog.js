world.onPlayerJoin(({ entity }) => {
    entity.player.lastPosition = entity.position.clone()
    entity.player.suspensionTimes = 0
})
world.onTick(() => {
    world.querySelectorAll('player').filter(e => !e.destroyed).forEach((e) => {
        if (!e.velocity) return
        if ((e.velocity.y == 0 || e.velocity.y == -0.12109375) && e.player.moveState == 'fall' && e.position.y == e.player.lastPosition.y) {
            if (!e.player.spectator && e.voxelContacts.length + e.entityContacts.length == 0) {
                e.player.suspensionTimes += 1
                if (e.player.suspensionTimes > 1) {
                    world.say(`${e.player.name} 因使用第三方插件作弊而被系统踢出服务器！`)
                    e.player.kick()
                }
            }
        } else {
            e.player.suspensionTimes = 0
        }
        e.player.lastPosition = e.position.clone()
        // if (e.player.canFly) {
        //     world.say(`${e.player.name} 因使用第三方插件作弊而被系统踢出服务器！`)
        //     e.player.kick()
        // }
    })
})
