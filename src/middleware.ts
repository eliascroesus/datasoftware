import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, authEnabled } from "@/lib/auth";

// Paths that must remain reachable without a session:
// - the login page + auth endpoints
// - inbound webhooks (protected by an unguessable per-source token)
// - the cron endpoint (protected by CRON_SECRET)
// - the health check
const PUBLIC_PREFIXES = [
  "/login",
  "/privacy",
  "/terms",
  "/api/auth",
  "/api/webhooks",
  "/api/cron",
  "/api/health",
];

export async function middleware(req: NextRequest) {
  if (!authEnabled()) return NextResponse.next();

  const { pathname } = req.nextUrl;
  // Public marketing homepage (exact match) — the app lives at /dashboard.
  if (pathname === "/") return NextResponse.next();
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (await verifySession(token)) return NextResponse.next();

  if (pathname.startsWith("/api")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|.*\\.png$).*)"],
};
