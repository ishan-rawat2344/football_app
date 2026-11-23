/**
 * What the Film room works out from your tags: match stats, patterns and
 * weekly focus areas. Pure, so it's tested.
 */
import type { FilmTag, FilmTagKind, MatchLog } from '../db/types';
import type { FocusArea } from '../focus/focus';
import { getTag, type Reason } from './tags';

export interface FilmStats {
  dribblesAttempted: number;
  dribblesWon: number;
  shots: number;
  shotsOnTarget: number;
  goals: number;
  leftFootTouches: number;
  keptAsking?: MatchLog['keptAsking'];
  /** Tags that still need a result (1v1 won or lost, etc.). */
  missingOutcome: number;
}

const count = (tags: FilmTag[], kind: FilmTagKind, outcomes?: string[]) =>
  tags.filter((t) => t.kind === kind && (!outcomes || (t.outcome && outcomes.includes(t.outcome)))).length;

export function statsFromTags(tags: FilmTag[]): FilmStats {
  const lost = count(tags, 'lost');
  const quiet = count(tags, 'quiet');
  const showed = count(tags, 'showed');
  // Only when you tagged how you reacted (showed again / went quiet).
  let keptAsking: FilmStats['keptAsking'];
  if (quiet) keptAsking = showed >= quiet ? 'mostly' : 'no';
  else if (showed && lost) keptAsking = 'yes';
  return {
    dribblesAttempted: count(tags, 'oneVOne'),
    dribblesWon: count(tags, 'oneVOne', ['won']),
    shots: count(tags, 'shot'),
    shotsOnTarget: count(tags, 'shot', ['goal', 'on']),
    goals: count(tags, 'shot', ['goal']),
    leftFootTouches: count(tags, 'leftFoot'),
    keptAsking,
    missingOutcome: tags.filter((t) => getTag(t.kind).outcomes && !t.outcome).length,
  };
}

/**
 * The match-log fields the tags can fill in, for "Use these numbers". Only
 * kinds you actually tagged: no 1v1 tags means "not tagged", not "zero".
 */
export function statsPatch(s: FilmStats): Partial<MatchLog> {
  const patch: Partial<MatchLog> = {};
  if (s.dribblesAttempted) Object.assign(patch, { dribblesAttempted: s.dribblesAttempted, dribblesWon: s.dribblesWon });
  if (s.shots) Object.assign(patch, { shots: s.shots, shotsOnTarget: s.shotsOnTarget, goals: s.goals });
  if (s.leftFootTouches) patch.leftFootTouches = s.leftFootTouches;
  if (s.keptAsking) patch.keptAsking = s.keptAsking;
  return patch;
}

const NOUN: Record<FilmTagKind, string> = {
  oneVOne: '1v1s you lost',
  shot: 'shots that went wrong',
  leftFoot: 'poor left-foot actions',
  cross: 'crosses that missed',
  lost: 'times you lost the ball',
  safe: 'times you played it safe',
  run: 'runs that went wrong',
  showed: 'times you showed again',
  quiet: 'quiet spells',
  trackBack: 'recoveries that went wrong',
  press: 'presses they played round',
  moment: 'moments',
};

export interface Pattern {
  kind: FilmTagKind;
  reason: Reason;
  count: number;
  /** How many tags it could have applied to. */
  of: number;
  /** How many games it came up in. */
  games: number;
  text: string;
}

/** Problems that keep coming up, most frequent first. */
export function patterns(tags: FilmTag[], minCount = 2): Pattern[] {
  const out: Pattern[] = [];
  const kinds = [...new Set(tags.map((t) => t.kind))];
  for (const kind of kinds) {
    const def = getTag(kind);
    for (const reason of def.reasons.filter((r) => r.problem)) {
      const hits = tags.filter((t) => t.kind === kind && t.reasons?.includes(reason.key));
      if (hits.length < minCount) continue;
      const of = tags.filter((t) => t.kind === kind && (!reason.for || !t.outcome || reason.for.includes(t.outcome))).length;
      const label = reason.label.charAt(0).toLowerCase() + reason.label.slice(1);
      out.push({
        kind,
        reason,
        count: hits.length,
        of,
        games: new Set(hits.map((h) => h.matchId)).size,
        text: `${hits.length} of ${of} ${NOUN[kind]}: ${label}`,
      });
    }
  }
  return out.sort((a, b) => b.count - a.count || b.count / b.of - a.count / a.of);
}

/** How many times a reason must come up (across recent reviewed games) to become a focus. */
export const FOCUS_AT = 3;

/**
 * Weekly focus areas from the Film room: a problem that came up 3+ times in
 * your recent reviewed games.
 */
export function filmFocusAreas(tags: FilmTag[]): FocusArea[] {
  const games = new Set(tags.map((t) => t.matchId)).size;
  const inGames = games === 1 ? 'your last reviewed game' : `your last ${games} reviewed games`;
  return patterns(tags, FOCUS_AT)
    .filter((p) => p.reason.focus)
    .map((p) => ({
      key: 'film' as const,
      title: p.reason.focus!.title,
      why: `From the Film room: "${p.reason.label}" came up ${p.count} times in ${inGames}.`,
      inGame: p.reason.focus!.inGame,
      skills: p.reason.focus!.skills,
      categories: p.reason.focus!.categories,
      gap: Math.min(1, 0.45 + p.count * 0.1),
    }));
}
