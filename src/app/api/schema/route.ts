import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Returns the record kinds and their fields available for a given source, used
// to drive the metric builder's dropdowns (like Zapier showing available data).
export async function GET(req: NextRequest) {
  const integrationId = req.nextUrl.searchParams.get("integrationId") || undefined;
  const records = await prisma.eventRecord.findMany({
    where: integrationId ? { integrationId } : {},
    select: { kind: true, data: true },
    orderBy: { occurredAt: "desc" },
    take: 800,
  });

  const kinds = new Set<string>();
  const fieldsByKind: Record<string, Set<string>> = {};
  for (const r of records) {
    kinds.add(r.kind);
    const set = (fieldsByKind[r.kind] ??= new Set());
    for (const key of Object.keys((r.data as Record<string, any>) ?? {})) {
      if (!key.startsWith("_")) set.add(key);
    }
  }

  return NextResponse.json({
    kinds: Array.from(kinds).sort(),
    fieldsByKind: Object.fromEntries(
      Object.entries(fieldsByKind).map(([k, v]) => [k, Array.from(v).sort()]),
    ),
  });
}
