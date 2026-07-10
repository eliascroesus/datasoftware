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
    { key: "sendblue_repliers", label: "People who replied", aggregation: "unique", recordKind: "sms", valueField: "contact", filters: [{ field: "direction", op: "eq", value: "inbound" }], unit: "count", color: "amber" },
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

  async handleWebhook(body, _headers, _ctx): Promise<SyncResult> {
    // SendBlue posts inbound messages and outbound status callbacks to the same
    // URL. Detect direction robustly from is_outbound / direction / status.
    const status = String(body?.status ?? "").toUpperCase();
    const outboundStatuses = new Set([
      "SENT",
      "DELIVERED",
      "QUEUED",
      "SENDING",
      "DISPATCHED",
    ]);
    const isOutbound =
      body?.is_outbound === true ||
      body?.direction === "outbound" ||
      (body?.is_outbound === undefined && outboundStatuses.has(status));
    const isInbound =
      body?.is_outbound === false ||
      body?.direction === "inbound" ||
      status === "RECEIVED";
    const direction = isOutbound && !isInbound ? "outbound" : "inbound";

    // The contact (lead) is the other party — used to count unique repliers.
    const contact = isOutbound
      ? body?.to_number ?? body?.number
      : body?.from_number ?? body?.number;
    const handle =
      body?.message_handle ?? body?.id ?? `${contact}-${body?.date_sent ?? Date.now()}`;

    const events = [
      {
        kind: "sms",
        externalId: String(handle),
        title:
          (direction === "outbound" ? "→ " : "← ") +
          (contact ?? "message") +
          (body?.content ? `: ${String(body.content).slice(0, 40)}` : ""),
        occurredAt: new Date(body?.date_sent ?? body?.date_created ?? Date.now()),
        data: {
          direction,
          contact: contact ?? "",
          status: body?.status ?? (direction === "inbound" ? "received" : "sent"),
          content: body?.content ?? "",
          from_number: body?.from_number ?? "",
          to_number: body?.to_number ?? "",
          message_type: body?.message_type ?? (body?.media_url ? "media" : "text"),
          media_url: body?.media_url ?? "",
        },
      },
    ];

    return {
      dataPoints: [],
      events,
      message: `SendBlue ${direction} message (${status || "received"})`,
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
