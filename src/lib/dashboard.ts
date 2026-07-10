import { prisma } from "./db";
import {
  computeMetrics,
  resolveRange,
  type ComputedMetric,
  type RangeKey,
} from "./metrics";
import { publicIntegration } from "./integrations";
import type { Integration } from "@prisma/client";

export interface SummaryData {
  integrations: ReturnType<typeof publicIntegration>[];
  rawIntegrations: Integration[];
  metrics: ComputedMetric[];
  byIntegration: Record<string, ComputedMetric[]>;
  perIntegration: Record<string, { records: number; eventsToday: number }>;
  eventsByDay: number[];
  totals: {
    sources: number;
    connected: number;
    syncing: number;
    records: number;
    eventsToday: number;
    dataPoints: number;
    lastSyncedAt: Date | null;
  };
}

export async function getSummary(
  range: RangeKey = "30d",
): Promise<SummaryData> {
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
  const fourteenAgo = new Date();
  fourteenAgo.setDate(fourteenAgo.getDate() - 13);
  fourteenAgo.setHours(0, 0, 0, 0);

  const [eventsToday, recordsByInt, todayByInt, recentEvents] = await Promise.all([
    prisma.eventRecord.count({ where: { occurredAt: { gte: startOfToday } } }),
    prisma.eventRecord.groupBy({ by: ["integrationId"], _count: { _all: true } }),
    prisma.eventRecord.groupBy({
      by: ["integrationId"],
      where: { occurredAt: { gte: startOfToday } },
      _count: { _all: true },
    }),
    prisma.eventRecord.findMany({
      where: { occurredAt: { gte: fourteenAgo } },
      select: { occurredAt: true },
      take: 20000,
    }),
  ]);

  const perIntegration: Record<string, { records: number; eventsToday: number }> = {};
  for (const r of recordsByInt) {
    perIntegration[r.integrationId] = {
      records: r._count._all,
      eventsToday: 0,
    };
  }
  for (const r of todayByInt) {
    (perIntegration[r.integrationId] ??= { records: 0, eventsToday: 0 }).eventsToday =
      r._count._all;
  }

  // Events per day for the last 14 days (for the stat-card bar chart).
  const eventsByDay = new Array(14).fill(0);
  for (const e of recentEvents) {
    const diff = Math.floor(
      (e.occurredAt.getTime() - fourteenAgo.getTime()) / 86400000,
    );
    if (diff >= 0 && diff < 14) eventsByDay[diff]++;
  }

  const metrics = await computeMetrics(defs, resolveRange(range));

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
    perIntegration,
    eventsByDay,
    totals: {
      sources: integrations.length,
      connected: integrations.filter((i) => i.status === "CONNECTED").length,
      syncing: integrations.filter((i) => i.status === "SYNCING").length,
      records,
      eventsToday,
      dataPoints,
      lastSyncedAt: lastSyncedAt ?? null,
    },
  };
}
