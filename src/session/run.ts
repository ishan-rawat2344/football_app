/**
 * Session mode as a pure state machine. The screen dispatches actions and a
 * `tick` with the current time; timers use timestamps (not counting
 * intervals), so they stay right even if the phone pauses the app.
 */
import type { SessionType } from '../db/types';
import { getDrill } from '../drills/library';
import type { SessionBlock } from '../drills/types';
import type { ISODate } from '../lib/dates';
import type { PlannedBlock } from '../plan/types';

export type DrillRating = 'easy' | 'right' | 'hard';
export type Phase = 'work' | 'rest' | 'rate' | 'done';

export interface Readiness {
  sleep: 'good' | 'ok' | 'poor';
  legs: 'fresh' | 'ok' | 'heavy';
  soreness: 'none' | 'bit' | 'sore';
}

export interface RunItem {
  drillId: string;
  block: SessionBlock;
  level: -1 | 0 | 1;
  sets: number;
  reps: string;
  workSec?: number;
  restSec: number;
  minutes: number;
  note?: string;
}

export interface RunState {
  date: ISODate;
  kind: SessionType;
  startedAt: number;
  endedAt?: number;
  light: boolean;
  readiness?: Readiness;
  items: RunItem[];
  index: number;
  set: number; // 1-based
  phase: Phase;
  /** When the current timed phase ends (ms), or null for untimed / paused. */
  endsAt: number | null;
  pausedLeft: number | null;
  ratings: Record<string, DrillRating>;
  finished: string[];
  skipped: string[];
  endedEarly: boolean;
}

export type RunAction =
  | { type: 'tick'; now: number }
  | { type: 'setDone'; now: number }
  | { type: 'skipRest'; now: number }
  | { type: 'pause'; now: number }
  | { type: 'resume'; now: number }
  | { type: 'rate'; rating: DrillRating; now: number }
  | { type: 'skipDrill'; now: number }
  | { type: 'skipDrills'; drillIds: string[]; now: number }
  | { type: 'end'; now: number };

/** Light version: poor sleep and heavy legs, or real soreness. */
export function needsLightVersion(r: Readiness): boolean {
  const flags = [r.sleep === 'poor', r.legs === 'heavy', r.soreness === 'bit'].filter(Boolean).length;
  return r.soreness === 'sore' || flags >= 2;
}

const LIGHT_FACTOR = 0.6;

/** Flatten the plan's blocks into the list of drills session mode walks through. */
export function buildRunItems(blocks: PlannedBlock[], light: boolean): RunItem[] {
  const items: RunItem[] = [];
  for (const b of blocks) {
    for (const it of b.items) {
      const d = getDrill(it.drillId);
      if (!d) continue;
      // Light version: no flat-out speed work, fewer sets of everything else.
      if (light && d.category === 'speed' && d.intensity === 'high') continue;
      const baseSets = it.sets ?? d.dose.sets;
      const sets = light && b.block !== 'warmup' && b.block !== 'cooldown' ? Math.max(1, Math.round(baseSets * LIGHT_FACTOR)) : baseSets;
      items.push({
        drillId: d.id,
        block: b.block,
        level: it.level,
        sets,
        reps: d.dose.reps,
        workSec: d.dose.workSec,
        restSec: d.dose.restSec,
        minutes: light ? Math.max(2, Math.round(it.minutes * (sets / Math.max(1, baseSets)))) : it.minutes,
        note: it.note,
      });
    }
  }
  return items;
}

export function initRun(args: {
  date: ISODate;
  kind: SessionType;
  blocks: PlannedBlock[];
  now: number;
  readiness?: Readiness;
  light?: boolean;
}): RunState {
  const light = args.light ?? (args.readiness ? needsLightVersion(args.readiness) : false);
  const items = buildRunItems(args.blocks, light);
  const base: RunState = {
    date: args.date,
    kind: args.kind,
    startedAt: args.now,
    light,
    readiness: args.readiness,
    items,
    index: 0,
    set: 1,
    phase: 'work',
    endsAt: null,
    pausedLeft: null,
    ratings: {},
    finished: [],
    skipped: [],
    endedEarly: false,
  };
  return items.length ? startWork(base, 0, 1, args.now) : { ...base, phase: 'done', endedAt: args.now };
}

