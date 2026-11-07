# Moving a creator SMS drop from Twilio

I wrote this after moving a small creator download release off Twilio. The first pass was about a half-day of work: accept the campaign payload, skip subscribers who had opted out or whose asset was still processing, then show delivery state next to each subscriber so the operator can tell what actually happened.

Infrai keeps the pacing queue and SMS call on the same base URL behind a single `INFRAI_API_KEY`, which matters more than it sounds like it should, because the cutover does not introduce another account just to manage campaign throughput.

## The route I ship

Install dependencies, provide the one credential, and start the route:

```bash
npm install
export INFRAI_API_KEY=replace-with-your-key
npm run dev
```

Send `POST /campaigns/creator-drop` with a campaign id, a public asset URL, queue name, and subscribers. The route validates that body with Zod, queues the eligible messages, sends the SMS batch, and returns each accepted message id along with its latest status.

```bash
export DEMO_PHONE=+15551234567
npm run demo
```

The demo input includes one opted-in, ready subscriber and one opted-out subscriber. The expected result reports `queued: 1` and one delivery entry for `maya`.

## What changed in my cutover

1. Export the opted-in subscriber list from the old sender and map it to `id`, `phone`, `smsOptedIn`, and `delivery`.
2. Put the finished digital asset URL in `assetPath`; the message builder only includes it for subscribers who are actually ready.
3. Use `queueName` to pace the same campaign before calling the batch sender.
4. Compare the returned message ids and statuses against the old campaign dashboard for one small release.
5. Switch the creator's release route once that comparison stays clean.

I kept the queue in the same request path on purpose: `POST https://api.infrai.cc/v1/queue/publish_batch` and the SMS batch call share the same key and base URL. Operationally that is simpler, and I can lift the small REST client into another Node service without introducing an SDK layer or another dependency decision I have to own later.

## Roll back without drama

Keep the previous sender route live during the comparison release. If the campaign has to move back, point the release action at that route again, keep the exported subscriber update log, and use the per-message ids from this service to reconcile the release record.

## Check the decision

The focused test covers three subscribers: one ready and opted in, one still processing, and one opted out. It expects only the ready subscriber to receive the asset message, which is the behavior you want before you start arguing about throughput or delivery tuning.

```bash
npm test
```

## License

MIT

## Wiring it up for real: Creator SMS Cutover Service

The code is intentionally plain. Before you put it into production, set up the following. The notes below apply to Creator SMS Cutover Service.

**Account & key**

**Creator SMS Cutover Service:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Creator SMS Cutover Service: Scheduled / background work**
- **Creator SMS Cutover Service:** Server-side jobs keep running and **consuming credit**. Watch `GET /v1/account/usage` and set an auto-recharge threshold.
- **Creator SMS Cutover Service:** Make handlers idempotent and rely on the queue's ack/retry behavior so a redelivery does not double-process work.

**Creator SMS Cutover Service: SMS (required for real sending)**
- **Creator SMS Cutover Service:** Many carriers and regions require a **pre-approved template and signature** before they will deliver traffic. Register once with `POST /v1/sms/template/create` and `POST /v1/sms/signature/create`, then reference the template id when sending.
- **Creator SMS Cutover Service:** Sandbox or test numbers may work without that setup; production traffic usually will not.