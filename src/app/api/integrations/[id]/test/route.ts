import { NextRequest, NextResponse } from "next/server";
import { verifyIntegration } from "@/lib/integrations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const result = await verifyIntegration(params.id);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
