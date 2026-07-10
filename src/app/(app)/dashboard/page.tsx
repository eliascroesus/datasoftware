import Link from "next/link";
import { ArrowRight, Database, Radio, Boxes, Clock, Sparkles } from "lucide-react";
import { getSummary } from "@/lib/dashboard";
import { MetricCard } from "@/components/MetricCard";
import { ProviderBadge } from "@/components/ProviderIcon";
import { StatusPill } from "@/components/StatusPill";
import { DashboardActions } from "@/components/DashboardActions";
import { formatNumber, timeAgo } from "@/lib/utils";
import { allConnectorMeta } from "@/lib/connectors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function StatTile({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon: any;
  accent: string;
}) {
  return (
    <div className="panel flex items-center gap-3 p-4">
      <span
        className="flex h-10 w-10 items-center justify-center rounded-lg"
        style={{ background: `${accent}1f`, color: accent }}
      >
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <div className="text-lg font-semibold tabular-nums text-white">
          {value}
        </div>
        <div className="text-xs text-muted">{label}</div>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const summary = await getSummary();
  const { integrations, metrics, byIntegration, totals } = summary;

  if (integrations.length === 0) {
    const connectors = allConnectorMeta();
    return (
      <div className="animate-fade-in">
        <div className="mx-auto max-w-2xl py-10 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-accent-teal shadow-glow">
            <Sparkles className="text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            One dashboard for all your data
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-muted">
            Connect Close CRM, Calendly, SendBlue, Instantly, Google Sheets and
            webhooks. NamziLabs pulls everything into one place, timestamps it, and
            lets you build any metric you want.
          </p>
          <Link href="/integrations" className="btn-primary mx-auto mt-6 w-fit">
            Connect your first source <ArrowRight size={16} />
          </Link>
        </div>
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-3">
          {connectors.map((c) => (
            <Link
              key={c.provider}
              href={`/integrations?connect=${c.provider}`}
              className="panel panel-hover flex items-center gap-3 p-4"
            >
              <ProviderBadge provider={c.provider} size={38} />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-white">
                  {c.name}
                </div>
                <div className="truncate text-xs text-faint">{c.category}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  const sourceGroups = integrations
    .map((i) => ({
      integration: i,
      metrics: byIntegration[i.id] ?? [],
    }))
    .filter((g) => g.metrics.length > 0);
  const globalMetrics = byIntegration["global"] ?? [];

  return (
    <div className="animate-fade-in space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Summary
          </h1>
          <p className="mt-1 text-sm text-muted">
            Live metrics across {totals.sources} source
            {totals.sources === 1 ? "" : "s"} · updated {timeAgo(totals.lastSyncedAt)}
          </p>
        </div>
        <DashboardActions />
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Active sources"
          value={`${totals.connected}/${totals.sources}`}
          icon={Radio}
          accent="#4f8bff"
        />
        <StatTile
          label="Records tracked"
          value={formatNumber(totals.records)}
          icon={Boxes}
          accent="#2dd4bf"
        />
        <StatTile
          label="Events today"
          value={formatNumber(totals.eventsToday)}
          icon={Clock}
          accent="#8b7cff"
        />
        <StatTile
          label="Data points"
          value={formatNumber(totals.dataPoints)}
          icon={Database}
          accent="#fbbf24"
        />
      </div>

      {metrics.length > 0 ? (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
              Key metrics
            </h2>
            <Link
              href="/metrics"
              className="text-xs font-medium text-brand-soft hover:underline"
            >
              Configure metrics →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {metrics.map((m) => (
              <MetricCard key={m.id} metric={m} />
            ))}
          </div>
        </section>
      ) : null}

      {sourceGroups.map(({ integration, metrics: ms }) => (
        <section key={integration.id}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <ProviderBadge provider={integration.provider} size={34} />
              <div>
                <h2 className="font-semibold text-white">{integration.name}</h2>
                <div className="text-xs text-faint">
                  Last synced {timeAgo(integration.lastSyncedAt)}
                </div>
              </div>
              <StatusPill status={integration.status} />
            </div>
            <Link
              href={`/sources/${integration.id}`}
              className="btn-ghost text-xs"
            >
              View details <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {ms.map((m) => (
              <MetricCard key={m.id} metric={m} />
            ))}
          </div>
        </section>
      ))}

      {globalMetrics.length > 0 ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
            Cross-source metrics
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {globalMetrics.map((m) => (
              <MetricCard key={m.id} metric={m} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
