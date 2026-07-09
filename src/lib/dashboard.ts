import { prisma } from "./db";
import { computeMetrics, type ComputedMetric } from "./metrics";
import { publicIntegration } from "./integrations";
import type { Integration } from "@prisma/client";

export interface SummaryData {
  integrations: ReturnType<typeof publicIntegration>[];
  rawIntegrations: Integration[];
  metrics: ComputedMetric[];
  byIntegration: Record<string, ComputedMetric[]>;
  totals: {
    sources: number;
    connected: number;
    records: number;
    eventsToday: number;
    dataPoints: number;
    lastSyncedAt: Date | null;
  };
}

export async function getSummary(days = 14): Promise<SummaryData> {
  const [integrations, defs, records, dataPoints] = await Promise.all([
    prisma.integration.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.metricDefinition.findMany({
      where: { pinned: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.eventRecord.count(),
    prisma.dataPoint.count(),
  ]);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const eventsToday = await prisma.eventRecord.count({
    where: { occurredAt: { gte: startOfToday } },
  });

  const metrics = await computeMetrics(defs, { days });

  const byIntegration: Record<string, ComputedMetric[]> = {};
  for (const m of metrics) {
    const key = m.integrationId ?? "global";
    (byIntegration[key] ??= []).push(m);
  }

  const lastSyncedAt = integrations
    .map((i) => i.lastSyncedAt)
    .filter(Boolean)
    .sort((a, b) => (b as Date).getTime() - (a as Date).getTime())[0] as
    | Date
    | undefined;

  return {
    integrations: integrations.map(publicIntegration),
    rawIntegrations: integrations,
    metrics,
    byIntegration,
    totals: {
      sources: integrations.length,
      connected: integrations.filter((i) => i.status === "CONNECTED").length,
      records,
      eventsToday,
      dataPoints,
      lastSyncedAt: lastSyncedAt ?? null,
    },
  };
}
