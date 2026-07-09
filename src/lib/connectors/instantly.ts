import { apiFetch } from "./http";
import type { Connector, ConnectorContext, SyncResult, VerifyResult } from "./types";

const BASE = "https://api.instantly.ai/api/v2";

function auth(ctx: ConnectorContext) {
  const apiKey = ctx.credentials.apiKey as string;
  if (!apiKey) throw new Error("Instantly API key is missing.");
  return { Authorization: `Bearer ${apiKey}` };
}

export const instantlyConnector: Connector = {
  provider: "instantly",
  name: "Instantly",
  description:
    "Track cold-email campaigns: emails sent, open rate, reply rate and opportunities per campaign.",
  category: "Email Outreach",
  color: "#fbbf24",
  docsUrl: "https://developer.instantly.ai/",
  supportsWebhook: true,
  supportsSync: true,
  credentialFields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      secret: true,
      placeholder: "Bearer key from Instantly v2 API",
      help: "Instantly → Settings → Integrations → API Keys (V2). Sent as a Bearer token.",
    },
  ],
  configFields: [
    {
      key: "campaignIds",
      label: "Campaign IDs (optional)",
      type: "text",
      help: "Comma-separated campaign IDs to limit tracking. Leave blank for all.",
    },
  ],
  defaultMetrics: [
    { key: "instantly_sent", label: "Emails sent", aggregation: "latest", recordKind: "series", valueField: "instantly_sent", unit: "count", color: "amber" },
    { key: "instantly_reply_rate", label: "Reply rate", aggregation: "latest", recordKind: "series", valueField: "instantly_reply_rate", unit: "percent", color: "brand" },
    { key: "instantly_open_rate", label: "Open rate", aggregation: "latest", recordKind: "series", valueField: "instantly_open_rate", unit: "percent", color: "teal" },
    { key: "instantly_opportunities", label: "Opportunities", aggregation: "latest", recordKind: "series", valueField: "instantly_opportunities", unit: "count", color: "violet" },
  ],

  async verify(ctx): Promise<VerifyResult> {
    const res = await apiFetch<any>(`${BASE}/campaigns`, {
      headers: auth(ctx),
      query: { limit: 1 },
    });
    const count = res?.items?.length ?? 0;
    return {
      ok: true,
      message: "Connected to Instantly.",
      accountLabel: `Instantly (${count > 0 ? "campaigns found" : "no campaigns yet"})`,
    };
  },

  async sync(ctx): Promise<SyncResult> {
    const headers = auth(ctx);
    const filterIds = String(ctx.config.campaignIds ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    // Per-campaign analytics.
    const analytics = await apiFetch<any>(`${BASE}/campaigns/analytics`, {
      headers,
      query: filterIds.length ? { ids: filterIds.join(",") } : {},
    });
    const rows: any[] = Array.isArray(analytics)
      ? analytics
      : (analytics?.items ?? []);

    let sent = 0;
    let replies = 0;
    let opens = 0;
    let opportunities = 0;
    for (const r of rows) {
      sent += r.emails_sent_count ?? r.sent_count ?? 0;
      replies += r.reply_count ?? 0;
      opens += r.open_count ?? 0;
      opportunities += r.total_opportunities ?? r.leads_who_replied ?? 0;
    }
    const replyRate = sent ? (replies / sent) * 100 : 0;
    const openRate = sent ? (opens / sent) * 100 : 0;

    const now = new Date();
    const dataPoints = [
      { metricKey: "instantly_sent", value: sent, timestamp: now },
      { metricKey: "instantly_replies", value: replies, timestamp: now },
      { metricKey: "instantly_reply_rate", value: Math.round(replyRate * 10) / 10, timestamp: now },
      { metricKey: "instantly_open_rate", value: Math.round(openRate * 10) / 10, timestamp: now },
      { metricKey: "instantly_opportunities", value: opportunities, timestamp: now },
    ];

    const events = rows.map((r) => ({
      kind: "campaign",
      externalId: (r.campaign_id ?? r.id) as string,
      title: (r.campaign_name ?? r.name ?? "Campaign") as string,
      occurredAt: now,
      data: {
        sent: r.emails_sent_count ?? r.sent_count ?? 0,
        opens: r.open_count ?? 0,
        replies: r.reply_count ?? 0,
        bounced: r.bounced_count ?? 0,
        opportunities: r.total_opportunities ?? 0,
        opportunity_value: r.total_opportunity_value ?? 0,
      },
    }));

    return {
      dataPoints,
      events,
      message: `Synced ${rows.length} campaigns — ${sent} sent, reply rate ${replyRate.toFixed(1)}%.`,
    };
  },

  async handleWebhook(body, _headers, _ctx): Promise<SyncResult> {
    // Instantly webhook: { event_type, campaign_id, lead_email, ... }
    const type = body?.event_type ?? body?.event ?? "instantly_event";
    return {
      dataPoints: [],
      events: [
        {
          kind: "email_event",
          externalId: body?.id ?? undefined,
          title: `${type}: ${body?.lead_email ?? ""}`.trim(),
          occurredAt: new Date(),
          data: { event_type: type, ...body },
        },
      ],
      message: `Instantly webhook: ${type}`,
    };
  },
};
