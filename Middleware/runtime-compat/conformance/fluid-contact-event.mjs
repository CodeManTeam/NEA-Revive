import { RuntimeFluidContactEvent } from "../../../Frontend/demo-map/src/runtime/script-runtime.mjs";

export function createFluidContactEventFixture(overrides = {}) {
  return Object.freeze(new RuntimeFluidContactEvent(
    overrides.tick ?? 9,
    overrides.entity ?? Object.freeze({ id: "fluid-entity" }),
    overrides.voxel ?? 21,
  ));
}
