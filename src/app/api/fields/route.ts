import { NextRequest, NextResponse } from "next/server";
import { fieldsForKind } from "@/lib/metrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Distinct field/column names present in stored records of a given kind — used
// by the metric builder to populate its field dropdowns.
export async function GET(req: NextRequest) {
  const kind = req.nextUrl.searchParams.get("kind") ?? "sheet_row";
  const integrationId =
    req.nextUrl.searchParams.get("integrationId") ?? undefined;
  const fields = await fieldsForKind(kind, integrationId);
  return NextResponse.json({ fields });
}
