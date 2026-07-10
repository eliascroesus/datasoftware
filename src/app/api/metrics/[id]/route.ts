import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = await req.json();
    const data: Record<string, any> = {};
    for (const key of [
      "label",
      "aggregation",
      "recordKind",
      "valueField",
      "ratioField",
      "unit",
      "format",
      "color",
      "goal",
      "goalPeriod",
      "belowColor",
      "pinned",
      "sortOrder",
      "integrationId",
    ]) {
      if (key in body) data[key] = body[key];
    }
    if ("filters" in body) data.filters = body.filters;
    const updated = await prisma.metricDefinition.update({
      where: { id: params.id },
      data,
    });
    return NextResponse.json({ metric: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await prisma.metricDefinition.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
