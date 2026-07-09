import { NextRequest, NextResponse } from "next/server";
import { runSync } from "@/lib/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const result = await runSync(params.id);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
