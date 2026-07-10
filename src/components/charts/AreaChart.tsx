import { colorHex } from "@/lib/providers";
import type { TrendPoint } from "@/lib/metrics";

// Larger area chart with gridlines and sparse date labels. Pure SVG.
export function AreaChart({
  data,
  color = "brand",
  height = 220,
  unit = "count",
}: {
  data: TrendPoint[];
  color?: string;
  height?: number;
  unit?: string;
}) {
  const hex = colorHex(color);
  const id = `area-grad-${color}`;
  const width = 720;
  const padX = 8;
  const padTop = 16;
  const padBottom = 26;

  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-faint"
        style={{ height }}
      >
        No data yet
      </div>
    );
  }

  const values = data.map((d) => d.v);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const range = max - min || 1;
  const w = width - padX * 2;
  const h = height - padTop - padBottom;

  const pts = data.map((d, i) => {
    const x = padX + (data.length === 1 ? w / 2 : (i / (data.length - 1)) * w);
    const y = padTop + h - ((d.v - min) / range) * h;
    return [x, y] as const;
  });
  const line = pts
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${padTop + h} L${pts[0][0].toFixed(1)},${padTop + h} Z`;

  const gridLines = 4;
  const suffix = unit === "percent" ? "%" : "";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      className="overflow-visible"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={hex} stopOpacity="0.4" />
          <stop offset="100%" stopColor={hex} stopOpacity="0" />
        </linearGradient>
      </defs>

      {Array.from({ length: gridLines + 1 }).map((_, i) => {
        const y = padTop + (h / gridLines) * i;
        const val = max - (range / gridLines) * i;
        return (
          <g key={i}>
            <line
              x1={padX}
              y1={y}
              x2={width - padX}
              y2={y}
              stroke="rgba(120,140,200,0.1)"
              strokeWidth={1}
            />
            <text
              x={padX}
              y={y - 4}
              fill="#5a6892"
              fontSize={10}
              className="tabular-nums"
            >
              {Math.round(val)}
              {suffix}
            </text>
          </g>
        );
      })}

      <path d={area} fill={`url(#${id})`} />
      <path
        d={line}
        fill="none"
        stroke={hex}
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {data.map((d, i) => {
        if (i % Math.ceil(data.length / 6) !== 0 && i !== data.length - 1)
          return null;
        const x = pts[i][0];
        const label = new Date(d.t).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        return (
          <text
            key={i}
            x={x}
            y={height - 8}
            fill="#5a6892"
            fontSize={10}
            textAnchor="middle"
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}
