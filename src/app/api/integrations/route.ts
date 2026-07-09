import { NextRequest, NextResponse } from "next/server";
import {
  listIntegrations,
  createIntegration,
  verifyIntegration,
  publicIntegration,
} from "@/lib/integrations";
import { runSync } from "@/lib/sync";
import { getConnector } from "@/lib/connectors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const integrations = await listIntegrations();
  return NextResponse.json({ integrations: integrations.map(publicIntegration) });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.provider || !getConnector(body.provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    const integration = await createIntegration({
      provider: body.provider,
      name: body.name,
      credentials: body.credentials ?? {},
      config: body.config ?? {},
    });

    // Best-effort verify + initial sync so the dashboard fills immediately.
    const verify = await verifyIntegration(integration.id);
    let syncMessage: string | undefined;
    const connector = getConnector(integration.provider);
    if (verify.ok && connector?.supportsSync) {
      const sync = await runSync(integration.id);
      syncMessage = sync.message;
    }

    const fresh = await (await import("@/lib/integrations")).getIntegration(
      integration.id,
    );
    return NextResponse.json({
      integration: fresh ? publicIntegration(fresh) : null,
      verify,
      syncMessage,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
