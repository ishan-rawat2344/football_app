import { describe, expect, it } from 'vitest';
import { CUES, nextCue } from '../drills/cues';
import { getDrill } from '../drills/library';
import type { PlannedBlock } from '../plan/types';
import {
  buildRunItems,
  initRun,
  needsLightVersion,
  runReducer,
  runStatus,
  secondsLeft,
  type RunAction,
  type RunState,
} from './run';

const blocks: PlannedBlock[] = [
  { block: 'warmup', items: [{ drillId: 'warmup-home', level: 0, minutes: 3 }] }, // 6 × 30 s timed
  { block: 'technical', items: [{ drillId: 'bm-croqueta', level: 0, minutes: 8 }] }, // 3 sets, rep-based
  { block: 'physical', items: [{ drillId: 'sp-acceleration', level: 0, minutes: 10 }] }, // speed, high
];

const T0 = 1_000_000;
const play = (s: RunState, ...actions: RunAction[]) => actions.reduce(runReducer, s);

describe('session run', () => {
  it('flattens blocks into drills with their dose', () => {
    const items = buildRunItems(blocks, false);
    expect(items.map((i) => i.drillId)).toEqual(['warmup-home', 'bm-croqueta', 'sp-acceleration']);
    expect(items[0]).toMatchObject({ sets: 6, workSec: 30, restSec: 5 });
    expect(items[1]).toMatchObject({ sets: 3, restSec: 30 });
    expect(items[1]!.workSec).toBeUndefined();
  });

  it('timed work and rest run on the clock, then the drill moves on', () => {
    let s = initRun({ date: '2026-11-23', kind: 'home', blocks, now: T0 });
    expect(s.phase).toBe('work');
    expect(secondsLeft(s, T0)).toBe(30);
    s = runReducer(s, { type: 'tick', now: T0 + 30_000 });
    expect(s.phase).toBe('rest');
    expect(secondsLeft(s, T0 + 30_000)).toBe(5);
    s = runReducer(s, { type: 'tick', now: T0 + 35_000 });
    expect(s).toMatchObject({ phase: 'work', set: 2 });
  });

  it('pause freezes the clock and resume picks up where it stopped', () => {
    let s = initRun({ date: '2026-11-23', kind: 'home', blocks, now: T0 });
    s = play(s, { type: 'pause', now: T0 + 10_000 }, { type: 'tick', now: T0 + 90_000 });
    expect(s.phase).toBe('work');
    expect(secondsLeft(s, T0 + 90_000)).toBe(20);
    s = runReducer(s, { type: 'resume', now: T0 + 90_000 });
    expect(secondsLeft(s, T0 + 95_000)).toBe(15);
  });

  it('a warm-up is not rated; a technical drill is, then the session ends', () => {
    let s = initRun({ date: '2026-11-23', kind: 'home', blocks, now: T0 });
    // finish the warm-up quickly: 6 timed sets
    for (let i = 0; i < 6; i++) s = play(s, { type: 'setDone', now: T0 }, { type: 'skipRest', now: T0 });
    expect(s.items[s.index]!.drillId).toBe('bm-croqueta');
    // rep-based: tap "set done" three times (skipping rests)
    s = play(s, { type: 'setDone', now: T0 }, { type: 'skipRest', now: T0 }, { type: 'setDone', now: T0 }, { type: 'skipRest', now: T0 }, { type: 'setDone', now: T0 });
    expect(s.phase).toBe('rate');
    s = runReducer(s, { type: 'rate', rating: 'easy', now: T0 });
    expect(s.ratings['bm-croqueta']).toBe('easy');
    expect(s.items[s.index]!.drillId).toBe('sp-acceleration');
    s = runReducer(s, { type: 'skipDrill', now: T0 + 60_000 });
    expect(s.phase).toBe('done');
    expect(runStatus(s)).toBe('partial');
  });

  it('ending early is a partial session', () => {
    const s = runReducer(initRun({ date: '2026-11-23', kind: 'home', blocks, now: T0 }), { type: 'end', now: T0 + 1 });
    expect(s.phase).toBe('done');
    expect(runStatus(s)).toBe('partial');
  });

  it('a pain report can skip the drills that load that area, including the current one', () => {
    let s = initRun({ date: '2026-11-23', kind: 'home', blocks, now: T0 });
    s = runReducer(s, { type: 'skipDrills', drillIds: ['warmup-home', 'sp-acceleration'], now: T0 });
    expect(s.items[s.index]!.drillId).toBe('bm-croqueta');
    s = play(s, { type: 'setDone', now: T0 }, { type: 'skipRest', now: T0 }, { type: 'setDone', now: T0 }, { type: 'skipRest', now: T0 }, { type: 'setDone', now: T0 }, { type: 'rate', rating: 'right', now: T0 });
    expect(s.phase).toBe('done'); // acceleration was skipped automatically
  });
});

describe('readiness', () => {
  it('goes light on real soreness, or two warning signs', () => {
    expect(needsLightVersion({ sleep: 'good', legs: 'fresh', soreness: 'none' })).toBe(false);
    expect(needsLightVersion({ sleep: 'poor', legs: 'ok', soreness: 'none' })).toBe(false);
    expect(needsLightVersion({ sleep: 'poor', legs: 'heavy', soreness: 'none' })).toBe(true);
    expect(needsLightVersion({ sleep: 'good', legs: 'fresh', soreness: 'sore' })).toBe(true);
  });

  it('the light version drops flat-out speed work and cuts sets, but keeps the warm-up', () => {
    const items = buildRunItems(blocks, true);
    expect(items.map((i) => i.drillId)).toEqual(['warmup-home', 'bm-croqueta']);
    expect(items[0]!.sets).toBe(6);
    expect(items[1]!.sets).toBe(2); // 3 × 0.6 rounded
  });
});

describe('cue caller', () => {
  it('only uses drills that exist', () => {
    for (const id of Object.keys(CUES)) expect(getDrill(id), id).toBeDefined();
  });

  it('never repeats the same cue twice in a row when there is a choice, and stays in the time window', () => {
    const set = CUES['1v1-gates-on-call']!;
    let last: string | null = null;
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 50; i++) {
      const c = nextCue(set, last, rand);
      expect(c.word).not.toBe(last);
      expect(c.delayMs).toBeGreaterThanOrEqual(set.every[0] * 1000);
      expect(c.delayMs).toBeLessThanOrEqual(set.every[1] * 1000);
      last = c.word;
    }
  });
});
