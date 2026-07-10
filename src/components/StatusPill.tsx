import { cn } from "@/lib/utils";

const MAP: Record<string, { label: string; cls: string; dot: string }> = {
  CONNECTED: {
    label: "Connected",
    cls: "text-zinc-200 bg-bg-raise border-panel-border",
    dot: "bg-white",
  },
  SYNCING: {
    label: "Syncing",
    cls: "text-zinc-200 bg-bg-raise border-panel-border",
    dot: "bg-white animate-pulse",
  },
  ERROR: {
    label: "Error",
    cls: "text-zinc-400 bg-bg-raise border-zinc-700",
    dot: "bg-zinc-500",
  },
  DISCONNECTED: {
    label: "Not connected",
    cls: "text-faint bg-bg-raise border-panel-border",
    dot: "bg-zinc-700",
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
