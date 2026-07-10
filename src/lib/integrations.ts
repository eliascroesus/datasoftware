import { prisma } from "./db";
import { encryptJSON, decryptJSON } from "./crypto";
import { getConnector } from "./connectors";
import { refreshAccessToken } from "./google";
import type { Integration } from "@prisma/client";

export interface IntegrationInput {
  provider: string;
  name?: string;
  credentials?: Record<string, any>;
  config?: Record<string, any>;
}

export async function listIntegrations(): Promise<Integration[]> {
  return prisma.integration.findMany({ orderBy: { createdAt: "asc" } });
}

export async function getIntegration(id: string): Promise<Integration | null> {
  return prisma.integration.findUnique({ where: { id } });
}

// Create a new integration. Credentials are encrypted at rest.
export async function createIntegration(input: IntegrationInput) {
  const connector = getConnector(input.provider);
  if (!connector) throw new Error(`Unknown provider: ${input.provider}`);

  const integration = await prisma.integration.create({
    data: {
      provider: input.provider,
      name: input.name?.trim() || connector.name,
      credentials: input.credentials
        ? encryptJSON(input.credentials)
        : null,
      config: (input.config ?? {}) as any,
      status: "DISCONNECTED",
    },
  });
  await seedDefaultMetrics(integration);
  return integration;
}

// Update credentials (merged with existing so blank secret fields are kept) and
// config (replaced).
export async function updateIntegration(
  id: string,
  input: { name?: string; credentials?: Record<string, any>; config?: Record<string, any> },
) {
  const existing = await prisma.integration.findUnique({ where: { id } });
  if (!existing) throw new Error("Integration not found");

  let credentialsBlob = existing.credentials;
  if (input.credentials) {
    const current = decryptJSON<Record<string, any>>(existing.credentials) ?? {};
    const merged = { ...current };
    for (const [k, v] of Object.entries(input.credentials)) {
      // Ignore empty strings so a blank field doesn't wipe a stored secret.
      if (v !== "" && v !== undefined && v !== null) merged[k] = v;
    }
    credentialsBlob = encryptJSON(merged);
  }

  return prisma.integration.update({
    where: { id },
    data: {
      name: input.name?.trim() || existing.name,
      credentials: credentialsBlob,
      config: (input.config ?? existing.config) as any,
    },
  });
}

export async function deleteIntegration(id: string) {
  await prisma.integration.delete({ where: { id } });
}

// Merge a patch into the encrypted credentials blob (used by the Google OAuth
// callback to store the refresh token without touching other fields).
export async function setIntegrationCredentials(
  id: string,
  patch: Record<string, any>,
) {
  const existing = await prisma.integration.findUnique({ where: { id } });
  if (!existing) throw new Error("Integration not found");
  const current = decryptJSON<Record<string, any>>(existing.credentials) ?? {};
  const merged = { ...current, ...patch };
  return prisma.integration.update({
    where: { id },
    data: { credentials: encryptJSON(merged) },
  });
}

// Decrypt an integration's Google refresh token and mint a fresh access token.
export async function getGoogleAccessToken(id: string): Promise<string> {
  const integration = await prisma.integration.findUnique({ where: { id } });
  if (!integration) throw new Error("Integration not found");
  const creds = decryptJSON<Record<string, any>>(integration.credentials) ?? {};
  const refreshToken = creds.google_oauth?.refresh_token;
  if (!refreshToken) {
    throw new Error("This integration is not connected to Google. Sign in first.");
  }
  return refreshAccessToken(refreshToken);
}

export function hasGoogleOAuth(integration: Integration): boolean {
  const creds = decryptJSON<Record<string, any>>(integration.credentials) ?? {};
  return !!creds.google_oauth?.refresh_token;
}

// Create MetricDefinition rows from the connector's default metrics. Keys are
// namespaced by integration id so connecting the same tool twice is safe.
export async function seedDefaultMetrics(integration: Integration) {
  const connector = getConnector(integration.provider);
  if (!connector) return;
  const cfg = (integration.config as Record<string, any>) ?? {};
  let order = 0;
  for (const seed of connector.defaultMetrics) {
    const key = `${integration.id}:${seed.key}`;
    // For generic webhooks, the default count metric should track whatever
    // record kind the user configured (config.eventKind), not the placeholder.
    const recordKind =
      integration.provider === "webhook" &&
      cfg.eventKind &&
      seed.recordKind === "webhook_event"
        ? String(cfg.eventKind)
        : seed.recordKind;
    await prisma.metricDefinition.upsert({
      where: { key },
      update: {},
      create: {
        key,
        label: seed.label,
        integrationId: integration.id,
        aggregation: seed.aggregation,
        recordKind,
        valueField: seed.valueField ?? null,
        ratioField: seed.ratioField ?? null,
        filters: (seed.filters ?? []) as any,
        unit: seed.unit ?? "count",
        format: seed.format ?? "number",
        color: seed.color ?? "brand",
        pinned: seed.pinned ?? true,
        sortOrder: order++,
      },
    });
  }
}

// Verify stored credentials against the live API.
export async function verifyIntegration(
  id: string,
): Promise<{ ok: boolean; message: string; accountLabel?: string }> {
  const integration = await prisma.integration.findUnique({ where: { id } });
  if (!integration) return { ok: false, message: "Integration not found" };
  const connector = getConnector(integration.provider);
  if (!connector?.verify) {
    return { ok: true, message: "No verification needed for this connector." };
  }
  try {
    const result = await connector.verify({
      integrationId: integration.id,
      credentials: decryptJSON(integration.credentials) ?? {},
      config: (integration.config as Record<string, any>) ?? {},
      appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "",
    });
    await prisma.integration.update({
      where: { id },
      data: {
        status: result.ok ? "CONNECTED" : "ERROR",
        lastError: result.ok ? null : result.message,
      },
    });
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.integration.update({
      where: { id },
      data: { status: "ERROR", lastError: message },
    });
    return { ok: false, message };
  }
}

// Public-safe view of an integration (credentials stripped, config exposed).
export function publicIntegration(i: Integration) {
  return {
    id: i.id,
    provider: i.provider,
    name: i.name,
    status: i.status,
    config: (i.config ?? {}) as Record<string, any>,
    webhookToken: i.webhookToken,
    hasCredentials: !!i.credentials,
    oauth: { google: hasGoogleOAuth(i) },
    lastSyncedAt: i.lastSyncedAt,
    lastError: i.lastError,
    createdAt: i.createdAt,
  };
}
