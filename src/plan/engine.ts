/**
 * The rolling plan.
 *
 * Game days are only known a day ahead, so there is no fixed calendar.
 * Each day is decided by a few rules, in order, using what has actually
 * happened (games and logged sessions) and this week's targets. Change an
 * input ("game tomorrow") and the days re-plan instantly.
 *
 * Rules that never bend:
 *  - games are high-intensity days, and two high-intensity days never sit
 *    back to back (unless you add a game yourself)
 *  - the day before a game is a short, light "sharp" session
 *  - the day after a game is recovery
 *  - at least one rest day a week
 *  - every 4th week is lighter
 */
import type { DayOverride, SessionLog, SessionType } from '../db/types';
import { addDays, daysBetween, fromISODate, type ISODate } from '../lib/dates';
import { describeRestriction, loadCheck, painRestrictions } from './adapt';
import { buildSession, sessionMinutes } from './sessions';
import type { DayIntensity, DayKind, DayPlan, PlanInput, PlannedBlock, WeekCounts } from './types';

/** A Monday; day numbers count from here so drill rotation is stable. */
const ORDINAL_EPOCH = '2026-01-05';

export const INTENSITY: Record<DayKind, DayIntensity> = {
  game: 'high',
  groundHard: 'high',
  groundTech: 'medium',
  home: 'low',
  sharp: 'low',
  recovery: 'low',
  rest: 'rest',
  missed: 'rest',
};

export const TITLE: Record<DayKind, string> = {
  game: 'Game day',
  groundHard: 'Ground session: hard',
  groundTech: 'Ground session: technical',
  home: 'Home session',
  sharp: 'Sharp session',
  recovery: 'Recovery',
  rest: 'Rest day',
  missed: 'Nothing logged',
};

const isHigh = (k: DayKind) => INTENSITY[k] === 'high';

export function weekStart(d: ISODate): ISODate {
  const dow = fromISODate(d).getDay(); // 0 = Sunday
  return addDays(d, -((dow + 6) % 7));
}

export function isLightWeek(planStart: ISODate, date: ISODate): boolean {
  const weeks = Math.floor(daysBetween(weekStart(planStart), weekStart(date)) / 7);
  return weeks >= 0 && weeks % 4 === 3;
}

function newWeek(input: PlanInput, light: boolean): WeekCounts {
  const s = input.profile.schedule;
  return {
    ground: 0,
    home: 0,
    rest: 0,
    games: 0,
    groundTarget: light ? Math.max(1, s.groundSessionsPerWeek - 1) : s.groundSessionsPerWeek,
    homeTarget: s.homeSessionsPerWeek,
  };
}

function countDay(week: WeekCounts, kind: DayKind) {
  if (kind === 'game') week.games += 1;
  else if (kind === 'groundHard' || kind === 'groundTech') week.ground += 1;
  else if (kind === 'home' || kind === 'sharp' || kind === 'recovery') week.home += 1;
  else week.rest += 1;
}

interface DecideArgs {
  override?: DayOverride;
  gameTomorrow: boolean;
  gameYesterday: boolean;
  prevHigh: boolean;
  week: WeekCounts;
  lastDayOfWeek: boolean;
  groundMax: number;
}

