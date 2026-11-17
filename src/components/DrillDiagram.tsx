import { createContext, useContext, useEffect, useId, useMemo, useState } from 'react';
import { ballPoint, frameStates, movesUsed, samplePath, toPathD, wavy } from '../drills/diagrams/geometry';
import type { DrillDiagram, Item, LabelPos, Move, MoveType, Pt } from '../drills/diagrams/types';
import type { Drill } from '../drills/types';

const PAD = 18;
const PLAY_MS = 2600;

const LEGEND: Record<MoveType, string> = {
  dribble: 'Dribble',
  run: 'Run',
  pass: 'Pass',
  shot: 'Shot',
  feint: 'Fake',
  look: 'Look',
};

/** The drawable range (content coordinates), so labels can stay inside it. */
const Bounds = createContext({ minX: 0, maxX: 300 });

/** Rough width of a label in px (11px semi-bold). */
const textWidth = (t: string) => t.length * 6.2;

/** Pixels per metre, so the picture fits a phone screen whatever its shape. */
function scaleFor(size: Pt) {
  return Math.min(300 / size[0], 330 / size[1]);
}

function Label({ x, y, text, pos = 'right', gap = 9 }: { x: number; y: number; text: string; pos?: LabelPos; gap?: number }) {
  const { minX, maxX } = useContext(Bounds);
  const w = textWidth(text);
  // Flip to the other side when a label would run off the edge.
  if (pos === 'right' && x + gap + w > maxX && x - gap - w >= minX) pos = 'left';
  else if (pos === 'left' && x - gap - w < minX && x + gap + w <= maxX) pos = 'right';
  if (pos === 'above' || pos === 'below') x = Math.max(minX + w / 2, Math.min(maxX - w / 2, x));
  const at = (
    {
      right: { x: x + gap, y: y + 4, anchor: 'start' },
      left: { x: x - gap, y: y + 4, anchor: 'end' },
      above: { x, y: y - gap - 2, anchor: 'middle' },
      below: { x, y: y + gap + 10, anchor: 'middle' },
    } as const
  )[pos];
  return (
    <text className="dg__label" x={at.x} y={at.y} textAnchor={at.anchor}>
      {text}
    </text>
  );
}

function Cone({ x, y, size }: { x: number; y: number; size: number }) {
  return (
    <polygon
      className="dg__cone"
      points={`${x},${y - size} ${x + size * 0.9},${y + size * 0.6} ${x - size * 0.9},${y + size * 0.6}`}
    />
  );
}

