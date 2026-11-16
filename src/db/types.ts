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

/** Single row (id "me"). Filled in M1 from your private profile file. */
export interface Profile {
  id: 'me';
  name?: string;
  updatedAt: string;
  [field: string]: unknown;
}

export interface RatingSnapshot {
  id?: number;
  date: ISODate;
  ratings: Ratings;
}

export type SessionType =
  | 'groundHard'
  | 'groundTech'
  | 'home'
  | 'sharp'
  | 'recovery'
  | 'rest'
  | 'game';

export interface PlannedSession {
  id: string; // e.g. "2026-11-18"
  date: ISODate;
  type: SessionType;
  blocks: unknown[];
  reasons: string[];
}

export interface Game {
  date: ISODate;
  status: 'planned' | 'played' | 'cancelled';
}

export interface SessionLog {
  id?: number;
  date: ISODate;
  plannedSessionId?: string;
  status: 'done' | 'partial' | 'skipped';
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
  goals?: number;
  assists?: number;
  dribblesAttempted?: number;
  dribblesWon?: number;
  shots?: number;
  shotsOnTarget?: number;
  leftFootTouches?: number;
  confidence?: number; // 1–10
  [field: string]: unknown;
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
  trusted?: boolean;
  blocked?: boolean;
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