/** The core rules, in order. Returns the kind of day and why. */
export function decide(a: DecideArgs): { kind: SessionType; reasons: string[] } {
  const { week } = a;

  // 1. Your own choice, kept inside the safety rules.
  if (a.override === 'rest') return { kind: 'rest', reasons: ['You chose a rest day.'] };
  if (a.override === 'home') {
    return a.gameTomorrow
      ? { kind: 'sharp', reasons: ['Game tomorrow, so your home session is a short, sharp one.'] }
      : { kind: 'home', reasons: ['You chose a home session.'] };
  }
  if (a.override === 'ground' || a.override === 'groundTech') {
    if (a.gameTomorrow) {
      return {
        kind: 'sharp',
        reasons: ['Game tomorrow, so no ground session today. Short, sharp touches at home instead.'],
      };
    }
    if (a.override === 'groundTech') {
      return { kind: 'groundTech', reasons: ['You chose a technical ground session: no sprints.'] };
    }
    if (a.prevHigh) {
      return {
        kind: 'groundTech',
        reasons: ["Yesterday was hard, so today's ground session is technical, with no sprints."],
      };
    }
    return { kind: 'groundHard', reasons: ['You chose a ground session.'] };
  }

  // 2. Games come first.
  if (a.gameTomorrow) {
    return {
      kind: 'sharp',
      reasons: ['Game tomorrow: short and sharp. Touches and confidence, nothing tiring.'],
    };
  }
  if (a.gameYesterday) {
    return {
      kind: 'recovery',
      reasons: ['Day after a game: recovery. Move gently and notice how your body feels.'],
    };
  }

  // 3. A hard ground session when it's safe and you still need one this week.
  if (!a.prevHigh && week.ground < week.groundTarget && week.ground < a.groundMax) {
    return {
      kind: 'groundHard',
      reasons: [
        `Ground session ${week.ground + 1} of ${week.groundTarget} this week. No game yesterday and none known for tomorrow, so it can be a hard one.`,
      ],
    };
  }

  // 4. At least one rest day a week.
  if (a.lastDayOfWeek && week.rest === 0) {
    return { kind: 'rest', reasons: ['Rest day. You need at least one a week: you get stronger while you rest.'] };
  }

  // 5. Otherwise home, until the home target is met; then rest.
  if (week.home < week.homeTarget) {
    return {
      kind: 'home',
      reasons: [
        a.prevHigh
          ? 'Yesterday was hard, so today is a lighter home session.'
          : `Home session ${week.home + 1} of ${week.homeTarget} this week.`,
      ],
    };
  }
  return { kind: 'rest', reasons: ["This week's targets are done. Rest day."] };
}

/** Swaps worth offering for a day, given what it already is. */
function swapOptions(kind: DayKind, gameTomorrow: boolean, prevHigh: boolean): DayOverride[] {
  if (kind === 'game' || kind === 'missed') return [];
  const all: DayOverride[] = gameTomorrow ? ['home', 'rest'] : ['ground', 'groundTech', 'home', 'rest'];
  return all.filter((o) => {
    if (o === 'ground') return kind !== 'groundHard' && !prevHigh;
    if (o === 'groundTech') return kind !== 'groundTech';
    if (o === 'home') return kind !== 'home' && kind !== 'sharp';
    return kind !== 'rest';
  });
}

/**
 * Plans from the start of the week containing yesterday up to `days` days
 * from today. Past days come from what actually happened; today and later
 * are decided by the rules. Callers usually show `when !== 'past'`.
 */
export interface PlanOptions {
  /** Start planning from this date's week instead of yesterday's. */
  from?: ISODate;
  /** Skip choosing drills (faster, for streaks and counts). */
  withBlocks?: boolean;
}

