// Client-safe provider display metadata (no server-only imports).

export interface ProviderStyle {
  color: string;
  gradient: string;
  short: string;
  glow: string;
}

// Monochrome provider styling — solid neutral surfaces, no color.
const MONO: ProviderStyle = {
  color: "#d4d4d8",
  gradient: "from-zinc-700 to-transparent",
  glow: "rgba(0,0,0,0.4)",
  short: "",
};

export const PROVIDER_STYLE: Record<string, ProviderStyle> = {
  close: { ...MONO, short: "Close" },
  calendly: { ...MONO, short: "Calendly" },
  sendblue: { ...MONO, short: "SendBlue" },
  instantly: { ...MONO, short: "Instantly" },
  google_sheets: { ...MONO, short: "Sheets" },
  webhook: { ...MONO, short: "Webhook" },
};

export function providerStyle(provider: string): ProviderStyle {
  return (
    PROVIDER_STYLE[provider] ?? {
      ...MONO,
      short: provider.slice(0, 2).toUpperCase(),
    }
  );
}

// Chart colors — grayscale shades so series stay visually distinct in B&W.
export const COLOR_HEX: Record<string, string> = {
  brand: "#e4e4e7",
  teal: "#d4d4d8",
  violet: "#a1a1aa",
  amber: "#fafafa",
  pink: "#c4c4c7",
  good: "#e4e4e7",
  bad: "#a1a1aa",
};

export function colorHex(token: string): string {
  return COLOR_HEX[token] ?? token ?? "#e4e4e7";
}
