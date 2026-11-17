import { describe, expect, it } from 'vitest';
import type { Game, HealthFlag, PainReport, PlannedSession, Profile, SessionLog } from '../db/types';
import { getDrill } from '../drills/library';
import { LOAD_TAG_AREAS } from '../drills/types';
import { addDays } from '../lib/dates';
import { defaultProfile } from '../profile/meta';
import { INTENSITY, computeStreak, isLightWeek, planDays, plannedKindFor, summarizeWeek, weekStart } from './engine';
import type { DayPlan, PlanInput } from './types';

const MON = '2026-11-23'; // a Monday

function profile(over: Partial<Profile> = {}): Profile {
  const p = defaultProfile();
  return {
    ...p,
    equipment: ['ball', 'resistanceBand', 'tapeMeasure'],
    places: { ...p.places, hasWall: true },
    partner: { available: 'occasional', notes: '' },
    ...over,
  };
}

function input(over: Partial<PlanInput> = {}): PlanInput {
  return {
    today: MON,
    profile: profile(),
    ratings: { weakFoot: 2, firstTouch: 4, offBallMovement: 3, decisionMaking: 4, confidence: 4, pace: 8, defending: 8 },
    games: [],
    logs: [],
    overrides: [],
    planStart: MON,
    ...over,
  };
}

const games = (...dates: string[]): Game[] => dates.map((date) => ({ date, status: 'planned' }));
const upcoming = (days: DayPlan[]) => days.filter((d) => d.when !== 'past');
const kinds = (days: DayPlan[]) => upcoming(days).map((d) => d.kind);
const drillIds = (d: DayPlan) => d.blocks.flatMap((b) => b.items.map((i) => i.drillId));

const groin: HealthFlag = {
  id: 'groin',
  title: 'Groin pain, both sides',
  areas: ['groinLeft', 'groinRight'],
  status: 'active',
  amberAt: 3,
  since: '',
  notes: '',
  rules: '',
};

describe('weeks', () => {
  it('no games: two hard ground days, never back to back, home days and a rest day', () => {
    expect(kinds(planDays(input()))).toEqual([
      'groundHard', // Mon
      'home', // Tue: day after a hard day
      'groundHard', // Wed
      'home',
      'home',
      'home', // home target of 4 reached
      'rest', // Sun: at least one rest day
    ]);
  });

  it('games Tuesday and Saturday: matches the plan we agreed', () => {
    expect(kinds(planDays(input({ games: games('2026-11-24', '2026-11-28') })))).toEqual([
      'sharp', // Mon: game tomorrow
      'game',
      'recovery', // Wed: day after
      'groundHard', // Thu: the one hard day that fits
      'sharp', // Fri
      'game',
      'recovery', // Sun
    ]);
  });

  it('a 3-game week has no hard ground day: the games are the hard work', () => {
    const k = kinds(planDays(input({ games: games('2026-11-23', '2026-11-25', '2026-11-28') })));
    expect(k).not.toContain('groundHard');
    expect(k.filter((x) => x === 'game')).toHaveLength(3);
  });

  it('weeks start on Monday', () => {
    expect(weekStart('2026-11-29')).toBe(MON);
    expect(weekStart(MON)).toBe(MON);
  });
});

describe('rules that never bend', () => {
  // Small deterministic random generator, so failures are reproducible.
  function rng(seed: number) {
    return () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
  }

  it('a hard ground session is never next to another high-intensity day (300 random game patterns)', () => {
    const rand = rng(42);
    for (let run = 0; run < 300; run++) {
      const g = Array.from({ length: 14 }, (_, i) => addDays(MON, i)).filter(() => rand() < 0.3);
      const days = upcoming(planDays(input({ games: games(...g) }), 14));
      for (let i = 1; i < days.length; i++) {
        const [a, b] = [days[i - 1]!, days[i]!];
        if (a.kind === 'groundHard') expect(INTENSITY[b.kind], `${b.date} after hard ${a.date}`).not.toBe('high');
        if (b.kind === 'groundHard') expect(INTENSITY[a.kind], `${a.date} before hard ${b.date}`).not.toBe('high');
      }
    }
  });

  it('the day before a game is always light, with no sprinting or cutting', () => {
    const days = upcoming(planDays(input({ games: games('2026-11-24', '2026-11-26', '2026-11-29') })));
    for (const d of days.filter((x) => x.gameTomorrow)) {
      expect(d.kind).toBe('sharp');
      for (const id of drillIds(d)) {
        const drill = getDrill(id)!;
        expect(drill.loadTags, id).not.toContain('sprint');
        expect(drill.loadTags, id).not.toContain('cutting');
        expect(drill.intensity, id).toBe('low');
      }
      expect(d.minutes).toBeLessThanOrEqual(20);
    }
  });

  it('every week without a game-heavy schedule has a rest day', () => {
    const days = upcoming(planDays(input(), 14));
    const byWeek = new Map<string, DayPlan[]>();
    for (const d of days) byWeek.set(weekStart(d.date), [...(byWeek.get(weekStart(d.date)) ?? []), d]);
    for (const [, week] of byWeek) if (week.length === 7) expect(week.some((d) => d.kind === 'rest')).toBe(true);
  });

  it('no Nordic curls the day before a game', () => {
    for (let i = 0; i < 28; i++) {
      const g = addDays(MON, i + 1);
      const d = upcoming(planDays(input({ today: addDays(MON, i), games: games(g) }), 1))[0]!;
      expect(drillIds(d)).not.toContain('ip-nordic');
    }
  });
});

