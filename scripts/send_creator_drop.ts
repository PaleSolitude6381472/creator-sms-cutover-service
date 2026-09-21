import { launchCreatorCampaign } from "../src/campaign_service.js";

const phone = process.env.DEMO_PHONE;
if (!phone) throw new Error("DEMO_PHONE is required");

const result = await launchCreatorCampaign({
  campaignId: "sep-creator-drop",
  title: "September brush pack",
  assetPath: "https://creator.example/downloads/september-brushes",
  queueName: "creator-campaigns",
  subscribers: [
    { id: "maya", phone, smsOptedIn: true, delivery: "ready" },
    { id: "lee", phone: "+15550000000", smsOptedIn: false, delivery: "ready" },
  ],
});

console.log(JSON.stringify(result, null, 2));
