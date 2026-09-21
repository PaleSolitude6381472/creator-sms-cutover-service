import assert from "node:assert/strict";
import test from "node:test";
import { prepareCreatorDrop } from "../src/subscriber_delivery.js";

test("only opted-in subscribers with finished assets receive a creator drop", () => {
  const messages = prepareCreatorDrop({
    campaignId: "drop-7",
    title: "Loop kit",
    assetPath: "https://creator.example/loop-kit",
    queueName: "creator-campaigns",
    subscribers: [
      { id: "ready", phone: "+15550000001", smsOptedIn: true, delivery: "ready" },
      { id: "processing", phone: "+15550000002", smsOptedIn: true, delivery: "processing" },
      { id: "opted-out", phone: "+15550000003", smsOptedIn: false, delivery: "ready" },
    ],
  });
  assert.deepEqual(messages, [{
    subscriberId: "ready",
    to: "+15550000001",
    body: "Loop kit: your download is ready https://creator.example/loop-kit",
  }]);
});
