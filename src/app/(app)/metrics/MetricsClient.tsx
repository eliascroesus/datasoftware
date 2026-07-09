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
} from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { ProviderBadge } from "@/components/ProviderIcon";
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
const NO_VALUE_OPS = new Set(["empty", "not_empty", "exists"]);

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
  }>({ kinds: [], fieldsByKind: {} });
  const [preview, setPreview] = useState<ComputedMetric | null>(null);
  const [previewErr, setPreviewErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  const update = (patch: Partial<FormState>) =>
    setForm((f) => ({ ...f, ...patch }));

  // Load schema (kinds + fields) whenever the source changes.
  useEffect(() => {
    const qs = form.integrationId ? `?integrationId=${form.integrationId}` : "";
    fetch(`/api/schema${qs}`)
      .then((r) => r.json())
      .then((d) => {
        setSchema(d);
        setForm((f) =>
          f.recordKind || d.kinds.length === 0
            ? f
            : { ...f, recordKind: d.kinds[0] },
        );
      })
      .catch(() => {});
  }, [form.integrationId]);

  const availableFields = schema.fieldsByKind[form.recordKind] ?? [];

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
              <input
                className="input"
                list="kinds-list"
                placeholder="e.g. sheet_row, booking, sms"
                value={form.recordKind}
                onChange={(e) => update({ recordKind: e.target.value })}
              />
              <datalist id="kinds-list">
                {schema.kinds.map((k) => (
                  <option key={k} value={k} />
                ))}
              </datalist>
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
                <input
                  className="input"
                  list="fields-list"
                  placeholder="e.g. Amount, Email"
                  value={form.valueField}
                  onChange={(e) => update({ valueField: e.target.value })}
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

          <datalist id="fields-list">
            {availableFields.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>

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
                    <input
                      className="input flex-1"
                      list="fields-list"
                      placeholder="field"
                      value={row.field}
                      onChange={(e) => {
                        const filters = [...form.filters];
                        filters[idx] = { ...row, field: e.target.value };
                        update({ filters });
                      }}
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
                      <input
                        className="input flex-1"
                        placeholder="value"
                        value={row.value ?? ""}
                        onChange={(e) => {
                          const filters = [...form.filters];
                          filters[idx] = { ...row, value: e.target.value };
                          update({ filters });
                        }}
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
              <input
                className="input"
                type="number"
                placeholder="e.g. 100"
                value={form.goal}
                onChange={(e) => update({ goal: e.target.value })}
              />
            </label>
            <div>
              <span className="mb-1.5 block text-sm font-medium text-slate-200">
                Colour
              </span>
              <div className="flex gap-2 pt-1">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => update({ color: c })}
                    className={cn(
                      "h-7 w-7 rounded-full border-2 transition",
                      form.color === c ? "border-white" : "border-transparent",
                    )}
                    style={{
                      background:
                        {
                          brand: "#4f8bff",
                          teal: "#2dd4bf",
                          violet: "#8b7cff",
                          amber: "#fbbf24",
                          pink: "#f472b6",
                          good: "#34d399",
                        }[c] ?? "#4f8bff",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

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
