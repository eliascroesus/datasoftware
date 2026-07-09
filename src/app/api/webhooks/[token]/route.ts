import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ingestWebhook } from "@/lib/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Inbound webhook sink. Every integration has a unique token; POST any JSON
// (or form-encoded) body to /api/webhooks/<token> and the matching connector
// parses it into records.
export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } },
) {
  const integration = await prisma.integration.findUnique({
    where: { webhookToken: params.token },
  });
  if (!integration) {
    return NextResponse.json({ error: "Unknown webhook token" }, { status: 404 });
  }

  let body: any = {};
  const contentType = req.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      body = await req.json();
    } else if (
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data")
    ) {
      const form = await req.formData();
      body = Object.fromEntries(form.entries());
    } else {
      const text = await req.text();
      try {
        body = JSON.parse(text);
      } catch {
        body = { raw: text };
      }
    }
  } catch {
    body = {};
  }

  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => (headers[k] = v));

  const result = await ingestWebhook(integration, body, headers);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

// Allow GET so services that verify a webhook URL with a challenge succeed.
export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } },
) {
  const integration = await prisma.integration.findUnique({
    where: { webhookToken: params.token },
    select: { id: true, name: true, provider: true },
  });
  if (!integration) {
    return NextResponse.json({ error: "Unknown webhook token" }, { status: 404 });
  }
  // Echo a challenge param if present (common webhook verification pattern).
  const challenge = req.nextUrl.searchParams.get("challenge");
  if (challenge) return new NextResponse(challenge, { status: 200 });
  return NextResponse.json({
    ok: true,
    integration: integration.name,
    provider: integration.provider,
    message: "Webhook endpoint is live. Send a POST request here.",
  });
}
