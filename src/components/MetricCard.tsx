import { ArrowUpRight, ArrowDownRight, Minus, Info } from "lucide-react";
import { Sparkline } from "./charts/Sparkline";
import { Gauge } from "./charts/Gauge";
import { formatNumber, cn } from "@/lib/utils";
import { colorHex } from "@/lib/providers";
import type { ComputedMetric } from "@/lib/metrics";

export function ChangePill({ change }: { change: number | null }) {
  if (change === null || change === undefined) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-faint">
        <Minus size={12} /> —
      </span>
    );
  }
  const up = change >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-semibold",
        up ? "text-good" : "text-bad",
      )}
    >
      {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
      {Math.abs(change)}%
    </span>
  );
}

function metricTitle(m: ComputedMetric): string {
  const agg =
    { count: "Count of", sum: "Sum of", avg: "Average of", unique: "Unique", ratio: "Rate of", latest: "Live KPI" }[
      m.aggregation
    ] ?? m.aggregation;
  return `${agg} ${m.recordKind === "series" ? m.label : m.recordKind}`;
}

export function MetricCard({
  metric,
  subtitle,
  comparison,
}: {
  metric: ComputedMetric;
  subtitle?: string;
  comparison?: string;
}) {
  const trendValues = metric.trend.map((t) => t.v);
  const isRate = metric.unit === "percent" || metric.format === "percent";
  const isCustom =
    metric.aggregation !== "latest" && metric.recordKind !== "series";
  // Use the below-goal colour when the goal-period value is under target.
  const activeColor =
    metric.underGoal && metric.belowColor ? metric.belowColor : metric.color;
  const goalPct =
    metric.goal && metric.goal > 0 && metric.goalActual != null
      ? Math.min(100, Math.round((metric.goalActual / metric.goal) * 100))
      : null;
  const periodLabel = metric.goalPeriod
    ? { day: "today", week: "this week", month: "this month" }[metric.goalPeriod] ??
      metric.goalPeriod
    : null;

  return (
    <div className="panel panel-hover group flex flex-col p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="label-muted truncate">{metric.label}</p>
          <span title={metricTitle(metric)} className="text-faint">
            <Info size={12} />
          </span>
        </div>
        {isCustom ? (
          <span className="chip shrink-0 border-brand/30 bg-brand/10 py-0.5 text-[10px] text-brand-soft">
            Custom
          </span>
        ) : null}
      </div>

      {isRate ? (
        <div className="mt-3 flex items-center gap-4">
          <Gauge value={metric.value} color={activeColor} size={78} />
          <div className="min-w-0">
            <ChangePill change={metric.change} />
            {comparison ? (
              <p className="mt-0.5 truncate text-[11px] text-faint">{comparison}</p>
            ) : null}
          </div>
        </div>
      ) : (
        <>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div className="stat-value tabular-nums">
              {formatNumber(metric.value, { unit: metric.unit, format: metric.format })}
            </div>
            <Sparkline data={trendValues} color={activeColor} width={120} height={44} />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <ChangePill change={metric.change} />
            {comparison ? (
              <span className="truncate text-[11px] text-faint">{comparison}</span>
            ) : null}
          </div>
        </>
      )}

      {goalPct !== null ? (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-faint">
              Goal {periodLabel ? `· ${periodLabel}` : ""}
            </span>
            <span
              className="tabular-nums font-medium"
              style={{ color: metric.underGoal ? colorHex(activeColor) : "#34d399" }}
            >
              {formatNumber(metric.goalActual ?? 0)} / {formatNumber(metric.goal!)}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
            <div
              className="h-full rounded-full"
              style={{ width: `${goalPct}%`, background: colorHex(activeColor) }}
            />
          </div>
        </div>
      ) : null}

      {subtitle ? (
        <p className="mt-2 truncate text-xs text-faint">{subtitle}</p>
      ) : null}
    </div>
  );
}
