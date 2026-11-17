/** Pure helpers for drawing diagrams: state per frame, curves and wavy lines. */
import type { BallAt, DrillDiagram, Move, Pt } from './types';

export interface FrameState {
  me: Pt;
  partner?: Pt;
  ball: BallAt;
}

/**
 * Positions for the set-up view (index 0) and after each frame (1..n).
 * A dribble moves the player and keeps the ball at their feet; a run moves
 * the player and leaves the ball; a pass or shot sends the ball to the end
 * of its path. Explicit positions on a frame win.
 */
export function frameStates(d: DrillDiagram): FrameState[] {
  let s: FrameState = { me: d.start.me, partner: d.start.partner, ball: d.start.ball ?? null };
  const out: FrameState[] = [s];
  for (const f of d.frames) {
    const next: FrameState = { ...s };
    for (const m of f.moves ?? []) {
      const end = m.path[m.path.length - 1]!;
      const who = m.by ?? 'me';
      const pos = (w: 'me' | 'partner') => (w === 'me' ? next.me : next.partner);
      if (m.type === 'dribble') {
        if (who === 'me') next.me = end;
        else next.partner = end;
        next.ball = who;
      } else if (m.type === 'run') {
        // leaving the ball behind if it was at your feet
        if (next.ball === who) next.ball = pos(who) ?? null;
        if (who === 'me') next.me = end;
        else next.partner = end;
      } else if (m.type === 'pass' || m.type === 'shot') {
        next.ball = end;
      }
    }
    if (f.me) next.me = f.me;
    if (f.partner) next.partner = f.partner;
    if (f.ball !== undefined) next.ball = f.ball;
    out.push(next);
    s = next;
  }
  return out;
}

/** Where the ball is drawn. At someone's feet it sits just ahead of them. */
export function ballPoint(state: FrameState): Pt | null {
  const b = state.ball;
  if (b === null || b === undefined) return null;
  if (b === 'me') return state.me;
  if (b === 'partner') return state.partner ?? null;
  return b;
}

/** Points along a smooth curve through `pts` (Catmull-Rom), or the polyline itself. */
export function samplePath(pts: Pt[], curve = false, perSegment = 12): Pt[] {
  if (pts.length < 3 || !curve) return pts;
  const out: Pt[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[Math.min(pts.length - 1, i + 2)]!;
    for (let t = 0; t < 1; t += 1 / perSegment) {
      const t2 = t * t;
      const t3 = t2 * t;
      const c = (a: number, b: number, cc: number, dd: number) =>
        0.5 * (2 * b + (-a + cc) * t + (2 * a - 5 * b + 4 * cc - dd) * t2 + (-a + 3 * b - 3 * cc + dd) * t3);
      out.push([c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[pts.length - 1]!);
  return out;
}

const dist = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1]);

export function pathLength(pts: Pt[]): number {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += dist(pts[i - 1]!, pts[i]!);
  return l;
}

/**
 * A wavy version of a path (for dribbles). The wave fades out over the last
 * stretch so the arrowhead points the right way. Units are whatever `pts` use.
 */
export function wavy(pts: Pt[], amplitude: number, wavelength: number): Pt[] {
  const total = pathLength(pts);
  if (total === 0) return pts;
  const step = wavelength / 8;
  const out: Pt[] = [];
  let travelled = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    const len = dist(a, b);
    if (len === 0) continue;
    const ux = (b[0] - a[0]) / len;
    const uy = (b[1] - a[1]) / len;
    for (let s = 0; s < len; s += step) {
      const along = travelled + s;
      const fade = Math.min(1, (total - along) / (wavelength * 0.75), along / (wavelength * 0.25));
      const off = amplitude * Math.max(0, fade) * Math.sin((2 * Math.PI * along) / wavelength);
      out.push([a[0] + ux * s - uy * off, a[1] + uy * s + ux * off]);
    }
    travelled += len;
  }
  out.push(pts[pts.length - 1]!);
  return out;
}

export function toPathD(pts: Pt[]): string {
  return pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
}

/** Every point a diagram uses, to check it stays inside its area. */
export function allPoints(d: DrillDiagram): Pt[] {
  const pts: Pt[] = [d.start.me];
  if (d.start.partner) pts.push(d.start.partner);
  if (Array.isArray(d.start.ball)) pts.push(d.start.ball);
  for (const it of d.items) {
    if ('at' in it) pts.push(it.at);
    if ('from' in it) pts.push(it.from, it.to);
    if (it.kind === 'zone') pts.push([it.at[0] + it.size[0], it.at[1] + it.size[1]]);
  }
  for (const f of d.frames) {
    for (const m of f.moves ?? []) pts.push(...m.path);
    if (f.me) pts.push(f.me);
    if (f.partner) pts.push(f.partner);
    if (Array.isArray(f.ball)) pts.push(f.ball);
  }
  return pts;
}

export const movesUsed = (d: DrillDiagram) => new Set<Move['type']>(d.frames.flatMap((f) => (f.moves ?? []).map((m) => m.type)));