describe('your choices', () => {
  const override = (date: string, o: PlannedSession['override']): PlannedSession => ({
    id: date,
    date,
    type: 'home',
    blocks: [],
    reasons: [],
    source: 'user',
    override: o,
  });

  it('"ground" the day after a game becomes a technical ground session', () => {
    const days = upcoming(
      planDays(input({ games: games('2026-11-22'), overrides: [override(MON, 'ground')] })),
    );
    expect(days[0]!.kind).toBe('groundTech');
    for (const id of drillIds(days[0]!)) expect(getDrill(id)!.loadTags, id).not.toContain('sprint');
  });

  it('"ground" the day before a game becomes a sharp session', () => {
    const days = upcoming(planDays(input({ games: games('2026-11-24'), overrides: [override(MON, 'ground')] })));
    expect(days[0]!.kind).toBe('sharp');
  });

  it('"can\'t get to the ground" turns a hard day into a home day and the plan adapts', () => {
    const days = kinds(planDays(input({ overrides: [override(MON, 'home')] })));
    expect(days[0]).toBe('home');
    expect(days[1]).toBe('groundHard'); // ground moves to Tuesday
  });

  it('a session you logged today stays as it was', () => {
    const logs: SessionLog[] = [{ id: 1, date: MON, status: 'done', sessionType: 'groundTech' }];
    const days = upcoming(planDays(input({ logs })));
    expect(days[0]!.kind).toBe('groundTech');
    expect(days[0]!.logged).toBe('done');
  });

  it('a hard day yesterday that you logged keeps today light', () => {
    const logs: SessionLog[] = [{ id: 1, date: '2026-11-22', status: 'done', sessionType: 'groundHard' }];
    expect(upcoming(planDays(input({ logs })))[0]!.kind).toBe('home');
  });

  it('asks about a game tomorrow before a hard session, until you answer', () => {
    expect(upcoming(planDays(input()))[0]!.askGameTomorrow).toBe(true);
    const answered = input({ games: [{ date: '2026-11-24', status: 'none' }] });
    expect(upcoming(planDays(answered))[0]!.askGameTomorrow).toBe(false);
    expect(upcoming(planDays(answered))[0]!.kind).toBe('groundHard');
  });

  it('works out what an unlogged yesterday was meant to be', () => {
    expect(plannedKindFor(input({ today: '2026-11-24' }), MON)).toBe('groundHard');
  });

  it('only offers swaps that make sense', () => {
    const days = upcoming(planDays(input({ games: games('2026-11-24') })));
    expect(days[0]!.options).not.toContain('ground'); // day before a game
    expect(days[1]!.options).toEqual([]); // game day
  });
});

describe('health notes', () => {
  it('an active groin note keeps out Copenhagen planks and high-intensity groin work for a month', () => {
    const p = profile({ health: [groin] });
    const ids = new Set<string>();
    for (let w = 0; w < 4; w++) {
      for (const d of upcoming(planDays(input({ profile: p, today: addDays(MON, w * 7) })))) {
        drillIds(d).forEach((id) => ids.add(id));
      }
    }
    expect(ids.has('ip-copenhagen')).toBe(false);
    expect(ids.has('1v1-outside-burst')).toBe(false);
    expect(ids.has('sp-cut-and-go')).toBe(false);
    expect(ids.has('ip-adductor-squeeze')).toBe(true); // the gentle groin work is prioritised
  });

  it('drills that load an active area are set to the easier version with a note', () => {
    const p = profile({ health: [groin] });
    const items = upcoming(planDays(input({ profile: p }), 14)).flatMap((d) => d.blocks.flatMap((b) => b.items));
    const easier = items.filter((i) => i.level === -1);
    expect(easier.length).toBeGreaterThan(0);
    for (const i of easier) expect(i.note).toContain('Easier version');
  });
});

