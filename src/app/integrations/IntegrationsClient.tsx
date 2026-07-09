"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  X,
  Plus,
  RefreshCw,
  Settings2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ArrowRight,
  Radio,
} from "lucide-react";
import { ProviderBadge } from "@/components/ProviderIcon";
import { StatusPill } from "@/components/StatusPill";
import { Field } from "@/components/Field";
import { CopyButton } from "@/components/CopyButton";
import { timeAgo, cn } from "@/lib/utils";
import type { ConnectorMetaClient, PublicIntegration } from "@/lib/client-types";

function defaultsFor(connector: ConnectorMetaClient, integration?: PublicIntegration | null) {
  const cfg: Record<string, any> = {};
  for (const f of connector.configFields) {
    cfg[f.key] = integration?.config?.[f.key] ?? f.defaultValue ?? "";
  }
  return cfg;
}

function ConnectModal({
  connector,
  integration: initialIntegration,
  appUrl,
  onClose,
  onChanged,
}: {
  connector: ConnectorMetaClient;
  integration: PublicIntegration | null;
  appUrl: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [saved, setSaved] = useState<PublicIntegration | null>(initialIntegration);
  const [name, setName] = useState(initialIntegration?.name ?? connector.name);
  const [creds, setCreds] = useState<Record<string, any>>({});
  const [config, setConfig] = useState<Record<string, any>>(() =>
    defaultsFor(connector, initialIntegration),
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(
    null,
  );

  const webhookUrl = saved
    ? `${appUrl}/api/webhooks/${saved.webhookToken}`
    : null;

  async function connect() {
    setBusy("connect");
    setResult(null);
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: connector.provider,
          name,
          credentials: creds,
          config,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ ok: false, message: data.error ?? "Failed to connect" });
      } else {
        setSaved(data.integration);
        const parts = [data.verify?.message, data.syncMessage].filter(Boolean);
        setResult({
          ok: data.verify?.ok ?? true,
          message: parts.join(" · ") || "Connected.",
        });
        onChanged();
      }
    } catch (e) {
      setResult({ ok: false, message: String(e) });
    } finally {
      setBusy(null);
    }
  }

  async function saveChanges() {
    if (!saved) return connect();
    setBusy("save");
    setResult(null);
    try {
      await fetch(`/api/integrations/${saved.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, credentials: creds, config }),
      });
      const test = await fetch(`/api/integrations/${saved.id}/test`, {
        method: "POST",
      }).then((r) => r.json());
      let syncMsg = "";
      if (connector.supportsSync && test.ok) {
        const sync = await fetch(`/api/integrations/${saved.id}/sync`, {
          method: "POST",
        }).then((r) => r.json());
        syncMsg = sync.message ?? "";
      }
      setResult({
        ok: test.ok,
        message: [test.message, syncMsg].filter(Boolean).join(" · "),
      });
      onChanged();
    } catch (e) {
      setResult({ ok: false, message: String(e) });
    } finally {
      setBusy(null);
    }
  }

  async function syncNow() {
    if (!saved) return;
    setBusy("sync");
    const res = await fetch(`/api/integrations/${saved.id}/sync`, {
      method: "POST",
    }).then((r) => r.json());
    setResult({ ok: res.ok, message: res.message });
    onChanged();
    setBusy(null);
  }

  async function remove() {
    if (!saved) return;
    if (!confirm(`Delete “${saved.name}”? This removes its tracked data.`)) return;
    setBusy("delete");
    await fetch(`/api/integrations/${saved.id}`, { method: "DELETE" });
    onChanged();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:p-8">
      <div className="panel w-full max-w-xl animate-fade-in">
        <div className="flex items-start justify-between gap-3 border-b border-panel-border p-5">
          <div className="flex items-center gap-3">
            <ProviderBadge provider={connector.provider} size={44} />
            <div>
              <h2 className="text-lg font-semibold text-white">{connector.name}</h2>
              <p className="text-xs text-muted">{connector.category}</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost px-2 py-2">
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[62vh] space-y-4 overflow-y-auto p-5">
          <p className="text-sm text-muted">{connector.description}</p>

          <Field
            field={{ key: "name", label: "Display name", type: "text" }}
            value={name}
            onChange={setName}
          />

          {connector.credentialFields.length > 0 ? (
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-faint">
                Credentials
              </div>
              {connector.credentialFields.map((f) => (
                <Field
                  key={f.key}
                  field={f}
                  value={creds[f.key]}
                  onChange={(v) => setCreds((c) => ({ ...c, [f.key]: v }))}
                  secretSaved={!!saved?.hasCredentials && f.secret}
                />
              ))}
            </div>
          ) : null}

          {connector.configFields.length > 0 ? (
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-faint">
                Configuration
              </div>
              {connector.configFields.map((f) => (
                <Field
                  key={f.key}
                  field={f}
                  value={config[f.key]}
                  onChange={(v) => setConfig((c) => ({ ...c, [f.key]: v }))}
                />
              ))}
            </div>
          ) : null}

          {connector.supportsWebhook && webhookUrl ? (
            <div className="rounded-lg border border-panel-border bg-bg-soft/60 p-3">
              <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-faint">
                <Radio size={13} /> Inbound webhook URL
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded bg-black/30 px-2 py-1.5 text-xs text-brand-soft">
                  {webhookUrl}
                </code>
                <CopyButton value={webhookUrl} />
              </div>
              <p className="mt-1.5 text-xs text-faint">
                Point {connector.name}&apos;s webhooks here to stream data in real
                time.
              </p>
            </div>
          ) : null}

          {result ? (
            <div
              className={cn(
                "flex items-start gap-2 rounded-lg border p-3 text-sm",
                result.ok
                  ? "border-good/20 bg-good/10 text-good"
                  : "border-bad/20 bg-bad/10 text-bad",
              )}
            >
              {result.ok ? (
                <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              )}
              <span className="text-slate-100">{result.message}</span>
            </div>
          ) : null}

          {connector.docsUrl ? (
            <a
              href={connector.docsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-brand-soft hover:underline"
            >
              {connector.name} API docs <ExternalLink size={12} />
            </a>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-panel-border p-4">
          <div>
            {saved ? (
              <button onClick={remove} className="btn-danger" disabled={!!busy}>
                <Trash2 size={15} /> Delete
              </button>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {saved && connector.supportsSync ? (
              <button onClick={syncNow} className="btn-ghost" disabled={!!busy}>
                <RefreshCw size={15} className={cn(busy === "sync" && "animate-spin")} />
                Sync now
              </button>
            ) : null}
            <button
              onClick={saveChanges}
              className="btn-primary"
              disabled={!!busy}
            >
              {busy === "connect" || busy === "save" ? (
                <RefreshCw size={15} className="animate-spin" />
              ) : (
                <CheckCircle2 size={15} />
              )}
              {saved ? "Save & re-sync" : "Connect & sync"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function IntegrationsClient({
  connectors,
  initialIntegrations,
  appUrl,
}: {
  connectors: ConnectorMetaClient[];
  initialIntegrations: PublicIntegration[];
  appUrl: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [integrations, setIntegrations] =
    useState<PublicIntegration[]>(initialIntegrations);
  const [modal, setModal] = useState<{
    connector: ConnectorMetaClient;
    integration: PublicIntegration | null;
  } | null>(null);

  const refresh = useCallback(async () => {
    const data = await fetch("/api/integrations").then((r) => r.json());
    setIntegrations(data.integrations ?? []);
    router.refresh();
  }, [router]);

  // Auto-open the connect modal from ?connect=provider
  useEffect(() => {
    const p = searchParams.get("connect");
    if (p) {
      const connector = connectors.find((c) => c.provider === p);
      if (connector) setModal({ connector, integration: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const byCategory = useMemo(() => {
    const map = new Map<string, ConnectorMetaClient[]>();
    for (const c of connectors) {
      const arr = map.get(c.category) ?? [];
      arr.push(c);
      map.set(c.category, arr);
    }
    return Array.from(map.entries());
  }, [connectors]);

  const connectorFor = (provider: string) =>
    connectors.find((c) => c.provider === provider)!;

  return (
    <div className="animate-fade-in space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Integrations
        </h1>
        <p className="mt-1 text-sm text-muted">
          Connect your tools once. Unived pulls data on a schedule and via
          webhooks, then unifies it on your dashboard.
        </p>
      </header>

      {integrations.length > 0 ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
            Connected sources
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {integrations.map((i) => (
              <div key={i.id} className="panel p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <ProviderBadge provider={i.provider} size={40} />
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-white">
                        {i.name}
                      </div>
                      <div className="text-xs text-faint">
                        Synced {timeAgo(i.lastSyncedAt)}
                      </div>
                    </div>
                  </div>
                  <StatusPill status={i.status} />
                </div>
                {i.lastError ? (
                  <div className="mt-3 flex items-start gap-1.5 rounded-md bg-bad/10 p-2 text-xs text-bad">
                    <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                    <span className="line-clamp-2">{i.lastError}</span>
                  </div>
                ) : null}
                <div className="mt-4 flex items-center gap-2">
                  <Link href={`/sources/${i.id}`} className="btn-ghost flex-1 text-xs">
                    View data <ArrowRight size={14} />
                  </Link>
                  <button
                    onClick={() =>
                      setModal({ connector: connectorFor(i.provider), integration: i })
                    }
                    className="btn-ghost text-xs"
                  >
                    <Settings2 size={14} /> Configure
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {byCategory.map(([category, list]) => (
        <section key={category}>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
            {category}
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {list.map((c) => (
              <div key={c.provider} className="panel panel-hover flex flex-col p-4">
                <div className="flex items-center gap-3">
                  <ProviderBadge provider={c.provider} size={42} />
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-white">
                      {c.name}
                    </div>
                    <div className="flex gap-1.5 text-[11px] text-faint">
                      {c.supportsSync ? <span className="chip">Scheduled sync</span> : null}
                      {c.supportsWebhook ? <span className="chip">Webhook</span> : null}
                    </div>
                  </div>
                </div>
                <p className="mt-3 flex-1 text-sm text-muted">{c.description}</p>
                <button
                  onClick={() => setModal({ connector: c, integration: null })}
                  className="btn-ghost mt-4 w-full"
                >
                  <Plus size={15} /> Connect
                </button>
              </div>
            ))}
          </div>
        </section>
      ))}

      {modal ? (
        <ConnectModal
          connector={modal.connector}
          integration={modal.integration}
          appUrl={appUrl}
          onClose={() => setModal(null)}
          onChanged={refresh}
        />
      ) : null}
    </div>
  );
}
