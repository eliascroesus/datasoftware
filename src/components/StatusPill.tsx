import { cn } from "@/lib/utils";

const MAP: Record<string, { label: string; cls: string; dot: string }> = {
  CONNECTED: {
    label: "Connected",
    cls: "text-good bg-good/10 border-good/20",
    dot: "bg-good",
  },
  SYNCING: {
    label: "Syncing",
    cls: "text-amber bg-amber/10 border-amber/20",
    dot: "bg-amber animate-pulse",
  },
  ERROR: {
    label: "Error",
    cls: "text-bad bg-bad/10 border-bad/20",
    dot: "bg-bad",
  },
  DISCONNECTED: {
    label: "Not connected",
    cls: "text-faint bg-bg-raise border-panel-border",
    dot: "bg-zinc-600",
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
