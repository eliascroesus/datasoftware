// Client-safe provider display metadata (no server-only imports).

export interface ProviderStyle {
  color: string;
  gradient: string;
  short: string;
  glow: string;
}

export const PROVIDER_STYLE: Record<string, ProviderStyle> = {
  close: {
    color: "#3d7dff",
    gradient: "from-[#3d7dff]/25 to-transparent",
    glow: "rgba(61,125,255,0.35)",
    short: "Close",
  },
  calendly: {
    color: "#2dd4bf",
    gradient: "from-[#2dd4bf]/25 to-transparent",
    glow: "rgba(45,212,191,0.35)",
    short: "Calendly",
  },
  sendblue: {
    color: "#8b7cff",
    gradient: "from-[#8b7cff]/25 to-transparent",
    glow: "rgba(139,124,255,0.35)",
    short: "SendBlue",
  },
  instantly: {
    color: "#fbbf24",
    gradient: "from-[#fbbf24]/25 to-transparent",
    glow: "rgba(251,191,36,0.32)",
    short: "Instantly",
  },
  google_sheets: {
    color: "#34d399",
    gradient: "from-[#34d399]/25 to-transparent",
    glow: "rgba(52,211,153,0.32)",
    short: "Sheets",
  },
  webhook: {
    color: "#f472b6",
    gradient: "from-[#f472b6]/25 to-transparent",
    glow: "rgba(244,114,182,0.32)",
    short: "Webhook",
  },
};

export function providerStyle(provider: string): ProviderStyle {
  return (
    PROVIDER_STYLE[provider] ?? {
      color: "#8a97c2",
      gradient: "from-slate-500/20 to-transparent",
      glow: "rgba(138,151,194,0.3)",
      short: provider.slice(0, 2).toUpperCase(),
    }
  );
}

// Map a semantic color token to a concrete hex used by charts/cards.
export const COLOR_HEX: Record<string, string> = {
  brand: "#4f8bff",
  teal: "#2dd4bf",
  violet: "#8b7cff",
  amber: "#fbbf24",
  pink: "#f472b6",
  good: "#34d399",
  bad: "#fb7185",
};

export function colorHex(token: string): string {
  return COLOR_HEX[token] ?? token ?? "#4f8bff";
}
