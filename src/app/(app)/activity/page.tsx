import Link from "next/link";
import { prisma } from "@/lib/db";
import { ProviderBadge } from "@/components/ProviderIcon";
import { timeAgo } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KIND_LABEL: Record<string, string> = {
  opportunity: "Opportunity",
  lead: "Lead",
  booking: "Booking",
  sms: "Message",
  campaign: "Campaign",
  email_event: "Email event",
  sheet_row: "Sheet row",
  webhook_event: "Webhook",
};

export default async function ActivityPage() {
  const events = await prisma.eventRecord.findMany({
    orderBy: { occurredAt: "desc" },
    take: 120,
    include: { integration: { select: { name: true, provider: true, id: true } } },
  });

  return (
    <div className="animate-fade-in space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Activity feed
        </h1>
        <p className="mt-1 text-sm text-muted">
          Every record pulled or pushed into NamziLabs, newest first — fully
          timestamped across all your sources.
        </p>
      </header>

      {events.length === 0 ? (
        <div className="panel p-10 text-center text-sm text-faint">
          No activity yet. Connect a source and sync to populate the feed.
        </div>
      ) : (
        <div className="panel divide-y divide-panel-border/60">
          {events.map((e) => {
            const dir =
              (e.data as any)?.direction === "outbound"
                ? "→"
                : (e.data as any)?.direction === "inbound"
                  ? "←"
                  : null;
            return (
              <Link
                key={e.id}
                href={`/sources/${e.integration.id}`}
                className="flex items-center gap-3 px-4 py-3 transition hover:bg-white/[0.02]"
              >
                <ProviderBadge provider={e.integration.provider} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium text-white">
                      {dir ? `${dir} ` : ""}
                      {e.title ?? KIND_LABEL[e.kind] ?? e.kind}
                    </span>
                    <span className="chip shrink-0 py-0.5 text-[10px]">
                      {KIND_LABEL[e.kind] ?? e.kind}
                    </span>
                  </div>
                  <div className="truncate text-xs text-faint">
                    {e.integration.name}
                  </div>
                </div>
                <span className="shrink-0 text-xs text-faint">
                  {timeAgo(e.occurredAt)}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
