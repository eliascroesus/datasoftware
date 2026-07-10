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
  // Distinct observed values per field — like Zapier suggesting the values it
  // actually saw in your sample data (e.g. Booked → Yes / No).
  const valuesByKind: Record<string, Record<string, Set<string>>> = {};

  for (const r of records) {
    kinds.add(r.kind);
    const set = (fieldsByKind[r.kind] ??= new Set());
    const ex = (examplesByKind[r.kind] ??= {});
    const vals = (valuesByKind[r.kind] ??= {});
    for (const [key, value] of Object.entries((r.data as Record<string, any>) ?? {})) {
      if (key.startsWith("_")) continue;
      set.add(key);
      const str =
        value === null || value === undefined
          ? ""
          : typeof value === "object"
            ? JSON.stringify(value)
            : String(value);
      if (ex[key] === undefined && str !== "") ex[key] = str;
      // Collect a small set of distinct values (skip long/high-cardinality).
      if (str !== "" && str.length <= 40) {
        const vset = (vals[key] ??= new Set());
        if (vset.size < 20) vset.add(str);
      }
    }
  }

  return NextResponse.json({
    kinds: Array.from(kinds).sort(),
    fieldsByKind: Object.fromEntries(
      Object.entries(fieldsByKind).map(([k, v]) => [k, Array.from(v).sort()]),
    ),
    examplesByKind,
    valuesByKind: Object.fromEntries(
      Object.entries(valuesByKind).map(([k, fieldMap]) => [
        k,
        Object.fromEntries(
          Object.entries(fieldMap)
            // Only expose fields with a small, enum-like set of values.
            .filter(([, s]) => s.size > 0 && s.size <= 12)
            .map(([f, s]) => [f, Array.from(s).sort()]),
        ),
      ]),
    ),
  });
}
