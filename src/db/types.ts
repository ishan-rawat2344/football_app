/**
 * Shapes of the records stored on the device. M0 only creates the tables;
 * later milestones fill them in and may add fields (new fields are optional,
 * so existing data keeps working).
 */
import type { ISODate } from '../lib/dates';

export type SkillKey =
  | 'dribbling1v1'
  | 'firstTouch'
  | 'crossing'
  | 'finishing'
  | 'weakFoot'
  | 'passing'
  | 'pace'
  | 'stamina'
  | 'strength'
  | 'heading'
  | 'offBallMovement'
  | 'defending'
  | 'decisionMaking'
  | 'confidence';

export type Ratings = Partial<Record<SkillKey, number>>; // 1–10

export type BodyArea =
  | 'ankleRight'
  | 'ankleLeft'
  | 'groinRight'
  | 'groinLeft'
  | 'kneeRight'
  | 'kneeLeft'
  | 'hamstringRight'
  | 'hamstringLeft'
  | 'calf'
  | 'hip'
  | 'lowerBack'
  | 'other';

export type Foot = 'right' | 'left' | 'both';
export type Position = 'LW' | 'LM' | 'RW' | 'RM' | 'ST' | 'CAM' | 'CM' | 'LB' | 'RB';
export type EquipmentKey =
  | 'ball'
  | 'cones'
  | 'miniGoal'
  | 'rebounder'
  | 'agilityLadder'
  | 'resistanceBand'
  | 'miniBands'
  | 'hurdles'
  | 'tapeMeasure'
  | 'gym';
export type TrainingWindow = 'earlyMorning' | 'morning' | 'afternoon' | 'evening';

/**
 * active   = hurting now; drives restrictions
 * monitor  = cleared, but watch the pain threshold
 * resolved = history only
 */
export type HealthStatus = 'active' | 'monitor' | 'resolved';

export interface HealthFlag {
  id: string;
  title: string;
  areas: BodyArea[];
  status: HealthStatus;
  /** Pain score (0–10) in these areas that turns the traffic light amber. */
  amberAt: number;
  since: string; // free text, e.g. "March"
  reviewBy?: ISODate;
  notes: string;
  /** What the coach should do about it, in plain words. */
  rules: string;
}

export interface RoleModel {
  name: string;
  what: string;
}

export interface IfThenPlan {
  id: string;
  when: string;
  then: string;
}

/** Single row (id "me"), imported from your private profile file in M1. */
export interface Profile {
  id: 'me';
  updatedAt: string;
  name: string;
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
  country: string;
  dominantFoot: Foot;
  positions: Position[];
  game: {
    level: string;
    format: string;
    surface: string;
    teamShape: string;
    matchMinutes: number | null;
    minutesPlayed: number | null;
  };
  style: {
    weapons: string[];
    goalSources: string[];
    goTo1v1: string;
    goodGame: string;
    badGame: string;
    roleModels: RoleModel[];
  };
  goals: {
    weeks4: string[];
    months3: string[];
    year1: string[];
  };
  /** Numbers the weekly focus (M5) checks your match logs against. */
  matchTargets: {
    dribbleAttemptsMin: number;
    dribbleAttemptsTarget: number;
    leftFootPassesMin: number;
  };
  schedule: {
    gamesPerWeekMin: number;
    gamesPerWeekMax: number;
    gameStartTime: string; // 24-hour "HH:MM"
    gameNoticeDays: number;
    groundSessionsPerWeek: number;
    groundSessionsMax: number;
    homeSessionsPerWeek: number;
    trainingWindows: TrainingWindow[];
  };
  places: {
    ground: string;
    groundTravelMin: number | null;
    groundHasGoals: boolean | null; // null = not checked yet
    groundHasLights: boolean | null;
    hasWall: boolean;
    homeSpace: string;
  };
  equipment: EquipmentKey[];
  partner: {
    available: 'never' | 'occasional' | 'regular';
    notes: string;
  };
  fitness: {
    pushUps: number | null;
    squats: number | null;
    plankSec: number | null;
    singleLegBalanceSec: number | null;
    otherTraining: string;
    warmUpHabit: string;
  };
  lifestyle: {
    sleepBeforeGamesH: number | null;
    sleepNormalH: number | null;
    preGameFood: string;
    dietNotes: string;
  };
  health: HealthFlag[];
  mind: {
    strengths: string[];
    problemMoment: string;
    afterMistake: string;
    drivers: string;
    cueWords: string[];
    ifThen: IfThenPlan[];
  };
  prefs: {
    videoLanguage: string;
  };
}

export interface RatingSnapshot {
  id?: number;
  date: ISODate;
  ratings: Ratings;
  note?: string;
}