function ItemView({ it, k }: { it: Item; k: number }) {
  const p = (q: Pt) => [q[0] * k, q[1] * k] as const;
  switch (it.kind) {
    case 'cone': {
      const [x, y] = p(it.at);
      return (
        <g>
          <Cone x={x} y={y} size={6} />
          {it.label && <Label x={x} y={y} text={it.label} pos={it.labelPos} />}
        </g>
      );
    }
    case 'defender': {
      const [x, y] = p(it.at);
      return (
        <g>
          <Cone x={x} y={y} size={10} />
          {it.label && <Label x={x} y={y} text={it.label} pos={it.labelPos} gap={13} />}
        </g>
      );
    }
    case 'gate': {
      const [x, y] = p(it.at);
      const half = (it.width * k) / 2;
      const [dx, dy] = it.dir === 'v' ? [0, half] : [half, 0];
      return (
        <g>
          <Cone x={x - dx} y={y - dy} size={6} />
          <Cone x={x + dx} y={y + dy} size={6} />
          {it.label && <Label x={x + dx} y={y + dy} text={it.label} pos={it.labelPos} />}
        </g>
      );
    }
    case 'goal': {
      const [x, y] = p(it.at);
      const w = it.width * k;
      const depth = it.facing === 'up' ? 10 : -10;
      return (
        <g>
          <rect
            className="dg__net"
            x={x - w / 2}
            y={Math.min(y, y + depth)}
            width={w}
            height={Math.abs(depth)}
          />
          <line className="dg__goal" x1={x - w / 2} y1={y} x2={x + w / 2} y2={y} />
          {it.label && (
            <Label
              x={it.labelPos === 'left' ? x - w / 2 : it.labelPos === 'right' ? x + w / 2 : x}
              y={y}
              text={it.label}
              pos={it.labelPos ?? 'below'}
              gap={it.labelPos === 'left' || it.labelPos === 'right' ? 8 : 6}
            />
          )}
        </g>
      );
    }
    case 'wall': {
      const [x1, y1] = p(it.from);
      const [x2, y2] = p(it.to);
      const t = it.target;
      return (
        <g>
          <line className="dg__wall" x1={x1} y1={y1} x2={x2} y2={y2} />
          {t && (
            <line
              className="dg__target"
              x1={t.at[0] * k - (t.width * k) / 2}
              y1={t.at[1] * k}
              x2={t.at[0] * k + (t.width * k) / 2}
              y2={t.at[1] * k}
            />
          )}
          {it.label && <Label x={(x1 + x2) / 2} y={(y1 + y2) / 2} text={it.label} pos={it.labelPos ?? 'below'} gap={6} />}
        </g>
      );
    }
    case 'line': {
      const [x1, y1] = p(it.from);
      const [x2, y2] = p(it.to);
      return (
        <g>
          <line className={`dg__line ${it.dashed ? 'dg__line--dashed' : ''}`} x1={x1} y1={y1} x2={x2} y2={y2} />
          {it.label && <Label x={(x1 + x2) / 2} y={(y1 + y2) / 2} text={it.label} pos={it.labelPos} gap={6} />}
        </g>
      );
    }
    case 'zone': {
      const [x, y] = p(it.at);
      const w = it.size[0] * k;
      const h = it.size[1] * k;
      return (
        <g>
          <rect className="dg__zone" x={x} y={y} width={w} height={h} rx={3} />
          {it.label && <Label x={x + w / 2} y={y + h / 2} text={it.label} pos={it.labelPos ?? 'below'} gap={h / 2 + 2} />}
        </g>
      );
    }
    case 'text': {
      const [x, y] = p(it.at);
      return <Label x={x} y={y + 6} text={it.text} pos="above" gap={0} />;
    }
  }
}

function MoveView({ m, k, ids, state }: { m: Move; k: number; ids: Record<string, string>; state: 'now' | 'past' }) {
  const px = m.path.map((q) => [q[0] * k, q[1] * k] as Pt);
  let pts = samplePath(px, m.curve);
  if (m.type === 'dribble') pts = wavy(pts, 3.2, 13);
  const who = m.by === 'partner' ? 'partner' : 'me';
  const marker = m.type === 'look' ? undefined : `url(#${m.type === 'feint' ? ids.feint : who === 'partner' ? ids.partner : ids.ink})`;
  return (
    <path
      className={`dg__move dg__move--${m.type} dg__move--${who} dg__move--${state}`}
      d={toPathD(pts)}
      markerEnd={marker}
    />
  );
}

function Swatch({ type }: { type: MoveType }) {
  const d = type === 'dribble' ? toPathD(wavy([[2, 7], [30, 7]], 2.6, 10)) : 'M2 7 L30 7';
  return (
    <svg width="34" height="14" aria-hidden="true">
      <path className={`dg__move dg__move--${type}`} d={d} />
    </svg>
  );
}

/**
 * The step-by-step diagram for a drill: the set-up first, then one frame per
 * step. Next/Back move through it; Play steps through on its own.
 */
