import { formatDate } from "@/lib/utils";

interface RecordLite {
  id: string;
  kind: string;
  title: string | null;
  data: Record<string, any>;
  occurredAt: Date | string;
}

// Renders a data table with columns derived from the records' fields.
export function RecordsTable({ records }: { records: RecordLite[] }) {
  if (records.length === 0) {
    return (
      <div className="panel p-8 text-center text-sm text-faint">
        No records yet. Sync this source or send it a webhook to see data here.
      </div>
    );
  }

  // Derive up to 6 columns from the most common non-internal fields.
  const counts = new Map<string, number>();
  for (const r of records) {
    for (const key of Object.keys(r.data ?? {})) {
      if (key.startsWith("_")) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  const columns = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([k]) => k);

  return (
    <div className="panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-panel-border text-left text-xs uppercase tracking-wider text-faint">
              <th className="px-4 py-3 font-medium">When</th>
              {columns.map((c) => (
                <th key={c} className="px-4 py-3 font-medium">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr
                key={r.id}
                className="border-b border-panel-border/60 last:border-0 hover:bg-white/[0.02]"
              >
                <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">
                  {formatDate(r.occurredAt)}
                </td>
                {columns.map((c) => {
                  const val = r.data?.[c];
                  return (
                    <td key={c} className="max-w-[220px] px-4 py-3 text-slate-200">
                      <span className="line-clamp-1">
                        {val === undefined || val === null || val === ""
                          ? "—"
                          : typeof val === "object"
                            ? JSON.stringify(val)
                            : String(val)}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
