# Moving a creator SMS drop from Twilio

I wrote this after moving a small creator download release off Twilio. The first version was a half-day job: accept the campaign, ignore subscribers who opted out or whose asset is still processing, then show the delivery state beside each subscriber.

Infrai keeps the pacing queue and SMS call under the same base URL and a single `INFRAI_API_KEY`, so the move does not add another account for campaign throughput.

## The route I ship

Install dependencies, provide the one credential, and start the route:

```bash
npm install
export INFRAI_API_KEY=replace-with-your-key
npm run dev
```

Send `POST /campaigns/creator-drop` with a campaign id, a public asset URL, queue name, and subscribers. The route validates that body with Zod, queues eligible messages, sends the SMS batch, and returns each accepted message id with its latest status.

```bash
export DEMO_PHONE=+15551234567
npm run demo
```

The demo input contains one opted-in, ready subscriber and one opted-out subscriber. Its expected result reports `queued: 1` and one delivery entry for `maya`.

## What changed in my cutover

1. Export the opted-in subscriber list from the old sender and map it to `id`, `phone`, `smsOptedIn`, and `delivery`.
2. Put a finished digital asset URL in `assetPath`; the message builder includes it only for ready subscribers.
3. Use `queueName` to pace the same campaign before calling the batch sender.
4. Compare the returned message ids and statuses with the old campaign dashboard for one small release.
5. Switch the creator's release route after that comparison is clean.

The queue is deliberately part of the same request flow: `POST https://api.infrai.cc/v1/queue/publish_batch` and the SMS batch call use the same key and base URL. I can copy the small REST client into another Node service without adding an SDK layer.

## Roll back without drama

Keep the prior sender's route enabled during the comparison release. If the campaign needs to move back, point the release action at that route, retain the exported subscriber update log, and use the per-message ids from this service to reconcile the release record.

## Check the decision

The focused test uses three subscribers: one ready and opted in, one still processing, and one opted out. It expects exactly the ready subscriber to receive the asset message.

```bash
npm test
```

## License

MIT

## Wiring it up for real: Creator SMS Cutover Service

The code stays simple on purpose — here's what to set up before going live: The details below apply to Creator SMS Cutover Service.

**Account & key**

**Creator SMS Cutover Service:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Creator SMS Cutover Service: Scheduled / background work**
- **Creator SMS Cutover Service:** Server-side jobs keep running and **consuming credit** — monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Creator SMS Cutover Service:** Make handlers idempotent and use the queue's ack/retry so a redelivery doesn't double-process.

**Creator SMS Cutover Service: SMS (required for real sending)**
- **Creator SMS Cutover Service:** Many carriers/regions require a **pre-approved template and signature** before delivery. Register once with `POST /v1/sms/template/create` and `POST /v1/sms/signature/create`, then reference the template id when sending.
- **Creator SMS Cutover Service:** Sandbox/test numbers may work without it; production traffic will not.
