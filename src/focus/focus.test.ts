import { describe, expect, it } from 'vitest';
import type { MatchLog } from '../db/types';
import { defaultProfile } from '../profile/meta';
import { averages, focusSkills, recentMatches, weeklyFocus } from './focus';

const T = '2026-11-28';
const profile = defaultProfile(); // targets: attempts ≥3 (aim 8), left foot ≥5
const ratings = { weakFoot: 2, offBallMovement: 3, firstTouch: 4, pace: 8, heading: 1 };

const match = (date: string, m: Partial<MatchLog> = {}, id = 1): MatchLog => ({
  id,
  date,
  minutes: 65,
  dribblesAttempted: 4,
  dribblesWon: 2,
  shots: 4,
  shotsOnTarget: 2,
  leftFootTouches: 6,
  confidence: 6,
  involvement: 'some',
  keptAsking: 'yes',
  ...m,
});

describe('weekly focus', () => {
  it('with no recent games, falls back to your lowest ratings (ignoring heading)', () => {
    const f = weeklyFocus({ matches: [], profile, ratings, today: T });
    expect(f.basedOn).toBe('ratings');
    expect(f.areas.map((a) => a.title)).toEqual(['Weak foot', 'Off-ball movement']);
  });

  it('a quiet game: few 1v1s and little left foot become the two focus areas', () => {
    const f = weeklyFocus({
      matches: [match('2026-11-26', { dribblesAttempted: 1, dribblesWon: 0, leftFootTouches: 1 })],
      profile,
      ratings,
      today: T,
    });
    expect(f.basedOn).toBe('matches');
    expect(f.areas.map((a) => a.key)).toEqual(['leftFoot', 'attempts']);
    expect(f.areas[1]!.why).toBe('1 1v1 attempt in your last game. Your minimum is 3.');
  });

  it('a good game gives credit instead', () => {
    const f = weeklyFocus({ matches: [match('2026-11-26')], profile, ratings, today: T });
    expect(f.areas).toEqual([]);
    expect(f.wins.length).toBeGreaterThanOrEqual(3);
  });

  it('taking players on but rarely winning → sharpen the moves', () => {
    const f = weeklyFocus({ matches: [match('2026-11-26', { dribblesAttempted: 8, dribblesWon: 1 })], profile, ratings, today: T });
    expect(f.areas[0]!.key).toBe('dribbleSuccess');
  });

  it('barely on the ball and going quiet after losing it are caught', () => {
    const f = weeklyFocus({
      matches: [match('2026-11-26', { involvement: 'barely', keptAsking: 'no' })],
      profile,
      ratings,
      today: T,
    });
    expect(f.areas.map((a) => a.key)).toEqual(['involvement', 'afterLoss']);
    expect(f.areas[0]!.why).toBe('You barely got the ball in your last game.');
    expect(focusSkills(f)).toEqual(['offBallMovement', 'confidence']);
  });

  it('never picks two focus areas that lead with the same skill', () => {
    const f = weeklyFocus({
      matches: [match('2026-11-26', { dribblesAttempted: 0, confidence: 2 })],
      profile,
      ratings,
      today: T,
    });
    const leads = f.areas.map((a) => a.skills[0]);
    expect(new Set(leads).size).toBe(leads.length);
  });

  it('uses only the last 3 games from the last 3 weeks', () => {
    const ms = [
      match('2026-10-01', {}, 1), // too old
      match('2026-11-20', {}, 2),
      match('2026-11-22', {}, 3),
      match('2026-11-24', {}, 4),
      match('2026-11-26', {}, 5),
    ];
    expect(recentMatches(ms, T).map((m) => m.id)).toEqual([5, 4, 3]);
  });

  it('averages handle missing numbers', () => {
    const a = averages([{ date: T }, { date: T, dribblesAttempted: 4, confidence: 6 }]);
    expect(a.attempts).toBe(2);
    expect(a.confidence).toBe(6);
  });
});
