/**
 * How the plan adapts to what you log.
 *
 *  - Pain traffic light per body area (never a diagnosis):
 *      green  below your amber score, and gone by the next morning
 *      amber  at/above the amber score (your note's, or 3), or 2+/10 the next
 *             morning → drills loading that area are left out for 3 days
 *      red    5+/10, or 3+/10 at rest → left out for 7 days, no hard sessions,
 *             and Today tells you to see a physio or doctor
 *  - Training load (effort × minutes): if the last 7 days are more than 30%
 *    above your 4-week average, today's hard session becomes technical.
 *  - Drill difficulty: "too hard" once → easier next time; "too easy" twice
 *    in a row → harder.
 */
import type { BodyArea, DrillState, Game, HealthFlag, MatchLog, PainReport, SessionLog, SessionType } from '../db/types';
import { describeAreas } from '../drills/personal';
import { addDays, daysBetween, formatShort, type ISODate } from '../lib/dates';
import type { DrillRating } from '../session/run';

// ---------------------------------------------------------------- pain

export const DEFAULT_AMBER = 3;
export const RED_SCORE = 5;
const AMBER_DAYS = 3;
const RED_DAYS = 7;

export interface AreaRestriction {
  area: BodyArea;
  level: 'amber' | 'red';
  /** Last day the restriction applies (inclusive). */
  until: ISODate;
  report: PainReport;
}

export function amberFor(area: BodyArea, flags: HealthFlag[]): number {
  const flag = flags.find((f) => f.status !== 'resolved' && f.areas.includes(area));
  return flag?.amberAt ?? DEFAULT_AMBER;
}

export function painLevel(r: PainReport, flags: HealthFlag[]): 'green' | 'amber' | 'red' {
  if (r.score >= RED_SCORE || (r.when === 'atRest' && r.score >= 3)) return 'red';
  if (r.score >= amberFor(r.area, flags) || (r.when === 'nextMorning' && r.score >= 2)) return 'amber';
  return 'green';
}

/** Areas the plan is protecting today, most serious first. */
export function painRestrictions(reports: PainReport[], flags: HealthFlag[], today: ISODate): AreaRestriction[] {
  const byArea = new Map<BodyArea, AreaRestriction>();
  const sorted = [...reports].sort((a, b) => a.date.localeCompare(b.date) || (a.id ?? 0) - (b.id ?? 0));
  for (const r of sorted) {
    if (r.date > today) continue;
    const level = painLevel(r, flags);
    const existing = byArea.get(r.area);
    if (level === 'green') {
      // A clear (0–1) morning check-in lifts an amber restriction early; red waits its 7 days.
      if (existing?.level === 'amber' && r.when === 'nextMorning' && r.score <= 1 && r.date > existing.report.date) {
        byArea.delete(r.area);
      }
      continue;
    }
    const until = addDays(r.date, level === 'red' ? RED_DAYS : AMBER_DAYS);
    if (daysBetween(today, until) < 0) continue; // expired
    if (!existing || level === 'red' || existing.level === 'amber') {
      if (existing?.level === 'red' && level === 'amber' && existing.until >= until) continue;
      byArea.set(r.area, { area: r.area, level, until, report: r });
    }
  }
  return [...byArea.values()].sort((a, b) => (a.level === b.level ? 0 : a.level === 'red' ? -1 : 1));
}

const WHEN_PHRASE: Record<PainReport['when'], string> = {
  during: 'during training',
  after: 'after training',
  nextMorning: 'the next morning',
  atRest: 'at rest',
};

export function describeRestriction(r: AreaRestriction): string {
  return `${describeAreas([r.area])}: ${r.report.score}/10 ${WHEN_PHRASE[r.report.when]} on ${formatShort(r.report.date)}`;
}

// ---------------------------------------------------------------- load

/** Typical effort (1–10) when a session was logged without one. */
const EST_RPE: Record<SessionType, number> = {
  groundHard: 7,
  groundTech: 5,
  home: 4,
  sharp: 3,
  recovery: 2,
  rest: 0,
  game: 8,
};
const GAME_MINUTES = 65;

/** Daily training load (effort × minutes), games included. */
export function dailyLoads(
  logs: SessionLog[],
  games: Game[],
  from: ISODate,
  to: ISODate,
  matches: MatchLog[] = [],
): Map<ISODate, number> {
  const out = new Map<ISODate, number>();
  for (const l of logs) {
    if (l.date < from || l.date > to || l.status === 'skipped') continue;
    const type = l.sessionType ?? 'home';
    const load = (l.rpe ?? EST_RPE[type]) * (l.minutes ?? 0);
    out.set(l.date, (out.get(l.date) ?? 0) + load);
  }
  // Logged matches use your minutes and effort; other games are estimated.
  for (const m of matches) {
    if (m.date < from || m.date > to) continue;
    out.set(m.date, (out.get(m.date) ?? 0) + (m.rpe ?? EST_RPE.game) * (m.minutes ?? GAME_MINUTES));
  }
  for (const g of games) {
    if (g.date < from || g.date > to || (g.status !== 'played' && g.status !== 'planned')) continue;
    if (matches.some((m) => m.date === g.date)) continue;
    out.set(g.date, (out.get(g.date) ?? 0) + EST_RPE.game * GAME_MINUTES);
  }
  return out;
}

export interface LoadCheck {
  acute: number; // last 7 days
  chronic: number; // average week over the last 28 days
  ratio: number | null;
  spike: boolean;
}

/** Needs 3 weeks of plan history before it can judge a spike. */
export function loadCheck(
  logs: SessionLog[],
  games: Game[],
  today: ISODate,
  planStart: ISODate,
  matches: MatchLog[] = [],
): LoadCheck {
  const yesterday = addDays(today, -1);
  const loads = dailyLoads(logs, games, addDays(today, -28), yesterday, matches);
  let acute = 0;
  let total = 0;
  for (const [d, v] of loads) {
    total += v;
    if (d >= addDays(today, -7)) acute += v;
  }
  const chronic = total / 4;
  const enoughHistory = daysBetween(planStart, today) >= 21;
  const ratio = chronic > 0 ? acute / chronic : null;
  return { acute, chronic, ratio, spike: enoughHistory && ratio !== null && ratio > 1.3 };
}

// ---------------------------------------------------------------- difficulty

export function updateDrillState(prev: DrillState | undefined, drillId: string, rating: DrillRating): DrillState {
  const state: DrillState = prev ?? { drillId, level: 0, recentRatings: [] };
  const recent = [...state.recentRatings, rating].slice(-3);
  if (rating === 'hard') return { drillId, level: Math.max(-1, state.level - 1) as DrillState['level'], recentRatings: [] };
  const lastTwo = recent.slice(-2);
  if (lastTwo.length === 2 && lastTwo.every((r) => r === 'easy')) {
    return { drillId, level: Math.min(1, state.level + 1) as DrillState['level'], recentRatings: [] };
  }
  return { drillId, level: state.level, recentRatings: recent };
}
