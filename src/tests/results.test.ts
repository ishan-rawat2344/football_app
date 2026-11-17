import { describe, expect, it } from 'vitest';
import type { TestResult } from '../db/types';
import { formatValue, getTest, TESTS } from './defs';
import { dueTests, footRatio, isNewPB, personalBest, trend, weeklyLoads } from './results';

const r = (testId: string, date: string, value: number, id = 1): TestResult => ({ id, testId, date, value });
const sprint = getTest('sprint-30')!;
const wall = getTest('wall-left-60')!;

describe('test definitions', () => {
  it('all 9 tests are complete and have sensible ranges', () => {
    expect(TESTS).toHaveLength(9);
    expect(new Set(TESTS.map((t) => t.id)).size).toBe(9);
    for (const t of TESTS) {
      expect(t.steps.length, t.id).toBeGreaterThanOrEqual(2);
      expect(t.max, t.id).toBeGreaterThan(t.min);
      expect(t.fair.length, t.id).toBeGreaterThan(10);
      if (t.outOfTen) expect(t.max).toBe(10);
    }
  });

  it('formats values with their unit', () => {
    expect(formatValue(sprint, 4.5)).toBe('4.50 s');
    expect(formatValue(wall, 42)).toBe('42 passes');
    expect(formatValue(getTest('crossing-10')!, 6)).toBe('6/10');
  });
});

describe('personal bests', () => {
  const rs = [r('sprint-30', '2026-11-01', 4.6, 1), r('sprint-30', '2026-11-29', 4.42, 2), r('sprint-30', '2026-12-27', 4.5, 3)];

  it('lower is better for times', () => {
    expect(personalBest(sprint, rs)?.value).toBe(4.42);
    expect(isNewPB(sprint, rs, 4.41)).toBe(true);
    expect(isNewPB(sprint, rs, 4.42)).toBe(false); // equalling is not a new PB
  });

  it('higher is better for counts', () => {
    const w = [r('wall-left-60', '2026-11-01', 30, 1), r('wall-left-60', '2026-11-29', 38, 2)];
    expect(personalBest(wall, w)?.value).toBe(38);
    expect(isNewPB(wall, w, 39)).toBe(true);
  });

  it('the first result is always a PB', () => {
    expect(isNewPB(sprint, [], 6)).toBe(true);
  });

  it('trend reports improvement signed so positive is better', () => {
    expect(trend(sprint, rs).improvement).toBeCloseTo(0.1, 5); // 4.6 → 4.5
    const w = [r('wall-left-60', '2026-11-01', 30, 1), r('wall-left-60', '2026-11-29', 38, 2)];
    expect(trend(wall, w).improvement).toBe(8);
    expect(trend(wall, [w[0]!]).improvement).toBeNull();
  });
});

describe('due tests', () => {
  it('everything is due before the first test day', () => {
    expect(dueTests([], '2026-11-17')).toHaveLength(9);
  });

  it('a test is due again 4 weeks after it was done', () => {
    const rs = [r('plank', '2026-11-01', 40)];
    expect(dueTests(rs, '2026-11-28').some((d) => d.test.id === 'plank')).toBe(false);
    expect(dueTests(rs, '2026-11-29').some((d) => d.test.id === 'plank')).toBe(true);
  });
});

describe('foot ratio', () => {
  it('compares left and right from the same day', () => {
    const rs = [r('wall-left-60', '2026-11-17', 24, 1), r('wall-right-60', '2026-11-17', 40, 2)];
    expect(footRatio(rs)?.ratio).toBeCloseTo(0.6);
    expect(footRatio([r('wall-left-60', '2026-11-17', 24)])).toBeNull();
  });
});

describe('weekly load', () => {
  it('sums each Monday-to-Sunday week, including games', () => {
    const weeks = weeklyLoads(
      [
        { date: '2026-11-16', status: 'done', sessionType: 'groundHard', minutes: 60, rpe: 7 },
        { date: '2026-11-18', status: 'skipped', sessionType: 'home', minutes: 0 },
      ],
      [{ date: '2026-11-19', status: 'played' }],
      [{ date: '2026-11-19', minutes: 60, rpe: 8 }],
      '2026-11-20',
      2,
    );
    expect(weeks).toHaveLength(2);
    expect(weeks[1]).toEqual({ week: '2026-11-16', load: 420 + 480, sessions: 1 });
    expect(weeks[0]!.load).toBe(0);
  });
});
