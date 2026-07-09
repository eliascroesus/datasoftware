import { prisma } from "./db";
import { decryptJSON } from "./crypto";
import { getConnector } from "./connectors";
import type {
  ConnectorContext,
  DataPointInput,
  EventRecordInput,
  SyncResult,
} from "./connectors/types";
import { getAppUrl } from "./config";
import type { Integration } from "@prisma/client";

function buildContext(integration: Integration): ConnectorContext {
  return {
    integrationId: integration.id,
    credentials: decryptJSON(integration.credentials) ?? {},
    config: (integration.config as Record<string, any>) ?? {},
    appUrl: getAppUrl(),
  };
}

// Persist the normalised output of a connector run.
async function persistResult(
  integrationId: string,
  result: SyncResult,
): Promise<number> {
  const { dataPoints, events } = result;

  if (dataPoints.length) {
    await prisma.dataPoint.createMany({
      data: dataPoints.map((p: DataPointInput) => ({
        integrationId,
        metricKey: p.metricKey,
        value: p.value,
        timestamp: p.timestamp ?? new Date(),
        meta: (p.meta ?? {}) as any,
      })),
    });
  }

  let count = 0;
  for (const e of events as EventRecordInput[]) {
    count++;
    const base = {
      integrationId,
      kind: e.kind,
      title: e.title ?? null,
      data: (e.data ?? {}) as any,
      occurredAt: e.occurredAt ?? new Date(),
    };
    if (e.externalId) {
      await prisma.eventRecord.upsert({
        where: {
          integrationId_kind_externalId: {
            integrationId,
            kind: e.kind,
            externalId: e.externalId,
          },
        },
        create: { ...base, externalId: e.externalId },
        update: { title: base.title, data: base.data, occurredAt: base.occurredAt },
      });
    } else {
      await prisma.eventRecord.create({ data: base });
    }
  }
  return count;
}

// Provider-specific derived series computed from stored events
// (e.g. SendBlue reply rate = inbound / outbound).
async function recomputeDerived(integration: Integration): Promise<void> {
  if (integration.provider === "sendblue") {
    const [outbound, inbound] = await Promise.all([
      prisma.eventRecord.count({
        where: {
          integrationId: integration.id,
          kind: "sms",
          data: { path: ["direction"], equals: "outbound" },
        },
      }),
      prisma.eventRecord.count({
        where: {
          integrationId: integration.id,
          kind: "sms",
          data: { path: ["direction"], equals: "inbound" },
        },
      }),
    ]);
    const replyRate = outbound ? Math.round((inbound / outbound) * 1000) / 10 : 0;
    await prisma.dataPoint.create({
      data: {
        integrationId: integration.id,
        metricKey: "sendblue_reply_rate",
        value: replyRate,
      },
    });
  }
}

export async function runSync(integrationId: string): Promise<{
  ok: boolean;
  message: string;
  records: number;
}> {
  const integration = await prisma.integration.findUnique({
    where: { id: integrationId },
  });
  if (!integration) return { ok: false, message: "Integration not found", records: 0 };

  const connector = getConnector(integration.provider);
  if (!connector?.sync) {
    return {
      ok: false,
      message: `${integration.provider} does not support scheduled sync (webhook-only).`,
      records: 0,
    };
  }

  const run = await prisma.syncRun.create({
    data: { integrationId, status: "RUNNING" },
  });
  await prisma.integration.update({
    where: { id: integrationId },
    data: { status: "SYNCING" },
  });

  try {
    const result = await connector.sync(buildContext(integration));
    const records = await persistResult(integrationId, result);
    await recomputeDerived(integration);

    await prisma.syncRun.update({
      where: { id: run.id },
      data: {
        status: "SUCCESS",
        recordsPulled: records,
        message: result.message,
        finishedAt: new Date(),
      },
    });
    await prisma.integration.update({
      where: { id: integrationId },
      data: {
        status: "CONNECTED",
        lastSyncedAt: new Date(),
        lastError: null,
      },
    });
    return { ok: true, message: result.message ?? "Synced.", records };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.syncRun.update({
      where: { id: run.id },
      data: { status: "ERROR", message, finishedAt: new Date() },
    });
    await prisma.integration.update({
      where: { id: integrationId },
      data: { status: "ERROR", lastError: message },
    });
    return { ok: false, message, records: 0 };
  }
}

export async function ingestWebhook(
  integration: Integration,
  body: any,
  headers: Record<string, string>,
): Promise<{ ok: boolean; message: string }> {
  const connector = getConnector(integration.provider);
  if (!connector?.handleWebhook) {
    return { ok: false, message: "This integration does not accept webhooks." };
  }
  try {
    const result = await connector.handleWebhook(
      body,
      headers,
      buildContext(integration),
    );
    await persistResult(integration.id, result);
    await recomputeDerived(integration);
    await prisma.integration.update({
      where: { id: integration.id },
      data: {
        status: "CONNECTED",
        lastSyncedAt: new Date(),
        lastError: null,
      },
    });
    await prisma.syncRun.create({
      data: {
        integrationId: integration.id,
        status: "SUCCESS",
        recordsPulled: result.events.length,
        message: result.message ?? "Webhook received",
        finishedAt: new Date(),
      },
    });
    return { ok: true, message: result.message ?? "Webhook processed." };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.integration.update({
      where: { id: integration.id },
      data: { lastError: message },
    });
    return { ok: false, message };
  }
}