export function planDays(input: PlanInput, days = 7, opts: PlanOptions = {}): DayPlan[] {
  const { today, profile } = input;
  const withBlocks = opts.withBlocks ?? true;
  const pain = input.pain ?? [];
  const levels = new Map((input.drillStates ?? []).map((s) => [s.drillId, s.level]));
  const load = loadCheck(input.logs, input.games, today, input.planStart, input.matches ?? []);
  const gameDates = new Set(
    input.games.filter((g) => g.status === 'planned' || g.status === 'played').map((g) => g.date),
  );
  const knownGameStatus = new Set(input.games.map((g) => g.date));
  const logByDate = new Map<ISODate, SessionLog>();
  for (const l of [...input.logs].sort((a, b) => (a.id ?? 0) - (b.id ?? 0))) logByDate.set(l.date, l);
  const overrideByDate = new Map<ISODate, DayOverride>();
  for (const o of input.overrides) if (o.source === 'user' && o.override) overrideByDate.set(o.date, o.override);

  const start = weekStart(opts.from ?? addDays(today, -1));
  const end = addDays(today, days - 1);

  const didTrain = (l?: SessionLog) => l && (l.status === 'done' || l.status === 'partial');

  // What happened the day before we start.
  const before = addDays(start, -1);
  let prev: DayKind = gameDates.has(before)
    ? 'game'
    : didTrain(logByDate.get(before))
      ? (logByDate.get(before)?.sessionType ?? 'home')
      : 'rest';

  const out: DayPlan[] = [];
  let week = newWeek(input, isLightWeek(input.planStart, start));
  // Drills in the last session of each kind, so the next one differs.
  const lastDrills = new Map<DayKind, Set<string>>();

  for (let d = start; daysBetween(d, end) >= 0; d = addDays(d, 1)) {
    if (d === weekStart(d) && d !== start) week = newWeek(input, isLightWeek(input.planStart, d));
    const when: DayPlan['when'] = d < today ? 'past' : d === today ? 'today' : 'future';
    const lightWeek = isLightWeek(input.planStart, d);
    const gameTomorrow = gameDates.has(addDays(d, 1));
    const gameYesterday = gameDates.has(addDays(d, -1));
    const prevHigh = isHigh(prev);
    const log = logByDate.get(d);
    const override = overrideByDate.get(d);

    let kind: DayKind;
    let reasons: string[] = [];
    let plannedKind: SessionType | undefined;
    const restrictions = when === 'past' ? [] : painRestrictions(pain, profile.health, d);
    const decideArgs = {
      override,
      gameTomorrow,
      gameYesterday,
      prevHigh,
      week,
      lastDayOfWeek: fromISODate(d).getDay() === 0,
      groundMax: profile.schedule.groundSessionsMax,
    };

    if (gameDates.has(d)) {
      kind = 'game';
      reasons = [
        prevHigh && prev !== 'game'
          ? "Game day after a hard session. Play, but listen to your body."
          : 'Game day. Do the activation warm-up before kick-off, then log your match.',
      ];
    } else if (when === 'past') {
      if (didTrain(log)) kind = log?.sessionType ?? 'home';
      else {
        kind = 'missed';
        plannedKind = decide(decideArgs).kind; // so we can ask "did you do it?" and keep streaks fair
      }
    } else if (didTrain(log) && log?.sessionType) {
      kind = log.sessionType; // today, already done: keep what you did
      reasons = ['Done today.'];
    } else {
      const r = decide(decideArgs);
      kind = r.kind;
      reasons = r.reasons;
      // Safety overrides: red pain or a load spike turn a hard day into a technical one.
      const red = restrictions.filter((x) => x.level === 'red');
      if (kind === 'groundHard' && red.length) {
        kind = 'groundTech';
        reasons = [`No hard session while pain is high (${red.map(describeRestriction).join('; ')}). Technical work only.`];
      } else if (kind === 'groundHard' && when === 'today' && load.spike) {
        kind = 'groundTech';
        reasons = [
          `Your training load in the last 7 days is ${Math.round((load.ratio ?? 0) * 100 - 100)}% above your 4-week average. Easing off: technical session today.`,
        ];
      }
    }
    if (restrictions.length && kind !== 'rest' && kind !== 'missed') {
      reasons.push(`Leaving out drills that load your ${restrictions.map(describeRestriction).join('; ')}.`);
    }

    if (lightWeek && when !== 'past' && kind !== 'game' && kind !== 'rest') {
      reasons.push('Light week: every 4th week backs off so your body absorbs the work.');
    }

    // Rotate drills per session of the same kind (ground or home), not per
    // calendar day, so consecutive sessions of one kind never repeat.
    const weekNo = Math.floor(daysBetween(ORDINAL_EPOCH, weekStart(d)) / 7);
    const nthOfKind =
      kind === 'groundHard' || kind === 'groundTech'
        ? week.ground
        : kind === 'home' || kind === 'sharp' || kind === 'recovery'
          ? week.home
          : 0;
    // A day you've logged shows what you actually did, even if ratings change later.
    const loggedBlocks = didTrain(log) && Array.isArray(log?.blocks) ? (log.blocks as PlannedBlock[]) : null;
    const blocks = loggedBlocks
      ? loggedBlocks
      : when === 'past' || kind === 'missed' || !withBlocks
        ? []
        : buildSession(kind, {
            ordinal: weekNo * 7 + nthOfKind,
            ratings: input.ratings,
            profile,
            lightWeek,
            gameTomorrow,
            avoid: lastDrills.get(kind),
            blockedAreas: new Set(restrictions.map((x) => x.area)),
            levels,
            focusSkills: input.focusSkills,
          });
    if (blocks.length) {
      const ids = blocks.flatMap((b) => b.items.map((i) => i.drillId));
      lastDrills.set(kind, new Set(ids));
    }

    out.push({
      date: d,
      kind,
      title: TITLE[kind],
      minutes: sessionMinutes(blocks),
      intensity: INTENSITY[kind],
      blocks,
      reasons,
      when,
      lightWeek,
      logged: log?.status,
      override,
      askGameTomorrow: when === 'today' && kind === 'groundHard' && !knownGameStatus.has(addDays(d, 1)),
      gameTomorrow,
      options: when === 'past' ? [] : swapOptions(kind, gameTomorrow, prevHigh),
      plannedKind,
      restrictions,
    });

    countDay(week, kind);
    prev = kind;
  }
  return out;
}

