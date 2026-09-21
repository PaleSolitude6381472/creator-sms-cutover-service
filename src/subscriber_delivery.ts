import { z } from "zod";

export const campaignInput = z.object({
  campaignId: z.string().min(1),
  title: z.string().min(1),
  assetPath: z.string().url(),
  queueName: z.string().min(1),
  subscribers: z.array(z.object({
    id: z.string().min(1),
    phone: z.string().min(8),
    smsOptedIn: z.boolean(),
    delivery: z.enum(["ready", "processing"]),
  })).min(1),
});

export type CampaignInput = z.infer<typeof campaignInput>;

export type PreparedMessage = {
  subscriberId: string;
  to: string;
  body: string;
};

export function prepareCreatorDrop(input: CampaignInput): PreparedMessage[] {
  return input.subscribers
    .filter((subscriber) => subscriber.smsOptedIn && subscriber.delivery === "ready")
    .map((subscriber) => ({
      subscriberId: subscriber.id,
      to: subscriber.phone,
      body: `${input.title}: your download is ready ${input.assetPath}`,
    }));
}
