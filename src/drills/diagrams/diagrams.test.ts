import { describe, expect, it } from 'vitest';
import { DRILLS, getDrill } from '../library';
import { allPoints, ballPoint, frameStates, samplePath, wavy } from './geometry';
import { DIAGRAMS, NO_DIAGRAM } from './index';
import type { DrillDiagram } from './types';

describe('drill diagrams', () => {
  it('every layout drill has a diagram, and body exercises do not', () => {
    for (const d of DRILLS) {
      if (NO_DIAGRAM.has(d.id)) expect(DIAGRAMS[d.id], d.id).toBeUndefined();
      else expect(DIAGRAMS[d.id], d.id).toBeDefined();
    }
  });

  it('every diagram belongs to a drill and its frames point at real steps, in order', () => {
    for (const [id, dg] of Object.entries(DIAGRAMS)) {
      const drill = getDrill(id);
      expect(drill, id).toBeDefined();
      expect(dg.frames.length, id).toBeGreaterThan(0);
      let prev = -1;
      for (const f of dg.frames) {
        expect(f.step, id).toBeGreaterThan(prev);
        expect(f.step, id).toBeLessThan(drill!.steps.length);
        prev = f.step;
      }
    }
  });

  it('everything is drawn inside its area', () => {
    for (const [id, dg] of Object.entries(DIAGRAMS)) {
      for (const [x, y] of allPoints(dg)) {
        expect(x, `${id} x=${x}`).toBeGreaterThanOrEqual(0);
        expect(y, `${id} y=${y}`).toBeGreaterThanOrEqual(0);
        expect(x, `${id} x=${x}`).toBeLessThanOrEqual(dg.size[0]);
        expect(y, `${id} y=${y}`).toBeLessThanOrEqual(dg.size[1]);
      }
    }
  });

  it('a partner only moves in diagrams that have one', () => {
    for (const [id, dg] of Object.entries(DIAGRAMS)) {
      const partnerMoves = dg.frames.flatMap((f) => f.moves ?? []).filter((m) => m.by === 'partner' && m.type !== 'pass');
      if (partnerMoves.length) expect(dg.start.partner, id).toBeDefined();
    }
  });
});

describe('diagram geometry', () => {
  const dg: DrillDiagram = {
    surface: 'pitch',
    size: [10, 10],
    items: [],
    start: { me: [5, 9], ball: 'me' },
    frames: [
      { step: 0, moves: [{ type: 'dribble', path: [[5, 9], [5, 5]] }] },
      { step: 1, moves: [{ type: 'pass', path: [[5, 5], [8, 1]] }] },
      { step: 2, moves: [{ type: 'run', path: [[5, 5], [8, 2]] }] },
    ],
  };

  it('works out where everyone is after each frame', () => {
    const s = frameStates(dg);
    expect(s).toHaveLength(4);
    expect(s[1]).toMatchObject({ me: [5, 5], ball: 'me' });
    expect(s[2]).toMatchObject({ me: [5, 5], ball: [8, 1] });
    expect(s[3]).toMatchObject({ me: [8, 2], ball: [8, 1] });
    expect(ballPoint(s[1]!)).toEqual([5, 5]);
  });

  it('a run leaves the ball where it was', () => {
    const s = frameStates({ ...dg, frames: [{ step: 0, moves: [{ type: 'run', path: [[5, 9], [5, 2]] }] }] });
    expect(s[1]).toMatchObject({ me: [5, 2], ball: [5, 9] });
  });

  it('curves pass through their points, and wavy lines end where the path ends', () => {
    const c = samplePath([[0, 0], [5, 5], [10, 0]], true);
    expect(c[0]).toEqual([0, 0]);
    expect(c.at(-1)).toEqual([10, 0]);
    expect(c.some(([x, y]) => Math.abs(x - 5) < 0.01 && Math.abs(y - 5) < 0.01)).toBe(true);
    const w = wavy([[0, 0], [0, 50]], 3, 10);
    expect(w.at(-1)).toEqual([0, 50]);
    expect(Math.max(...w.map(([x]) => Math.abs(x)))).toBeGreaterThan(2);
  });
});
