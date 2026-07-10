import crypto from "node:crypto";
import { getAppUrl } from "./config";

// Google OAuth + Drive/Sheets helpers powering the "sign in with Google →
// pick a spreadsheet → tab → columns" flow (Zapier-style). Requires a Google
// Cloud OAuth client (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET). Falls back to
// service-account / API-key auth when OAuth isn't configured.

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE_FILES = "https://www.googleapis.com/drive/v3/files";
const SHEETS_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/drive.metadata.readonly",
  "https://www.googleapis.com/auth/spreadsheets.readonly",
].join(" ");

export function googleOAuthConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function googleRedirectUri(): string {
  return `${getAppUrl().replace(/\/$/, "")}/api/oauth/google/callback`;
}

// --- signed state (CSRF + carries the integration id) ---
function stateSecret(): string {
  return process.env.AUTH_SECRET || process.env.CREDENTIALS_SECRET || "unived-state";
}
export function signState(payload: Record<string, unknown>): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", stateSecret())
    .update(body)
    .digest("base64url");
  return `${body}.${sig}`;
}
export function verifyState(state: string): Record<string, any> | null {
  const [body, sig] = (state || "").split(".");
  if (!body || !sig) return null;
  const expected = crypto
    .createHmac("sha256", stateSecret())
    .update(body)
    .digest("base64url");
  if (
    sig.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  ) {
    return null;
  }
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: GOOGLE_SCOPES,
    access_type: "offline",
    include_granted_scopes: "true",
    // Always show the account chooser so users can connect a different account.
    prompt: "select_account consent",
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export async function exchangeCode(code: string): Promise<{
  refresh_token?: string;
  access_token: string;
  expires_in: number;
  scope: string;
}> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: googleRedirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    throw new Error(`Google token exchange failed: ${(await res.text()).slice(0, 300)}`);
  }
  return res.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    throw new Error(`Google token refresh failed: ${(await res.text()).slice(0, 300)}`);
  }
  const json = await res.json();
  if (!json.access_token) throw new Error("No access_token from Google refresh.");
  return json.access_token as string;
}

async function googleGet<T = any>(url: string, token: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Google API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  return res.json();
}

export async function listSpreadsheets(
  token: string,
  query = "",
): Promise<{ id: string; name: string }[]> {
  const q =
    "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false" +
    (query ? ` and name contains '${query.replace(/'/g, "\\'")}'` : "");
  const url =
    `${DRIVE_FILES}?` +
    new URLSearchParams({
      q,
      fields: "files(id,name)",
      orderBy: "modifiedTime desc",
      pageSize: "50",
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
    });
  const data = await googleGet<{ files: { id: string; name: string }[] }>(url, token);
  return data.files ?? [];
}

export async function listTabs(
  token: string,
  spreadsheetId: string,
): Promise<{ title: string; rows: number; columns: number }[]> {
  const url = `${SHEETS_BASE}/${encodeURIComponent(spreadsheetId)}?fields=sheets.properties(title,gridProperties)`;
  const data = await googleGet<any>(url, token);
  return (data.sheets ?? []).map((s: any) => ({
    title: s.properties.title,
    rows: s.properties.gridProperties?.rowCount ?? 0,
    columns: s.properties.gridProperties?.columnCount ?? 0,
  }));
}

export async function getHeaderColumns(
  token: string,
  spreadsheetId: string,
  tab: string,
): Promise<string[]> {
  const range = `${tab}!1:1`;
  const url = `${SHEETS_BASE}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}`;
  const data = await googleGet<any>(url, token);
  const row: string[] = data.values?.[0] ?? [];
  return row.map((c, i) => (c?.trim() ? c.trim() : `Column ${i + 1}`));
}
