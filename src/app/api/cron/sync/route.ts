import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runSync } from "@/lib/sync";
import { getConnector } from "@/lib/connectors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Triggered by Vercel Cron (see vercel.json). Syncs every integration that
// supports scheduled pulls. Protected by CRON_SECRET.
async function handle(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    const provided =
      auth?.replace("Bearer ", "") ??
      req.nextUrl.searchParams.get("secret") ??
      "";
    if (provided !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const integrations = await prisma.integration.findMany();
  const results: { id: string; name: string; ok: boolean; message: string }[] = [];
  for (const integration of integrations) {
    const connector = getConnector(integration.provider);
    if (!connector?.supportsSync) continue;
    if (!integration.credentials) continue;
    const result = await runSync(integration.id);
    results.push({
      id: integration.id,
      name: integration.name,
      ok: result.ok,
      message: result.message,
    });
  }
  return NextResponse.json({ ranAt: new Date().toISOString(), results });
}

export async function GET(req: NextRequest) {
  return handle(req);
}
export async function POST(req: NextRequest) {
  return handle(req);
}
