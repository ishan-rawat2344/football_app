/**
 * Makes the library personal: which drills hit your weakest skills, and
 * which ones load an area your health notes say to protect.
 */
import type { HealthFlag, Ratings } from '../db/types';
import { BODY_AREA_LABEL } from '../profile/meta';
import { LOAD_TAG_LABEL } from './meta';
import { LOAD_TAG_AREAS, type Drill, type LoadTag } from './types';

/** A rating at or below this counts as a weakness. */
export const WEAK_AT = 4;

/**
 * Higher = more useful to you right now. Each skill a drill trains adds
 * (10 - your rating), so drills on your weakest skills float to the top.
 * Skills you haven't rated count as a 5.
 */
export function priorityScore(drill: Drill, ratings: Ratings): number {
  return drill.skills.reduce((sum, s) => sum + (10 - (ratings[s] ?? 5)), 0);
}

export function weakSkillsHit(drill: Drill, ratings: Ratings) {
  return drill.skills.filter((s) => (ratings[s] ?? 10) <= WEAK_AT);
}

export interface HealthWarning {
  flag: HealthFlag;
  tags: LoadTag[];
  /** Plain-language warning for the drill page. */
  message: string;
  level: 'stop' | 'caution';
}

/** Warnings for this drill based on your non-resolved health notes. */
export function healthWarnings(drill: Drill, flags: HealthFlag[]): HealthWarning[] {
  const out: HealthWarning[] = [];
  for (const flag of flags) {
    if (flag.status === 'resolved' || flag.areas.length === 0) continue;
    const tags = drill.loadTags.filter((t) => LOAD_TAG_AREAS[t].some((a) => flag.areas.includes(a)));
    if (!tags.length) continue;

    const areas = flag.areas.map((a) => BODY_AREA_LABEL[a].toLowerCase()).join(' and ');
    const loads = tags.map((t) => LOAD_TAG_LABEL[t]).join(', ');
    // Light drills (e.g. the adductor squeeze, which is itself groin rehab)
    // are a caution even for an active note; only harder work says "go easy".
    const level = flag.status === 'active' && drill.intensity !== 'low' ? 'stop' : 'caution';
    const message =
      level === 'stop'
        ? `Your note "${flag.title}" is active. This drill involves ${loads}, which loads your ${areas}. Use the easier version, and stop if pain reaches ${flag.amberAt}/10 or is there the next morning.`
        : flag.status === 'active'
          ? `Your note "${flag.title}" is active. This drill is light, but it involves ${loads}. Stop and note it if your ${areas} reaches ${flag.amberAt}/10.`
          : `You're keeping an eye on "${flag.title}". This drill involves ${loads}. Fine to do, but stop and note it if your ${areas} reaches ${flag.amberAt}/10.`;
    out.push({ flag, tags, message, level });
  }
  // Most serious first.
  return out.sort((a, b) => (a.level === b.level ? 0 : a.level === 'stop' ? -1 : 1));
}
