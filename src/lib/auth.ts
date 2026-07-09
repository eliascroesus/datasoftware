// Lightweight single-tenant auth: a signed, HttpOnly session cookie protected by
// a shared password. Uses the Web Crypto API only (no Node built-ins) so it runs
// in both the Edge middleware and Node route handlers.

export const SESSION_COOKIE = "unived_session";
const encoder = new TextEncoder();

function getSecret(): string {
  return (
    process.env.AUTH_SECRET ||
    process.env.CREDENTIALS_SECRET ||
    "unived-insecure-dev-secret-change-me"
  );
}

// Login is enforced only when a password is configured. Without it the app is
// open (and shows a warning banner) so first-run setup isn't a lock-out.
export function authEnabled(): boolean {
  return !!process.env.AUTH_PASSWORD;
}

function bytesToB64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlToBytes(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function sign(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return bytesToB64url(new Uint8Array(sig));
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSession(sub = "admin", days = 30): Promise<string> {
  const payload = { sub, iat: Date.now(), exp: Date.now() + days * 86400000 };
  const body = bytesToB64url(encoder.encode(JSON.stringify(payload)));
  const sig = await sign(body);
  return `${body}.${sig}`;
}

export async function verifySession(token?: string | null): Promise<boolean> {
  if (!token) return false;
  const [body, sig] = token.split(".");
  if (!body || !sig) return false;
  const expected = await sign(body);
  if (!safeEqual(sig, expected)) return false;
  try {
    const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(body)));
    return typeof payload.exp === "number" && payload.exp > Date.now();
  } catch {
    return false;
  }
}

// Constant-time-ish password check.
export function checkPassword(input: string): boolean {
  const expected = process.env.AUTH_PASSWORD ?? "";
  if (!expected) return false;
  return safeEqual(input, expected);
}
