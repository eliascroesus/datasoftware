"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

// A Zapier-style combobox: type a value, or open a dropdown that lists the
// options discovered from your data, each with a preview value. Custom text is
// always allowed so it works even before any data has been pulled.
export function Combobox({
  value,
  onChange,
  options,
  hints,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  hints?: Record<string, string>;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const q = query.toLowerCase();
  const filtered = options.filter((o) => o.toLowerCase().includes(q));

  return (
    <div ref={ref} className={cn("relative", className)}>
      <div className="relative">
        <input
          className="input pr-8"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setOpen((o) => !o)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-faint hover:text-muted"
        >
          <ChevronDown size={15} />
        </button>
      </div>

      {open && options.length > 0 ? (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-panel-border bg-bg-raise shadow-card">
          {options.length > 6 ? (
            <div className="relative border-b border-panel-border">
              <Search
                size={13}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint"
              />
              <input
                autoFocus
                className="w-full bg-transparent py-2 pl-8 pr-2 text-xs text-slate-100 outline-none placeholder:text-faint"
                placeholder="Search fields…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          ) : null}
          <div className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-xs text-faint">No matches</div>
            ) : (
              filtered.map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => {
                    onChange(o);
                    setQuery("");
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left text-xs transition-colors hover:bg-white/[0.06]",
                    value === o ? "bg-brand/10 text-white" : "text-slate-200",
                  )}
                >
                  <span className="truncate font-medium">{o}</span>
                  {hints?.[o] !== undefined ? (
                    <span className="max-w-[50%] truncate text-faint">
                      {hints[o]}
                    </span>
                  ) : null}
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
