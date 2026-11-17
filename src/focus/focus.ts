/**
 * Weekly focus: what to work on next, from your recent games.
 *
 * Looks at your last few match logs (up to 3, from the last 3 weeks),
 * compares them with your per-game targets, and picks the two biggest gaps.
 * With no recent games it falls back to your lowest skill ratings.
 * The plan then gives drills on those skills a boost.
 */
import type { MatchLog, Profile, Ratings, SkillKey } from '../db/types';
import type { DrillCategory } from '../drills/types';
import { addDays, type ISODate } from '../lib/dates';
import { ALL_SKILLS } from '../profile/meta';

export type FocusKey =
  | 'attempts'
  | 'leftFoot'
  | 'involvement'
  | 'shots'
  | 'onTarget'
  | 'dribbleSuccess'
  | 'afterLoss'
  | 'confidence'
  | 'rating';

export interface FocusArea {
  key: FocusKey;
  title: string;
  /** Why, with your numbers. */
  why: string;
  /** What to do in the next game. */
  inGame: string;
  skills: SkillKey[];
  categories: DrillCategory[];
  /** 0–1: how far below target. Higher = more urgent. */
  gap: number;
}

export interface FocusResult {
  areas: FocusArea[]; // at most 2
  /** Targets you're hitting, for a bit of credit. */
  wins: string[];
  basedOn: 'matches' | 'ratings';
  matchCount: number;
}

