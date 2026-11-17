import type { BodyArea, SkillKey } from '../db/types';

export type DrillCategory =
  | 'warmup'
  | 'ballMastery'
  | 'oneVOne'
  | 'receiving'
  | 'crossing'
  | 'finishing'
  | 'weakFoot'
  | 'movement'
  | 'defending'
  | 'speed'
  | 'injuryPrevention'
  | 'cooldown';

/** Where it can be done. The terrace has a wall; the room is small (no kicking). */
export type DrillLocation = 'ground' | 'terrace' | 'room';

/** "either" = solo by default, with a partner version described in `partner`. */
export type DrillMode = 'solo' | 'partner' | 'either';

export type Intensity = 'low' | 'medium' | 'high';

/** Which part of a session a drill fits (used by the plan in M3). */
export type SessionBlock = 'warmup' | 'technical' | 'position' | 'physical' | 'cooldown';

/**
 * What a drill loads, so the plan can hold it back when something hurts and
 * avoid stacking hard work before games.
 */
export type LoadTag =
  | 'sprint' // max-speed running
  | 'cutting' // sharp changes of direction
  | 'kicking' // lots of hard strikes (loads groin and ankle)
  | 'adductor' // direct inner-thigh loading
  | 'ankle' // landing, balance or ankle-specific loading
  | 'hamstring' // eccentric hamstring work
  | 'plyometric'; // jumps and hops

export type EquipmentNeed =
  | 'ball'
  | 'markers' // cones, or stones/bottles
  | 'wall'
  | 'goal' // a real goal, or a wall with a marked target
  | 'band'
  | 'tapeMeasure'
  | 'phone' // timer or the cue caller
  | 'anchor' // something heavy to hook your feet under (sofa, bed) or a partner
  | 'bench'; // sofa, bed edge, chair or step

export interface DrillDose {
  sets: number;
  /** What one set is, e.g. "6 runs each side" or "30 s each foot". */
  reps: string;
  /** Timed work interval, for session-mode timers (M4). Omit for rep-based work. */
  workSec?: number;
  /** Rest between sets (and between timed reps). */
  restSec: number;
}

export interface Drill {
  id: string;
  name: string;
  category: DrillCategory;
  /** Why a right-footed left winger does this. */
  purpose: string;
  /** Distances and layout. */
  setup: string;
  equipment: EquipmentNeed[];
  locations: DrillLocation[];
  mode: DrillMode;
  durationMin: number;
  dose: DrillDose;
  steps: string[];
  coachingPoints: [string, string, string];
  mistakes: string[];
  easier: string;
  harder: string;
  /** How a non-footballer can help, for "either" and "partner" drills. */
  partner?: string;
  skills: SkillKey[];
  blocks: SessionBlock[];
  intensity: Intensity;
  loadTags: LoadTag[];
  /** Always shown: safety rules for this drill. */
  safety?: string;
  /** YouTube searches for this drill (M8). */
  videoQueries: string[];
}

export const LOAD_TAG_AREAS: Record<LoadTag, BodyArea[]> = {
  sprint: ['hamstringLeft', 'hamstringRight', 'calf'],
  cutting: ['ankleLeft', 'ankleRight', 'groinLeft', 'groinRight', 'kneeLeft', 'kneeRight'],
  kicking: ['groinLeft', 'groinRight', 'ankleLeft', 'ankleRight', 'hip'],
  adductor: ['groinLeft', 'groinRight'],
  ankle: ['ankleLeft', 'ankleRight', 'calf'],
  hamstring: ['hamstringLeft', 'hamstringRight'],
  plyometric: ['ankleLeft', 'ankleRight', 'kneeLeft', 'kneeRight', 'calf'],
};
