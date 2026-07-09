import { prisma } from "../src/lib/db";
import { seedDefaultMetrics } from "../src/lib/integrations";

// Deterministic PRNG so the demo dataset is stable across re-seeds.
function rng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
const rand = rng(42);
const pick = <T>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
const daysAgo = (n: number, hour = 12) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, Math.floor(rand() * 59), 0, 0);
  return d;
};

// A gently trending series (start → end) with noise, one point per day.
function series(
  metricKey: string,
  integrationId: string,
  start: number,
  end: number,
  days: number,
  noise: number,
  round = true,
) {
  const pts = [];
  for (let i = 0; i < days; i++) {
    const t = i / (days - 1);
    let v = start + (end - start) * t + (rand() - 0.5) * noise;
    if (v < 0) v = 0;
    pts.push({
      integrationId,
      metricKey,
      value: round ? Math.round(v) : Math.round(v * 10) / 10,
      timestamp: daysAgo(days - 1 - i),
    });
  }
  return pts;
}

async function main() {
  console.log("Clearing existing data…");
  await prisma.dataPoint.deleteMany();
  await prisma.eventRecord.deleteMany();
  await prisma.syncRun.deleteMany();
  await prisma.metricDefinition.deleteMany();
  await prisma.integration.deleteMany();

  const now = new Date();
  const mk = (provider: string, name: string, config: any = {}) =>
    prisma.integration.create({
      data: {
        provider,
        name,
        status: "CONNECTED",
        lastSyncedAt: now,
        config,
      },
    });

  console.log("Creating integrations…");
  const close = await mk("close", "Close CRM");
  const calendly = await mk("calendly", "Calendly");
  const sendblue = await mk("sendblue", "SendBlue");
  const instantly = await mk("instantly", "Instantly");
  const sheets = await mk("google_sheets", "Sales Pipeline Sheet", {
    spreadsheetId: "1AbCdEfGhIjKlMnOpQrStUvWxYz-demo",
    range: "Leads",
    hasHeader: true,
    keyColumn: "Email",
  });
  const webhook = await mk("webhook", "Stripe Webhook", {
    eventKind: "purchase",
    titlePath: "customer.email",
    metricKey: "webhook_revenue",
    valuePath: "amount",
  });

  for (const i of [close, calendly, sendblue, instantly, sheets, webhook]) {
    await seedDefaultMetrics(i);
  }

  const dataPoints: any[] = [];
  const events: any[] = [];

  // --- Close CRM ---
  dataPoints.push(
    ...series("close_leads", close.id, 118, 147, 30, 4),
    ...series("close_opportunities", close.id, 52, 74, 30, 3),
    ...series("close_won", close.id, 21, 38, 30, 2),
    ...series("close_accept_rate", close.id, 44, 52, 30, 3, false),
    ...series("close_pipeline_value", close.id, 21400, 29896, 30, 1400),
  );
  const oppStatuses = ["won", "active", "active", "lost", "active"];
  for (let i = 0; i < 60; i++) {
    const st = oppStatuses[i % oppStatuses.length];
    events.push({
      integrationId: close.id,
      kind: "opportunity",
      externalId: `oppo_${i}`,
      title: `${pick(["Acme", "Globex", "Initech", "Umbrella", "Hooli", "Stark", "Wayne"])} Co — ${pick(["Growth", "Pro", "Scale", "Enterprise"])}`,
      occurredAt: daysAgo(Math.floor(rand() * 30)),
      data: {
        status_type: st,
        status: st === "won" ? "Won" : st === "lost" ? "Lost" : "Active",
        value: Math.round(500 + rand() * 9000),
        lead_name: pick(["Sarah K", "Mike D", "Ana R", "Tom W", "Lisa M"]),
        accepted: st === "won" ? "Yes" : "No",
      },
    });
  }

  // --- Calendly ---
  dataPoints.push(
    ...series("calendly_bookings", calendly.id, 18, 31, 30, 3),
    ...series("calendly_canceled", calendly.id, 3, 6, 30, 1),
    ...series("calendly_booking_rate", calendly.id, 78, 86, 30, 3, false),
  );
  for (let i = 0; i < 42; i++) {
    const active = rand() > 0.18;
    events.push({
      integrationId: calendly.id,
      kind: "booking",
      externalId: `cal_${i}`,
      title: pick(["Discovery Call", "Demo", "Strategy Session", "Onboarding"]),
      occurredAt: daysAgo(Math.floor(rand() * 30)),
      data: {
        status: active ? "active" : "canceled",
        name: pick(["Discovery Call", "Demo", "Strategy Session"]),
        invitees: 1,
        booked: active ? "Yes" : "No",
      },
    });
  }

  // --- SendBlue (webhook-driven; reply rate as series) ---
  dataPoints.push(
    ...series("sendblue_reply_rate", sendblue.id, 29, 38, 21, 3, false),
  );
  for (let i = 0; i < 210; i++) {
    events.push({
      integrationId: sendblue.id,
      kind: "sms",
      externalId: `sb_out_${i}`,
      title: `→ +1${Math.floor(2000000000 + rand() * 7000000000)}`,
      occurredAt: daysAgo(Math.floor(rand() * 21)),
      data: {
        direction: "outbound",
        status: "delivered",
        content: pick([
          "Hey! Following up on your interest.",
          "Are you free for a quick call this week?",
          "Just checking in — any questions?",
        ]),
      },
    });
  }
  for (let i = 0; i < 74; i++) {
    events.push({
      integrationId: sendblue.id,
      kind: "sms",
      externalId: `sb_in_${i}`,
      title: `← +1${Math.floor(2000000000 + rand() * 7000000000)}`,
      occurredAt: daysAgo(Math.floor(rand() * 21)),
      data: {
        direction: "inbound",
        status: "received",
        content: pick(["Yes let's talk!", "Sounds good", "What times work?", "Not right now"]),
      },
    });
  }

  // --- Instantly ---
  dataPoints.push(
    ...series("instantly_sent", instantly.id, 14200, 19986, 30, 500),
    ...series("instantly_reply_rate", instantly.id, 4.2, 6.1, 30, 0.6, false),
    ...series("instantly_open_rate", instantly.id, 38, 47, 30, 3, false),
    ...series("instantly_opportunities", instantly.id, 12, 27, 30, 2),
  );
  const campaigns = [
    "Q3 SaaS Founders",
    "Agency Owners — US",
    "E-com 7-figure",
    "Coaches & Consultants",
    "Local Services",
  ];
  campaigns.forEach((name, i) => {
    const sent = Math.round(2400 + rand() * 2600);
    const opens = Math.round(sent * (0.4 + rand() * 0.1));
    const replies = Math.round(sent * (0.04 + rand() * 0.03));
    events.push({
      integrationId: instantly.id,
      kind: "campaign",
      externalId: `camp_${i}`,
      title: name,
      occurredAt: daysAgo(Math.floor(rand() * 20)),
      data: {
        sent,
        opens,
        replies,
        opportunities: Math.round(replies * 0.4),
        opportunity_value: Math.round(replies * 0.4 * 3200),
      },
    });
  });

  // --- Google Sheets: 128 rows, ~40% booked ---
  dataPoints.push(...series("sheet_total_rows", sheets.id, 96, 128, 30, 2));
  const owners = ["Alex", "Jordan", "Sam", "Taylor"];
  const statuses = ["New", "Contacted", "Qualified", "Closed"];
  for (let i = 0; i < 128; i++) {
    const booked = rand() < 0.41 ? "Yes" : "No";
    events.push({
      integrationId: sheets.id,
      kind: "sheet_row",
      externalId: `lead${i}@demo.com`,
      title: pick(["Jane", "John", "Priya", "Diego", "Mei", "Omar", "Nina"]) + ` ${pick(["Smith", "Lee", "Patel", "Garcia", "Chen"])}`,
      occurredAt: daysAgo(Math.floor(rand() * 30)),
      data: {
        Name: pick(["Jane", "John", "Priya", "Diego", "Mei"]) + " " + pick(["Smith", "Lee", "Patel"]),
        Email: `lead${i}@demo.com`,
        Booked: booked,
        Status: booked === "Yes" ? pick(["Qualified", "Closed"]) : pick(statuses),
        Owner: pick(owners),
        "Deal Value": booked === "Yes" ? Math.round(500 + rand() * 6000) : 0,
      },
    });
  }

  // --- Webhook (Stripe-style purchases) ---
  for (let i = 0; i < 18; i++) {
    const amount = Math.round(49 + rand() * 950);
    dataPoints.push({
      integrationId: webhook.id,
      metricKey: "webhook_revenue",
      value: amount,
      timestamp: daysAgo(Math.floor(rand() * 20)),
    });
    events.push({
      integrationId: webhook.id,
      kind: "purchase",
      externalId: `pi_${i}`,
      title: `purchase — customer${i}@mail.com`,
      occurredAt: daysAgo(Math.floor(rand() * 20)),
      data: { amount, currency: "usd", customer: { email: `customer${i}@mail.com` } },
    });
  }

  console.log(`Inserting ${dataPoints.length} data points…`);
  await prisma.dataPoint.createMany({ data: dataPoints });
  console.log(`Inserting ${events.length} records…`);
  for (let i = 0; i < events.length; i += 200) {
    await prisma.eventRecord.createMany({
      data: events.slice(i, i + 200),
      skipDuplicates: true,
    });
  }

  // --- Custom, configurable metrics (the Zapier-like tracking) ---
  console.log("Creating custom metrics…");
  const custom = [
    {
      key: `${sheets.id}:close_rate`,
      label: "Close rate",
      integrationId: sheets.id,
      aggregation: "ratio",
      recordKind: "sheet_row",
      filters: [{ field: "Booked", op: "eq", value: "Yes" }],
      unit: "percent",
      format: "percent",
      color: "brand",
      sortOrder: 1,
    },
    {
      key: `${sheets.id}:booked`,
      label: "Booked",
      integrationId: sheets.id,
      aggregation: "count",
      recordKind: "sheet_row",
      filters: [{ field: "Booked", op: "eq", value: "Yes" }],
      unit: "count",
      color: "teal",
      sortOrder: 2,
    },
    {
      key: `${sheets.id}:not_booked`,
      label: "Not booked",
      integrationId: sheets.id,
      aggregation: "count",
      recordKind: "sheet_row",
      filters: [{ field: "Booked", op: "eq", value: "No" }],
      unit: "count",
      color: "pink",
      sortOrder: 3,
    },
    {
      key: `${sheets.id}:pipeline_value`,
      label: "Sheet pipeline value",
      integrationId: sheets.id,
      aggregation: "sum",
      recordKind: "sheet_row",
      valueField: "Deal Value",
      filters: [],
      unit: "currency",
      format: "currency",
      color: "amber",
      sortOrder: 4,
    },
    {
      key: `${webhook.id}:revenue`,
      label: "Webhook revenue",
      integrationId: webhook.id,
      aggregation: "sum",
      recordKind: "purchase",
      valueField: "amount",
      filters: [],
      unit: "currency",
      format: "currency",
      color: "good",
      sortOrder: 1,
    },
  ];
  for (const c of custom) {
    await prisma.metricDefinition.create({
      data: { ...c, filters: c.filters as any, pinned: true },
    });
  }

  // A couple of sync-run rows for history realism.
  for (const i of [close, calendly, instantly, sheets]) {
    await prisma.syncRun.create({
      data: {
        integrationId: i.id,
        status: "SUCCESS",
        recordsPulled: Math.floor(20 + rand() * 100),
        message: "Synced successfully",
        finishedAt: now,
      },
    });
  }

  console.log("✅ Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
