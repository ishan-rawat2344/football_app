import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import type { Profile, RatingSnapshot } from '../db/types';

export type Loading = 'loading';

/** Your profile, kept live: updates everywhere as soon as it's saved. */
export function useProfile(): Profile | null | Loading {
  return useLiveQuery(async () => (await db.profile.get('me')) ?? null, [], 'loading' as Loading);
}

/** All rating snapshots, oldest first. */
export function useRatingHistory(): RatingSnapshot[] | Loading {
  return useLiveQuery(() => db.ratingSnapshots.orderBy('date').toArray(), [], 'loading' as Loading);
}

export function useSetting<T>(key: string): T | null | Loading {
  return useLiveQuery(
    async () => ((await db.settings.get(key))?.value as T | undefined) ?? null,
    [key],
    'loading' as Loading,
  );
}
