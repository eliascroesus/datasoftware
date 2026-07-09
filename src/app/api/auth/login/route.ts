import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  authEnabled,
  checkPassword,
  createSession,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!authEnabled()) {
    return NextResponse.json(
      { error: "Login is not enabled (no AUTH_PASSWORD set)." },
      { status: 400 },
    );
  }

  let password = "";
  try {
    const body = await req.json();
    password = String(body.password ?? "");
  } catch {
    /* ignore */
  }

  if (!checkPassword(password)) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const token = await createSession();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
