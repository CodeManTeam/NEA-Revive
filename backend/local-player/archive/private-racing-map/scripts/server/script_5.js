if (button === 'action0') {
    if (!gameOver && hitEntity) {
        let pos_ = origin.add(new GameVector3(this.velocity.x * 2, this.velocity.y * 2 - 0.36, this.velocity.z * 2));
        distance_ = pos_.distance(hitPosition);
        if (!hitEntity.isPlayer || distance_ > 2.9 || hitEntity.player.dead || this.player.dead) {
            return;
        }
        if (!this.tickAttacked && this.enableRun) {
            this.tickAttacked = true;
            this.velocity.x *= 0.66;
            this.velocity.z *= 0.66;
        }
        if (this.player.team === hitEntity.player.team) {
            return;
        }
        let pos_ = origin.add(new GameVector3(this.velocity.x * 2, this.velocity.y * 2 - 0.36, this.velocity.z * 2));
        let kbDir = hitEntity.position.sub(pos_);
        kbDir.y = 0;
        let dist = direction.mag();
        kbDir.x /= dist;
        kbDir.z /= dist;
        if (hitEntity.player.crouchButton) {
            hitEntity.velocity.y = 0.5;
            let kbFactor = hitEntity.player.walkState ?
                this.player.firstAttack ? 0.52 : 0.4 :
                this.player.firstAttack ? 0.48 : 0.37;
            for (let i = 0; i < 8; i++, await sleep(16)) {
                hitEntity.position.x += hitEntity.velocity.x + kbDir.x * kbFactor;
                hitEntity.position.z += hitEntity.velocity.z + kbDir.z * kbFactor;
            }
        } else {
            let kbFactor = hitEntity.player.walkState ?
                this.player.firstAttack ? 0.9 : 0.7 :
                this.player.firstAttack ? 0.7 : 0.5;
            hitEntity.velocity.x += kbDir.x * kbFactor;
            hitEntity.velocity.y = 0.5;
            hitEntity.velocity.z += kbDir.z * kbFactor;
        }
    }
}
