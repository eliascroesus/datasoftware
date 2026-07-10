// Client-safe provider display metadata (no server-only imports).

export interface ProviderStyle {
  color: string;
  gradient: string;
  short: string;
  glow: string;
}

// Colored provider identities (icons/badges), on the neutral dark chrome.
function mk(color: string, short: string): ProviderStyle {
  return { color, gradient: "", glow: `${color}55`, short };
}

export const PROVIDER_STYLE: Record<string, ProviderStyle> = {
  close: mk("#22c55e", "Close"),
  calendly: mk("#4f8bff", "Calendly"),
  sendblue: mk("#8b7cff", "SendBlue"),
  instantly: mk("#3b82f6", "Instantly"),
  google_sheets: mk("#22c55e", "Sheets"),
  webhook: mk("#f472b6", "Webhook"),
};

export function providerStyle(provider: string): ProviderStyle {
  return PROVIDER_STYLE[provider] ?? mk("#8a8f9c", provider.slice(0, 2).toUpperCase());
}

// Chart / accent colors used by sparklines, gauges and bars.
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
