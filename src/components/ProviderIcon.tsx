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
  style,
}: {
  provider: string;
  className?: string;
  size?: number;
  style?: React.CSSProperties;
}) {
  const Icon = ICONS[provider] ?? Boxes;
  return <Icon size={size} className={className} style={style} />;
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
      className="flex shrink-0 items-center justify-center rounded-xl border border-panel-border bg-bg-raise"
      style={{ width: size, height: size }}
    >
      <ProviderIcon
        provider={provider}
        size={Math.round(size * 0.5)}
        style={{ color: style.color }}
      />
    </span>
  );
}
