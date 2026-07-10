import { colorHex } from "@/lib/providers";

// Radial donut gauge with the value in the center. Pure SVG.
export function Gauge({
  value,
  color = "brand",
  size = 84,
  suffix = "%",
}: {
  value: number;
  color?: string;
  size?: number;
  suffix?: string;
}) {
  const hex = colorHex(color);
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value)) / 100;
  const dash = c * pct;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={hex}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-base font-semibold tabular-nums text-white">
          {Math.round(value)}
          <span className="text-xs text-muted">{suffix}</span>
        </span>
      </div>
    </div>
  );
}
