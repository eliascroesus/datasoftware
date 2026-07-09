import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public health check for uptime monitors. Reports DB connectivity.
export async function GET() {
  let db = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = true;
  } catch {
    db = false;
  }
  return NextResponse.json(
    { ok: db, db, time: new Date().toISOString() },
    { status: db ? 200 : 503 },
  );
}
