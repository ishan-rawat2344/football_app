/** Personal bests, trends and "what's due" for the solo tests. */
import type { Game, MatchLog, SessionLog, TestResult } from '../db/types';
import { addDays, daysBetween, type ISODate } from '../lib/dates';
import { dailyLoads } from '../plan/adapt';
import { weekStart } from '../plan/engine';
import { TEST_EVERY_DAYS, TESTS, type TestDef } from './defs';

const better = (t: TestDef, a: number, b: number) => (t.better === 'lower' ? a < b : a > b);

/** Oldest first. */
export const forTest = (results: TestResult[], id: string) =>
  results.filter((r) => r.testId === id).sort((a, b) => a.date.localeCompare(b.date) || (a.id ?? 0) - (b.id ?? 0));

export function personalBest(t: TestDef, results: TestResult[]): TestResult | undefined {
  let best: TestResult | undefined;
  for (const r of forTest(results, t.id)) if (!best || better(t, r.value, best.value)) best = r;
  return best;
}

/** Would this value be a new personal best (strictly better than every earlier result)? */
export function isNewPB(t: TestDef, previous: TestResult[], value: number): boolean {
  const pb = personalBest(t, previous);
  return !pb || better(t, value, pb.value);
}

export interface TestTrend {
  latest?: TestResult;
  first?: TestResult;
  best?: TestResult;
  /** Change since the first result, signed so positive = better. */
  improvement: number | null;
  count: number;
}

export function trend(t: TestDef, results: TestResult[]): TestTrend {
  const rs = forTest(results, t.id);
  const first = rs[0];
  const latest = rs.at(-1);
  const improvement =
    first && latest && rs.length > 1 ? (t.better === 'lower' ? first.value - latest.value : latest.value - first.value) : null;
  return { latest, first, best: personalBest(t, results), improvement, count: rs.length };
}

export interface DueTest {
  test: TestDef;
  lastDate?: ISODate;
  daysSince?: number;
}

/** Tests never done, or last done 4+ weeks ago. */
export function dueTests(results: TestResult[], today: ISODate): DueTest[] {
  return TESTS.map((test) => {
    const last = forTest(results, test.id).at(-1);
    const daysSince = last ? daysBetween(last.date, today) : undefined;
    return { test, lastDate: last?.date, daysSince };
  }).filter((d) => d.daysSince === undefined || d.daysSince >= TEST_EVERY_DAYS);
}

/** Left foot as a share of right foot, from the same test day. 1 = equal. */
export function footRatio(results: TestResult[]): { date: ISODate; ratio: number } | null {
  const left = forTest(results, 'wall-left-60');
  const right = forTest(results, 'wall-right-60');
  for (let i = left.length - 1; i >= 0; i--) {
    const l = left[i]!;
    const r = right.filter((x) => x.date === l.date).at(-1);
    if (r && r.value > 0) return { date: l.date, ratio: l.value / r.value };
  }
  return null;
}

export interface WeekLoad {
  week: ISODate; // Monday
  load: number;
  sessions: number;
}

/** Training load per week (Monday to Sunday), oldest first, including this week. */
export function weeklyLoads(
  logs: SessionLog[],
  games: Game[],
  matches: MatchLog[],
  today: ISODate,
  weeks = 8,
): WeekLoad[] {
  const thisWeek = weekStart(today);
  const from = addDays(thisWeek, -7 * (weeks - 1));
  const daily = dailyLoads(logs, games, from, today, matches);
  const out: WeekLoad[] = [];
  for (let w = 0; w < weeks; w++) {
    const week = addDays(from, w * 7);
    const end = addDays(week, 6);
    let load = 0;
    for (const [d, v] of daily) if (d >= week && d <= end) load += v;
    const sessions = logs.filter((l) => l.date >= week && l.date <= end && l.status !== 'skipped').length;
    out.push({ week, load: Math.round(load), sessions });
  }
  return out;
}
