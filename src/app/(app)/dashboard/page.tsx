import Link from "next/link";
import {
  ArrowRight,
  Database,
  Radio,
  Zap,
  Sparkles,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { getSummary } from "@/lib/dashboard";
import { MetricCard } from "@/components/MetricCard";
import { ProviderBadge } from "@/components/ProviderIcon";
import { StatusPill } from "@/components/StatusPill";
import { DashboardActions } from "@/components/DashboardActions";
import { RangeSelector } from "@/components/RangeSelector";
import { Sparkline } from "@/components/charts/Sparkline";
import { MiniBars } from "@/components/charts/MiniBars";
import { formatNumber, timeAgo } from "@/lib/utils";
import { allConnectorMeta } from "@/lib/connectors";
import type { RangeKey } from "@/lib/metrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COMPARISON: Record<string, string> = {
  today: "vs yesterday",
  yesterday: "vs prior day",
  "7d": "vs prev 7 days",
  "30d": "vs prev 30 days",
  all: "",
};

function StatCard({
  icon: Icon,
  tint,
  value,
  label,
  badge,
  sub,
  chart,
}: {
  icon: any;
  tint: string;
  value: string;
  label: string;
  badge?: string;
  sub?: string;
  chart?: React.ReactNode;
}) {
  return (
    <div className="panel flex items-center justify-between gap-3 p-4">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          style={{ background: `${tint}1f`, color: tint }}
        >
          <Icon size={20} />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xl font-semibold tabular-nums text-white">
              {value}
            </span>
            {badge ? (
              <span className="chip border-good/25 bg-good/10 py-0 text-[10px] text-good">
                {badge}
              </span>
            ) : null}
          </div>
          <div className="text-xs text-muted">{label}</div>
          {sub ? <div className="mt-0.5 text-[11px] text-faint">{sub}</div> : null}
        </div>
      </div>
      {chart ? <div className="shrink-0">{chart}</div> : null}
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { range?: string };
}) {
  const validRanges = ["today", "yesterday", "7d", "30d", "all"];
  const range = (
    validRanges.includes(searchParams.range ?? "") ? searchParams.range : "30d"
  ) as RangeKey;
  const summary = await getSummary(range);
  const { integrations, metrics, byIntegration, perIntegration, eventsByDay, totals } =
    summary;
  const comparison = COMPARISON[range];

  if (integrations.length === 0) {
    const connectors = allConnectorMeta();
    return (
      <div className="animate-fade-in">
        <div className="mx-auto max-w-2xl py-10 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white">
            <Sparkles className="text-black" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            One dashboard for all your data
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-muted">
            Connect Close CRM, Calendly, SendBlue, Instantly, Google Sheets and
            webhooks. NamziLabs pulls everything into one place, timestamps it,
            and lets you build any metric you want.
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

  return (
    <div className="animate-fade-in space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-[28px]">
            Summary
          </h1>
          <p className="mt-1 text-sm text-muted">
            Overview of your data sources and key metrics
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RangeSelector current={range} />
          <DashboardActions />
        </div>
      </header>

      {/* Stat row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Radio}
          tint="#8b7cff"
          value={String(totals.sources)}
          label="Active sources"
          badge={totals.connected > 0 ? "Live" : undefined}
          sub={`${totals.connected} connected · ${totals.syncing} syncing`}
        />
        <StatCard
          icon={Database}
          tint="#3d7dff"
          value={formatNumber(totals.records)}
          label="Records tracked"
        />
        <StatCard
          icon={Zap}
          tint="#8b7cff"
          value={formatNumber(totals.eventsToday)}
          label="Events today"
          chart={<MiniBars data={eventsByDay} width={130} height={38} />}
        />
        <StatCard
          icon={Database}
          tint="#fbbf24"
          value={formatNumber(totals.dataPoints)}
          label="Data points"
        />
      </div>

      {/* Key metrics */}
      {metrics.length > 0 ? (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Key metrics</h2>
            <Link href="/metrics" className="btn-ghost text-xs">
              Configure metrics
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {metrics.map((m) => (
              <MetricCard key={m.id} metric={m} comparison={comparison} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Source cards */}
      <section>
        <h2 className="mb-3 text-base font-semibold text-white">Sources</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {integrations.map((i) => {
            const spark = (byIntegration[i.id]?.[0]?.trend ?? []).map((t) => t.v);
            const stats = perIntegration[i.id] ?? { records: 0, eventsToday: 0 };
            const isError = i.status === "ERROR";
            return (
              <div key={i.id} className="panel flex flex-col p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <ProviderBadge provider={i.provider} size={34} />
                    <span className="truncate font-semibold text-white">
                      {i.name}
                    </span>
                  </div>
                  <StatusPill status={i.status} />
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="truncate text-[11px] text-faint">Last synced</div>
                    <div className="truncate text-xs font-medium text-slate-200">
                      {timeAgo(i.lastSyncedAt)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-faint">Records</div>
                    <div className="text-xs font-medium text-slate-200">
                      {formatNumber(stats.records)}
                    </div>
                  </div>
                  <div>
                    <div className="truncate text-[11px] text-faint">Today</div>
                    <div className="text-xs font-medium text-slate-200">
                      {formatNumber(stats.eventsToday)}
                    </div>
                  </div>
                </div>

                <div className="mt-3 h-10">
                  {spark.length ? (
                    <Sparkline
                      data={spark}
                      color={isError ? "bad" : "brand"}
                      width={320}
                      height={40}
                    />
                  ) : null}
                </div>

                {isError ? (
                  <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-bad/20 bg-bad/10 px-2.5 py-2 text-xs text-bad">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle size={13} /> Connection failed
                    </span>
                    <Link href="/integrations" className="font-semibold underline">
                      Reconnect
                    </Link>
                  </div>
                ) : (
                  <Link
                    href={`/sources/${i.id}`}
                    className="mt-3 flex items-center justify-between border-t border-panel-border pt-3 text-xs font-medium text-muted transition-colors hover:text-white"
                  >
                    View details
                    <ChevronRight size={14} />
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
