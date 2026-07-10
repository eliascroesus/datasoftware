"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const RANGES = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "all", label: "All time" },
];

export function RangeSelector({ current }: { current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function select(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-panel-border bg-bg-soft p-0.5">
      {RANGES.map((r) => (
        <button
          key={r.key}
          onClick={() => select(r.key)}
          className={cn(
            "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
            current === r.key
              ? "bg-white text-black"
              : "text-muted hover:text-white",
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
