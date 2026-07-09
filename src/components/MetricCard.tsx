import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { Sparkline } from "./charts/Sparkline";
import { formatNumber, cn } from "@/lib/utils";
import type { ComputedMetric } from "@/lib/metrics";

export function ChangePill({ change }: { change: number | null }) {
  if (change === null || change === undefined) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-md bg-white/[0.04] px-1.5 py-0.5 text-xs font-semibold text-faint">
        <Minus size={12} /> —
      </span>
    );
  }
  const up = change >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-semibold",
        up ? "bg-good/10 text-good" : "bg-bad/10 text-bad",
      )}
    >
      {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {Math.abs(change)}%
    </span>
  );
}

export function MetricCard({
  metric,
  subtitle,
}: {
  metric: ComputedMetric;
  subtitle?: string;
}) {
  const trendValues = metric.trend.map((t) => t.v);
  const goalPct =
    metric.goal && metric.goal > 0
      ? Math.min(100, Math.round((metric.value / metric.goal) * 100))
      : null;

  return (
    <div className="panel panel-hover group flex flex-col justify-between p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="label-muted truncate">{metric.label}</p>
          {subtitle ? (
            <p className="mt-0.5 truncate text-xs text-faint">{subtitle}</p>
          ) : null}
        </div>
        <ChangePill change={metric.change} />
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="stat-value tabular-nums">
          {formatNumber(metric.value, { unit: metric.unit, format: metric.format })}
        </div>
        <div className="opacity-90 transition group-hover:opacity-100">
          <Sparkline data={trendValues} color={metric.color} />
        </div>
      </div>

      {goalPct !== null ? (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] text-faint">
            <span>Goal</span>
            <span className="tabular-nums">
              {goalPct}% of{" "}
              {formatNumber(metric.goal!, { unit: metric.unit, format: metric.format })}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-brand"
              style={{ width: `${goalPct}%` }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
