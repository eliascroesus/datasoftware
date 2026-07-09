"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export function SyncButton({
  integrationId,
  supportsSync = true,
}: {
  integrationId: string;
  supportsSync?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function sync() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/integrations/${integrationId}/sync`, {
        method: "POST",
      }).then((r) => r.json());
      setMsg(res.message ?? null);
      router.refresh();
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(null), 4000);
    }
  }

  if (!supportsSync) {
    return (
      <button
        onClick={() => router.refresh()}
        className="btn-ghost"
        title="This source is webhook-driven"
      >
        <RefreshCw size={15} /> Refresh
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {msg ? (
        <span className="hidden max-w-[240px] truncate text-xs text-faint sm:block">
          {msg}
        </span>
      ) : null}
      <button onClick={sync} className="btn-primary" disabled={busy}>
        <RefreshCw size={15} className={cn(busy && "animate-spin")} />
        {busy ? "Syncing…" : "Sync now"}
      </button>
    </div>
  );
}
