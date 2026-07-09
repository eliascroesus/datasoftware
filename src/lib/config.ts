// Server-side runtime config helpers.

export function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function isConfigured(): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!process.env.DATABASE_URL) missing.push("DATABASE_URL");
  if (!process.env.CREDENTIALS_SECRET) missing.push("CREDENTIALS_SECRET");
  return { ok: missing.length === 0, missing };
}
