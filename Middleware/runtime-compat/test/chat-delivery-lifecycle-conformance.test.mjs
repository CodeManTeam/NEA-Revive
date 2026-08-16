import test from "node:test";
import assert from "node:assert/strict";
import { createRuntimeEntity, isLiveChatEntity } from "../../../Frontend/demo-map/src/runtime/script-runtime.mjs";
import { chatDeliveryLifecycleContract } from "../conformance/chat-delivery-lifecycle.mjs";

test("chat delivery lifecycle contract preserves recovered silent-drop and player removal ordering", () => {
  const entity = createRuntimeEntity({ id: "speaker" });
  assert.equal(isLiveChatEntity(entity), true);
  entity._destroyed = true;
  assert.equal(isLiveChatEntity(entity), false);
  assert.equal(isLiveChatEntity(null), false);
  assert.equal(chatDeliveryLifecycleContract.invalidEndpointPolicy, "silent-drop");
  assert.deepEqual(chatDeliveryLifecycleContract.playerRemovalOrder, [
    "world.onPlayerLeave",
    "player.onDestroy",
    "world.onEntityDestroy",
  ]);
  assert.deepEqual(chatDeliveryLifecycleContract.unresolved, [
    "MAX_CHATS_PER_TICK value",
    "Player display acknowledgement",
  ]);
});
