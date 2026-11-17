/** Database side of import, backup and restore. */
import type { Table } from 'dexie';
import { db, getSetting, putSetting } from '../db/db';
import type { Profile, RatingSnapshot } from '../db/types';
import { todayISO } from '../lib/dates';
import {
  BACKUP_TABLES,
  SECRET_SETTING_KEYS,
  backupFileName,
  buildBackup,
  emptyTables,
  type BackupFile,
} from './importExport';

const tableOf = (name: string) => db.table(name) as Table<Record<string, unknown>>;

export async function exportBackup(): Promise<File> {
  const tables = emptyTables();
  await db.transaction('r', BACKUP_TABLES.map(tableOf), async () => {
    for (const name of BACKUP_TABLES) tables[name] = await tableOf(name).toArray();
  });
  const backup = buildBackup(tables, __APP_VERSION__);
  return new File([JSON.stringify(backup, null, 1)], backupFileName(), { type: 'application/json' });
}

/**
 * iPhone: opens the share sheet (Save to Files, AirDrop…).
 * Elsewhere: a normal download. Returns false if the user cancelled.
 */
export async function shareOrDownload(file: File): Promise<boolean> {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: file.name });
      return true;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return false;
      // Share failed for another reason: fall through to a download.
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return true;
}

export async function markBackedUp(): Promise<void> {
  await putSetting('lastBackupAt', new Date().toISOString());
}

export async function getLastBackupAt(): Promise<string | null> {
  return (await getSetting<string>('lastBackupAt')) ?? null;
}

/** Replaces everything on the phone with the backup. API keys on this phone are kept. */
export async function restoreBackup(backup: BackupFile): Promise<void> {
  await db.transaction('rw', BACKUP_TABLES.map(tableOf), async () => {
    for (const name of BACKUP_TABLES) {
      const table = tableOf(name);
      if (name === 'settings') {
        const keep = await table.where('key').anyOf(SECRET_SETTING_KEYS).toArray();
        await table.clear();
        await table.bulkPut([...backup.tables.settings, ...keep]);
      } else {
        await table.clear();
        await table.bulkPut(backup.tables[name]);
      }
    }
  });
  await putSetting('lastRestoreAt', new Date().toISOString());
}

/** Saves an imported profile. Logs and history are untouched. */
export async function importProfile(profile: Profile, ratings: RatingSnapshot | null): Promise<void> {
  await db.transaction('rw', db.profile, db.ratingSnapshots, async () => {
    await db.profile.put({ ...profile, updatedAt: new Date().toISOString() });
    if (ratings) {
      const sameDay = await db.ratingSnapshots.where('date').equals(ratings.date).first();
      if (!sameDay) await db.ratingSnapshots.add(ratings);
    }
  });
}

export async function saveProfile(profile: Profile): Promise<void> {
  await db.profile.put({ ...profile, updatedAt: new Date().toISOString() });
}

/** One rating snapshot per day: saving again today updates today's. */
export async function saveRatings(ratings: RatingSnapshot['ratings']): Promise<void> {
  const date = todayISO();
  await db.transaction('rw', db.ratingSnapshots, async () => {
    const existing = await db.ratingSnapshots.where('date').equals(date).first();
    if (existing?.id !== undefined) await db.ratingSnapshots.update(existing.id, { ratings });
    else await db.ratingSnapshots.add({ date, ratings });
  });
}

/** Wipes every table on this phone, API keys included. */
export async function deleteAllData(): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    for (const t of db.tables) await t.clear();
  });
}
