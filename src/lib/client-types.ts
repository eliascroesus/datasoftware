// Client-safe shared types (no server-only imports).

export interface PublicIntegration {
  id: string;
  provider: string;
  name: string;
  status: string;
  config: Record<string, any>;
  webhookToken: string;
  hasCredentials: boolean;
  oauth?: { google: boolean };
  lastSyncedAt: string | Date | null;
  lastError: string | null;
  createdAt: string | Date;
}

export interface FieldSpec {
  key: string;
  label: string;
  type: "text" | "password" | "textarea" | "number" | "select" | "boolean";
  placeholder?: string;
  help?: string;
  required?: boolean;
  secret?: boolean;
  options?: { label: string; value: string }[];
  defaultValue?: string | number | boolean;
}

export interface ConnectorMetaClient {
  provider: string;
  name: string;
  description: string;
  category: string;
  color: string;
  docsUrl?: string;
  supportsWebhook: boolean;
  supportsSync: boolean;
  credentialFields: FieldSpec[];
  configFields: FieldSpec[];
}

export interface MetricDef {
  id: string;
  key: string;
  label: string;
  integrationId: string | null;
  aggregation: string;
  recordKind: string;
  valueField: string | null;
  ratioField: string | null;
  filters: { field: string; op: string; value?: string }[];
  unit: string;
  format: string;
  color: string;
  goal: number | null;
  goalPeriod: string | null;
  belowColor: string | null;
  pinned: boolean;
  sortOrder: number;
}
