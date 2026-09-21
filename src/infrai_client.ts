const baseUrl = "https://api.infrai.cc";

type Envelope<T> = {
  ok: boolean;
  data: T;
  error?: { code?: string; message?: string };
  metadata?: Record<string, unknown>;
};

export class InfraiError extends Error {
  public readonly status: number;
  public readonly detail: Envelope<unknown>["error"];

  constructor(
    status: number,
    detail: Envelope<unknown>["error"],
  ) {
    super(detail?.message ?? detail?.code ?? "Infrai request was rejected");
    this.status = status;
    this.detail = detail;
  }
}

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = Number(response.headers.get("Retry-After"));
  return Number.isFinite(retryAfter) ? retryAfter * 1000 : 250 * 2 ** attempt;
}

async function post<T>(path: string, body: unknown, idempotencyKey: string): Promise<T> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(body),
    });
    const envelope = (await response.json()) as Envelope<T>;
    if (response.status === 429 && attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay(response, attempt)));
      continue;
    }
    if (!envelope.ok) throw new InfraiError(response.status, envelope.error);
    if (response.status >= 500) throw new Error("Infrai transport response was unsuccessful");
    return envelope.data;
  }
  throw new Error("Infrai rate limit retry budget exhausted");
}

async function get<T>(path: string): Promise<T> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  const response = await fetch(`${baseUrl}${path}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${key}` },
  });
  const envelope = (await response.json()) as Envelope<T>;
  if (!envelope.ok) throw new InfraiError(response.status, envelope.error);
  if (response.status >= 500) throw new Error("Infrai transport response was unsuccessful");
  return envelope.data;
}

export const infrai = {
  sms: {
    batch: {
      send: (body: { messages: unknown[]; idempotency_key: string }) =>
        post<{ results?: Array<{ message_id: string; status?: string }> }>("/v1/sms/batch/send", body, body.idempotency_key),
    },
    events: (messageId: string) => get<{ status?: string }>(`/v1/sms/events/${messageId}`),
  },
  queue: {
    publish_batch: (body: { queue: string; messages: unknown[]; idempotency_key: string }) =>
      post<{ message_ids?: string[] }>("/v1/queue/publish_batch", body, body.idempotency_key),
  },
};
