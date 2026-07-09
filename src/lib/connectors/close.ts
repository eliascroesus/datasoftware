import { apiFetch, basicAuthHeader, defaultSince } from "./http";
import type { Connector, ConnectorContext, SyncResult, VerifyResult } from "./types";

const BASE = "https://api.close.com/api/v1";

function auth(ctx: ConnectorContext) {
  const apiKey = ctx.credentials.apiKey as string;
  if (!apiKey) throw new Error("Close API key is missing.");
  return { Authorization: basicAuthHeader(apiKey) };
}

export const closeConnector: Connector = {
  provider: "close",
  name: "Close CRM",
  description:
    "Track leads, opportunities, win/accept rate and pipeline value straight from your Close CRM.",
  category: "CRM",
  color: "#3d7dff",
  docsUrl: "https://developer.close.com/",
  supportsWebhook: true,
  supportsSync: true,
  credentialFields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      secret: true,
      placeholder: "api_xxxxxxxxxxxxxxxxxxxx",
      help: "Close → Settings → API Keys. Used with HTTP Basic auth.",
    },
  ],
  configFields: [
    {
      key: "wonStatusType",
      label: "“Accepted / Won” status type",
      type: "text",
      defaultValue: "won",
      help: "Opportunity status_type counted as accepted. Usually 'won'.",
    },
  ],
  defaultMetrics: [
    { key: "close_leads", label: "Leads", aggregation: "latest", recordKind: "series", valueField: "close_leads", unit: "count", color: "brand" },
    { key: "close_opportunities", label: "Opportunities", aggregation: "latest", recordKind: "series", valueField: "close_opportunities", unit: "count", color: "violet" },
    { key: "close_accept_rate", label: "Accept rate", aggregation: "latest", recordKind: "series", valueField: "close_accept_rate", unit: "percent", color: "teal" },
    { key: "close_pipeline_value", label: "Pipeline value", aggregation: "latest", recordKind: "series", valueField: "close_pipeline_value", unit: "currency", color: "amber" },
  ],

  async verify(ctx): Promise<VerifyResult> {
    const me = await apiFetch<any>(`${BASE}/me/`, { headers: auth(ctx) });
    const org = me?.organizations?.[0]?.name ?? me?.email ?? "Close account";
    return { ok: true, message: "Connected to Close CRM.", accountLabel: org };
  },

  async sync(ctx): Promise<SyncResult> {
    const headers = auth(ctx);
    const wonType = (ctx.config.wonStatusType as string) || "won";
    const since = defaultSince(60);

    // Opportunities (paginated, capped for a single sync run).
    const opps: any[] = [];
    let skip = 0;
    for (let page = 0; page < 5; page++) {
      const res = await apiFetch<any>(`${BASE}/opportunity/`, {
        headers,
        query: { _limit: 100, _skip: skip },
      });
      const data: any[] = res?.data ?? [];
      opps.push(...data);
      if (!res?.has_more || data.length === 0) break;
      skip += data.length;
    }

    // Leads count via the search meta.
    const leadRes = await apiFetch<any>(`${BASE}/lead/`, {
      headers,
      query: { _limit: 1 },
    });
    const leadCount: number = leadRes?.total_results ?? leadRes?.data?.length ?? 0;

    const won = opps.filter((o) => o.status_type === wonType);
    const active = opps.filter((o) => o.status_type === "active");
    const acceptRate = opps.length ? (won.length / opps.length) * 100 : 0;
    const pipelineValue = active.reduce(
      (sum, o) => sum + (o.value ?? 0) / 100,
      0,
    );

    const now = new Date();
    const dataPoints = [
      { metricKey: "close_leads", value: leadCount, timestamp: now },
      { metricKey: "close_opportunities", value: opps.length, timestamp: now },
      { metricKey: "close_won", value: won.length, timestamp: now },
      { metricKey: "close_accept_rate", value: Math.round(acceptRate * 10) / 10, timestamp: now },
      { metricKey: "close_pipeline_value", value: Math.round(pipelineValue), timestamp: now },
    ];

    const events = opps.slice(0, 200).map((o) => ({
      kind: "opportunity",
      externalId: o.id as string,
      title: (o.lead_name as string) ?? "Opportunity",
      occurredAt: o.date_created ? new Date(o.date_created) : now,
      data: {
        status: o.status_label,
        status_type: o.status_type,
        value: (o.value ?? 0) / 100,
        value_period: o.value_period,
        lead_name: o.lead_name,
        confidence: o.confidence,
        accepted: o.status_type === wonType ? "Yes" : "No",
      },
    }));

    return {
      dataPoints,
      events,
      message: `Synced ${opps.length} opportunities, ${leadCount} leads — accept rate ${acceptRate.toFixed(1)}%.`,
    };
  },

  async handleWebhook(body, _headers, _ctx): Promise<SyncResult> {
    // Close webhook envelope: { event: { object_type, action, data } }
    const event = body?.event ?? body;
    const object = event?.data ?? {};
    const kind = event?.object_type === "opportunity" ? "opportunity" : "lead";
    return {
      dataPoints: [],
      events: [
        {
          kind,
          externalId: object.id,
          title: object.display_name ?? object.lead_name ?? "Close event",
          occurredAt: new Date(),
          data: { action: event?.action, ...object },
        },
      ],
      message: `Close webhook: ${event?.object_type} ${event?.action}`,
    };
  },
};