export function DrillDiagramView({ drill, diagram, startAtEnd = false }: { drill: Drill; diagram: DrillDiagram; startAtEnd?: boolean }) {
  const uid = useId().replace(/:/g, '');
  const ids = { ink: `dg-ink-${uid}`, partner: `dg-partner-${uid}`, feint: `dg-feint-${uid}` };
  const states = useMemo(() => frameStates(diagram), [diagram]);
  const used = useMemo(() => [...movesUsed(diagram)], [diagram]);
  const last = diagram.frames.length;
  const [view, setView] = useState(startAtEnd ? last : 0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    if (view >= last) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setView((v) => v + 1), view === 0 ? 1200 : PLAY_MS);
    return () => clearTimeout(t);
  }, [playing, view, last]);

  const k = scaleFor(diagram.size);
  const W = diagram.size[0] * k + PAD * 2;
  const H = diagram.size[1] * k + PAD * 2;
  const s = states[view]!;
  const ball = ballPoint(s);
  const atFeet = s.ball === 'me' || s.ball === 'partner';
  const frame = view > 0 ? diagram.frames[view - 1] : undefined;
  const caption = frame ? drill.steps[frame.step] : drill.setup;
  const title = frame ? `Step ${frame.step + 1}` : 'Set-up';

  function go(v: number) {
    setPlaying(false);
    setView(Math.max(0, Math.min(last, v)));
  }

  function play() {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (view >= last) setView(0);
    setPlaying(true);
  }

  const pos = (q: Pt) => ({ transform: `translate(${q[0] * k}px, ${q[1] * k}px)` });
  // Arrows shown: from the latest frame that starts a new rep up to now.
  let from = 0;
  for (let i = view - 1; i >= 0; i--) {
    if (diagram.frames[i]!.reset) {
      from = i;
      break;
    }
  }
  const bounds = { minX: -PAD + 3, maxX: diagram.size[0] * k + PAD - 3 };

  return (
    <div className="dg-wrap">
      <svg
        className={`dg dg--${diagram.surface}`}
        viewBox={`0 0 ${W.toFixed(0)} ${H.toFixed(0)}`}
        width={Math.round(W)}
        height={Math.round(H)}
        role="img"
        aria-label={`Diagram of ${drill.name}. ${title}.`}
      >
        <defs>
          {(
            [
              [ids.ink, 'dg__head--ink'],
              [ids.partner, 'dg__head--partner'],
              [ids.feint, 'dg__head--feint'],
            ] as const
          ).map(([id, cls]) => (
            <marker key={id} id={id} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path className={cls} d="M1 1 L9 5 L1 9 Z" />
            </marker>
          ))}
        </defs>
        <rect className="dg__bg" x="0" y="0" width={W} height={H} rx="12" />
        <Bounds.Provider value={bounds}>
        <g transform={`translate(${PAD} ${PAD})`}>
          {diagram.items.map((it, i) => (
            <ItemView key={i} it={it} k={k} />
          ))}

          {diagram.frames.slice(from, view).map((f, j) =>
            (f.moves ?? []).map((m, mi) => (
              <MoveView key={`${from + j}-${mi}`} m={m} k={k} ids={ids} state={from + j === view - 1 ? 'now' : 'past'} />
            )),
          )}

          {s.partner && (
            <g className="dg__actor" style={pos(s.partner)}>
              <circle className="dg__partner" r="8.5" />
              {view === 0 && <Label x={0} y={0} text="Partner" pos="right" gap={12} />}
            </g>
          )}
          <g className="dg__actor" style={pos(s.me)}>
            <circle className="dg__me" r="9" />
            {view === 0 && <Label x={0} y={0} text="You" pos="right" gap={12} />}
          </g>
          {ball && (
            <g className="dg__actor" style={pos(ball)}>
              <circle className="dg__ball" r="4.6" cx={atFeet ? 7 : 0} cy={atFeet ? -7 : 0} />
            </g>
          )}

        </g>
        </Bounds.Provider>
      </svg>

      <div className="dg-dots" role="group" aria-label="Steps">
        {Array.from({ length: last + 1 }, (_, i) => (
          <button
            key={i}
            type="button"
            className="dg-dot"
            aria-current={i === view ? 'step' : undefined}
            aria-label={i === 0 ? 'Set-up' : `Step ${diagram.frames[i - 1]!.step + 1}`}
            onClick={() => go(i)}
          />
        ))}
      </div>

      <div className="dg-controls">
        <button type="button" className="btn btn--small btn--secondary" onClick={() => go(view - 1)} disabled={view === 0} aria-label="Previous step">
          ‹
        </button>
        <button type="button" className="btn btn--small btn--primary dg-play" onClick={play}>
          {playing ? 'Pause' : view >= last ? 'Replay' : 'Play'}
        </button>
        <button type="button" className="btn btn--small btn--secondary" onClick={() => go(view + 1)} disabled={view === last} aria-label="Next step">
          ›
        </button>
      </div>

      <div className="dg-caption" aria-live="polite">
        <p className="dg-caption__title">{title}</p>
        {frame?.cue && <p className="dg-cue">{frame.cue}</p>}
        <p className="dg-caption__text">{caption}</p>
      </div>

      {used.length > 0 && (
        <div className="dg-legend" aria-hidden="true">
          {used.map((t) => (
            <span key={t}>
              <Swatch type={t} />
              {LEGEND[t]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
