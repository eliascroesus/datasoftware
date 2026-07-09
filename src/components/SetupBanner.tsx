import { ShieldAlert } from "lucide-react";

// Shown when no AUTH_PASSWORD is configured — the app is publicly reachable.
export function SetupBanner() {
  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl2 border border-amber/30 bg-amber/10 p-3.5 text-sm text-amber">
      <ShieldAlert size={18} className="mt-0.5 shrink-0" />
      <div className="text-slate-100">
        <span className="font-semibold text-amber">No login configured.</span>{" "}
        Anyone with this URL can see your data. Set an{" "}
        <code className="rounded bg-black/30 px-1.5 py-0.5 text-xs text-amber">
          AUTH_PASSWORD
        </code>{" "}
        environment variable to turn on the login wall.
      </div>
    </div>
  );
}
