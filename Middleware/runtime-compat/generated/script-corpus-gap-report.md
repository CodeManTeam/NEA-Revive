# Script Corpus Compatibility Gap Report

Private source paths, work identities, and event type names are excluded. Samples only prioritize unified ABI work.

A custom extension is reported only when the corpus contains a direct member assignment and the native ABI catalogs contain no matching declaration.

## Evidence Boundaries

- Source class: approved-local-private-inspection
- Redaction: anonymous-aggregate
- Publication status: public-sanitized
- Reproducibility limit: Requires an approved local private source; this aggregate cannot recreate source code, source paths, work identities, member-assignment paths, or event type names.

## Summary

- Anonymous samples: 2
- Distinct API requirements: 74
- Executable: 40
- Partial: 19
- Unavailable: 0
- Missing native ABI: 0
- Unclassified surfaces: 0
- Script-defined custom extensions: 15

## Highest-Priority Native Gaps

| Priority | Side | Usage | Requirement | Canonical ABI | State | Compatibility |
| ---: | --- | ---: | --- | --- | --- | --- |
| 36 | server | 12 | `world.onChat` | `server.world.onChat` | partial | partial |
| 36 | server | 12 | `world.onTick` | `server.world.onTick` | partial | partial |
| 24 | server | 8 | `world.raycast` | `server.world.raycast` | partial | partial |
| 15 | server | 5 | `storage.getDataStorage` | `server.GameStorage.getDataStorage` | partial | partial |
| 15 | server | 5 | `world.onVoxelContact` | `server.world.onVoxelContact` | partial | partial |
| 12 | server | 4 | `world.onClick` | `server.world.onClick` | partial | partial |
| 9 | server | 3 | `world.onFluidEnter` | `server.world.onFluidEnter` | partial | partial |
| 6 | server | 2 | `world.addCollisionFilter` | `server.world.addCollisionFilter` | partial | partial |
| 6 | server | 2 | `world.addZone` | `server.world.addZone` | partial | partial |
| 6 | server | 2 | `world.onEntityContact` | `server.world.onEntityContact` | partial | partial |
| 6 | server | 2 | `world.onPlayerPurchaseSuccess` | `server.world.onPlayerPurchaseSuccess` | partial | partial |
| 3 | server | 1 | `storage.getGroupStorage` | `server.GameStorage.getGroupStorage` | partial | partial |
| 3 | server | 1 | `world.airFriction` | `server.world.airFriction` | partial | partial |
| 3 | server | 1 | `world.fogColor` | `server.world.fogColor` | partial | partial |
| 3 | server | 1 | `world.gravity` | `server.world.gravity` | partial | partial |
| 3 | server | 1 | `world.onDie` | `server.world.onDie` | partial | partial |
| 3 | server | 1 | `world.onFluidLeave` | `server.world.onFluidLeave` | partial | partial |
| 3 | server | 1 | `world.onRespawn` | `server.world.onRespawn` | partial | partial |
| 3 | server | 1 | `world.onTakeDamage` | `server.world.onTakeDamage` | partial | partial |

## Unclassified Surfaces

These names have neither a matching native declaration nor direct assignment evidence in the current corpus.

| Side | Usage | Requirement |
| --- | ---: | --- |

## Script-Defined Extensions

| Side | Usage | Assignments | Requirement |
| --- | ---: | ---: | --- |
| server | 33 | 5 | `world.gameStarting` |
| server | 16 | 4 | `world.gameTime` |
| server | 14 | 3 | `world.team_has_bed` |
| server | 13 | 7 | `world.hp` |
| server | 5 | 2 | `world.time` |
| server | 4 | 1 | `gui.message` |
| server | 3 | 1 | `gui.YELLOW` |
| server | 3 | 2 | `world.deadPeople` |
| server | 2 | 1 | `gui.BLUE` |
| server | 2 | 1 | `gui.GREY` |
| server | 2 | 1 | `gui.Purple` |
| server | 2 | 1 | `gui.RED` |
| server | 2 | 1 | `world.meg_zym` |
| server | 1 | 1 | `gui.GREEN` |
| server | 1 | 1 | `world.meg_uns` |

## Implemented High-Use Paths

| Side | Usage | Requirement | Canonical ABI |
| --- | ---: | --- | --- |
| server | 168 | `remoteChannel.sendClientEvent` | `server.remoteChannel.sendClientEvent` |
| client | 63 | `ui.findChildByName` | `client.UiNode.findChildByName` |
| client | 59 | `remoteChannel.sendServerEvent` | `client.remoteChannel.sendServerEvent` |
| client | 22 | `remoteChannel.events` | `client.remoteChannel.events` |
| server | 119 | `world.querySelectorAll` | `server.world.querySelectorAll` |
| client | 14 | `UiImage.create` | `client.UiImage.create` |
| client | 14 | `UiText.create` | `client.UiText.create` |
| client | 13 | `UiScreen.getAllScreen` | `client.UiScreen.getAllScreen` |
| server | 72 | `world.say` | `server.world.say` |
| client | 12 | `input.unlockPointer` | `client.input.unlockPointer` |
| client | 12 | `UiBox.create` | `client.UiBox.create` |
| server | 62 | `voxels.getVoxelId` | `server.GameVoxels.getVoxelId` |
| server | 48 | `voxels.setVoxelId` | `server.GameVoxels.setVoxelId` |
| client | 7 | `input.lockPointer` | `client.input.lockPointer` |
| client | 6 | `screen.findChildByName` | `client.UiNode.findChildByName` |
| server | 10 | `remoteChannel.onServerEvent` | `server.remoteChannel.onServerEvent` |
| client | 5 | `screen.name` | `client.UiNode.name` |
| client | 5 | `UiScale.create` | `client.UiScale.create` |
| server | 28 | `world.onPlayerJoin` | `server.world.onPlayerJoin` |
| server | 26 | `voxels.id` | `server.GameVoxels.id` |
| server | 20 | `world.createEntity` | `server.world.createEntity` |
| client | 3 | `input.pointerLockEvents` | `client.input.pointerLockEvents` |
| server | 17 | `voxels.setVoxel` | `server.GameVoxels.setVoxel` |
| server | 15 | `world.size` | `server.world.size` |
| client | 2 | `screen.events` | `client.ClientScreen.events` |
| client | 2 | `screen.visible` | `client.UiScreen.visible` |
| client | 2 | `UiScrollBox.create` | `client.UiScrollBox.create` |
| server | 9 | `world.querySelector` | `server.world.querySelector` |
| server | 8 | `world.onPress` | `server.world.onPress` |
| client | 1 | `UiInput.create` | `client.UiInput.create` |
