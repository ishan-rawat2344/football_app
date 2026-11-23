import Dexie, { type EntityTable } from 'dexie';
import type {
  ChannelPref,
  DrillState,
  FilmTag,
  Game,
  LessonProgress,
  MatchLog,
  PainReport,
  PlannedSession,
  Profile,
  RatingSnapshot,
  SearchCacheEntry,
  SessionLog,
  SettingRecord,
  TestResult,
  VideoFeedback,
  VideoRecord,
} from './types';

/**
 * Everything lives in IndexedDB on the device. Drill and lesson content
 * isn't stored here: it ships with the app as code.
 *
 * Schema strings list the primary key first, then indexed fields only.
 * "++id" is an auto-increment key. To change the schema, add
 * `this.version(2).stores({...})` below and never edit an existing version.
 */
export class TouchlineDB extends Dexie {
  profile!: EntityTable<Profile, 'id'>;
  ratingSnapshots!: EntityTable<RatingSnapshot, 'id'>;
  plannedSessions!: EntityTable<PlannedSession, 'id'>;
  games!: EntityTable<Game, 'date'>;
  sessionLogs!: EntityTable<SessionLog, 'id'>;
  painReports!: EntityTable<PainReport, 'id'>;
  matchLogs!: EntityTable<MatchLog, 'id'>;
  testResults!: EntityTable<TestResult, 'id'>;
  drillState!: EntityTable<DrillState, 'drillId'>;
  videos!: EntityTable<VideoRecord, 'videoId'>;
  searchCache!: EntityTable<SearchCacheEntry, 'queryKey'>;
  videoFeedback!: EntityTable<VideoFeedback, 'videoId'>;
  channelPrefs!: EntityTable<ChannelPref, 'channelId'>;
  lessonProgress!: EntityTable<LessonProgress, 'lessonId'>;
  settings!: EntityTable<SettingRecord, 'key'>;
  filmTags!: EntityTable<FilmTag, 'id'>;

  constructor() {
    super('touchline');
    this.version(1).stores({
      profile: 'id',
      ratingSnapshots: '++id, date',
      plannedSessions: 'id, date, type',
      games: 'date, status',
      sessionLogs: '++id, date, plannedSessionId, status',
      painReports: '++id, date, area, [area+date]',
      matchLogs: '++id, date',
      testResults: '++id, testId, date, [testId+date]',
      drillState: 'drillId',
      videos: 'videoId, channelId, fetchedAt',
      searchCache: 'queryKey, fetchedAt',
      videoFeedback: 'videoId',
      channelPrefs: 'channelId',
      lessonProgress: 'lessonId',
      settings: 'key',
    });
    // v1.2: Film room tags. Existing data is untouched.
    this.version(2).stores({
      filmTags: '++id, matchId, [matchId+t]',
    });
  }
}

export const db = new TouchlineDB();

export async function getSetting<T>(key: string): Promise<T | undefined> {
  return (await db.settings.get(key))?.value as T | undefined;
}

export async function putSetting(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value, updatedAt: new Date().toISOString() });
}
