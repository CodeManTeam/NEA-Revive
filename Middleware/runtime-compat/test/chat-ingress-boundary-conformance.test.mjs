import assert from "node:assert/strict";
import test from "node:test";
import { canProduceGameChatEvent, chatIngressBoundaryContract } from "../conformance/chat-ingress-boundary.mjs";

test("player game-chat noticeMessage is not a ScriptShell chat ingress producer", () => {
  assert.deepEqual(chatIngressBoundaryContract.recoveredPlayerProtocol.clientToServer, ["noticeMessage"]);
  assert.deepEqual(chatIngressBoundaryContract.recoveredBrowserSender.fields, ["title", "detail"]);
  assert.equal(canProduceGameChatEvent("noticeMessage", { title: "notice", detail: "text" }), false);
  assert.equal(chatIngressBoundaryContract.compatibility.noticeMessageProducesGameChatEvent, false);
  assert.equal(chatIngressBoundaryContract.compatibility.launchState, "blocked");
});

test("only the recovered ScriptShell chatEvents.chats shape qualifies as event input", () => {
  assert.equal(canProduceGameChatEvent("chatEvents.chats", { senderId: 7, private: false, message: "hello" }), true);
  assert.equal(canProduceGameChatEvent("chatEvents.chats", { senderId: 7, private: false }), false);
  assert.deepEqual(chatIngressBoundaryContract.historicalConsumer.dispatchOrder, ["world.onChat", "entity.onChat"]);
});
