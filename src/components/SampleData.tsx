"use client";

import { useEffect, useState } from "react";
import { Database, ChevronDown, ChevronRight } from "lucide-react";

interface Rec {
  id: string;
  kind: string;
  title: string | null;
  data: Record<string, any>;
  occurredAt: string;
}

// Shows the latest records pulled for an integration so you can confirm real
// data is flowing and see which fields are available to map into metrics.
export function SampleData({
  integrationId,
  refreshKey,
}: {
  integrationId: string;
  refreshKey?: number;
}) {
  const [records, setRecords] = useState<Rec[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/integrations/${integrationId}/sample`)
      .then((r) => r.json())
      .then((d) => active && setRecords(d.records ?? []))
      .catch(() => active && setRecords([]));
    return () => {
      active = false;
    };
  }, [integrationId, refreshKey]);

  if (!records || records.length === 0) return null;

  return (
    <div className="rounded-xl border border-panel-border bg-black/20 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-faint">
        <Database size={13} /> Latest data pulled ({records.length})
      </div>
      <div className="space-y-1">
        {records.map((r) => {
          const expanded = open === r.id;
          const fields = Object.entries(r.data).filter(([k]) => !k.startsWith("_"));
          return (
            <div key={r.id} className="rounded-lg border border-panel-border/70">
              <button
                onClick={() => setOpen(expanded ? null : r.id)}
                className="flex w-full items-center gap-2 px-2.5 py-2 text-left text-sm hover:bg-white/[0.03]"
              >
                {expanded ? (
                  <ChevronDown size={14} className="shrink-0 text-faint" />
                ) : (
                  <ChevronRight size={14} className="shrink-0 text-faint" />
                )}
                <span className="chip shrink-0 py-0.5 text-[10px]">{r.kind}</span>
                <span className="flex-1 truncate text-slate-200">
                  {r.title ?? "Record"}
                </span>
              </button>
              {expanded ? (
                <dl className="grid grid-cols-1 gap-x-4 gap-y-1 border-t border-panel-border/70 px-3 py-2 text-xs sm:grid-cols-2">
                  {fields.map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-2">
                      <dt className="shrink-0 text-faint">{k}</dt>
                      <dd className="truncate text-right text-slate-300">
                        {v === null || v === undefined || v === ""
                          ? "—"
                          : typeof v === "object"
                            ? JSON.stringify(v)
                            : String(v)}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
