import type { PricePoint } from "../lib/api";
import { zenyShort } from "../lib/format";

/**
 * Daily lowest and average price, drawn as plain SVG.
 *
 * A charting library would be several hundred kilobytes for two polylines and
 * an axis, on a page whose whole point is loading fast next to a running game.
 *
 * The lowest price is the line that matters - it is what a buyer will actually
 * pay - so it is the solid one; the average is drawn behind it to show whether
 * that low is the market or an outlier.
 */
export function PriceChart({
  points,
  width = 560,
  height = 180,
}: {
  points: PricePoint[];
  width?: number;
  height?: number;
}) {
  if (points.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">
        No price history yet. The daily rollup writes its first point tonight.
      </p>
    );
  }
  if (points.length === 1) {
    const only = points[0];
    return (
      <p className="rounded-md border border-slate-700 bg-slate-900/50 p-6 text-center text-sm text-slate-300">
        One day recorded so far - low {zenyShort(only.min)}, average{" "}
        {zenyShort(only.avg)}. A trend needs a second day.
      </p>
    );
  }

  const pad = { top: 12, right: 12, bottom: 22, left: 52 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;

  const lo = Math.min(...points.map((p) => p.min));
  const hi = Math.max(...points.map((p) => p.avg), ...points.map((p) => p.min));
  // A flat series would otherwise divide by zero and collapse to the top edge.
  const span = hi - lo || Math.max(1, hi * 0.1);

  const x = (i: number) => pad.left + (i / (points.length - 1)) * w;
  const y = (v: number) => pad.top + h - ((v - lo) / span) * h;
  const line = (pick: (p: PricePoint) => number) =>
    points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(pick(p))}`).join(" ");

  const ticks = [lo, lo + span / 2, lo + span];
  const first = points[0].date.slice(5);
  const last = points[points.length - 1].date.slice(5);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      role="img"
      aria-label="Daily lowest and average price"
    >
      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={pad.left}
            x2={width - pad.right}
            y1={y(t)}
            y2={y(t)}
            className="stroke-slate-700"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
          <text
            x={pad.left - 8}
            y={y(t) + 4}
            textAnchor="end"
            className="fill-slate-500 text-[10px]"
          >
            {zenyShort(Math.round(t))}
          </text>
        </g>
      ))}

      <path d={line((p) => p.avg)} className="stroke-slate-500" strokeWidth={1.5} fill="none" strokeDasharray="4 3" />
      <path d={line((p) => p.min)} className="stroke-emerald-400" strokeWidth={2} fill="none" />

      {points.map((p, i) => (
        <circle key={p.date} cx={x(i)} cy={y(p.min)} r={2.5} className="fill-emerald-300">
          <title>{`${p.date}: low ${zenyShort(p.min)}, avg ${zenyShort(p.avg)}, ${p.listings} listing(s)`}</title>
        </circle>
      ))}

      <text x={pad.left} y={height - 6} className="fill-slate-500 text-[10px]">
        {first}
      </text>
      <text x={width - pad.right} y={height - 6} textAnchor="end" className="fill-slate-500 text-[10px]">
        {last}
      </text>
    </svg>
  );
}
