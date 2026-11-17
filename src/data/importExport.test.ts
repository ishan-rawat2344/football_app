import { readFileSync, existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { normalizeProfile, normalizeRatings } from '../profile/normalize';
import {
  BACKUP_KIND,
  ImportError,
  PROFILE_KIND,
  buildBackup,
  emptyTables,
  parseImportFile,
} from './importExport';

describe('normalizeProfile', () => {
  it('fills a blank input with defaults', () => {
    const p = normalizeProfile({});
    expect(p.id).toBe('me');
    expect(p.positions).toEqual(['LW']);
    expect(p.matchTargets.dribbleAttemptsMin).toBe(3);
    expect(p.prefs.videoLanguage).toBe('en');
  });

  it('drops wrong types and unknown values', () => {
    const p = normalizeProfile({
      age: 'twenty',
      dominantFoot: 'middle',
      positions: ['LW', 'GK', 42],
      equipment: ['ball', 'jetpack'],
      schedule: { groundSessionsPerWeek: 99 },
      health: [{ title: '' }, { title: 'Sore calf', areas: ['calf', 'elbow'], amberAt: 0 }],
    });
    expect(p.age).toBeNull();
    expect(p.dominantFoot).toBe('right');
    expect(p.positions).toEqual(['LW']);
    expect(p.equipment).toEqual(['ball']);
    expect(p.schedule.groundSessionsPerWeek).toBe(7);
    expect(p.health).toHaveLength(1);
    expect(p.health[0]?.areas).toEqual(['calf']);
    expect(p.health[0]?.amberAt).toBe(1);
    expect(p.health[0]?.id).toBeTruthy();
  });

  it('keeps an invalid review date out', () => {
    const p = normalizeProfile({ health: [{ title: 'Groin', reviewBy: '30/11/2026' }] });
    expect(p.health[0]?.reviewBy).toBeUndefined();
  });
});

describe('normalizeRatings', () => {
  it('keeps known skills, rounds and clamps to 1–10', () => {
    expect(normalizeRatings({ pace: 8.4, weakFoot: 0, confidence: 14, juggling: 9 })).toEqual({
      pace: 8,
      weakFoot: 1,
      confidence: 10,
    });
  });
});

describe('parseImportFile', () => {
  it('rejects non-JSON and unknown files with a readable error', () => {
    expect(() => parseImportFile('hello')).toThrow(ImportError);
    expect(() => parseImportFile('{"kind":"something-else"}')).toThrow(/isn't a Touchline/);
  });

  it('parses a profile file with ratings', () => {
    const result = parseImportFile(
      JSON.stringify({
        kind: PROFILE_KIND,
        version: 1,
        profile: { name: 'Test', dominantFoot: 'right' },
        ratings: { date: '2026-11-16', ratings: { pace: 8, weakFoot: 2 } },
      }),
    );
    expect(result.type).toBe('profile');
    if (result.type !== 'profile') return;
    expect(result.profile.name).toBe('Test');
    expect(result.ratings?.ratings).toEqual({ pace: 8, weakFoot: 2 });
  });

  it('round-trips a backup and strips secrets and YouTube caches', () => {
    const tables = emptyTables();
    tables.profile = [{ ...normalizeProfile({ name: 'Test' }) }];
    tables.matchLogs = [{ id: 1, date: '2026-11-18', goals: 2 }];
    tables.settings = [
      { key: 'appOpens', value: 3, updatedAt: 'x' },
      { key: 'youtubeApiKey', value: 'SECRET', updatedAt: 'x' },
    ];
    const backup = buildBackup(tables, '0.2.0', new Date('2026-11-17T10:00:00Z'));
    expect(backup.kind).toBe(BACKUP_KIND);
    expect(JSON.stringify(backup)).not.toContain('SECRET');
    expect(Object.keys(backup.tables)).not.toContain('videos');

    const parsed = parseImportFile(JSON.stringify(backup));
    expect(parsed.type).toBe('backup');
    if (parsed.type !== 'backup') return;
    expect(parsed.counts.matchLogs).toBe(1);
    expect(parsed.counts.settings).toBe(1);
    expect(parsed.backup.tables.matchLogs[0]).toMatchObject({ goals: 2 });
  });

  it('refuses a backup from a newer app version', () => {
    const text = JSON.stringify({ kind: BACKUP_KIND, version: 99, tables: {} });
    expect(() => parseImportFile(text)).toThrow(/newer version/);
  });

  it('drops rows without their key', () => {
    const text = JSON.stringify({
      kind: BACKUP_KIND,
      version: 1,
      tables: { settings: [{ value: 1 }, { key: 'ok', value: 2 }] },
    });
    const parsed = parseImportFile(text);
    expect(parsed.type === 'backup' && parsed.backup.tables.settings).toEqual([{ key: 'ok', value: 2 }]);
  });

  it('rejects a table that is not a list', () => {
    const text = JSON.stringify({ kind: BACKUP_KIND, version: 1, tables: { games: 'oops' } });
    expect(() => parseImportFile(text)).toThrow(/damaged \(games\)/);
  });
});

// Checks the real interview profile imports cleanly. Skipped on CI, where
// private/ doesn't exist.
const privateProfile = new URL('../../private/profile.json', import.meta.url);
describe.runIf(existsSync(privateProfile))('private/profile.json', () => {
  it('imports without losing anything', () => {
    const text = readFileSync(privateProfile, 'utf8');
    const result = parseImportFile(text);
    expect(result.type).toBe('profile');
    if (result.type !== 'profile') return;
    const raw = JSON.parse(text).profile;
    expect(result.profile.health).toHaveLength(raw.health.length);
    expect(result.profile.mind.ifThen).toHaveLength(raw.mind.ifThen.length);
    expect(result.profile.style.roleModels).toHaveLength(raw.style.roleModels.length);
    expect(result.profile.equipment).toEqual(raw.equipment);
    expect(Object.keys(result.ratings?.ratings ?? {})).toHaveLength(14);
  });
});
