/**
 * What to search YouTube for. Drill searches live on each drill
 * (videoQueries); these are for your weekly focus areas.
 */
import type { SkillKey } from '../db/types';
import type { FocusArea, FocusKey } from '../focus/focus';

const FOCUS_QUERIES: Record<Exclude<FocusKey, 'rating' | 'film'>, string[]> = {
  attempts: ['how to beat a full back 1v1 winger', 'winger 1v1 attacking tutorial'],
  dribbleSuccess: ['best 1v1 moves for wingers tutorial', 'how to dribble past a defender tutorial'],
  leftFoot: ['how to improve weak foot football drills', 'weak foot passing and shooting drills'],
  involvement: ['winger off the ball movement', 'how to get on the ball more as a winger'],
  shots: ['winger cut inside and shoot drill', 'how to shoot more as a winger'],
  onTarget: ['finishing technique placement football', 'how to hit the target football shooting tips'],
  afterLoss: ['football mental toughness after mistakes', 'how to bounce back from a mistake football'],
  confidence: ['how to be confident on the ball football', 'football confidence tips for wingers'],
};

const SKILL_QUERIES: Record<SkillKey, string[]> = {
  dribbling1v1: ['winger 1v1 dribbling tutorial', 'close control dribbling drills football'],
  firstTouch: ['first touch drills football solo', 'how to improve first touch football'],
  crossing: ['how to cross a ball winger tutorial', 'crossing technique football drills'],
  finishing: ['finishing drills for wingers', 'finishing technique placement football'],
  weakFoot: ['how to improve weak foot football drills', 'weak foot passing and shooting drills'],
  passing: ['passing technique drills football solo', 'how to pass a football properly'],
  pace: ['sprint speed training for footballers', 'acceleration drills football'],
  stamina: ['football conditioning running drills', 'football fitness interval training'],
  strength: ['strength training for footballers bodyweight', 'football strength exercises at home'],
  heading: ['heading technique football tutorial', 'how to head a football properly'],
  offBallMovement: ['winger off the ball movement', 'how to find space as a winger'],
  defending: ['how to defend as a winger tracking back', 'winger defensive positioning'],
  decisionMaking: ['winger decision making final third', 'when to dribble pass or shoot football'],
  confidence: ['how to be confident on the ball football', 'football confidence tips for wingers'],
};

export function focusQueries(area: FocusArea): string[] {
  if (area.key !== 'rating' && area.key !== 'film') return FOCUS_QUERIES[area.key];
  return area.skills.flatMap((s) => SKILL_QUERIES[s]).slice(0, 3);
}