describe('light weeks and places', () => {
  it('every 4th week is light: one fewer ground session and shorter physical work', () => {
    const planStart = addDays(MON, -21); // so this is week 4
    expect(isLightWeek(planStart, MON)).toBe(true);
    const days = planDays(input({ planStart }));
    expect(kinds(days).filter((k) => k === 'groundHard')).toHaveLength(1);
    const today = upcoming(days)[0]!;
    expect(today.reasons.join(' ')).toContain('Light week');
    expect(summarizeWeek(days, input({ planStart })).ground.target).toBe(1);
  });

  it('with no wall at home, home sessions only use room drills', () => {
    const p = profile();
    const noWall = { ...p, places: { ...p.places, hasWall: false } };
    for (const d of upcoming(planDays(input({ profile: noWall }), 14)).filter((x) => x.kind === 'home')) {
      for (const id of drillIds(d)) expect(getDrill(id)!.locations, id).toContain('room');
    }
  });

  it('partner-only drills are left out unless you have a regular partner', () => {
    for (const d of upcoming(planDays(input(), 28))) {
      for (const id of drillIds(d)) expect(getDrill(id)!.mode, id).not.toBe('partner');
    }
  });

  it('two sessions of the same kind in a row are never identical', () => {
    const days = upcoming(planDays(input({ games: games('2026-11-25', '2026-11-28') }), 21));
    for (const kind of ['groundHard', 'home', 'sharp'] as const) {
      const sessions = days.filter((d) => d.kind === kind).map((d) => drillIds(d).join(','));
      for (let i = 1; i < sessions.length; i++) expect(sessions[i], `${kind} #${i}`).not.toBe(sessions[i - 1]);
    }
  });

  it('rotates drills so the week is not the same session on repeat', () => {
    const homeTech = upcoming(planDays(input(), 14))
      .filter((d) => d.kind === 'home')
      .map((d) => d.blocks.find((b) => b.block === 'technical')?.items[0]?.drillId);
    expect(new Set(homeTech).size).toBeGreaterThanOrEqual(2);
  });

  it('weak-skill drills dominate: most home sessions train the weak foot or first touch', () => {
    const home = upcoming(planDays(input(), 14)).filter((d) => d.kind === 'home');
    const hits = home.filter((d) =>
      drillIds(d).some((id) => getDrill(id)!.skills.some((s) => s === 'weakFoot' || s === 'firstTouch')),
    );
    expect(hits.length / home.length).toBeGreaterThanOrEqual(0.75);
  });

  it('session lengths match the plan: ground about an hour, home about 20 minutes', () => {
    const days = upcoming(planDays(input(), 14));
    for (const d of days.filter((x) => x.kind === 'groundHard')) expect(d.minutes).toBeGreaterThanOrEqual(45);
    for (const d of days.filter((x) => x.kind === 'groundHard')) expect(d.minutes).toBeLessThanOrEqual(80);
    for (const d of days.filter((x) => x.kind === 'home')) expect(d.minutes).toBeLessThanOrEqual(30);
  });
});

describe('week summary', () => {
  it('counts what is done and what is still planned', () => {
    const logs: SessionLog[] = [{ id: 1, date: MON, status: 'done', sessionType: 'groundHard' }];
    const inp = input({ logs, today: '2026-11-24' });
    const s = summarizeWeek(planDays(inp), inp);
    expect(s.ground.done).toBe(1);
    expect(s.ground.target).toBe(2);
    expect(s.ground.done + s.ground.planned).toBe(2);
  });
});

describe('logged sessions', () => {
  it('a logged day keeps the drills you actually did', () => {
    const blocks = [{ block: 'technical' as const, items: [{ drillId: 'bm-juggling', level: 0 as const, minutes: 10 }] }];
    const logs: SessionLog[] = [{ id: 1, date: MON, status: 'done', sessionType: 'home', blocks }];
    const today = upcoming(planDays(input({ logs })))[0]!;
    expect(today.blocks).toEqual(blocks);
    expect(today.minutes).toBe(10);
  });
});

