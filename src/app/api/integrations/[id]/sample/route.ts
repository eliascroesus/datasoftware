import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Latest few records pulled for a source — shown in the connect modal so you can
// see real data flowing in before you build metrics from it (Zapier "test" step).
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const records = await prisma.eventRecord.findMany({
    where: { integrationId: params.id },
    orderBy: { occurredAt: "desc" },
    take: 5,
    select: { id: true, kind: true, title: true, data: true, occurredAt: true },
  });
  return NextResponse.json({ records });
}
