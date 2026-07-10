import { NextRequest, NextResponse } from "next/server";
import { googleOAuthConfigured, buildAuthUrl, signState } from "@/lib/google";
import { getAppUrl } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Kicks off the Google sign-in flow for a given integration.
export async function GET(req: NextRequest) {
  const integrationId = req.nextUrl.searchParams.get("integrationId");
  const base = getAppUrl();
  if (!integrationId) {
    return NextResponse.redirect(`${base}/integrations?error=missing_integration`);
  }
  if (!googleOAuthConfigured()) {
    return NextResponse.redirect(`${base}/integrations?error=google_not_configured`);
  }
  const state = signState({ integrationId, t: Date.now() });
  return NextResponse.redirect(buildAuthUrl(state));
}
