import { publicRuntimeCapabilities } from "./project-capability.mjs";

export const RECOVERED_SERVER_CAPABILITIES = Object.freeze([
  "server.world.events",
  "server.world.chat",
  "server.world.entities",
  "server.world.voxels",
  "server.world.config",
  "server.gui",
  "server.storage",
  "server.player",
  "server.player.write",
  "server.remote-channel",
]);

export function recoveredClientCapabilities(currentRuntime) {
  return publicRuntimeCapabilities(currentRuntime, "client");
}
