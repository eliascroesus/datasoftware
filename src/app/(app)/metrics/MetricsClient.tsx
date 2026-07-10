"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  Pencil,
  Star,
  Filter,
  Save,
  X,
  Sparkles,
  RefreshCw,
  Database,
} from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { ProviderBadge } from "@/components/ProviderIcon";
import { Combobox } from "@/components/Combobox";
import type { ComputedMetric } from "@/lib/metrics";
import type { MetricDef, PublicIntegration } from "@/lib/client-types";
import { cn } from "@/lib/utils";

const AGGREGATIONS = [
  { value: "count", label: "Count records" },
  { value: "sum", label: "Sum of a field" },
  { value: "avg", label: "Average of a field" },
  { value: "unique", label: "Count unique values" },
  { value: "ratio", label: "Rate / ratio (%)" },
];
const OPS = [
  { value: "eq", label: "is" },
  { value: "neq", label: "is not" },
  { value: "contains", label: "contains" },
  { value: "not_contains", label: "doesn't contain" },
  { value: "not_empty", label: "is not empty" },
  { value: "empty", label: "is empty" },
  { value: "gt", label: ">" },
  { value: "lt", label: "<" },
  { value: "gte", label: "≥" },
  { value: "lte", label: "≤" },
  { value: "in", label: "is any of" },
];
const COLORS = ["brand", "teal", "violet", "amber", "pink", "good"];
const BELOW_COLORS = ["bad", "amber", "pink", "violet"];
const SWATCH: Record<string, string> = {
  brand: "#4f8bff",
  teal: "#2dd4bf",
  violet: "#8b7cff",
  amber: "#fbbf24",
  pink: "#f472b6",
  good: "#34d399",
  bad: "#fb7185",
};
const NO_VALUE_OPS = new Set(["empty", "not_empty", "exists"]);

function Swatches({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (c: string) => void;
  options: string[];
}) {
  return (
    <div className="flex gap-2 pt-1">
      {options.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={
            "h-7 w-7 rounded-full border-2 transition " +
            (value === c ? "border-white" : "border-transparent")
          }
          style={{ background: SWATCH[c] ?? "#4f8bff" }}
        />
      ))}
    </div>
  );
}

interface FilterRow {
  field: string;
  op: string;
  value?: string;
}
interface FormState {
  id?: string;
  label: string;
  integrationId: string;
  recordKind: string;
  aggregation: string;
  valueField: string;
  filters: FilterRow[];
  unit: string;
  color: string;
  goal: string;
  goalPeriod: string;
  belowColor: string;
}

const EMPTY_FORM: FormState = {
  label: "",
  integrationId: "",
  recordKind: "",
  aggregation: "count",
  valueField: "",
  filters: [],
  unit: "count",
  color: "brand",
  goal: "",
  goalPeriod: "",
  belowColor: "bad",
};

