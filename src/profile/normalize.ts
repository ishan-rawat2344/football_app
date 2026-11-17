/**
 * Turns untrusted JSON (an imported profile file or a backup) into a valid
 * Profile. Anything missing or the wrong type falls back to the default,
 * so an older or hand-edited file still imports cleanly.
 */
import type {
  BodyArea,
  EquipmentKey,
  Foot,
  HealthFlag,
  HealthStatus,
  IfThenPlan,
  Position,
  Profile,
  Ratings,
  RoleModel,
  SkillKey,
  TrainingWindow,
} from '../db/types';
import { BODY_AREAS, EQUIPMENT, POSITIONS, SKILL_KEYS, TRAINING_WINDOWS, defaultProfile } from './meta';

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const obj = (v: unknown): Obj => (isObj(v) ? v : {});

const str = (v: unknown, d: string): string => (typeof v === 'string' ? v.trim() : d);

const numOrNull = (v: unknown, d: number | null): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : v === null ? null : d;

const num = (v: unknown, d: number, min = -Infinity, max = Infinity): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : d;

const boolOrNull = (v: unknown, d: boolean | null): boolean | null =>
  typeof v === 'boolean' ? v : v === null ? null : d;

const bool = (v: unknown, d: boolean): boolean => (typeof v === 'boolean' ? v : d);

const strList = (v: unknown, d: string[]): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim()) : d;

function oneOf<T extends string>(v: unknown, allowed: readonly T[], d: T): T {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : d;
}

