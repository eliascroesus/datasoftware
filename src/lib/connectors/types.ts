// Shared contracts every connector implements. A connector knows how to
// authenticate to an external tool, pull data from it on a schedule, and/or
// parse data pushed to it via webhook. Everything it produces is normalised
// into DataPoints (numeric time-series) and EventRecords (row-level records).

export type FieldType =
  | "text"
  | "password"
  | "textarea"
  | "number"
  | "select"
  | "boolean";

export interface ConnectorField {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  help?: string;
  required?: boolean;
  secret?: boolean;
  options?: { label: string; value: string }[];
  defaultValue?: string | number | boolean;
}

export interface DataPointInput {
  metricKey: string;
  value: number;
  timestamp?: Date;
  meta?: Record<string, unknown>;
}

export interface EventRecordInput {
  kind: string;
  externalId?: string;
  title?: string;
  data?: Record<string, unknown>;
  occurredAt?: Date;
}

export interface SyncResult {
  dataPoints: DataPointInput[];
  events: EventRecordInput[];
  message?: string;
  // When true, the events represent the COMPLETE current set for the kinds
  // present, so the orchestrator replaces (deletes + reinserts) prior events of
  // those kinds. Used by spreadsheet syncs so the DB mirrors the sheet exactly.
  replace?: boolean;
}

export interface VerifyResult {
  ok: boolean;
  message: string;
  accountLabel?: string;
}

export interface ConnectorContext {
  integrationId: string;
  credentials: Record<string, any>;
  config: Record<string, any>;
  // Absolute base URL of this deployment (for building webhook URLs, etc.).
  appUrl: string;
}

export interface MetricSeed {
  key: string;
  label: string;
  aggregation: "count" | "sum" | "avg" | "ratio" | "unique" | "latest";
  recordKind: string;
  valueField?: string;
  ratioField?: string;
  filters?: { field: string; op: string; value?: string }[];
  unit?: "count" | "percent" | "currency";
  format?: string;
  color?: string;
  pinned?: boolean;
}

export interface Connector {
  provider: string;
  name: string;
  description: string;
  category: string;
  color: string;
  docsUrl?: string;
  supportsWebhook: boolean;
  supportsSync: boolean;
  credentialFields: ConnectorField[];
  configFields: ConnectorField[];
  defaultMetrics: MetricSeed[];
  // Verify stored credentials are valid.
  verify?(ctx: ConnectorContext): Promise<VerifyResult>;
  // Pull fresh data from the source.
  sync?(ctx: ConnectorContext): Promise<SyncResult>;
  // Parse an inbound webhook body into records/points.
  handleWebhook?(
    body: any,
    headers: Record<string, string>,
    ctx: ConnectorContext,
  ): Promise<SyncResult>;
}

// Small helper: pluck a value out of a nested object by dot-path.
export function getPath(obj: any, path: string): unknown {
  if (!path) return undefined;
  return path
    .split(".")
    .reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const cleaned = String(value).replace(/[$,%\s]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
