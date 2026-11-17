import { describe, expect, it } from 'vitest';
import type { Game, HealthFlag, PainReport, SessionLog } from '../db/types';
import { addDays } from '../lib/dates';
import { describeRestriction, loadCheck, painLevel, painRestrictions, updateDrillState } from './adapt';

const T = '2026-11-25';
const pain = (date: string, area: PainReport['area'], score: number, when: PainReport['when'] = 'during', id = 1): PainReport => ({
  id,
  date,
  area,
  score,
  when,
});
const groin: HealthFlag = { id: 'g', title: 'Groin', areas: ['groinLeft', 'groinRight'], status: 'active', amberAt: 3, since: '', notes: '', rules: '' };

describe('pain traffic light', () => {
  it('green below amber, amber at 3–4, red at 5+', () => {
    expect(painLevel(pain(T, 'ankleRight', 2), [])).toBe('green');
    expect(painLevel(pain(T, 'ankleRight', 3), [])).toBe('amber');
    expect(painLevel(pain(T, 'ankleRight', 4), [])).toBe('amber');
    expect(painLevel(pain(T, 'ankleRight', 5), [])).toBe('red');
  });

  it('a note with a stricter amber score is respected', () => {
    const strict = { ...groin, amberAt: 2 };
    expect(painLevel(pain(T, 'groinLeft', 2), [strict])).toBe('amber');
  });

  it('pain still there the next morning is amber; pain at rest is red', () => {
    expect(painLevel(pain(T, 'groinLeft', 2, 'nextMorning'), [])).toBe('amber');
    expect(painLevel(pain(T, 'groinLeft', 3, 'atRest'), [])).toBe('red');
  });

  it('amber lasts 3 days, red lasts 7', () => {
    const amber = [pain('2026-11-22', 'ankleRight', 4)];
    expect(painRestrictions(amber, [], '2026-11-25')).toHaveLength(1);
    expect(painRestrictions(amber, [], '2026-11-26')).toHaveLength(0);
    const red = [pain('2026-11-20', 'hamstringLeft', 6)];
    expect(painRestrictions(red, [], '2026-11-27')[0]?.level).toBe('red');
    expect(painRestrictions(red, [], '2026-11-28')).toHaveLength(0);
  });

  it('a clear morning check-in lifts amber early, but not red', () => {
    const a = [pain('2026-11-24', 'ankleRight', 4, 'during', 1), pain('2026-11-25', 'ankleRight', 0, 'nextMorning', 2)];
    expect(painRestrictions(a, [], T)).toHaveLength(0);
    const r = [pain('2026-11-24', 'ankleRight', 6, 'during', 1), pain('2026-11-25', 'ankleRight', 0, 'nextMorning', 2)];
    expect(painRestrictions(r, [], T)[0]?.level).toBe('red');
  });

  it('red comes first and describes what was logged', () => {
    const list = painRestrictions([pain(T, 'ankleRight', 3, 'during', 1), pain(T, 'groinLeft', 6, 'after', 2)], [], T);
    expect(list.map((x) => x.level)).toEqual(['red', 'amber']);
    expect(describeRestriction(list[0]!)).toBe('left groin: 6/10 after training on Wed 25 Nov');
  });
});

describe('load guard', () => {
  const games: Game[] = [];
  it('needs 3 weeks of history before flagging a spike', () => {
    const logs: SessionLog[] = [{ date: addDays(T, -1), status: 'done', sessionType: 'groundHard', minutes: 90, rpe: 10 }];
    expect(loadCheck(logs, games, T, addDays(T, -10)).spike).toBe(false);
  });

  it('flags a week well above the 4-week average', () => {
    const logs: SessionLog[] = [];
    // three steady weeks: 4 sessions × 300
    for (let d = 28; d > 7; d -= 2) logs.push({ date: addDays(T, -d), status: 'done', sessionType: 'home', minutes: 60, rpe: 5 });
    // a big last week
    for (let d = 7; d >= 1; d--) logs.push({ date: addDays(T, -d), status: 'done', sessionType: 'groundHard', minutes: 70, rpe: 8 });
    const c = loadCheck(logs, games, T, addDays(T, -40));
    expect(c.ratio).toBeGreaterThan(1.3);
    expect(c.spike).toBe(true);
  });

  it('counts games (estimated) and ignores skipped sessions', () => {
    const c = loadCheck(
      [{ date: addDays(T, -2), status: 'skipped', sessionType: 'groundHard', minutes: 60 }],
      [{ date: addDays(T, -1), status: 'played' }],
      T,
      addDays(T, -40),
    );
    expect(c.acute).toBe(8 * 65);
  });
});

describe('drill difficulty', () => {
  it('"too hard" once makes it easier next time', () => {
    expect(updateDrillState(undefined, 'x', 'hard').level).toBe(-1);
  });

  it('"too easy" twice in a row makes it harder; once is not enough', () => {
    const once = updateDrillState(undefined, 'x', 'easy');
    expect(once.level).toBe(0);
    expect(updateDrillState(once, 'x', 'easy').level).toBe(1);
    expect(updateDrillState(updateDrillState(once, 'x', 'right'), 'x', 'easy').level).toBe(0);
  });

  it('stays within easier / standard / harder', () => {
    let s = updateDrillState(undefined, 'x', 'hard');
    s = updateDrillState(s, 'x', 'hard');
    expect(s.level).toBe(-1);
    s = { drillId: 'x', level: 1, recentRatings: ['easy'] };
    expect(updateDrillState(s, 'x', 'easy').level).toBe(1);
  });
});