export type SessionType =
  | 'groundHard'
  | 'groundTech'
  | 'home'
  | 'sharp'
  | 'recovery'
  | 'rest'
  | 'game';

/** What you asked for on a day, instead of the automatic choice. */
export type DayOverride = 'ground' | 'groundTech' | 'home' | 'rest';

/**
 * Stored only when you change a day by hand ("can't get to the ground").
 * Every other day is worked out fresh by the plan engine (src/plan).
 */
export interface PlannedSession {
  id: string; // the date, e.g. "2026-11-18"
  date: ISODate;
  type: SessionType;
  blocks: unknown[];
  reasons: string[];
  source?: 'user';
  override?: DayOverride;
}

/**
 * planned  = you've signed up
 * played   = it happened
 * cancelled = was on, then called off
 * none     = you've confirmed there is no game that day
 */
export interface Game {
  date: ISODate;
  status: 'planned' | 'played' | 'cancelled' | 'none';
}

export interface SessionLog {
  id?: number;
  date: ISODate;
  plannedSessionId?: string;
  status: 'done' | 'partial' | 'skipped';
  /** What kind of day it was, so weekly targets can count it. */
  sessionType?: SessionType;
  rpe?: number; // 1–10
  minutes?: number;
  notes?: string;
  [field: string]: unknown;
}

export interface PainReport {
  id?: number;
  date: ISODate;
  area: BodyArea;
  score: number; // 0–10
  when: 'during' | 'after' | 'nextMorning' | 'atRest';
  sessionLogId?: number;
  note?: string;
}

export interface MatchLog {
  id?: number;
  date: ISODate;
  minutes?: number;
  /** How hard the game was, 1–10 (feeds training load). */
  rpe?: number;
  goals?: number;
  assists?: number;
  /** 1v1 take-ons tried and won. */
  dribblesAttempted?: number;
  dribblesWon?: number;
  shots?: number;
  shotsOnTarget?: number;
  /** Deliberate left-foot actions: passes, crosses, shots. */
  leftFootTouches?: number;
  confidence?: number; // 1–10
  /** How much of the ball you got. */
  involvement?: 'lots' | 'some' | 'barely';
  /** After losing the ball, did you keep asking for it? */
  keptAsking?: 'yes' | 'mostly' | 'no';
  wentWell?: string;
  wentBadly?: string;
  keyMoments?: string;
  mental?: string;
  /** Link to the game recording (e.g. YouTube). */
  recordingUrl?: string;
  /** Film room: where kick-off is in the video (seconds). */
  filmKickoff?: number;
  /** Film room: when you finished reviewing this game. */
  filmReviewedAt?: string;
  [field: string]: unknown;
}

/** Film room: one moment you tagged in a match video. */
export type FilmTagKind =
  | 'oneVOne'
  | 'shot'
  | 'leftFoot'
  | 'cross'
  | 'lost'
  | 'safe'
  | 'run'
  | 'showed'
  | 'quiet'
  | 'trackBack'
  | 'press'
  | 'moment';

export interface FilmTag {
  id?: number;
  matchId: number;
  /** Seconds into the video. */
  t: number;
  kind: FilmTagKind;
  /** e.g. "won", "goal", "late". Set when tagging or in review. */
  outcome?: string;
  /** What caused it, from the review list. */
  reasons?: string[];
  note?: string;
  createdAt: string;
}

export interface TestResult {
  id?: number;
  testId: string;
  date: ISODate;
  value: number;
  notes?: string;
}

export interface DrillState {
  drillId: string;
  level: -1 | 0 | 1; // easier / standard / harder
  recentRatings: Array<'easy' | 'right' | 'hard'>;
}

export interface VideoRecord {
  videoId: string;
  title: string;
  channelId: string;
  channelTitle: string;
  durationSec: number;
  views: number;
  likes?: number;
  lang?: string;
  embeddable?: boolean;
  isLive?: boolean;
  publishedAt: string;
  fetchedAt: string; // YouTube policy: refresh or delete within 30 days
}

export interface SearchCacheEntry {
  queryKey: string;
  videoIds: string[];
  fetchedAt: string;
}

export interface VideoFeedback {
  videoId: string;
  saved?: boolean;
  liked?: boolean;
  hidden?: boolean;
  updatedAt: string;
}

export interface ChannelPref {
  channelId: string;
  channelTitle?: string;
  /** When channelTitle came from YouTube (it's cleared after 30 days). */
  titleAt?: string;
  trusted?: boolean;
  blocked?: boolean;
  /** + for each video you liked from it, − for each you hid. */
  affinity: number;
}

export interface LessonProgress {
  lessonId: string;
  readAt: string;
}

export interface SettingRecord {
  key: string;
  value: unknown;
  updatedAt: string;
}
