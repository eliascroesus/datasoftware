"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Search,
  FileSpreadsheet,
  Check,
  Loader2,
  RefreshCw,
  Table2,
  KeyRound,
  AlertTriangle,
} from "lucide-react";
import type { PublicIntegration } from "@/lib/client-types";
import { cn } from "@/lib/utils";

interface Sheet {
  id: string;
  name: string;
}
interface Tab {
  title: string;
  rows: number;
  columns: number;
}

export function GoogleSheetsSetup({
  integration,
  config,
  onConfig,
  onNeedIntegration,
}: {
  integration: PublicIntegration | null;
  config: Record<string, any>;
  onConfig: (patch: Record<string, any>) => void;
  onNeedIntegration: () => Promise<PublicIntegration | null>;
}) {
  const [connected, setConnected] = useState(!!integration?.oauth?.google);
  const id = integration?.id;

  const [query, setQuery] = useState("");
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  const selectedSheetId = config.spreadsheetId as string | undefined;
  const selectedSheetName = config.spreadsheetName as string | undefined;
  const selectedTab = config.range as string | undefined;
  const keyColumn = config.keyColumn as string | undefined;

  const api = useCallback(
    async (action: string, extra: Record<string, string> = {}) => {
      const qs = new URLSearchParams({ action, ...extra });
      const res = await fetch(`/api/integrations/${id}/google?${qs}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Google request failed");
      return data;
    },
    [id],
  );

  const loadSheets = useCallback(
    async (q: string) => {
      if (!id) return;
      setLoading("sheets");
      setErr(null);
      try {
        const data = await api("spreadsheets", q ? { q } : {});
        setSheets(data.spreadsheets ?? []);
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(null);
      }
    },
    [api, id],
  );

  const loadTabs = useCallback(
    async (spreadsheetId: string) => {
      setLoading("tabs");
      try {
        const data = await api("tabs", { spreadsheetId });
        setTabs(data.tabs ?? []);
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(null);
      }
    },
    [api],
  );

  const loadColumns = useCallback(
    async (spreadsheetId: string, tab: string) => {
      setLoading("columns");
      try {
        const data = await api("columns", { spreadsheetId, tab });
        setColumns(data.columns ?? []);
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(null);
      }
    },
    [api],
  );

  // Initial load when connected.
  useEffect(() => {
    if (connected && id) {
      loadSheets("");
      if (selectedSheetId) loadTabs(selectedSheetId);
      if (selectedSheetId && selectedTab) loadColumns(selectedSheetId, selectedTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, id]);

  function onSearch(q: string) {
    setQuery(q);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => loadSheets(q), 350);
  }

  async function signIn() {
    setSigningIn(true);
    let target = integration;
    if (!target) target = await onNeedIntegration();
    if (target?.id) {
      window.location.href = `/api/oauth/google/start?integrationId=${target.id}`;
    } else {
      setSigningIn(false);
    }
  }

  async function disconnect() {
    if (!id) return;
    if (
      !confirm(
        "Disconnect this Google account? Your metrics stay, and you can reconnect a different account.",
      )
    )
      return;
    await fetch(`/api/integrations/${id}/google?action=disconnect`, {
      method: "POST",
    }).catch(() => {});
    onConfig({ spreadsheetId: "", spreadsheetName: "", range: "", keyColumn: "" });
    setSheets([]);
    setTabs([]);
    setColumns([]);
    setConnected(false);
  }

  function pickSheet(s: Sheet) {
    onConfig({ spreadsheetId: s.id, spreadsheetName: s.name, range: "", keyColumn: "" });
    setTabs([]);
    setColumns([]);
    loadTabs(s.id);
  }
  function pickTab(t: Tab) {
    onConfig({ range: t.title, keyColumn: "" });
    setColumns([]);
    if (selectedSheetId) loadColumns(selectedSheetId, t.title);
  }

  if (!connected) {
    return (
      <div className="rounded-xl border border-panel-border bg-black/20 p-5 text-center">
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#34d399]/12 text-[#34d399]">
          <FileSpreadsheet size={20} />
        </div>
        <p className="text-sm font-medium text-white">
          Connect your Google account
        </p>
        <p className="mx-auto mt-1 max-w-xs text-xs text-muted">
          Sign in once, then pick a spreadsheet, tab and columns — no keys to copy.
        </p>
        <button onClick={signIn} disabled={signingIn} className="btn-google mt-4">
          {signingIn ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <GoogleGlyph />
          )}
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border border-good/20 bg-good/10 px-3 py-2 text-xs text-good">
        <span className="flex items-center gap-1.5">
          <Check size={13} /> Google account connected
        </span>
        <span className="flex items-center gap-3">
          <button onClick={signIn} className="text-good/80 hover:text-good underline">
            Switch account
          </button>
          <button onClick={disconnect} className="text-bad/80 hover:text-bad underline">
            Disconnect
          </button>
        </span>
      </div>

      {err ? (
        <div className="flex items-start gap-2 rounded-lg border border-bad/20 bg-bad/10 p-2.5 text-xs text-bad">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          {err}
        </div>
      ) : null}

      {/* Step 1 — Spreadsheet */}
      <div>
        <StepLabel n={1} label="Choose a spreadsheet" icon={FileSpreadsheet} />
        <div className="relative">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
          />
          <input
            className="input pl-9"
            placeholder="Search your Google Sheets…"
            value={query}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
        <div className="mt-2 max-h-44 space-y-1 overflow-y-auto rounded-lg border border-panel-border bg-black/20 p-1">
          {loading === "sheets" ? (
            <ListLoading label="Loading your sheets…" />
          ) : sheets.length === 0 ? (
            <p className="p-3 text-center text-xs text-faint">No spreadsheets found.</p>
          ) : (
            sheets.map((s) => (
              <button
                key={s.id}
                onClick={() => pickSheet(s)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                  selectedSheetId === s.id
                    ? "bg-brand/15 text-white"
                    : "text-slate-200 hover:bg-white/[0.05]",
                )}
              >
                <FileSpreadsheet size={15} className="shrink-0 text-[#34d399]" />
                <span className="flex-1 truncate">{s.name}</span>
                {selectedSheetId === s.id ? (
                  <Check size={14} className="text-brand-soft" />
                ) : null}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Step 2 — Tab */}
      {selectedSheetId ? (
        <div>
          <StepLabel n={2} label={`Choose a tab in “${selectedSheetName}”`} icon={Table2} />
          {loading === "tabs" ? (
            <ListLoading label="Loading tabs…" />
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {tabs.map((t) => (
                <button
                  key={t.title}
                  onClick={() => pickTab(t)}
                  className={cn(
                    "rounded-md border px-2.5 py-1.5 text-xs transition-colors",
                    selectedTab === t.title
                      ? "border-brand/50 bg-brand/15 text-white"
                      : "border-panel-border bg-white/[0.02] text-muted hover:bg-white/[0.06]",
                  )}
                >
                  {t.title}
                  <span className="ml-1.5 text-faint">{t.rows}×{t.columns}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* Step 3 — Columns + key */}
      {selectedTab ? (
        <div>
          <StepLabel n={3} label="Columns detected" icon={KeyRound} />
          {loading === "columns" ? (
            <ListLoading label="Reading columns…" />
          ) : columns.length === 0 ? (
            <p className="text-xs text-faint">
              No header row found. Add headers to row 1, then re-sync.
            </p>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {columns.map((c) => (
                  <span key={c} className="chip">
                    {c}
                  </span>
                ))}
              </div>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted">
                  Unique row key (for de-duplication)
                </span>
                <select
                  className="input"
                  value={keyColumn ?? ""}
                  onChange={(e) => onConfig({ keyColumn: e.target.value })}
                >
                  <option value="">Row number (default)</option>
                  {columns.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function StepLabel({
  n,
  label,
  icon: Icon,
}: {
  n: number;
  label: string;
  icon: any;
}) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand/20 text-[11px] font-semibold text-brand-soft">
        {n}
      </span>
      <span className="flex items-center gap-1.5 text-sm font-medium text-slate-200">
        <Icon size={14} className="text-faint" />
        {label}
      </span>
    </div>
  );
}

function ListLoading({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 p-3 text-xs text-faint">
      <RefreshCw size={13} className="animate-spin" /> {label}
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.9 0 6.6 1.7 8.1 3.1l6-5.8C34.6 3.3 29.8 1 24 1 14.6 1 6.5 6.4 2.6 14.3l7 5.4C11.4 13.6 17.2 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-2.8-.4-4H24v7.6h12.7c-.3 2-1.6 5-4.7 7l7.2 5.6c4.3-4 6.9-9.9 6.9-16.2z" />
      <path fill="#FBBC05" d="M9.6 28.7c-.5-1.4-.8-2.9-.8-4.7s.3-3.3.8-4.7l-7-5.4C1.6 17.2 1 20.5 1 24s.6 6.8 1.6 10.1l7-5.4z" />
      <path fill="#34A853" d="M24 47c5.8 0 10.7-1.9 14.2-5.2l-7.2-5.6c-1.9 1.3-4.5 2.3-7 2.3-6.8 0-12.6-4.1-14.4-9.8l-7 5.4C6.5 41.6 14.6 47 24 47z" />
    </svg>
  );
}