function someOf<T extends string>(v: unknown, allowed: readonly T[], d: T[]): T[] {
  if (!Array.isArray(v)) return d;
  const out = v.filter((x): x is T => typeof x === 'string' && (allowed as readonly string[]).includes(x));
  return [...new Set(out)];
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const FEET: Foot[] = ['right', 'left', 'both'];
const POSITION_KEYS = POSITIONS.map((p) => p.key) as Position[];
const EQUIPMENT_KEYS = EQUIPMENT.map((e) => e.key) as EquipmentKey[];
const WINDOW_KEYS = TRAINING_WINDOWS.map((w) => w.key) as TrainingWindow[];
const AREA_KEYS = BODY_AREAS.map((a) => a.key) as BodyArea[];
const HEALTH_STATUSES: HealthStatus[] = ['active', 'monitor', 'resolved'];
const PARTNER: Profile['partner']['available'][] = ['never', 'occasional', 'regular'];

let idCounter = 0;
export function newId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

function healthFlag(v: unknown): HealthFlag | null {
  const o = obj(v);
  const title = str(o.title, '');
  if (!title) return null;
  const reviewBy = str(o.reviewBy, '');
  return {
    id: str(o.id, '') || newId('health'),
    title,
    areas: someOf(o.areas, AREA_KEYS, []),
    status: oneOf(o.status, HEALTH_STATUSES, 'active'),
    amberAt: num(o.amberAt, 3, 1, 10),
    since: str(o.since, ''),
    reviewBy: ISO_DATE.test(reviewBy) ? reviewBy : undefined,
    notes: str(o.notes, ''),
    rules: str(o.rules, ''),
  };
}

function roleModel(v: unknown): RoleModel | null {
  const o = obj(v);
  const name = str(o.name, '');
  return name ? { name, what: str(o.what, '') } : null;
}

function ifThen(v: unknown): IfThenPlan | null {
  const o = obj(v);
  const when = str(o.when, '');
  const then = str(o.then, '');
  return when || then ? { id: str(o.id, '') || newId('ifthen'), when, then } : null;
}

const notNull = <T,>(x: T | null): x is T => x !== null;

export function normalizeProfile(input: unknown): Profile {
  const d = defaultProfile();
  const p = obj(input);
  const game = obj(p.game);
  const style = obj(p.style);
  const goals = obj(p.goals);
  const targets = obj(p.matchTargets);
  const sched = obj(p.schedule);
  const places = obj(p.places);
  const partner = obj(p.partner);
  const fit = obj(p.fitness);
  const life = obj(p.lifestyle);
  const mind = obj(p.mind);
  const prefs = obj(p.prefs);

  const positions = someOf(p.positions, POSITION_KEYS, d.positions);

  return {
    id: 'me',
    updatedAt: str(p.updatedAt, d.updatedAt),
    name: str(p.name, d.name),
    age: numOrNull(p.age, d.age),
    heightCm: numOrNull(p.heightCm, d.heightCm),
    weightKg: numOrNull(p.weightKg, d.weightKg),
    country: str(p.country, d.country),
    dominantFoot: oneOf(p.dominantFoot, FEET, d.dominantFoot),
    positions: positions.length ? positions : d.positions,
    game: {
      level: str(game.level, d.game.level),
      format: str(game.format, d.game.format),
      surface: str(game.surface, d.game.surface),
      teamShape: str(game.teamShape, d.game.teamShape),
      matchMinutes: numOrNull(game.matchMinutes, d.game.matchMinutes),
      minutesPlayed: numOrNull(game.minutesPlayed, d.game.minutesPlayed),
    },
    style: {
      weapons: strList(style.weapons, d.style.weapons),
      goalSources: strList(style.goalSources, d.style.goalSources),
      goTo1v1: str(style.goTo1v1, d.style.goTo1v1),
      goodGame: str(style.goodGame, d.style.goodGame),
      badGame: str(style.badGame, d.style.badGame),
      roleModels: Array.isArray(style.roleModels)
        ? style.roleModels.map(roleModel).filter(notNull)
        : d.style.roleModels,
    },
    goals: {
      weeks4: strList(goals.weeks4, d.goals.weeks4),
      months3: strList(goals.months3, d.goals.months3),
      year1: strList(goals.year1, d.goals.year1),
    },
    matchTargets: {
      dribbleAttemptsMin: num(targets.dribbleAttemptsMin, d.matchTargets.dribbleAttemptsMin, 0, 50),
      dribbleAttemptsTarget: num(targets.dribbleAttemptsTarget, d.matchTargets.dribbleAttemptsTarget, 0, 50),
      leftFootPassesMin: num(targets.leftFootPassesMin, d.matchTargets.leftFootPassesMin, 0, 100),
    },
    schedule: {
      gamesPerWeekMin: num(sched.gamesPerWeekMin, d.schedule.gamesPerWeekMin, 0, 7),
      gamesPerWeekMax: num(sched.gamesPerWeekMax, d.schedule.gamesPerWeekMax, 0, 7),
      gameStartTime: str(sched.gameStartTime, d.schedule.gameStartTime),
      gameNoticeDays: num(sched.gameNoticeDays, d.schedule.gameNoticeDays, 0, 14),
      groundSessionsPerWeek: num(sched.groundSessionsPerWeek, d.schedule.groundSessionsPerWeek, 0, 7),
      groundSessionsMax: num(sched.groundSessionsMax, d.schedule.groundSessionsMax, 0, 7),
      homeSessionsPerWeek: num(sched.homeSessionsPerWeek, d.schedule.homeSessionsPerWeek, 0, 7),
      trainingWindows: someOf(sched.trainingWindows, WINDOW_KEYS, d.schedule.trainingWindows),
    },
    places: {
      ground: str(places.ground, d.places.ground),
      groundTravelMin: numOrNull(places.groundTravelMin, d.places.groundTravelMin),
      groundHasGoals: boolOrNull(places.groundHasGoals, d.places.groundHasGoals),
      groundHasLights: boolOrNull(places.groundHasLights, d.places.groundHasLights),
      hasWall: bool(places.hasWall, d.places.hasWall),
      homeSpace: str(places.homeSpace, d.places.homeSpace),
    },
    equipment: someOf(p.equipment, EQUIPMENT_KEYS, d.equipment),
    partner: {
      available: oneOf(partner.available, PARTNER, d.partner.available),
      notes: str(partner.notes, d.partner.notes),
    },
    fitness: {
      pushUps: numOrNull(fit.pushUps, d.fitness.pushUps),
      squats: numOrNull(fit.squats, d.fitness.squats),
      plankSec: numOrNull(fit.plankSec, d.fitness.plankSec),
      singleLegBalanceSec: numOrNull(fit.singleLegBalanceSec, d.fitness.singleLegBalanceSec),
      otherTraining: str(fit.otherTraining, d.fitness.otherTraining),
      warmUpHabit: str(fit.warmUpHabit, d.fitness.warmUpHabit),
    },
    lifestyle: {
      sleepBeforeGamesH: numOrNull(life.sleepBeforeGamesH, d.lifestyle.sleepBeforeGamesH),
      sleepNormalH: numOrNull(life.sleepNormalH, d.lifestyle.sleepNormalH),
      preGameFood: str(life.preGameFood, d.lifestyle.preGameFood),
      dietNotes: str(life.dietNotes, d.lifestyle.dietNotes),
    },
    health: Array.isArray(p.health) ? p.health.map(healthFlag).filter(notNull) : d.health,
    mind: {
      strengths: strList(mind.strengths, d.mind.strengths),
      problemMoment: str(mind.problemMoment, d.mind.problemMoment),
      afterMistake: str(mind.afterMistake, d.mind.afterMistake),
      drivers: str(mind.drivers, d.mind.drivers),
      cueWords: strList(mind.cueWords, d.mind.cueWords),
      ifThen: Array.isArray(mind.ifThen) ? mind.ifThen.map(ifThen).filter(notNull) : d.mind.ifThen,
    },
    prefs: {
      videoLanguage: str(prefs.videoLanguage, d.prefs.videoLanguage) || 'en',
    },
  };
}

/** Keeps only known skills with whole-number scores from 1 to 10. */
export function normalizeRatings(input: unknown): Ratings {
  const o = obj(input);
  const out: Ratings = {};
  for (const key of SKILL_KEYS) {
    const v = o[key];
    if (typeof v === 'number' && Number.isFinite(v)) {
      out[key as SkillKey] = Math.min(10, Math.max(1, Math.round(v)));
    }
  }
  return out;
}

export { isObj, ISO_DATE };
