import { cn } from "@/lib/utils";

const MAP: Record<string, { label: string; cls: string; dot: string }> = {
  CONNECTED: {
    label: "Connected",
    cls: "text-good bg-good/10 border-good/20",
    dot: "bg-good",
  },
  SYNCING: {
    label: "Syncing",
    cls: "text-brand-soft bg-brand/10 border-brand/20",
    dot: "bg-brand-soft animate-pulse",
  },
  ERROR: {
    label: "Error",
    cls: "text-bad bg-bad/10 border-bad/20",
    dot: "bg-bad",
  },
  DISCONNECTED: {
    label: "Not connected",
    cls: "text-faint bg-white/[0.03] border-panel-border",
    dot: "bg-faint",
  },
};

export function StatusPill({ status }: { status: string }) {
  const s = MAP[status] ?? MAP.DISCONNECTED;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        s.cls,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}