describe('adapting to what you log', () => {
  const pain = (date: string, area: PainReport['area'], score: number, when: PainReport['when'] = 'during'): PainReport => ({
    id: 1,
    date,
    area,
    score,
    when,
  });

  it('ankle pain at 4/10 leaves out every drill that loads the ankle for 3 days, and says why', () => {
    const inp = input({ pain: [pain(MON, 'ankleRight', 4)] });
    const days = upcoming(planDays(inp, 5));
    for (const d of days.slice(0, 4)) {
      for (const b of d.blocks) {
        for (const it of b.items) {
          const drill = getDrill(it.drillId)!;
          const loadsAnkle = drill.loadTags.some((t) => LOAD_TAG_AREAS[t].includes('ankleRight'));
          if (loadsAnkle) {
            expect(b.block, `${d.date} ${it.drillId}`).toBe('warmup'); // fixed warm-up stays, but easier
            expect(it.level).toBe(-1);
          }
        }
      }
      if (d.kind !== 'rest') expect(d.reasons.join(' ')).toContain('right ankle: 4/10');
    }
    expect(days[4]!.restrictions).toEqual([]); // day 4: lifted
  });

  it('red pain means no hard session', () => {
    const days = upcoming(planDays(input({ pain: [pain(MON, 'hamstringLeft', 6)] })));
    expect(days.map((d) => d.kind)).not.toContain('groundHard');
    expect(days[0]!.kind).toBe('groundTech');
    expect(days[0]!.reasons[0]).toContain('No hard session while pain is high');
  });

  it('a training-load spike turns today\'s hard session into a technical one', () => {
    const logs: SessionLog[] = [];
    for (let d = 28; d > 7; d -= 3) logs.push({ id: d, date: addDays(MON, -d), status: 'done', sessionType: 'home', minutes: 20, rpe: 4 });
    for (let d = 7; d >= 2; d -= 2) logs.push({ id: 100 + d, date: addDays(MON, -d), status: 'done', sessionType: 'groundHard', minutes: 75, rpe: 8 });
    const days = upcoming(planDays(input({ logs, planStart: addDays(MON, -35) })));
    expect(days[0]!.kind).toBe('groundTech');
    expect(days[0]!.reasons[0]).toContain('above your 4-week average');
  });

  it('uses your difficulty level per drill, with a reason', () => {
    const inp = input({ drillStates: [{ drillId: 'warmup-home', level: 1, recentRatings: [] }] });
    const home = upcoming(planDays(inp, 7)).find((d) => d.kind === 'home')!;
    const w = home.blocks[0]!.items[0]!;
    expect(w).toMatchObject({ drillId: 'warmup-home', level: 1 });
    expect(w.note).toContain('Harder version');
  });

  it('every planned drill carries its sets for session mode', () => {
    for (const d of upcoming(planDays(input(), 7))) {
      for (const b of d.blocks) for (const it of b.items) expect(it.sets).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('streak', () => {
  const done = (date: string, sessionType: SessionLog['sessionType'] = 'home', id = 1): SessionLog => ({ id, date, status: 'done', sessionType });

  it('counts sessions in a row; planned rest days and games keep it going', () => {
    // Mon hard, Tue home, Wed hard, Thu home, Fri home, Sat home, Sun rest (planned) → next Mon
    const logs = [
      done('2026-11-23', 'groundHard', 1),
      done('2026-11-24', 'home', 2),
      done('2026-11-25', 'groundHard', 3),
      done('2026-11-26', 'home', 4),
      done('2026-11-27', 'home', 5),
      done('2026-11-28', 'home', 6),
    ];
    const s = computeStreak(input({ logs, today: '2026-11-30' }));
    expect(s).toEqual({ current: 6, best: 6 });
  });

  it('a missed training day breaks it; today not done yet does not', () => {
    const logs = [done('2026-11-23', 'groundHard', 1), done('2026-11-25', 'groundHard', 2)]; // Tue missed
    expect(computeStreak(input({ logs, today: '2026-11-26' }))).toEqual({ current: 1, best: 1 });
  });

  it('a skipped session breaks it', () => {
    const logs: SessionLog[] = [done('2026-11-23', 'groundHard', 1), { id: 2, date: '2026-11-24', status: 'skipped' }];
    expect(computeStreak(input({ logs, today: '2026-11-25' })).current).toBe(0);
  });

  it('days before you started using the plan never count against you', () => {
    expect(computeStreak(input({ today: MON, planStart: MON }))).toEqual({ current: 0, best: 0 });
  });
});
