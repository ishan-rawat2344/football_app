/**
 * Small, dependency-free SVG charts. Specs (dataviz skill): 2px lines,
 * ≥8px markers with a 2px surface ring, hairline recessive grid, bars ≤24px
 * with a 4px rounded data end, text in text colours (never the series
 * colour), one series per chart, tap/hover tooltip on every chart.
 */
import { useRef, useState, type PointerEvent } from 'react';
import { daysBetween, formatShort, fromISODate, type ISODate } from '../lib/dates';

const W = 320;

const shortDate = (iso: ISODate) => fromISODate(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

function niceTicks(min: number, max: number, count = 3): number[] {
  if (min === max) return [min];
  const span = max - min;
  const step0 = span / count;
  const mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count) ?? step0;
  const start = Math.ceil(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + 1e-9; v += step) ticks.push(Math.round(v * 1000) / 1000);
  return ticks;
}

/** Keep a tooltip inside the chart: anchor it left/right near the edges. */
function tipStyle(xPct: number, yPct: number) {
  const tx = xPct > 70 ? '-100%' : xPct < 30 ? '0%' : '-50%';
  return { left: `${xPct}%`, top: `${yPct}%`, transform: `translate(${tx}, calc(-100% - 12px))` };
}

function useTooltip() {
  const [active, setActive] = useState<number | null>(null);
  return { active, setActive };
}

export interface LinePoint {
  x: ISODate;
  y: number;
}

