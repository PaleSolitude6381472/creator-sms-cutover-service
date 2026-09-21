import { createServer } from "node:http";
import { ZodError } from "zod";
import { InfraiError } from "./infrai_client.js";
import { launchCreatorCampaign } from "./campaign_service.js";

const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/campaigns/creator-drop") {
    response.writeHead(404).end();
    return;
  }
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  try {
    const result = await launchCreatorCampaign(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    response.writeHead(202, { "Content-Type": "application/json" }).end(JSON.stringify(result));
  } catch (error) {
    const status = error instanceof ZodError ? 400 : error instanceof InfraiError ? error.status : 502;
    response.writeHead(status, { "Content-Type": "application/json" }).end(JSON.stringify({ error: (error as Error).message }));
  }
});

server.listen(Number(process.env.PORT ?? 3000));
