import { NextRequest, NextResponse } from "next/server";
import {
  getIntegration,
  updateIntegration,
  deleteIntegration,
  publicIntegration,
} from "@/lib/integrations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const integration = await getIntegration(params.id);
  if (!integration)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ integration: publicIntegration(integration) });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = await req.json();
    const updated = await updateIntegration(params.id, {
      name: body.name,
      credentials: body.credentials,
      config: body.config,
    });
    return NextResponse.json({ integration: publicIntegration(updated) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await deleteIntegration(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
