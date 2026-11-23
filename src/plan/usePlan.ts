import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useState } from 'react';
import { db, putSetting } from '../db/db';
import { addDays, todayISO, type ISODate } from '../lib/dates';
import { focusSkills, weeklyFocus, type FocusResult } from '../focus/focus';
import { computeStreak, planDays, summarizeWeek, type Streak, type WeekSummary } from './engine';
import type { DayPlan, PlanInput } from './types';

/** Today's date, kept current if the app stays open past midnight. */
export function useToday(): ISODate {
  const [today, setToday] = useState(todayISO);
  useEffect(() => {
    const check = () => setToday(todayISO());
    const timer = setInterval(check, 60_000);
    document.addEventListener('visibilitychange', check);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', check);
    };
  }, []);
  return today;
}

export interface PlanState {
  input: PlanInput;
  days: DayPlan[]; // today and the next 6 days
  yesterday: DayPlan | undefined;
  /** If yesterday has nothing logged: what it was meant to be. */
  yesterdayPlanned: DayPlan['kind'] | null;
  week: WeekSummary;
  streak: Streak;
  focus: FocusResult;
}

/** Everything the plan needs, live from the database. `null` = no profile yet. */
export function usePlan(days = 7): PlanState | null | 'loading' {
  const today = useToday();
  const data = useLiveQuery(
    async () => {
      const profile = await db.profile.get('me');
      if (!profile) return null;
      const from = addDays(today, -21);
      const [ratings, games, logs, overrides, planStart, pain, drillStates, matches, filmTags] = await Promise.all([
        db.ratingSnapshots.orderBy('date').last(),
        db.games.toArray(),
        // 90 days for the streak and the 4-week load check
        db.sessionLogs.where('date').aboveOrEqual(addDays(today, -90)).toArray(),
        db.plannedSessions.toArray(),
        db.settings.get('planStart'),
        db.painReports.where('date').aboveOrEqual(from).toArray(),
        db.drillState.toArray(),
        db.matchLogs.where('date').aboveOrEqual(addDays(today, -60)).toArray(),
        db.filmTags.toArray(),
      ]);
      return {
        profile,
        ratings: ratings?.ratings ?? {},
        games,
        logs,
        overrides: overrides.filter((o) => o.source === 'user'),
        planStart: (planStart?.value as ISODate | undefined) ?? null,
        pain,
        drillStates,
        matches,
        filmTags,
      };
    },
    [today],
    'loading' as const,
  );

  // Light weeks count from the first day you used the plan.
  useEffect(() => {
    if (data && data !== 'loading' && !data.planStart) void putSetting('planStart', today);
  }, [data, today]);

  return useMemo(() => {
    if (data === 'loading' || data === null) return data;
    const focus = weeklyFocus({ matches: data.matches, profile: data.profile, ratings: data.ratings, today, filmTags: data.filmTags });
    const input: PlanInput = { ...data, planStart: data.planStart ?? today, today, focusSkills: focusSkills(focus) };
    const all = planDays(input, days);
    const yesterday = all.find((d) => d.date === addDays(today, -1));
    return {
      input,
      days: all.filter((d) => d.when !== 'past'),
      yesterday,
      // Only ask about days the plan existed for: not before you started using it.
      yesterdayPlanned:
        yesterday && yesterday.kind === 'missed' && !yesterday.logged && yesterday.date >= input.planStart
          ? (yesterday.plannedKind ?? null)
          : null,
      week: summarizeWeek(all, input),
      streak: computeStreak(input),
      focus,
    };
  }, [data, today, days]);
}