/** What a past, unlogged day would have been, so Today can ask "did you do it?". */
export function plannedKindFor(input: PlanInput, date: ISODate): SessionType | null {
  const day = planDays(input, 1, { from: date, withBlocks: false }).find((x) => x.date === date);
  if (!day) return null;
  return day.kind === 'missed' ? (day.plannedKind ?? null) : day.kind;
}

export interface Streak {
  current: number;
  best: number;
}

/**
 * Sessions in a row. Completed sessions and games count; planned rest days
 * don't break it; a skipped or missed training day does. Today only counts
 * once it's done, and never breaks the streak while it's still to do.
 */
export function computeStreak(input: PlanInput): Streak {
  const from = input.planStart > addDays(input.today, -90) ? input.planStart : addDays(input.today, -90);
  const days = planDays(input, 1, { from, withBlocks: false }).filter((d) => d.date >= from && d.date <= input.today);
  let current = 0;
  let best = 0;
  for (const d of days) {
    const trained = d.logged === 'done' || d.logged === 'partial' || (d.kind === 'game' && d.when === 'past');
    const breaks =
      d.when === 'past' && (d.logged === 'skipped' || (d.kind === 'missed' && d.plannedKind !== 'rest' && d.plannedKind !== 'game'));
    if (trained) best = Math.max(best, ++current);
    else if (breaks) current = 0;
  }
  return { current, best };
}

export interface WeekSummary {
  ground: { done: number; planned: number; target: number };
  home: { done: number; planned: number; target: number };
  rest: number;
  games: number;
  lightWeek: boolean;
}

/** This week's progress: what's done, and what the plan still has in it. */
export function summarizeWeek(days: DayPlan[], input: PlanInput): WeekSummary {
  const ws = weekStart(input.today);
  const inWeek = days.filter((d) => weekStart(d.date) === ws);
  const light = isLightWeek(input.planStart, input.today);
  const target = newWeek(input, light);
  const done = (d: DayPlan) => d.when === 'past' || d.logged === 'done' || d.logged === 'partial';
  const isGround = (k: DayKind) => k === 'groundHard' || k === 'groundTech';
  const isHome = (k: DayKind) => k === 'home' || k === 'sharp' || k === 'recovery';
  return {
    ground: {
      done: inWeek.filter((d) => isGround(d.kind) && done(d)).length,
      planned: inWeek.filter((d) => isGround(d.kind) && !done(d)).length,
      target: target.groundTarget,
    },
    home: {
      done: inWeek.filter((d) => isHome(d.kind) && done(d)).length,
      planned: inWeek.filter((d) => isHome(d.kind) && !done(d)).length,
      target: target.homeTarget,
    },
    rest: inWeek.filter((d) => d.kind === 'rest' || d.kind === 'missed').length,
    games: inWeek.filter((d) => d.kind === 'game').length,
    lightWeek: light,
  };
}