/** One series over time, with an optional target line and a highlighted point (e.g. a PB). */
export function LineChart({
  points,
  format,
  target,
  highlight,
  height = 170,
  label,
}: {
  points: LinePoint[];
  format: (n: number) => string;
  target?: { value: number; label: string };
  /** Index of a point to mark (personal best). */
  highlight?: { index: number; label: string };
  height?: number;
  /** Accessible summary. */
  label: string;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const { active, setActive } = useTooltip();
  if (!points.length) return null;

  // A target gets its own right-hand gutter, so its label never sits on the data.
  const pad = { l: 38, r: target ? 46 : 16, t: 14, b: 26 };
  const ys = points.map((p) => p.y).concat(target ? [target.value] : []);
  let lo = Math.min(...ys);
  let hi = Math.max(...ys);
  if (lo === hi) {
    lo -= Math.max(1, Math.abs(lo) * 0.1);
    hi += Math.max(1, Math.abs(hi) * 0.1);
  }
  const margin = (hi - lo) * 0.12;
  lo -= margin;
  hi += margin;
  const ticks = niceTicks(lo, hi);
  lo = Math.min(lo, ticks[0] ?? lo);
  hi = Math.max(hi, ticks.at(-1) ?? hi);

  const first = points[0]!.x;
  const span = Math.max(1, daysBetween(first, points.at(-1)!.x));
  const x = (p: LinePoint) =>
    points.length === 1 ? (pad.l + W - pad.r) / 2 : pad.l + (daysBetween(first, p.x) / span) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - lo) / (hi - lo)) * (height - pad.t - pad.b);

  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(p).toFixed(1)},${y(p.y).toFixed(1)}`).join(' ');

  function onMove(e: PointerEvent<SVGRectElement>) {
    const svg = ref.current;
    if (!svg) return;
    const box = svg.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    let best = 0;
    points.forEach((p, i) => {
      if (Math.abs(x(p) - px) < Math.abs(x(points[best]!) - px)) best = i;
    });
    setActive(best);
  }

  const a = active !== null ? points[active] : undefined;
  const last = points.at(-1)!;

  return (
    <div className="chart">
      <svg ref={ref} viewBox={`0 0 ${W} ${height}`} role="img" aria-label={label} className="chart__svg">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="chart__grid" />
            <text x={pad.l - 6} y={y(t) + 4} className="chart__tick" textAnchor="end">
              {format(t)}
            </text>
          </g>
        ))}
        {target && (
          <g>
            <line x1={pad.l} x2={W - pad.r} y1={y(target.value)} y2={y(target.value)} className="chart__target" />
            <text x={W - 2} y={y(target.value) + 3.5} className="chart__note" textAnchor="end">
              {target.label}
            </text>
          </g>
        )}
        {a && <line x1={x(a)} x2={x(a)} y1={pad.t} y2={height - pad.b} className="chart__cross" />}
        <path d={path} className="chart__line" />
        {points.map((p, i) => (
          <circle
            key={`${p.x}-${i}`}
            cx={x(p)}
            cy={y(p.y)}
            r={highlight?.index === i ? 6 : 4.5}
            className={highlight?.index === i ? 'chart__dot chart__dot--pb' : 'chart__dot'}
          />
        ))}
        {highlight && points[highlight.index] && (
          <text
            x={x(points[highlight.index]!)}
            y={y(points[highlight.index]!.y) - 11}
            className="chart__note chart__note--strong"
            textAnchor="middle"
          >
            {highlight.label}
          </text>
        )}
        <text x={pad.l} y={height - 6} className="chart__tick">
          {shortDate(first)}
        </text>
        {points.length > 1 && (
          <text x={W - pad.r} y={height - 6} className="chart__tick" textAnchor="end">
            {shortDate(last.x)}
          </text>
        )}
        <rect
          x={pad.l - 10}
          y={0}
          width={W - pad.l - pad.r + 20}
          height={height}
          fill="transparent"
          onPointerDown={onMove}
          onPointerMove={onMove}
          onPointerLeave={() => setActive(null)}
        />
      </svg>
      {a && (
        <div
          className="chart__tip"
          style={tipStyle((x(a) / W) * 100, (y(a.y) / height) * 100)}
          role="status"
        >
          <strong>{format(a.y)}</strong>
          <span>{formatShort(a.x)}</span>
        </div>
      )}
    </div>
  );
}

export interface Bar {
  key: string;
  label: string;
  value: number;
  /** Extra line in the tooltip. */
  detail?: string;
  /** Draw lighter (e.g. the week in progress). */
  partial?: boolean;
}

/** Columns from one baseline. */
export function BarChart({
  bars,
  format,
  height = 160,
  label,
}: {
  bars: Bar[];
  format: (n: number) => string;
  height?: number;
  label: string;
}) {
  const { active, setActive } = useTooltip();
  const pad = { l: 38, r: 8, t: 12, b: 24 };
  const max = Math.max(1, ...bars.map((b) => b.value));
  const ticks = niceTicks(0, max);
  const top = Math.max(max, ticks.at(-1) ?? max);
  const slot = (W - pad.l - pad.r) / Math.max(1, bars.length);
  const bw = Math.min(24, slot - 2); // ≤24px, at least a 2px gap
  const y = (v: number) => pad.t + (1 - v / top) * (height - pad.t - pad.b);
  const base = y(0);

  const column = (cx: number, v: number) => {
    const h = base - y(v);
    if (h <= 0) return '';
    const r = Math.min(4, h, bw / 2);
    const x0 = cx - bw / 2;
    const x1 = cx + bw / 2;
    const yt = base - h;
    // square at the baseline, 4px rounded data end
    return `M${x0},${base} V${yt + r} Q${x0},${yt} ${x0 + r},${yt} H${x1 - r} Q${x1},${yt} ${x1},${yt + r} V${base} Z`;
  };

  const a = active !== null ? bars[active] : undefined;
  const cx = (i: number) => pad.l + slot * i + slot / 2;

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${height}`} role="img" aria-label={label} className="chart__svg">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="chart__grid" />
            <text x={pad.l - 6} y={y(t) + 4} className="chart__tick" textAnchor="end">
              {format(t)}
            </text>
          </g>
        ))}
        {bars.map((b, i) => (
          <g key={b.key}>
            <path d={column(cx(i), b.value)} className={b.partial ? 'chart__bar chart__bar--partial' : 'chart__bar'} />
            {(i === 0 || i === bars.length - 1 || bars.length <= 5) && (
              <text x={cx(i)} y={height - 6} className="chart__tick" textAnchor="middle">
                {b.label}
              </text>
            )}
            <rect
              x={pad.l + slot * i}
              y={0}
              width={slot}
              height={height}
              fill="transparent"
              onPointerDown={() => setActive(i)}
              onPointerEnter={() => setActive(i)}
              onPointerLeave={() => setActive(null)}
            />
          </g>
        ))}
      </svg>
      {a && active !== null && (
        <div className="chart__tip" style={tipStyle((cx(active) / W) * 100, (y(a.value) / height) * 100)} role="status">
          <strong>{format(a.value)}</strong>
          <span>{a.label}</span>
          {a.detail && <span>{a.detail}</span>}
        </div>
      )}
    </div>
  );
}

/** A tiny trend line for list rows (no axes; the row shows the numbers). */
export function Sparkline({ values, width = 72, height = 24 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) return null;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const px = (i: number) => 3 + (i / (values.length - 1)) * (width - 6);
  const py = (v: number) => 3 + (1 - (v - lo) / span) * (height - 6);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="spark">
      <path d={d} className="chart__line" />
      <circle cx={px(values.length - 1)} cy={py(values.at(-1)!)} r={3} className="chart__dot" />
    </svg>
  );
}