export const currentItem = (s: RunState): RunItem | undefined => s.items[s.index];

function startWork(s: RunState, index: number, set: number, now: number): RunState {
  const item = s.items[index]!;
  return {
    ...s,
    index,
    set,
    phase: 'work',
    endsAt: item.workSec ? now + item.workSec * 1000 : null,
    pausedLeft: null,
  };
}

/** Warm-ups and cool-downs aren't rated: they don't change level. */
const rated = (item: RunItem) => item.block !== 'warmup' && item.block !== 'cooldown';

function finishItem(s: RunState, now: number): RunState {
  const item = s.items[s.index]!;
  if (rated(item)) return { ...s, phase: 'rate', endsAt: null, pausedLeft: null };
  return nextItem({ ...s, finished: [...s.finished, item.drillId] }, now);
}

function nextItem(s: RunState, now: number): RunState {
  // Skip anything already marked as skipped (e.g. after a pain report).
  let i = s.index + 1;
  while (i < s.items.length && s.skipped.includes(s.items[i]!.drillId)) i++;
  if (i >= s.items.length) return { ...s, phase: 'done', endsAt: null, pausedLeft: null, endedAt: now };
  return startWork(s, i, 1, now);
}

function afterWork(s: RunState, now: number): RunState {
  const item = s.items[s.index]!;
  if (s.set >= item.sets) return finishItem(s, now);
  if (item.restSec > 0) return { ...s, phase: 'rest', endsAt: now + item.restSec * 1000, pausedLeft: null };
  return startWork(s, s.index, s.set + 1, now);
}

export function runReducer(s: RunState, a: RunAction): RunState {
  if (s.phase === 'done') return s;
  switch (a.type) {
    case 'tick':
      if (s.endsAt === null || a.now < s.endsAt) return s;
      if (s.phase === 'work') return afterWork(s, a.now);
      if (s.phase === 'rest') return startWork(s, s.index, s.set + 1, a.now);
      return s;
    case 'setDone':
      return s.phase === 'work' ? afterWork(s, a.now) : s;
    case 'skipRest':
      return s.phase === 'rest' ? startWork(s, s.index, s.set + 1, a.now) : s;
    case 'pause':
      return s.endsAt !== null ? { ...s, pausedLeft: Math.max(0, s.endsAt - a.now), endsAt: null } : s;
    case 'resume':
      return s.pausedLeft !== null ? { ...s, endsAt: a.now + s.pausedLeft, pausedLeft: null } : s;
    case 'rate': {
      if (s.phase !== 'rate') return s;
      const id = s.items[s.index]!.drillId;
      return nextItem({ ...s, ratings: { ...s.ratings, [id]: a.rating }, finished: [...s.finished, id] }, a.now);
    }
    case 'skipDrill': {
      const id = s.items[s.index]!.drillId;
      return nextItem({ ...s, skipped: [...s.skipped, id] }, a.now);
    }
    case 'skipDrills': {
      // Mark later drills as skipped (they'll be passed over); the current one too if listed.
      const skipped = [...new Set([...s.skipped, ...a.drillIds])];
      const next = { ...s, skipped };
      return skipped.includes(s.items[s.index]!.drillId) ? nextItem(next, a.now) : next;
    }
    case 'end':
      return { ...s, phase: 'done', endsAt: null, pausedLeft: null, endedAt: a.now, endedEarly: true };
  }
}

/** Seconds left in the current timed phase (null if untimed). */
export function secondsLeft(s: RunState, now: number): number | null {
  if (s.pausedLeft !== null) return Math.ceil(s.pausedLeft / 1000);
  if (s.endsAt === null) return null;
  return Math.max(0, Math.ceil((s.endsAt - now) / 1000));
}

/** "done" if everything that counts was completed; "partial" otherwise. */
export function runStatus(s: RunState): 'done' | 'partial' {
  const missed = s.items.filter((i) => rated(i) && !s.finished.includes(i.drillId));
  return s.endedEarly || missed.length > 0 ? 'partial' : 'done';
}

export function elapsedMinutes(s: RunState, now: number): number {
  return Math.max(1, Math.round(((s.endedAt ?? now) - s.startedAt) / 60000));
}
