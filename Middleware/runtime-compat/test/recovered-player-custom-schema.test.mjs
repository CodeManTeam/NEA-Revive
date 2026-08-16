import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";

import { MuReadStream, MuWriteStream } from "../../../Shared/mudb/stream/index.js";

register(new URL("../../../Backend/local-player/tools/legacy-ts-loader.mjs", import.meta.url), import.meta.url);

const { MuQuantizedVec2, MuQuantizedVec3 } = await import("../evidence/recovered-player-custom-schema.ts");

test("recovered compact quantized vectors round-trip multi-axis and negative deltas", () => {
  const cases = [
    { schema: new MuQuantizedVec3(1, [255, 255, 255]), value: [2, 87, 14] },
    { schema: new MuQuantizedVec3(1, [0, 0, 0]), value: [219, 255, 41] },
    { schema: new MuQuantizedVec3(0.00390625, [0, 0, 0]), value: [0.5, -90, 0.349609375] },
    { schema: new MuQuantizedVec2(0.00390625, [0, 0]), value: [500, -10] },
    { schema: new MuQuantizedVec2(0.0009765625, [0, 0]), value: [0.9501953125, 1] },
  ];

  for (const { schema, value } of cases) {
    const output = new MuWriteStream(16);
    assert.equal(schema.diff(schema.identity, value, output), true);
    const input = new MuReadStream(Buffer.from(output.bytes()));
    assert.deepEqual(schema.patch(schema.identity, input), schema.toJSON(value));
    assert.equal(input.offset, input.length);
    output.destroy();
  }
});
