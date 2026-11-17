/** Saving a session: the log, pain reports, and difficulty updates, all at once. */
import { db, getSetting, putSetting } from '../db/db';
import type { PainReport, SessionType } from '../db/types';
import type { ISODate } from '../lib/dates';
import { updateDrillState } from '../plan/adapt';
import type { PlannedBlock } from '../plan/types';
import type { DrillRating, Readiness, RunState } from './run';

const ACTIVE_RUN = 'activeRun';

/** An in-progress session survives the app being closed or reloaded. */
export const saveActiveRun = (run: RunState) => putSetting(ACTIVE_RUN, run);
export const loadActiveRun = () => getSetting<RunState>(ACTIVE_RUN);
export const clearActiveRun = () => db.settings.delete(ACTIVE_RUN);

/** Pain logged mid-session is saved straight away, in case the session is abandoned. */
export async function logPain(report: Omit<PainReport, 'id'>): Promise<PainReport> {
  const id = await db.painReports.add(report as PainReport);
  return { ...report, id: id as number };
}

export interface SessionResult {
  date: ISODate;
  kind: SessionType;
  blocks: PlannedBlock[];
  status: 'done' | 'partial';
  minutes: number;
  rpe: number;
  readiness?: Readiness;
  light?: boolean;
  ratings: Record<string, DrillRating>;
  skipped: string[];
  notes?: string;
  /** Pain noticed at the end ("after"). Mid-session pain is already saved. */
  painAfter: Omit<PainReport, 'id' | 'date' | 'when'>[];
}

export async function saveSession(r: SessionResult): Promise<void> {
  await db.transaction('rw', [db.sessionLogs, db.painReports, db.drillState, db.settings], async () => {
    await db.sessionLogs.where('date').equals(r.date).delete();
    const logId = (await db.sessionLogs.add({
      date: r.date,
      plannedSessionId: r.date,
      status: r.status,
      sessionType: r.kind,
      minutes: r.minutes,
      rpe: r.rpe,
      readiness: r.readiness,
      light: r.light,
      blocks: r.blocks,
      drillRatings: r.ratings,
      skippedDrills: r.skipped,
      notes: r.notes?.trim() || undefined,
    })) as number;
    for (const p of r.painAfter) {
      await db.painReports.add({ ...p, date: r.date, when: 'after', sessionLogId: logId });
    }
    for (const [drillId, rating] of Object.entries(r.ratings)) {
      const prev = await db.drillState.get(drillId);
      await db.drillState.put(updateDrillState(prev, drillId, rating));
    }
    await db.settings.delete(ACTIVE_RUN);
  });
}
