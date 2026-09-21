import { randomUUID } from "node:crypto";
import { infrai } from "./infrai_client.js";
import { campaignInput, prepareCreatorDrop, type CampaignInput } from "./subscriber_delivery.js";

export async function launchCreatorCampaign(raw: unknown) {
  const input: CampaignInput = campaignInput.parse(raw);
  const messages = prepareCreatorDrop(input);
  const idempotencyKey = `${input.campaignId}-${randomUUID()}`;

  await infrai.queue.publish_batch({
    queue: input.queueName,
    messages: messages.map(({ subscriberId, to, body }) => ({ payload: { subscriberId, to, body } })),
    idempotency_key: idempotencyKey,
  });

  const sent = await infrai.sms.batch.send({
    messages: messages.map(({ to, body }) => ({ to, text: body })),
    idempotency_key: idempotencyKey,
  });

  const delivery = await Promise.all((sent.results ?? []).map(async ({ message_id, status }, index) => ({
    subscriberId: messages[index]?.subscriberId ?? "unknown",
    messageId: message_id,
    status: (await infrai.sms.events(message_id)).status ?? status ?? "accepted",
  })));

  return { campaignId: input.campaignId, queued: messages.length, delivery };
}
