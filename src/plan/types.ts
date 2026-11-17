import type {
  DayOverride,
  DrillState,
  Game,
  PainReport,
  PlannedSession,
  Profile,
  Ratings,
  SessionLog,
  SessionType,
} from '../db/types';
import type { AreaRestriction } from './adapt';
import type { SessionBlock } from '../drills/types';
import type { ISODate } from '../lib/dates';

export interface PlannedItem {
  drillId: string;
  /** -1 = do the easier version, 0 = standard, 1 = harder. */
  level: -1 | 0 | 1;
  minutes: number;
  /** Sets for today (the drill's dose, scaled for sharp or light days). */
  sets?: number;
  note?: string;
}

export interface PlannedBlock {
  block: SessionBlock;
  items: PlannedItem[];
}

/** "missed" = a past day with nothing logged. It counts as a rest day. */
export type DayKind = SessionType | 'missed';

export type DayIntensity = 'rest' | 'low' | 'medium' | 'high';

export interface DayPlan {
  date: ISODate;
  kind: DayKind;
  title: string;
  minutes: number;
  intensity: DayIntensity;
  blocks: PlannedBlock[];
  /** Plain-language reasons, most important first. */
  reasons: string[];
  when: 'past' | 'today' | 'future';
  /** Every 4th week is lighter. */
  lightWeek: boolean;
  logged?: SessionLog['status'];
  override?: DayOverride;
  /** Ask "signed up for a game tomorrow?" before a hard session. */
  askGameTomorrow: boolean;
  gameTomorrow: boolean;
  /** Swaps the user can pick for this day. */
  options: DayOverride[];
  /** Past unlogged days: what the plan had for that day. */
  plannedKind?: SessionType;
  /** Body areas the plan is protecting because of logged pain. */
  restrictions: AreaRestriction[];
}

export interface PlanInput {
  today: ISODate;
  profile: Profile;
  ratings: Ratings;
  games: Game[];
  logs: SessionLog[];
  overrides: PlannedSession[];
  /** First day the plan ran; light weeks count from here. */
  planStart: ISODate;
  /** Recent pain reports (traffic light). */
  pain?: PainReport[];
  /** Per-drill difficulty from your ratings. */
  drillStates?: DrillState[];
}

export interface WeekCounts {
  ground: number;
  home: number;
  rest: number;
  games: number;
  /** Targets for this week (lower in a light week). */
  groundTarget: number;
  homeTarget: number;
}
