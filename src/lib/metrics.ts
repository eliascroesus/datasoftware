import { prisma } from "./db";
import { getPath, toNumber } from "./connectors/types";
import { pctChange, round } from "./utils";
import type { MetricDefinition } from "@prisma/client";

export interface MetricFilter {
  field: string;
  op: string;
  value?: string;
}

export interface TrendPoint {
  t: string; // ISO date (day)
  v: number;
}

export interface ComputedMetric {
  id: string;
  key: string;
  label: string;
  unit: string;
  format: string;
  color: string;
  goal: number | null;
  pinned: boolean;
  aggregation: string;
  recordKind: string;
  integrationId: string | null;
  value: number;
  previous: number | null;
  change: number | null;
  trend: TrendPoint[];
}

interface RecordLite {
  occurredAt: Date;
  data: Record<string, any>;
}

function fieldValue(record: RecordLite, field: string): unknown {
  if (!field) return undefined;
  if (Object.prototype.hasOwnProperty.call(record.data, field)) {
    return record.data[field];
  }
  return getPath(record.data, field);
}

function passesFilters(record: RecordLite, filters: MetricFilter[]): boolean {
  for (const f of filters) {
    const raw = fieldValue(record, f.field);
    const val = raw == null ? "" : String(raw).trim();
    const target = (f.value ?? "").trim();
    const lc = val.toLowerCase();
    const tlc = target.toLowerCase();
    switch (f.op) {
      case "eq":
        if (lc !== tlc) return false;
        break;
      case "neq":
        if (lc === tlc) return false;
        break;
      case "contains":
        if (!lc.includes(tlc)) return false;
        break;
      case "not_contains":
        if (lc.includes(tlc)) return false;
        break;
      case "empty":
        if (val !== "") return false;
        break;
      case "not_empty":
      case "exists":
        if (val === "") return false;
        break;
      case "in": {
        const opts = tlc.split(",").map((s) => s.trim());
        if (!opts.includes(lc)) return false;
        break;
      }
      case "gt":
      case "lt":
      case "gte":
      case "lte": {
        const a = toNumber(raw);
        const b = toNumber(target);
        if (a === null || b === null) return false;
        if (f.op === "gt" && !(a > b)) return false;
        if (f.op === "lt" && !(a < b)) return false;
        if (f.op === "gte" && !(a >= b)) return false;
        if (f.op === "lte" && !(a <= b)) return false;
        break;
      }
      default:
        break;
    }
  }
  return true;
}

function aggregate(
  records: RecordLite[],
  aggregation: string,
  valueField?: string | null,
): number {
  switch (aggregation) {
    case "count":
      return records.length;
    case "sum": {
      let s = 0;
      for (const r of records) {
        const n = toNumber(fieldValue(r, valueField ?? ""));
        if (n !== null) s += n;
      }
      return round(s, 2);
    }
    case "avg": {
      const nums: number[] = [];
      for (const r of records) {
        const n = toNumber(fieldValue(r, valueField ?? ""));
        if (n !== null) nums.push(n);
      }
      return nums.length ? round(nums.reduce((a, b) => a + b, 0) / nums.length, 2) : 0;
    }
    case "unique": {
      const set = new Set<string>();
      for (const r of records) {
        const v = fieldValue(r, valueField ?? "");
        if (v != null && String(v).trim() !== "") set.add(String(v));
      }
      return set.size;
    }
    default:
      return records.length;
  }
}

function dayWindows(days: number): Date[] {
  const out: Date[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setHours(23, 59, 59, 999);
    d.setDate(d.getDate() - i);
    out.push(d);
  }
  return out;
}

