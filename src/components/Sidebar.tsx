"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Cable,
  SlidersHorizontal,
  Activity,
  Plus,
  Layers,
  LogOut,
} from "lucide-react";
import { ProviderIcon } from "./ProviderIcon";
import { StatusPill } from "./StatusPill";
import { providerStyle } from "@/lib/providers";
import { cn } from "@/lib/utils";

interface SourceLite {
  id: string;
  name: string;
  provider: string;
  status: string;
}

const NAV = [
  { href: "/dashboard", label: "Summary", icon: LayoutDashboard },
  { href: "/integrations", label: "Integrations", icon: Cable },
  { href: "/metrics", label: "Metrics builder", icon: SlidersHorizontal },
  { href: "/activity", label: "Activity feed", icon: Activity },
];

export function Sidebar({ showSignOut = false }: { showSignOut?: boolean }) {
  const pathname = usePathname();
  const [sources, setSources] = useState<SourceLite[]>([]);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/login";
  }

  useEffect(() => {
    let active = true;
    fetch("/api/integrations")
      .then((r) => (r.ok ? r.json() : { integrations: [] }))
      .then((d) => {
        if (active) setSources(d.integrations ?? []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [pathname]);

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-panel-border bg-bg-soft lg:flex">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white">
          <Layers size={18} className="text-black" />
        </div>
        <div className="leading-tight">
          <div className="text-[15px] font-bold tracking-tight text-white">
            NamziLabs
          </div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-faint">
            data platform
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {NAV.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                active
                  ? "bg-bg-raise text-white"
                  : "text-muted hover:bg-bg-raise hover:text-zinc-100",
              )}
            >
              <Icon size={17} className={active ? "text-white" : ""} />
              {item.label}
            </Link>
          );
        })}

        <div className="px-3 pb-1 pt-5 text-[11px] font-semibold uppercase tracking-wider text-faint">
          Sources
        </div>
        {sources.length === 0 ? (
          <Link
            href="/integrations"
            className="flex items-center gap-2 rounded-lg border border-dashed border-panel-border px-3 py-2 text-xs text-faint hover:border-brand/40 hover:text-muted"
          >
            <Plus size={14} /> Connect a source
          </Link>
        ) : (
          sources.map((s) => {
            const active = pathname === `/sources/${s.id}`;
            const style = providerStyle(s.provider);
            return (
              <Link
                key={s.id}
                href={`/sources/${s.id}`}
                className={cn(
                  "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition",
                  active
                    ? "bg-bg-raise text-white"
                    : "text-muted hover:bg-bg-raise hover:text-zinc-100",
                )}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-md border border-panel-border bg-bg text-zinc-300">
                  <ProviderIcon provider={s.provider} size={13} />
                </span>
                <span className="flex-1 truncate">{s.name}</span>
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    s.status === "CONNECTED"
                      ? "bg-white"
                      : s.status === "ERROR"
                        ? "bg-zinc-600"
                        : s.status === "SYNCING"
                          ? "animate-pulse bg-white"
                          : "bg-zinc-700",
                  )}
                />
              </Link>
            );
          })
        )}
      </nav>

      <div className="space-y-2 border-t border-panel-border p-3">
        <Link href="/integrations" className="btn-primary w-full">
          <Plus size={16} /> Add integration
        </Link>
        {showSignOut ? (
          <button onClick={signOut} className="btn-ghost w-full text-muted">
            <LogOut size={15} /> Sign out
          </button>
        ) : null}
      </div>
    </aside>
  );
}
