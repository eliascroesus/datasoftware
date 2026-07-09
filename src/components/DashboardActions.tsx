"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export function DashboardActions() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 600);
  }

  async function syncAll() {
    setSyncing(true);
    try {
      const res = await fetch("/api/integrations");
      const data = await res.json();
      const ids: string[] = (data.integrations ?? []).map((i: any) => i.id);
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/integrations/${id}/sync`, { method: "POST" }).catch(
            () => {},
          ),
        ),
      );
      router.refresh();
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={refresh} className="btn-ghost" disabled={refreshing}>
        <RefreshCw size={15} className={cn(refreshing && "animate-spin")} />
        Refresh
      </button>
      <button onClick={syncAll} className="btn-primary" disabled={syncing}>
        <Zap size={15} className={cn(syncing && "animate-pulse")} />
        {syncing ? "Syncing…" : "Sync all"}
      </button>
    </div>
  );
}
