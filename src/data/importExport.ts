/**
 * Backup, restore and profile import. The pure functions (build/parse) are
 * unit-tested; the db functions are thin wrappers around them.
 *
 * Two file kinds:
 *  - "touchline-profile": your profile + first ratings (made from the interview)
 *  - "touchline-backup":  everything on the phone, for restore or a new phone
 */
import type { Profile, RatingSnapshot } from '../db/types';
import { isObj, ISO_DATE, normalizeProfile, normalizeRatings } from '../profile/normalize';

export const PROFILE_KIND = 'touchline-profile';
export const BACKUP_KIND = 'touchline-backup';
export const BACKUP_VERSION = 1;

/**
 * Tables included in a backup. Left out on purpose: `videos` and
 * `searchCache`, which hold YouTube API data. YouTube's policy says it must be
 * refreshed or deleted within 30 days, so it's re-fetched rather than backed up.
 */
export const BACKUP_TABLES = [
  'profile',
  'ratingSnapshots',
  'plannedSessions',
  'games',
  'sessionLogs',
  'painReports',
  'matchLogs',
  'testResults',
  'drillState',
  'videoFeedback',
  'channelPrefs',
  'lessonProgress',
  'settings',
] as const;
export type BackupTable = (typeof BACKUP_TABLES)[number];
export type BackupTables = Record<BackupTable, Record<string, unknown>[]>;

/** Settings that never leave the phone (e.g. API keys). */
export const SECRET_SETTING_KEYS = ['youtubeApiKey'];

/** Primary key of each table, used to check rows are usable. */
const PRIMARY_KEY: Record<BackupTable, string | null> = {
  profile: 'id',
  ratingSnapshots: null, // auto-increment
  plannedSessions: 'id',
  games: 'date',
  sessionLogs: null,
  painReports: null,
  matchLogs: null,
  testResults: null,
  drillState: 'drillId',
  videoFeedback: 'videoId',
  channelPrefs: 'channelId',
  lessonProgress: 'lessonId',
  settings: 'key',
};

export interface BackupFile {
  kind: typeof BACKUP_KIND;
  version: number;
  appVersion: string;
  exportedAt: string;
  tables: BackupTables;
}

export type ParsedImport =
  | { type: 'profile'; profile: Profile; ratings: RatingSnapshot | null }
  | { type: 'backup'; backup: BackupFile; counts: Record<BackupTable, number> };

export class ImportError extends Error {}

export function emptyTables(): BackupTables {
  return Object.fromEntries(BACKUP_TABLES.map((t) => [t, []])) as unknown as BackupTables;
}

export function buildBackup(tables: BackupTables, appVersion: string, now = new Date()): BackupFile {
  const settings = tables.settings.filter(
    (row) => !SECRET_SETTING_KEYS.includes(String(row.key)),
  );
  return {
    kind: BACKUP_KIND,
    version: BACKUP_VERSION,
    appVersion,
    exportedAt: now.toISOString(),
    tables: { ...tables, settings },
  };
}

export function countRows(tables: BackupTables): Record<BackupTable, number> {
  return Object.fromEntries(BACKUP_TABLES.map((t) => [t, tables[t].length])) as Record<
    BackupTable,
    number
  >;
}

function parseProfileFile(data: Record<string, unknown>): ParsedImport {
  if (!isObj(data.profile)) throw new ImportError('This profile file has no profile in it.');
  const profile = normalizeProfile({ ...data.profile, updatedAt: new Date().toISOString() });

  let ratings: RatingSnapshot | null = null;
  if (isObj(data.ratings)) {
    const r = normalizeRatings(data.ratings.ratings);
    const date = typeof data.ratings.date === 'string' ? data.ratings.date : '';
    if (Object.keys(r).length && ISO_DATE.test(date)) {
      ratings = {
        date,
        ratings: r,
        note: typeof data.ratings.note === 'string' ? data.ratings.note : undefined,
      };
    }
  }
  return { type: 'profile', profile, ratings };
}

function parseBackupFile(data: Record<string, unknown>): ParsedImport {
  const version = typeof data.version === 'number' ? data.version : NaN;
  if (!(version >= 1)) throw new ImportError('This backup file is damaged (no version).');
  if (version > BACKUP_VERSION) {
    throw new ImportError(
      'This backup was made by a newer version of Touchline. Update the app (Settings → Repair app), then try again.',
    );
  }
  if (!isObj(data.tables)) throw new ImportError('This backup file is damaged (no data).');

  const tables = emptyTables();
  for (const name of BACKUP_TABLES) {
    const rows = data.tables[name];
    if (rows === undefined) continue;
    if (!Array.isArray(rows)) throw new ImportError(`This backup file is damaged (${name}).`);
    const key = PRIMARY_KEY[name];
    tables[name] = rows.filter(
      (r): r is Record<string, unknown> => isObj(r) && (key === null || r[key] !== undefined),
    );
  }
  // Profiles go through the same clean-up as an imported profile file.
  tables.profile = tables.profile.slice(0, 1).map((p) => ({ ...normalizeProfile(p) }));
  tables.settings = tables.settings.filter((r) => !SECRET_SETTING_KEYS.includes(String(r.key)));

  const backup: BackupFile = {
    kind: BACKUP_KIND,
    version,
    appVersion: typeof data.appVersion === 'string' ? data.appVersion : 'unknown',
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
    tables,
  };
  return { type: 'backup', backup, counts: countRows(tables) };
}

/** Reads a file's text and works out what it is. Throws ImportError with a readable message. */
export function parseImportFile(text: string): ParsedImport {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ImportError("That file isn't a Touchline file (it isn't valid JSON).");
  }
  if (!isObj(data)) throw new ImportError("That file isn't a Touchline file.");
  if (data.kind === PROFILE_KIND) return parseProfileFile(data);
  if (data.kind === BACKUP_KIND) return parseBackupFile(data);
  throw new ImportError("That file isn't a Touchline profile or backup.");
}

export function backupFileName(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `touchline-backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}
