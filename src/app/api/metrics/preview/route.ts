import { NextRequest, NextResponse } from "next/server";
import { computeMetric } from "@/lib/metrics";
import type { MetricDefinition } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Compute a metric definition without saving it — powers the builder's live
// preview card.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const def = {
      id: "preview",
      key: "preview",
      label: body.label || "Preview",
      integrationId: body.integrationId || null,
      aggregation: body.aggregation || "count",
      recordKind: body.recordKind || "sheet_row",
      valueField: body.valueField || null,
      ratioField: body.ratioField || null,
      filters: body.filters ?? [],
      unit: body.unit || "count",
      format: body.format || "number",
      color: body.color || "brand",
      goal: body.goal ?? null,
      pinned: true,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as MetricDefinition;

    const computed = await computeMetric(def, { days: 14 });
    return NextResponse.json({ metric: computed });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Preview failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
