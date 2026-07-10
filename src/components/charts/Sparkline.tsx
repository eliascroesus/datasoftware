import { colorHex } from "@/lib/providers";

// Lightweight dependency-free SVG sparkline with a soft area fill.
export function Sparkline({
  data,
  color = "brand",
  width = 150,
  height = 44,
  strokeWidth = 2,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  strokeWidth?: number;
}) {
  const hex = colorHex(color);
  // Deterministic id (same on server + client) — duplicate identical gradient
  // defs across cards are harmless and avoid hydration mismatches.
  const id = `spark-grad-${color}`;

  if (!data || data.length === 0) {
    return <svg width={width} height={height} aria-hidden />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = strokeWidth + 1;
  const w = width - pad * 2;
  const h = height - pad * 2;

  const points = data.map((v, i) => {
    const x = pad + (data.length === 1 ? w / 2 : (i / (data.length - 1)) * w);
    const y = pad + h - ((v - min) / range) * h;
    return [x, y] as const;
  });

  const line = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const area =
    `${line} L${points[points.length - 1][0].toFixed(1)},${height - pad} ` +
    `L${points[0][0].toFixed(1)},${height - pad} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={hex} stopOpacity="0.35" />
          <stop offset="100%" stopColor={hex} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path
        d={line}
        fill="none"
        stroke={hex}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle
        cx={points[points.length - 1][0]}
        cy={points[points.length - 1][1]}
        r={strokeWidth + 0.5}
        fill={hex}
      />
    </svg>
  );
}
