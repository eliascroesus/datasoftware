import {
  Building2,
  CalendarClock,
  MessageSquare,
  Send,
  Sheet,
  Webhook,
  Boxes,
  type LucideIcon,
} from "lucide-react";
import { providerStyle } from "@/lib/providers";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  close: Building2,
  calendly: CalendarClock,
  sendblue: MessageSquare,
  instantly: Send,
  google_sheets: Sheet,
  webhook: Webhook,
};

export function ProviderIcon({
  provider,
  className,
  size = 18,
}: {
  provider: string;
  className?: string;
  size?: number;
}) {
  const Icon = ICONS[provider] ?? Boxes;
  return <Icon size={size} className={className} />;
}

export function ProviderBadge({
  provider,
  size = 40,
}: {
  provider: string;
  size?: number;
}) {
  const style = providerStyle(provider);
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl border",
      )}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(140deg, ${style.color}2e, ${style.color}0a)`,
        borderColor: `${style.color}3a`,
        boxShadow: `0 6px 18px -10px ${style.glow}`,
      }}
    >
      <ProviderIcon
        provider={provider}
        size={Math.round(size * 0.48)}
        className="text-white"
      />
    </span>
  );
}