export interface MatchAverages {
  games: number;
  attempts: number;
  won: number;
  shots: number;
  onTarget: number;
  leftFoot: number;
  confidence: number | null;
  barelyShare: number; // share of games where you barely got the ball
  notAskingShare: number; // share of games where you stopped asking after losing it
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const round1 = (n: number) => Math.round(n * 10) / 10;
/** "1 shot", "2.5 shots" */
const count = (n: number, word: string) => `${round1(n)} ${word}${round1(n) === 1 ? '' : 's'}`;

export function recentMatches(matches: MatchLog[], today: ISODate, max = 3, days = 21): MatchLog[] {
  const from = addDays(today, -days);
  return matches
    .filter((m) => m.date >= from && m.date <= today)
    .sort((a, b) => b.date.localeCompare(a.date) || (b.id ?? 0) - (a.id ?? 0))
    .slice(0, max);
}

export function averages(ms: MatchLog[]): MatchAverages {
  const conf = ms.map((m) => m.confidence).filter((c): c is number => typeof c === 'number');
  return {
    games: ms.length,
    attempts: avg(ms.map((m) => m.dribblesAttempted ?? 0)),
    won: avg(ms.map((m) => m.dribblesWon ?? 0)),
    shots: avg(ms.map((m) => m.shots ?? 0)),
    onTarget: avg(ms.map((m) => m.shotsOnTarget ?? 0)),
    leftFoot: avg(ms.map((m) => m.leftFootTouches ?? 0)),
    confidence: conf.length ? avg(conf) : null,
    barelyShare: ms.length ? ms.filter((m) => m.involvement === 'barely').length / ms.length : 0,
    notAskingShare: ms.length ? ms.filter((m) => m.keptAsking === 'no' || m.keptAsking === 'mostly').length / ms.length : 0,
  };
}

/** Shots per game below which "get shots off" kicks in. */
const SHOTS_MIN = 3;

function fromMatches(a: MatchAverages, p: Profile): { areas: FocusArea[]; wins: string[] } {
  const t = p.matchTargets;
  const areas: FocusArea[] = [];
  const wins: string[] = [];
  const per = a.games === 1 ? 'in your last game' : `a game over your last ${a.games}`;
  /** "in your last game" / "in 2 of your last 3 games" */
  const inGames = (share: number) =>
    a.games === 1 ? 'in your last game' : `in ${Math.round(share * a.games)} of your last ${a.games} games`;

  if (a.attempts < t.dribbleAttemptsMin) {
    areas.push({
      key: 'attempts',
      title: 'Take defenders on',
      why: `${count(a.attempts, '1v1 attempt')} ${per}. Your minimum is ${t.dribbleAttemptsMin}.`,
      inGame: `First time you get it facing your full-back, go. Win or lose, it counts. Aim for ${t.dribbleAttemptsMin} or more.`,
      skills: ['dribbling1v1', 'confidence', 'decisionMaking'],
      categories: ['oneVOne'],
      gap: 1 - a.attempts / Math.max(1, t.dribbleAttemptsMin),
    });
  } else {
    wins.push(`${count(a.attempts, '1v1 attempt')} ${per} (minimum ${t.dribbleAttemptsMin})`);
    const rate = a.attempts > 0 ? a.won / a.attempts : 0;
    if (rate < 0.35) {
      areas.push({
        key: 'dribbleSuccess',
        title: 'Make your moves work',
        why: `You're taking players on (${round1(a.attempts)} a game), but winning ${Math.round(rate * 100)}%. Time to sharpen the moves.`,
        inGame: 'Use your two moves only, at the right distance: 1.5–2 m from the defender. Speed in, faster out.',
        skills: ['dribbling1v1', 'firstTouch'],
        categories: ['oneVOne', 'ballMastery'],
        gap: (0.35 - rate) / 0.35,
      });
    }
  }

  if (a.leftFoot < t.leftFootPassesMin) {
    areas.push({
      key: 'leftFoot',
      title: 'Use your left',
      why: `${count(a.leftFoot, 'deliberate left-foot action')} ${per}. Your minimum is ${t.leftFootPassesMin}.`,
      inGame: 'When the ball comes to your left side, play it with your left. Simple passes count.',
      skills: ['weakFoot'],
      categories: ['weakFoot'],
      gap: 1 - a.leftFoot / Math.max(1, t.leftFootPassesMin),
    });
  } else {
    wins.push(`${count(a.leftFoot, 'left-foot action')} ${per} (minimum ${t.leftFootPassesMin})`);
  }

  if (a.barelyShare >= 0.5) {
    areas.push({
      key: 'involvement',
      title: 'Get on the ball more',
      why: `You barely got the ball ${inGames(a.barelyShare)}.`,
      inGame: 'Every time the ball changes side, move: come inside when it is far away, show wide when your left-back has it.',
      skills: ['offBallMovement'],
      categories: ['movement'],
      gap: a.barelyShare,
    });
  }

  if (a.shots < SHOTS_MIN) {
    areas.push({
      key: 'shots',
      title: 'Get shots off',
      why: `${count(a.shots, 'shot')} ${per}. A winger who cuts in should get at least ${SHOTS_MIN}.`,
      inGame: 'When you cut inside onto your right and see the far post, shoot. Do not look for one more pass.',
      skills: ['finishing', 'offBallMovement'],
      categories: ['finishing'],
      gap: (1 - a.shots / SHOTS_MIN) * 0.8,
    });
  } else if (a.onTarget / Math.max(1, a.shots) < 0.4) {
    areas.push({
      key: 'onTarget',
      title: 'Hit the target',
      why: `${Math.round((a.onTarget / Math.max(1, a.shots)) * 100)}% of your shots were on target.`,
      inGame: 'Placement over power: side-foot or curl it, low, into the far corner.',
      skills: ['finishing'],
      categories: ['finishing'],
      gap: 0.5,
    });
  } else {
    wins.push(`${count(a.shots, 'shot')} ${per}, ${Math.round((a.onTarget / Math.max(1, a.shots)) * 100)}% on target`);
  }

  if (a.notAskingShare >= 0.5) {
    areas.push({
      key: 'afterLoss',
      title: 'Demand it again',
      why: `After losing the ball, you stopped asking for it ${inGames(a.notAskingShare)}.`,
      inGame: 'Lose it, clap, say your reset word, and show for it again within 5 seconds.',
      skills: ['confidence', 'offBallMovement'],
      categories: ['movement'],
      gap: a.notAskingShare * 0.9,
    });
  }

  if (a.confidence !== null && a.confidence <= 4) {
    areas.push({
      key: 'confidence',
      title: 'Confidence on the ball',
      why: `Your confidence averaged ${round1(a.confidence)}/10.`,
      inGame: 'Pick one if → then plan before the game and do it the first time it comes up.',
      skills: ['confidence', 'decisionMaking'],
      categories: ['oneVOne'],
      gap: (5 - a.confidence) / 5,
    });
  }

  return { areas, wins };
}

function fromRatings(ratings: Ratings): FocusArea[] {
  return ALL_SKILLS.filter((s) => ratings[s.key] !== undefined && s.key !== 'heading')
    .sort((a, b) => (ratings[a.key] ?? 10) - (ratings[b.key] ?? 10))
    .slice(0, 2)
    .map((s) => ({
      key: 'rating' as const,
      title: s.label,
      why: `Your lowest rating: ${ratings[s.key]}/10. Log a game and the focus will come from how you actually played.`,
      inGame: s.hint,
      skills: [s.key],
      categories: [],
      gap: (10 - (ratings[s.key] ?? 10)) / 10,
    }));
}

export function weeklyFocus(args: {
  matches: MatchLog[];
  profile: Profile;
  ratings: Ratings;
  today: ISODate;
}): FocusResult {
  const recent = recentMatches(args.matches, args.today);
  if (!recent.length) {
    return { areas: fromRatings(args.ratings), wins: [], basedOn: 'ratings', matchCount: 0 };
  }
  const { areas, wins } = fromMatches(averages(recent), args.profile);
  return {
    // The two biggest gaps, never two on the same skill set.
    areas: areas
      .sort((a, b) => b.gap - a.gap)
      .filter((a, i, all) => all.findIndex((x) => x.skills[0] === a.skills[0]) === i)
      .slice(0, 2),
    wins,
    basedOn: 'matches',
    matchCount: recent.length,
  };
}

/** Skills the plan should boost this week. */
export function focusSkills(f: FocusResult): SkillKey[] {
  return [...new Set(f.areas.flatMap((a) => a.skills))];
}
