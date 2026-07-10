import type { Connector, SyncResult, VerifyResult } from "./types";
import { toNumber } from "./types";

// SendBlue is primarily webhook-driven for inbound analytics: it posts message
// events (sent, delivered, received) to your webhook URL. We track SMS/iMessage
// volume and reply rate from those events.

export const sendblueConnector: Connector = {
  provider: "sendblue",
  name: "SendBlue",
  description:
    "Track SMS / iMessage sent, delivered, received and reply rate. Powered by SendBlue webhooks.",
  category: "Messaging",
  color: "#8b7cff",
  docsUrl: "https://sendblue.co/docs",
  supportsWebhook: true,
  supportsSync: false,
  credentialFields: [
    {
      key: "apiKeyId",
      label: "API Key ID",
      type: "password",
      required: true,
      secret: true,
      help: "SendBlue → Settings → API. Sent as the sb-api-key-id header.",
    },
    {
      key: "apiSecret",
      label: "API Secret",
      type: "password",
      required: true,
      secret: true,
      help: "Sent as the sb-api-secret-key header.",
    },
  ],
  configFields: [],
  defaultMetrics: [
    { key: "sendblue_sent", label: "SMS sent", aggregation: "count", recordKind: "sms", filters: [{ field: "direction", op: "eq", value: "outbound" }], unit: "count", color: "violet" },
    { key: "sendblue_received", label: "SMS received", aggregation: "count", recordKind: "sms", filters: [{ field: "direction", op: "eq", value: "inbound" }], unit: "count", color: "teal" },
    { key: "sendblue_reply_rate", label: "Reply rate", aggregation: "latest", recordKind: "series", valueField: "sendblue_reply_rate", unit: "percent", color: "brand" },
  ],

  async verify(ctx): Promise<VerifyResult> {
    // SendBlue has no public GET/verify endpoint; validate presence of keys.
    if (!ctx.credentials.apiKeyId || !ctx.credentials.apiSecret) {
      return { ok: false, message: "Both API Key ID and API Secret are required." };
    }
    return {
      ok: true,
      message:
        "Credentials stored. SendBlue is webhook-driven — point SendBlue webhooks at your NamziLabs URL below.",
      accountLabel: "SendBlue (webhook)",
    };
  },

  async handleWebhook(body, _headers, ctx): Promise<SyncResult> {
    // SendBlue webhook payload fields.
    const isOutbound =
      body?.is_outbound === true ||
      body?.direction === "outbound" ||
      body?.from_number === ctx.config.fromNumber;
    const direction = isOutbound ? "outbound" : "inbound";
    const handle = body?.message_handle ?? body?.id ?? undefined;

    const events = [
      {
        kind: "sms",
        externalId: handle,
        title:
          (isOutbound ? "→ " : "← ") +
          (body?.to_number ?? body?.from_number ?? "message"),
        occurredAt: new Date(body?.date_sent ?? body?.date_created ?? Date.now()),
        data: {
          direction,
          status: body?.status,
          content: body?.content,
          from_number: body?.from_number,
          to_number: body?.to_number,
          is_outbound: isOutbound,
          media_url: body?.media_url,
        },
      },
    ];

    return {
      dataPoints: [],
      events,
      message: `SendBlue ${direction} message (${body?.status ?? "received"})`,
    };
  },
};

// Reply rate is recomputed after each ingest by the sync/ingest orchestrator
// using the sent/received counts. Exposed here for reuse.
export function computeReplyRate(sent: number, received: number): number {
  const r = sent ? (received / sent) * 100 : 0;
  return Math.round(r * 10) / 10;
}

export { toNumber };
