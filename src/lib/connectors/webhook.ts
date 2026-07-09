import type { Connector, SyncResult } from "./types";
import { getPath, toNumber } from "./types";

// Generic webhook sink. Point any tool (Zapier, Make, n8n, a raw HTTP POST)
// at the integration's inbound URL. Optionally map a field in the payload to a
// numeric metric so it shows up as a trend, and map a field to a record title.

export const webhookConnector: Connector = {
  provider: "webhook",
  name: "Incoming Webhook",
  description:
    "Catch data from anything that can send an HTTP POST — Zapier, Make, n8n, or custom code.",
  category: "Custom",
  color: "#f472b6",
  supportsWebhook: true,
  supportsSync: false,
  credentialFields: [],
  configFields: [
    {
      key: "eventKind",
      label: "Record kind",
      type: "text",
      defaultValue: "webhook_event",
      help: "How these records are labelled/grouped, e.g. 'purchase', 'signup'.",
    },
    {
      key: "titlePath",
      label: "Title field (dot-path)",
      type: "text",
      help: "Optional path into the payload to use as the record title, e.g. 'customer.email'.",
    },
    {
      key: "metricKey",
      label: "Numeric metric key",
      type: "text",
      help: "Optional. If set, a numeric value at the path below is tracked as a trend.",
    },
    {
      key: "valuePath",
      label: "Numeric value field (dot-path)",
      type: "text",
      help: "Path to a number in the payload, e.g. 'order.total'.",
    },
  ],
  defaultMetrics: [
    { key: "webhook_events", label: "Webhook events", aggregation: "count", recordKind: "webhook_event", unit: "count", color: "pink" },
  ],

  async handleWebhook(body, _headers, ctx): Promise<SyncResult> {
    const kind = (ctx.config.eventKind as string) || "webhook_event";
    const titlePath = ctx.config.titlePath as string | undefined;
    const metricKey = ctx.config.metricKey as string | undefined;
    const valuePath = ctx.config.valuePath as string | undefined;

    const title = titlePath
      ? String(getPath(body, titlePath) ?? "Webhook event")
      : "Webhook event";

    const dataPoints = [];
    if (metricKey && valuePath) {
      const num = toNumber(getPath(body, valuePath));
      if (num !== null) {
        dataPoints.push({ metricKey, value: num, timestamp: new Date() });
      }
    }

    return {
      dataPoints,
      events: [
        {
          kind,
          externalId: body?.id ? String(body.id) : undefined,
          title,
          occurredAt: new Date(),
          data: typeof body === "object" && body ? body : { value: body },
        },
      ],
      message: `Received ${kind} webhook.`,
    };
  },
};
