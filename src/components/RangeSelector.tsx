"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Calendar, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const RANGES = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "all", label: "All time" },
];

export function RangeSelector({ current }: { current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function select(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", key);
    router.push(`${pathname}?${params.toString()}`);
    setOpen(false);
  }

  const label = RANGES.find((r) => r.key === current)?.label ?? "Last 30 days";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="btn-ghost gap-2"
      >
        <Calendar size={15} className="text-muted" />
        {label}
        <ChevronDown size={15} className="text-muted" />
      </button>
      {open ? (
        <div className="absolute right-0 z-50 mt-1 w-44 overflow-hidden rounded-lg border border-panel-border bg-bg-raise py-1 shadow-card">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => select(r.key)}
              className={cn(
                "flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-white/[0.05]",
                current === r.key ? "text-white" : "text-muted",
              )}
            >
              {r.label}
              {current === r.key ? (
                <Check size={14} className="text-brand-soft" />
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
