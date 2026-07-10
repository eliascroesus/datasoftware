import crypto from "node:crypto";
import { apiFetch } from "./http";
import { refreshAccessToken } from "../google";
import type { Connector, ConnectorContext, SyncResult, VerifyResult } from "./types";

const SHEETS_BASE = "https://sheets.googleapis.com/v4/spreadsheets";
const SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";

interface ServiceAccount {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

function parseServiceAccount(raw: unknown): ServiceAccount | null {
  if (!raw) return null;
  try {
    const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (obj?.client_email && obj?.private_key) return obj as ServiceAccount;
    return null;
  } catch {
    return null;
  }
}

// Exchange a service-account JWT for a short-lived OAuth access token.
async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const tokenUri = sa.token_uri || "https://oauth2.googleapis.com/token";
  const header = Buffer.from(
    JSON.stringify({ alg: "RS256", typ: "JWT" }),
  ).toString("base64url");
  const claims = Buffer.from(
    JSON.stringify({
      iss: sa.client_email,
      scope: SCOPE,
      aud: tokenUri,
      exp: now + 3600,
      iat: now,
    }),
  ).toString("base64url");
  const signingInput = `${header}.${claims}`;
  const signature = crypto
    .sign("RSA-SHA256", Buffer.from(signingInput), sa.private_key)
    .toString("base64url");
  const assertion = `${signingInput}.${signature}`;

  const res = await fetch(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) {
    throw new Error(
      `Google token exchange failed (${res.status}): ${(await res.text()).slice(0, 200)}`,
    );
  }
  const json: any = await res.json();
  if (!json.access_token) throw new Error("No access_token returned by Google.");
  return json.access_token as string;
}

async function readValues(ctx: ConnectorContext): Promise<string[][]> {
  const spreadsheetId = ctx.config.spreadsheetId as string;
  const range = (ctx.config.range as string) || "Sheet1";
  if (!spreadsheetId) throw new Error("Spreadsheet ID is required.");

  const url = `${SHEETS_BASE}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}`;

  // Preferred: OAuth (user signed in with Google).
  const refreshToken = ctx.credentials.google_oauth?.refresh_token;
  if (refreshToken) {
    const token = await refreshAccessToken(refreshToken);
    const res = await apiFetch<any>(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res?.values ?? [];
  }

  const sa = parseServiceAccount(ctx.credentials.serviceAccountJson);
  if (sa) {
    const token = await getAccessToken(sa);
    const res = await apiFetch<any>(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res?.values ?? [];
  }

  const apiKey = ctx.credentials.apiKey as string;
  if (!apiKey) {
    throw new Error(
      "Provide either a service account JSON (private sheets) or an API key (public sheets).",
    );
  }
  const res = await apiFetch<any>(url, { query: { key: apiKey } });
  return res?.values ?? [];
}

function rowsToObjects(
  values: string[][],
  hasHeader: boolean,
): { headers: string[]; rows: Record<string, string>[] } {
  if (values.length === 0) return { headers: [], rows: [] };
  let headers: string[];
  let dataRows: string[][];
  if (hasHeader) {
    headers = values[0].map((h, i) => (h?.trim() ? h.trim() : `Column ${i + 1}`));
    dataRows = values.slice(1);
  } else {
    const width = Math.max(...values.map((r) => r.length));
    headers = Array.from({ length: width }, (_, i) => `Column ${i + 1}`);
    dataRows = values;
  }
  const rows = dataRows.map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = r[i] ?? "";
    });
    return obj;
  });
  return { headers, rows };
}

export const googleSheetsConnector: Connector = {
  provider: "google_sheets",
  name: "Google Sheets",
  description:
    "Pull rows from any spreadsheet and build custom metrics from specific columns (e.g. booked vs not-booked).",
  category: "Spreadsheets",
  color: "#34d399",
  docsUrl: "https://developers.google.com/sheets/api",
  supportsWebhook: true,
  supportsSync: true,
  credentialFields: [
    {
      key: "serviceAccountJson",
      label: "Service Account JSON",
      type: "textarea",
      secret: true,
      help: "For private sheets: paste the full JSON key of a Google service account, then share the sheet with its client_email.",
    },
    {
      key: "apiKey",
      label: "API Key (public sheets only)",
      type: "password",
      secret: true,
      help: "Alternative for sheets shared as 'anyone with the link'. Not needed if using a service account.",
    },
  ],
  configFields: [
    {
      key: "spreadsheetId",
      label: "Spreadsheet ID",
      type: "text",
      required: true,
      placeholder: "1AbC...the long id from the sheet URL",
      help: "The ID between /d/ and /edit in the spreadsheet URL.",
    },
    {
      key: "range",
      label: "Range / Tab",
      type: "text",
      defaultValue: "Sheet1",
      help: "A tab name (e.g. 'Leads') or A1 range (e.g. 'Leads!A1:Z5000').",
    },
    {
      key: "hasHeader",
      label: "First row is a header",
      type: "boolean",
      defaultValue: true,
    },
    {
      key: "keyColumn",
      label: "Unique key column",
      type: "text",
      help: "Column used to de-duplicate rows across syncs (e.g. 'Email'). Optional.",
    },
  ],
  defaultMetrics: [
    { key: "sheet_total_rows", label: "Rows", aggregation: "count", recordKind: "sheet_row", unit: "count", color: "teal" },
  ],

  async verify(ctx): Promise<VerifyResult> {
    const values = await readValues(ctx);
    const { headers, rows } = rowsToObjects(
      values,
      ctx.config.hasHeader !== false,
    );
    return {
      ok: true,
      message: `Read ${rows.length} rows. Columns: ${headers.slice(0, 8).join(", ")}${headers.length > 8 ? "…" : ""}`,
      accountLabel: `${rows.length} rows · ${headers.length} columns`,
    };
  },

  async sync(ctx): Promise<SyncResult> {
    const values = await readValues(ctx);
    const hasHeader = ctx.config.hasHeader !== false;
    const keyColumn = ctx.config.keyColumn as string | undefined;
    const { headers, rows } = rowsToObjects(values, hasHeader);

    const now = new Date();
    const events = rows.map((row, i) => {
      const externalId =
        keyColumn && row[keyColumn] ? String(row[keyColumn]) : `row_${i + 1}`;
      const title =
        row[headers[0]] || (keyColumn && row[keyColumn]) || `Row ${i + 1}`;
      return {
        kind: "sheet_row",
        externalId,
        title: String(title),
        occurredAt: now,
        data: { ...row, _rowIndex: i + 1 },
      };
    });

    return {
      dataPoints: [
        { metricKey: "sheet_total_rows", value: rows.length, timestamp: now },
      ],
      events,
      message: `Synced ${rows.length} rows across ${headers.length} columns.`,
    };
  },

  async handleWebhook(body, _headers, ctx): Promise<SyncResult> {
    // Optional: a Google Apps Script onEdit trigger can POST changed rows here.
    // Treat the body as a single row object.
    const row = body?.row ?? body ?? {};
    const keyColumn = ctx.config.keyColumn as string | undefined;
    const externalId =
      keyColumn && row[keyColumn] ? String(row[keyColumn]) : undefined;
    return {
      dataPoints: [],
      events: [
        {
          kind: "sheet_row",
          externalId,
          title: String(row[Object.keys(row)[0]] ?? "Sheet update"),
          occurredAt: new Date(),
          data: row,
        },
      ],
      message: "Google Sheets webhook row upserted.",
    };
  },
};
