import { colorHex } from "@/lib/providers";

// Small vertical bar chart (e.g. events per day). Pure SVG.
export function MiniBars({
  data,
  color = "violet",
  width = 150,
  height = 40,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  const hex = colorHex(color);
  if (!data || data.length === 0) {
    return <svg width={width} height={height} aria-hidden />;
  }
  const max = Math.max(...data, 1);
  const gap = 2;
  const bw = (width - gap * (data.length - 1)) / data.length;

  return (
    <svg width={width} height={height} aria-hidden>
      {data.map((v, i) => {
        const h = Math.max(2, (v / max) * (height - 2));
        const x = i * (bw + gap);
        const y = height - h;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={bw}
            height={h}
            rx={Math.min(2, bw / 2)}
            fill={hex}
            opacity={0.5 + 0.5 * (v / max)}
          />
        );
      })}
    </svg>
  );
}
