import Link from "next/link";
import { notFound } from "next/navigation";
import { Settings2, Radio, History, CheckCircle2, XCircle } from "lucide-react";
import { prisma } from "@/lib/db";
import { getConnector } from "@/lib/connectors";
import { computeMetrics } from "@/lib/metrics";
import { MetricCard } from "@/components/MetricCard";
import { AreaChart } from "@/components/charts/AreaChart";
import { ProviderBadge } from "@/components/ProviderIcon";
import { StatusPill } from "@/components/StatusPill";
import { SyncButton } from "@/components/SyncButton";
import { CopyButton } from "@/components/CopyButton";
import { RecordsTable } from "@/components/RecordsTable";
import { getAppUrl } from "@/lib/config";
import { timeAgo, formatDate } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function SourcePage({
  params,
}: {
  params: { id: string };
}) {
  const integration = await prisma.integration.findUnique({
    where: { id: params.id },
  });
  if (!integration) notFound();

  const connector = getConnector(integration.provider);
  const [defs, events, syncRuns] = await Promise.all([
    prisma.metricDefinition.findMany({
      where: { integrationId: integration.id },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.eventRecord.findMany({
      where: { integrationId: integration.id },
      orderBy: { occurredAt: "desc" },
      take: 50,
    }),
    prisma.syncRun.findMany({
      where: { integrationId: integration.id },
      orderBy: { startedAt: "desc" },
      take: 8,
    }),
  ]);

  const metrics = await computeMetrics(defs, { days: 30 });
  const featured =
    metrics.slice().sort((a, b) => {
      const va = Math.max(...a.trend.map((t) => t.v), 0);
      const vb = Math.max(...b.trend.map((t) => t.v), 0);
      return vb - va;
    })[0] ?? null;

  const webhookUrl = connector?.supportsWebhook
    ? `${getAppUrl()}/api/webhooks/${integration.webhookToken}`
    : null;

  const configEntries = Object.entries(
    (integration.config as Record<string, any>) ?? {},
  ).filter(([, v]) => v !== "" && v !== null && v !== undefined);

  return (
    <div className="animate-fade-in space-y-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <ProviderBadge provider={integration.provider} size={52} />
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                {integration.name}
              </h1>
              <StatusPill status={integration.status} />
            </div>
            <p className="mt-0.5 text-sm text-muted">
              {connector?.category} · last synced {timeAgo(integration.lastSyncedAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/integrations" className="btn-ghost text-sm">
            <Settings2 size={15} /> Configure
          </Link>
          <SyncButton
            integrationId={integration.id}
            supportsSync={connector?.supportsSync ?? false}
          />
        </div>
      </header>

      {integration.lastError ? (
        <div className="panel border-bad/30 bg-bad/5 p-3 text-sm text-bad">
          Last error: {integration.lastError}
        </div>
      ) : null}

      {metrics.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((m) => (
            <MetricCard key={m.id} metric={m} />
          ))}
        </div>
      ) : null}

      {featured ? (
        <section className="panel p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-white">{featured.label} · 30 days</h2>
            <span className="text-xs text-faint">time-stamped trend</span>
          </div>
          <AreaChart data={featured.trend} color={featured.color} unit={featured.unit} />
        </section>
      ) : null}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
              Recent records
            </h2>
            <Link
              href={`/metrics?integrationId=${integration.id}`}
              className="text-xs font-medium text-brand-soft hover:underline"
            >
              Build a metric from these →
            </Link>
          </div>
          <RecordsTable records={events as any} />
        </div>

        <div className="space-y-5">
          {webhookUrl ? (
            <div className="panel p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-faint">
                <Radio size={13} /> Webhook URL
              </div>
              <code className="block truncate rounded bg-black/30 px-2 py-1.5 text-xs text-brand-soft">
                {webhookUrl}
              </code>
              <div className="mt-2">
                <CopyButton value={webhookUrl} label="Copy webhook URL" />
              </div>
            </div>
          ) : null}

          {configEntries.length > 0 ? (
            <div className="panel p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-faint">
                Configuration
              </div>
              <dl className="space-y-1.5 text-sm">
                {configEntries.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <dt className="text-muted">{k}</dt>
                    <dd className="max-w-[160px] truncate text-slate-200">
                      {String(v)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}

          <div className="panel p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-faint">
              <History size={13} /> Sync history
            </div>
            {syncRuns.length === 0 ? (
              <p className="text-sm text-faint">No syncs yet.</p>
            ) : (
              <ul className="space-y-2">
                {syncRuns.map((run) => (
                  <li key={run.id} className="flex items-start gap-2 text-sm">
                    {run.status === "SUCCESS" ? (
                      <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-good" />
                    ) : run.status === "ERROR" ? (
                      <XCircle size={15} className="mt-0.5 shrink-0 text-bad" />
                    ) : (
                      <History size={15} className="mt-0.5 shrink-0 text-muted" />
                    )}
                    <div className="min-w-0">
                      <div className="truncate text-slate-200">
                        {run.message ?? run.status}
                      </div>
                      <div className="text-xs text-faint">
                        {formatDate(run.startedAt)} · {run.recordsPulled} records
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