export function MetricsClient({
  initialMetrics,
  integrations,
  defaultIntegrationId,
}: {
  initialMetrics: MetricDef[];
  integrations: PublicIntegration[];
  defaultIntegrationId: string;
}) {
  const router = useRouter();
  const [metrics, setMetrics] = useState<MetricDef[]>(initialMetrics);
  const [form, setForm] = useState<FormState>({
    ...EMPTY_FORM,
    integrationId: defaultIntegrationId,
  });
  const [schema, setSchema] = useState<{
    kinds: string[];
    fieldsByKind: Record<string, string[]>;
    examplesByKind: Record<string, Record<string, string>>;
    valuesByKind: Record<string, Record<string, string[]>>;
  }>({ kinds: [], fieldsByKind: {}, examplesByKind: {}, valuesByKind: {} });
  const [preview, setPreview] = useState<ComputedMetric | null>(null);
  const [previewErr, setPreviewErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingSchema, setLoadingSchema] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  const update = (patch: Partial<FormState>) =>
    setForm((f) => ({ ...f, ...patch }));

  // Load schema (kinds + fields + sample values) for the selected source.
  const loadSchema = useCallback(
    async (integrationId: string, autopickKind = true) => {
      setLoadingSchema(true);
      try {
        const qs = integrationId ? `?integrationId=${integrationId}` : "";
        const d = await fetch(`/api/schema${qs}`).then((r) => r.json());
        setSchema(d);
        if (autopickKind) {
          setForm((f) =>
            f.recordKind || d.kinds.length === 0
              ? f
              : { ...f, recordKind: d.kinds[0] },
          );
        }
      } catch {
        /* ignore */
      } finally {
        setLoadingSchema(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadSchema(form.integrationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.integrationId]);

  // "Pull latest" actually re-syncs the selected source (fetching fresh rows
  // from Google/Close/etc.), then refreshes the discovered fields + preview.
  const pullLatest = useCallback(async () => {
    setLoadingSchema(true);
    try {
      if (form.integrationId) {
        await fetch(`/api/integrations/${form.integrationId}/sync`, {
          method: "POST",
        }).catch(() => {});
      }
      await loadSchema(form.integrationId, false);
      router.refresh();
    } finally {
      setLoadingSchema(false);
    }
  }, [form.integrationId, loadSchema, router]);

  const availableFields = schema.fieldsByKind[form.recordKind] ?? [];
  const availableExamples = schema.examplesByKind[form.recordKind] ?? {};
  const availableValues = schema.valuesByKind[form.recordKind] ?? {};

  // Clicking a field from the live data maps it into the metric: as the value
  // field for sum/avg/unique, or as a new filter rule otherwise.
  function mapField(field: string) {
    if (["sum", "avg", "unique"].includes(form.aggregation)) {
      update({ valueField: field });
    } else {
      update({
        filters: [
          ...form.filters,
          { field, op: "eq", value: availableExamples[field] ?? "" },
        ],
      });
    }
  }

  // Live preview (debounced).
  useEffect(() => {
    if (!form.recordKind) {
      setPreview(null);
      return;
    }
    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/metrics/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: form.label || "Preview",
            integrationId: form.integrationId || null,
            aggregation: form.aggregation,
            recordKind: form.recordKind,
            valueField: form.valueField || null,
            filters: form.filters.filter((f) => f.field),
            unit: form.aggregation === "ratio" ? "percent" : form.unit,
            color: form.color,
            goal: form.goal ? Number(form.goal) : null,
            goalPeriod: form.goalPeriod || null,
            belowColor: form.belowColor || null,
          }),
        });
        const data = await res.json();
        if (data.error) {
          setPreviewErr(data.error);
          setPreview(null);
        } else {
          setPreviewErr(null);
          setPreview(data.metric);
        }
      } catch (e) {
        setPreviewErr(String(e));
      }
    }, 350);
    return () => clearTimeout(debounce.current);
  }, [form]);

  const refreshMetrics = useCallback(async () => {
    const data = await fetch("/api/metrics").then((r) => r.json());
    setMetrics(data.metrics ?? []);
    router.refresh();
  }, [router]);

  async function save() {
    if (!form.label.trim()) return;
    setSaving(true);
    const payload = {
      label: form.label,
      integrationId: form.integrationId || null,
      aggregation: form.aggregation,
      recordKind: form.recordKind,
      valueField: form.valueField || null,
      filters: form.filters.filter((f) => f.field),
      unit: form.aggregation === "ratio" ? "percent" : form.unit,
      format: form.aggregation === "ratio" ? "percent" : form.unit,
      color: form.color,
      goal: form.goal ? Number(form.goal) : null,
      goalPeriod: form.goalPeriod || null,
      belowColor: form.belowColor || null,
      pinned: true,
    };
    try {
      if (form.id) {
        await fetch(`/api/metrics/${form.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch("/api/metrics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      await refreshMetrics();
      setForm({ ...EMPTY_FORM, integrationId: form.integrationId });
    } finally {
      setSaving(false);
    }
  }

  function editMetric(m: MetricDef) {
    setForm({
      id: m.id,
      label: m.label,
      integrationId: m.integrationId ?? "",
      recordKind: m.recordKind,
      aggregation: m.aggregation === "latest" ? "count" : m.aggregation,
      valueField: m.valueField ?? "",
      filters: (m.filters ?? []) as FilterRow[],
      unit: m.unit,
      color: m.color,
      goal: m.goal != null ? String(m.goal) : "",
      goalPeriod: m.goalPeriod ?? "",
      belowColor: m.belowColor ?? "bad",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function removeMetric(id: string) {
    if (!confirm("Delete this metric?")) return;
    await fetch(`/api/metrics/${id}`, { method: "DELETE" });
    await refreshMetrics();
  }

  async function togglePin(m: MetricDef) {
    await fetch(`/api/metrics/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !m.pinned }),
    });
    await refreshMetrics();
  }

  const integrationName = (id: string | null) =>
    id ? integrations.find((i) => i.id === id)?.name ?? "Source" : "All sources";

  const isFieldAgg = ["sum", "avg", "unique"].includes(form.aggregation);
  const groups = useMemo(() => {
    const map = new Map<string, MetricDef[]>();
    for (const m of metrics) {
      const key = m.integrationId ?? "global";
      (map.get(key) ?? map.set(key, []).get(key)!).push(m);
    }
    return Array.from(map.entries());
  }, [metrics]);

  return (
    <div className="animate-fade-in space-y-7">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Metrics builder
        </h1>
        <p className="mt-1 text-sm text-muted">
          Turn any incoming data into a tracked metric — count spreadsheet rows
          by column value, compute close rate, sum revenue, and more.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        {/* Builder */}
        <div className="panel space-y-4 p-5 lg:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold text-white">
              <Sparkles size={16} className="text-brand-soft" />
              {form.id ? "Edit metric" : "New metric"}
            </h2>
            {form.id ? (
              <button
                onClick={() =>
                  setForm({ ...EMPTY_FORM, integrationId: form.integrationId })
                }
                className="btn-ghost px-2 py-1 text-xs"
              >
                <X size={13} /> Cancel edit
              </button>
            ) : null}
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-200">
              Metric name
            </span>
            <input
              className="input"
              placeholder="e.g. Booked calls, Close rate, SMS reply rate"
              value={form.label}
              onChange={(e) => update({ label: e.target.value })}
            />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-200">
                Source
              </span>
              <select
                className="input"
                value={form.integrationId}
                onChange={(e) =>
                  update({ integrationId: e.target.value, recordKind: "" })
                }
              >
                <option value="">All sources</option>
                {integrations.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-200">
                Track (record type)
              </span>
              <Combobox
                value={form.recordKind}
                onChange={(v) => update({ recordKind: v })}
                options={schema.kinds}
                placeholder="e.g. sheet_row, booking, sms"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-200">
                Calculation
              </span>
              <select
                className="input"
                value={form.aggregation}
                onChange={(e) => update({ aggregation: e.target.value })}
              >
                {AGGREGATIONS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>

            {isFieldAgg ? (
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-200">
                  Field / column
                </span>
                <Combobox
                  value={form.valueField}
                  onChange={(v) => update({ valueField: v })}
                  options={availableFields}
                  hints={availableExamples}
                  placeholder="e.g. Amount, Email"
                />
              </label>
            ) : (
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-200">
                  Unit
                </span>
                <select
                  className="input"
                  value={form.aggregation === "ratio" ? "percent" : form.unit}
                  disabled={form.aggregation === "ratio"}
                  onChange={(e) => update({ unit: e.target.value })}
                >
                  <option value="count">Number</option>
                  <option value="percent">Percent</option>
                  <option value="currency">Currency ($)</option>
                </select>
              </label>
            )}
          </div>

          {/* Filters */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm font-medium text-slate-200">
                <Filter size={14} />
                {form.aggregation === "ratio"
                  ? "Numerator — count records where"
                  : "Only include records where"}
              </span>
              <button
                onClick={() =>
                  update({
                    filters: [...form.filters, { field: "", op: "eq", value: "" }],
                  })
                }
                className="btn-ghost px-2 py-1 text-xs"
              >
                <Plus size={13} /> Add rule
              </button>
            </div>
            {form.filters.length === 0 ? (
              <p className="text-xs text-faint">
                No rules — {form.aggregation === "ratio" ? "add one to define the rate" : "counts every record"}.
              </p>
            ) : (
              <div className="space-y-2">
                {form.filters.map((row, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Combobox
                      className="flex-1"
                      value={row.field}
                      onChange={(v) => {
                        const filters = [...form.filters];
                        filters[idx] = { ...row, field: v };
                        update({ filters });
                      }}
                      options={availableFields}
                      hints={availableExamples}
                      placeholder="field"
                    />
                    <select
                      className="input w-32 shrink-0"
                      value={row.op}
                      onChange={(e) => {
                        const filters = [...form.filters];
                        filters[idx] = { ...row, op: e.target.value };
                        update({ filters });
                      }}
                    >
                      {OPS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    {!NO_VALUE_OPS.has(row.op) ? (
                      <Combobox
                        className="flex-1"
                        value={row.value ?? ""}
                        onChange={(v) => {
                          const filters = [...form.filters];
                          filters[idx] = { ...row, value: v };
                          update({ filters });
                        }}
                        options={availableValues[row.field] ?? []}
                        placeholder="value"
                      />
                    ) : (
                      <div className="flex-1" />
                    )}
                    <button
                      onClick={() =>
                        update({
                          filters: form.filters.filter((_, i) => i !== idx),
                        })
                      }
                      className="btn-ghost px-2 py-2"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {form.aggregation === "ratio" ? (
              <p className="mt-2 text-xs text-faint">
                Rate = matching records ÷ all {form.recordKind || "records"} × 100.
                Great for close rate, booking rate, show rate.
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-200">
                Goal (optional)
              </span>
              <div className="flex gap-2">
                <input
                  className="input"
                  type="number"
                  placeholder="e.g. 30"
                  value={form.goal}
                  onChange={(e) => update({ goal: e.target.value })}
                />
                <select
                  className="input w-32 shrink-0"
                  value={form.goalPeriod}
                  onChange={(e) => update({ goalPeriod: e.target.value })}
                >
                  <option value="">total</option>
                  <option value="day">per day</option>
                  <option value="week">per week</option>
                  <option value="month">per month</option>
                </select>
              </div>
              {form.goal ? (
                <p className="mt-1 text-[11px] text-faint">
                  Counts {form.goalPeriod ? `this ${form.goalPeriod}` : "in total"}{" "}
                  toward the goal.
                </p>
              ) : null}
            </label>
            <div>
              <span className="mb-1.5 block text-sm font-medium text-slate-200">
                Graph colour
              </span>
              <Swatches
                value={form.color}
                onChange={(c) => update({ color: c })}
                options={COLORS}
              />
            </div>
          </div>

          {form.goal ? (
            <div>
              <span className="mb-1.5 block text-sm font-medium text-slate-200">
                Colour when below goal
              </span>
              <Swatches
                value={form.belowColor}
                onChange={(c) => update({ belowColor: c })}
                options={BELOW_COLORS}
              />
            </div>
          ) : null}

          <div className="flex justify-end border-t border-panel-border pt-4">
            <button
              onClick={save}
              disabled={saving || !form.label.trim() || !form.recordKind}
              className="btn-primary"
            >
              <Save size={15} />
              {form.id ? "Save changes" : "Create metric"}
            </button>
          </div>
        </div>

        {/* Live preview */}
        <div className="space-y-4 lg:col-span-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-faint">
            Live preview
          </div>
          {preview ? (
            <MetricCard
              metric={preview}
              subtitle={integrationName(form.integrationId || null)}
            />
          ) : (
            <div className="panel flex h-40 items-center justify-center p-6 text-center text-sm text-faint">
              {previewErr
                ? previewErr
                : form.recordKind
                  ? "Adjust the builder to preview…"
                  : "Pick a source and record type to preview."}
            </div>
          )}
          <p className="text-xs text-faint">
            The preview reflects real data already stored. Save to pin it to your
            dashboard.
          </p>

          {/* Zapier-style test data: real sample fields + values, click to map */}
          {form.recordKind ? (
            <div className="panel p-4">
              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-faint">
                  <Database size={13} /> Sample data
                </div>
                <button
                  onClick={pullLatest}
                  className="btn-ghost px-2 py-1 text-[11px]"
                  disabled={loadingSchema}
                  title={
                    form.integrationId
                      ? "Re-sync this source and refresh fields"
                      : "Refresh fields"
                  }
                >
                  <RefreshCw
                    size={12}
                    className={cn(loadingSchema && "animate-spin")}
                  />
                  {loadingSchema ? "Syncing…" : "Pull latest"}
                </button>
              </div>
              {availableFields.length === 0 ? (
                <p className="py-3 text-xs text-faint">
                  {loadingSchema
                    ? "Loading sample…"
                    : "No data yet. Connect and sync this source, then pull the latest sample."}
                </p>
              ) : (
                <>
                  <p className="mb-3 text-xs text-faint">
                    Pulled from your latest records —{" "}
                    {["sum", "avg", "unique"].includes(form.aggregation)
                      ? "click a field to use it as the value."
                      : "click a field to add it as a filter."}
                  </p>
                  <div className="space-y-1">
                    {availableFields.map((f) => (
                      <button
                        key={f}
                        onClick={() => mapField(f)}
                        className="group flex w-full items-center justify-between gap-3 rounded-md border border-panel-border bg-white/[0.02] px-2.5 py-1.5 text-left text-xs transition-colors hover:border-brand/40 hover:bg-white/[0.05]"
                      >
                        <span className="flex items-center gap-1.5 font-medium text-slate-200">
                          <Plus
                            size={11}
                            className="text-faint group-hover:text-brand-soft"
                          />
                          {f}
                        </span>
                        <span className="max-w-[45%] truncate text-faint">
                          {availableExamples[f] ?? "—"}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* Saved metrics */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
          Your metrics ({metrics.length})
        </h2>
        <div className="space-y-5">
          {groups.map(([key, list]) => {
            const integration =
              key === "global"
                ? null
                : integrations.find((i) => i.id === key) ?? null;
            return (
              <div key={key}>
                <div className="mb-2 flex items-center gap-2 text-sm text-muted">
                  {integration ? (
                    <ProviderBadge provider={integration.provider} size={24} />
                  ) : null}
                  <span className="font-medium text-slate-200">
                    {integration ? integration.name : "Cross-source / custom"}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {list.map((m) => (
                    <div
                      key={m.id}
                      className="panel flex items-center justify-between gap-3 p-3"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium text-white">
                          {m.label}
                        </div>
                        <div className="truncate text-xs text-faint">
                          {describeMetric(m)}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          onClick={() => togglePin(m)}
                          className="btn-ghost px-2 py-1.5"
                          title={m.pinned ? "Unpin from summary" : "Pin to summary"}
                        >
                          <Star
                            size={14}
                            className={m.pinned ? "fill-amber text-amber" : ""}
                          />
                        </button>
                        <button
                          onClick={() => editMetric(m)}
                          className="btn-ghost px-2 py-1.5"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => removeMetric(m.id)}
                          className="btn-ghost px-2 py-1.5"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {metrics.length === 0 ? (
            <div className="panel p-8 text-center text-sm text-faint">
              No metrics yet. Build one above.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function describeMetric(m: MetricDef): string {
  if (m.recordKind === "series" || m.aggregation === "latest") {
    return `Live KPI · ${m.valueField ?? m.key}`;
  }
  const agg =
    { count: "Count", sum: "Sum of", avg: "Avg of", unique: "Unique", ratio: "Rate of" }[
      m.aggregation
    ] ?? m.aggregation;
  const field = ["sum", "avg", "unique"].includes(m.aggregation)
    ? ` ${m.valueField ?? ""}`
    : "";
  const where =
    m.filters && m.filters.length
      ? ` where ${m.filters
          .map((f) => `${f.field} ${f.op} ${f.value ?? ""}`.trim())
          .join(", ")}`
      : "";
  return `${agg}${field} ${m.recordKind}${where}`.trim();
}
