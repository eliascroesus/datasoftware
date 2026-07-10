import { apiFetch, defaultSince } from "./http";
import type { Connector, ConnectorContext, SyncResult, VerifyResult } from "./types";

const BASE = "https://api.calendly.com";

function auth(ctx: ConnectorContext) {
  const token = ctx.credentials.token as string;
  if (!token) throw new Error("Calendly access token is missing.");
  return { Authorization: `Bearer ${token}` };
}

export const calendlyConnector: Connector = {
  provider: "calendly",
  name: "Calendly",
  description:
    "Track bookings, cancellations, show/booking rate and event volume from Calendly.",
  category: "Scheduling",
  color: "#2dd4bf",
  docsUrl: "https://developer.calendly.com/",
  supportsWebhook: true,
  supportsSync: true,
  credentialFields: [
    {
      key: "token",
      label: "Personal Access Token",
      type: "password",
      required: true,
      secret: true,
      placeholder: "eyJ...",
      help: "Calendly → Integrations → API & Webhooks → Personal access tokens.",
    },
  ],
  configFields: [],
  defaultMetrics: [
    { key: "calendly_bookings", label: "Bookings", aggregation: "latest", recordKind: "series", valueField: "calendly_bookings", unit: "count", color: "teal" },
    { key: "calendly_canceled", label: "Cancellations", aggregation: "latest", recordKind: "series", valueField: "calendly_canceled", unit: "count", color: "pink" },
    { key: "calendly_booking_rate", label: "Active booking rate", aggregation: "latest", recordKind: "series", valueField: "calendly_booking_rate", unit: "percent", color: "brand" },
  ],

  async verify(ctx): Promise<VerifyResult> {
    const me = await apiFetch<any>(`${BASE}/users/me`, { headers: auth(ctx) });
    const name = me?.resource?.name ?? "Calendly user";
    return { ok: true, message: "Connected to Calendly.", accountLabel: name };
  },

  async sync(ctx): Promise<SyncResult> {
    const headers = auth(ctx);
    const me = await apiFetch<any>(`${BASE}/users/me`, { headers });
    const userUri: string = me?.resource?.uri;
    if (!userUri) throw new Error("Could not resolve your Calendly user.");

    // Bound the window so we capture recent + upcoming bookings.
    const minStart = defaultSince(90).toISOString();
    const maxStart = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

    const events: any[] = [];
    let pageToken: string | undefined;
    for (let page = 0; page < 5; page++) {
      // Scope by `user` (always available on a personal token) rather than
      // `organization`, which can be undefined and trigger a 400.
      const res = await apiFetch<any>(`${BASE}/scheduled_events`, {
        headers,
        query: {
          user: userUri,
          count: 100,
          sort: "start_time:desc",
          min_start_time: minStart,
          max_start_time: maxStart,
          page_token: pageToken,
        },
      });
      const collection: any[] = res?.collection ?? [];
      events.push(...collection);
      pageToken = res?.pagination?.next_page_token;
      if (!pageToken) break;
    }

    const active = events.filter((e) => e.status === "active");
    const canceled = events.filter((e) => e.status === "canceled");
    const bookingRate = events.length ? (active.length / events.length) * 100 : 0;

    const now = new Date();
    const dataPoints = [
      { metricKey: "calendly_bookings", value: active.length, timestamp: now },
      { metricKey: "calendly_canceled", value: canceled.length, timestamp: now },
      {
        metricKey: "calendly_booking_rate",
        value: Math.round(bookingRate * 10) / 10,
        timestamp: now,
      },
    ];

    const eventRecords = events.slice(0, 250).map((e) => ({
      kind: "booking",
      externalId: e.uri as string,
      title: (e.name as string) ?? "Booking",
      occurredAt: e.start_time ? new Date(e.start_time) : now,
      data: {
        status: e.status,
        name: e.name,
        start_time: e.start_time,
        end_time: e.end_time,
        location: e.location?.type,
        invitees: e.invitees_counter?.active ?? 0,
        booked: e.status === "active" ? "Yes" : "No",
      },
    }));

    return {
      dataPoints,
      events: eventRecords,
      message: `Synced ${events.length} events — ${active.length} active, ${canceled.length} canceled.`,
    };
  },

  async handleWebhook(body, _headers, _ctx): Promise<SyncResult> {
    // Calendly webhook: { event: "invitee.created" | "invitee.canceled", payload }
    const evt = body?.event as string;
    const payload = body?.payload ?? {};
    const canceled = evt?.includes("canceled");
    return {
      dataPoints: [],
      events: [
        {
          kind: "booking",
          externalId: payload.uri ?? payload.event ?? undefined,
          title: payload.name ?? payload.event_type?.name ?? "Calendly booking",
          occurredAt: new Date(payload.created_at ?? Date.now()),
          data: {
            status: canceled ? "canceled" : "active",
            invitee_email: payload.email,
            invitee_name: payload.name,
            booked: canceled ? "No" : "Yes",
            event: evt,
          },
        },
      ],
      message: `Calendly webhook: ${evt}`,
    };
  },
};
