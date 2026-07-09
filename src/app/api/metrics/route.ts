import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const integrationId = req.nextUrl.searchParams.get("integrationId");
  const metrics = await prisma.metricDefinition.findMany({
    where: integrationId ? { integrationId } : {},
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ metrics });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.label) {
      return NextResponse.json({ error: "Label is required" }, { status: 400 });
    }
    const slug = String(body.label)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40);
    const key = body.key || `custom_${slug}_${nanoid(6)}`;

    const created = await prisma.metricDefinition.create({
      data: {
        key,
        label: body.label,
        integrationId: body.integrationId || null,
        aggregation: body.aggregation || "count",
        recordKind: body.recordKind || "sheet_row",
        valueField: body.valueField || null,
        ratioField: body.ratioField || null,
        filters: (body.filters ?? []) as any,
        unit: body.unit || "count",
        format: body.format || "number",
        color: body.color || "brand",
        goal: body.goal ?? null,
        pinned: body.pinned ?? true,
        sortOrder: body.sortOrder ?? 100,
      },
    });
    return NextResponse.json({ metric: created });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create metric";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
