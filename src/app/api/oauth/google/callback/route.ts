import { NextRequest, NextResponse } from "next/server";
import { exchangeCode, verifyState } from "@/lib/google";
import { setIntegrationCredentials } from "@/lib/integrations";
import { prisma } from "@/lib/db";
import { getAppUrl } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const base = getAppUrl();
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${base}/integrations?error=${encodeURIComponent(error)}`);
  }

  const parsed = state ? verifyState(state) : null;
  if (!code || !parsed?.integrationId) {
    return NextResponse.redirect(`${base}/integrations?error=invalid_state`);
  }
  const integrationId = parsed.integrationId as string;

  try {
    const tokens = await exchangeCode(code);
    if (tokens.refresh_token) {
      await setIntegrationCredentials(integrationId, {
        google_oauth: {
          refresh_token: tokens.refresh_token,
          scope: tokens.scope,
          obtained_at: new Date().toISOString(),
        },
      });
    }
    await prisma.integration.update({
      where: { id: integrationId },
      data: { status: "CONNECTED", lastError: null },
    });
    return NextResponse.redirect(
      `${base}/integrations?connect=google_sheets&id=${integrationId}&google=connected`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "oauth_failed";
    await prisma.integration
      .update({ where: { id: integrationId }, data: { lastError: message } })
      .catch(() => {});
    return NextResponse.redirect(
      `${base}/integrations?connect=google_sheets&id=${integrationId}&error=${encodeURIComponent(message)}`,
    );
  }
}