// Compute a single metric definition into a value + trend + change.
export async function computeMetric(
  def: MetricDefinition,
  opts: { days?: number } = {},
): Promise<ComputedMetric> {
  const days = opts.days ?? 14;
  const base = {
    id: def.id,
    key: def.key,
    label: def.label,
    unit: def.unit,
    format: def.format,
    color: def.color,
    goal: def.goal,
    pinned: def.pinned,
    aggregation: def.aggregation,
    recordKind: def.recordKind,
    integrationId: def.integrationId,
  };

  // --- Series metrics: read the latest DataPoint for a metric key. ---
  if (def.recordKind === "series" || def.aggregation === "latest") {
    const metricKey = def.valueField ?? def.key;
    const points = await prisma.dataPoint.findMany({
      where: {
        metricKey,
        ...(def.integrationId ? { integrationId: def.integrationId } : {}),
      },
      orderBy: { timestamp: "asc" },
      take: 2000,
    });
    const windows = dayWindows(days);
    const trend: TrendPoint[] = windows.map((end) => {
      let last = 0;
      for (const p of points) {
        if (p.timestamp.getTime() <= end.getTime()) last = p.value;
        else break;
      }
      return { t: end.toISOString().slice(0, 10), v: round(last, 2) };
    });
    const value = points.length ? points[points.length - 1].value : 0;
    const previous = trend.length ? trend[0].v : null;
    return {
      ...base,
      value: round(value, 2),
      previous,
      change: previous !== null ? pctChange(value, previous) : null,
      trend,
    };
  }

  // --- Record metrics: aggregate EventRecords with filters. ---
  const filters = (def.filters as unknown as MetricFilter[]) ?? [];
  const records = await prisma.eventRecord.findMany({
    where: {
      kind: def.recordKind,
      ...(def.integrationId ? { integrationId: def.integrationId } : {}),
    },
    select: { occurredAt: true, data: true },
    orderBy: { occurredAt: "asc" },
    take: 20000,
  });
  const lite = records.map((r) => ({
    occurredAt: r.occurredAt,
    data: (r.data as Record<string, any>) ?? {},
  }));

  const matching = lite.filter((r) => passesFilters(r, filters));

  let value: number;
  const windows = dayWindows(days);
  let trend: TrendPoint[];

  if (def.aggregation === "ratio") {
    // ratio = matching / denominator * 100
    const denom = def.ratioField
      ? lite.filter((r) => toNumber(fieldValue(r, def.ratioField!)) !== null)
      : lite;
    value = denom.length ? round((matching.length / denom.length) * 100, 1) : 0;
    trend = windows.map((end) => {
      const m = matching.filter((r) => r.occurredAt.getTime() <= end.getTime()).length;
      const d = denom.filter((r) => r.occurredAt.getTime() <= end.getTime()).length;
      return { t: end.toISOString().slice(0, 10), v: d ? round((m / d) * 100, 1) : 0 };
    });
  } else {
    value = aggregate(matching, def.aggregation, def.valueField);
    trend = windows.map((end) => {
      const subset = matching.filter((r) => r.occurredAt.getTime() <= end.getTime());
      return {
        t: end.toISOString().slice(0, 10),
        v: aggregate(subset, def.aggregation, def.valueField),
      };
    });
  }

  const previous = trend.length ? trend[0].v : null;
  return {
    ...base,
    value: round(value, 2),
    previous,
    change: previous !== null ? pctChange(value, previous) : null,
    trend,
  };
}

export async function computeMetrics(
  defs: MetricDefinition[],
  opts: { days?: number } = {},
): Promise<ComputedMetric[]> {
  return Promise.all(defs.map((d) => computeMetric(d, opts)));
}

// Distinct field/column names seen across a record kind — used to power the
// metric builder's field dropdown.
export async function fieldsForKind(
  recordKind: string,
  integrationId?: string,
): Promise<string[]> {
  const records = await prisma.eventRecord.findMany({
    where: { kind: recordKind, ...(integrationId ? { integrationId } : {}) },
    select: { data: true },
    take: 200,
    orderBy: { occurredAt: "desc" },
  });
  const fields = new Set<string>();
  for (const r of records) {
    const data = (r.data as Record<string, any>) ?? {};
    for (const key of Object.keys(data)) {
      if (!key.startsWith("_")) fields.add(key);
    }
  }
  return Array.from(fields).sort();
}
