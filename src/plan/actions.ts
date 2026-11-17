/** Writes from the Today and Plan screens. The plan re-computes from these. */
import { db } from '../db/db';
import type { DayOverride, Game, SessionLog, SessionType } from '../db/types';
import type { ISODate } from '../lib/dates';
import type { DayPlan } from './types';

/** status null removes the record (back to "don't know"). */
export async function setGame(date: ISODate, status: Game['status'] | null): Promise<void> {
  if (status === null) await db.games.delete(date);
  else await db.games.put({ date, status });
}

/** override null clears it (back to the plan's own choice). */
export async function setOverride(date: ISODate, override: DayOverride | null): Promise<void> {
  if (override === null) {
    await db.plannedSessions.delete(date);
    return;
  }
  await db.plannedSessions.put({
    id: date,
    date,
    type: override === 'ground' ? 'groundHard' : override,
    blocks: [],
    reasons: [],
    source: 'user',
    override,
  });
}

/**
 * Quick log for M3: done or skipped. Session mode (M4) adds effort, drill
 * ratings and pain to this same record.
 */
export async function logDay(day: DayPlan, status: SessionLog['status']): Promise<void> {
  if (day.kind === 'missed') return;
  await db.transaction('rw', db.sessionLogs, async () => {
    await db.sessionLogs.where('date').equals(day.date).delete();
    await db.sessionLogs.add({
      date: day.date,
      plannedSessionId: day.date,
      status,
      sessionType: day.kind as SessionType,
      minutes: status === 'skipped' ? 0 : day.minutes,
      blocks: day.blocks,
    });
  });
}

/** Answer "did you do yesterday's session?" without opening it. */
export async function logPastDay(date: ISODate, kind: SessionType | null): Promise<void> {
  await db.transaction('rw', db.sessionLogs, async () => {
    await db.sessionLogs.where('date').equals(date).delete();
    await db.sessionLogs.add(
      kind
        ? { date, plannedSessionId: date, status: 'done', sessionType: kind }
        : { date, plannedSessionId: date, status: 'skipped' },
    );
  });
}

export async function clearLog(date: ISODate): Promise<void> {
  await db.sessionLogs.where('date').equals(date).delete();
}
