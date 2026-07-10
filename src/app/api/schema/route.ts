import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Returns the record kinds, their fields, and one example value per field for a
// given source — this powers the metric builder's dropdowns and the Zapier-style
// "here's the data we pulled, map it" panel.
export async function GET(req: NextRequest) {
  const integrationId = req.nextUrl.searchParams.get("integrationId") || undefined;
  const records = await prisma.eventRecord.findMany({
    where: integrationId ? { integrationId } : {},
    select: { kind: true, data: true, occurredAt: true },
    orderBy: { occurredAt: "desc" },
    take: 800,
  });

  const kinds = new Set<string>();
  const fieldsByKind: Record<string, Set<string>> = {};
  const examplesByKind: Record<string, Record<string, string>> = {};

  for (const r of records) {
    kinds.add(r.kind);
    const set = (fieldsByKind[r.kind] ??= new Set());
    const ex = (examplesByKind[r.kind] ??= {});
    for (const [key, value] of Object.entries((r.data as Record<string, any>) ?? {})) {
      if (key.startsWith("_")) continue;
      set.add(key);
      // Keep the first (most recent) non-empty example per field.
      if (
        ex[key] === undefined &&
        value !== null &&
        value !== undefined &&
        value !== ""
      ) {
        ex[key] =
          typeof value === "object" ? JSON.stringify(value) : String(value);
      }
    }
  }

  return NextResponse.json({
    kinds: Array.from(kinds).sort(),
    fieldsByKind: Object.fromEntries(
      Object.entries(fieldsByKind).map(([k, v]) => [k, Array.from(v).sort()]),
    ),
    examplesByKind,
  });
}
