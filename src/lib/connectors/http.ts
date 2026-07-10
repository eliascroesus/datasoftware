// Thin fetch wrapper used by connectors. Adds a timeout, JSON parsing, and
// clear error messages that surface back to the integrations UI.

export class ConnectorHttpError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string, message?: string) {
    super(message ?? `Request failed with status ${status}`);
    this.name = "ConnectorHttpError";
    this.status = status;
    this.body = body;
  }
}

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  query?: Record<string, string | number | undefined | null>;
  timeoutMs?: number;
}

export async function apiFetch<T = any>(
  url: string,
  opts: RequestOptions = {},
): Promise<T> {
  const { method = "GET", headers = {}, body, query, timeoutMs = 20000 } = opts;

  const finalUrl = new URL(url);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== "") {
        finalUrl.searchParams.set(k, String(v));
      }
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(finalUrl.toString(), {
      method,
      headers: {
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      cache: "no-store",
    });

    const text = await res.text();
    if (!res.ok) {
      // Surface the provider's error detail so failures are debuggable in the UI.
      let detail = "";
      try {
        const parsed = JSON.parse(text);
        detail =
          parsed.message ||
          parsed.error ||
          parsed.title ||
          parsed.details?.[0]?.message ||
          "";
      } catch {
        detail = text.slice(0, 160);
      }
      throw new ConnectorHttpError(
        res.status,
        text.slice(0, 500),
        `${method} ${finalUrl.pathname} → ${res.status} ${res.statusText}${detail ? ` — ${detail}` : ""}`,
      );
    }
    if (!text) return {} as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  } catch (err) {
    if (err instanceof ConnectorHttpError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Request to ${finalUrl.host} timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export function basicAuthHeader(user: string, pass = ""): string {
  return "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
}

// A rolling window helper: default lookback for syncs (last 30 days).
export function defaultSince(days = 30): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}
