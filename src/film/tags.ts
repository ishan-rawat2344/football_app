/**
 * Film room tags: the buttons you tap while watching, the results you can
 * pick, the reasons you choose in review, and what fixes each reason.
 *
 * Coach content only: no personal details (this repo is public).
 */
import type { FilmTagKind, SkillKey } from '../db/types';
import type { DrillCategory } from '../drills/types';

export interface Outcome {
  key: string;
  label: string;
  /** Counts as a success, e.g. a 1v1 won. */
  good?: boolean;
}

export interface Reason {
  key: string;
  label: string;
  /** A problem worth fixing (counts towards patterns and weekly focus). */
  problem: boolean;
  /** Which results this reason applies to. Default: all. */
  for?: string[];
  fix?: { drillId?: string; lessonId?: string };
  /** For weekly focus, when it keeps happening. */
  focus?: { title: string; inGame: string; skills: SkillKey[]; categories: DrillCategory[] };
}

export interface TagDef {
  kind: FilmTagKind;
  label: string;
  group: 'ball' | 'off';
  outcomes?: Outcome[];
  reasons: Reason[];
  /** What to look for when you review it. */
  lookFor: [string, string, string];
}

const R = (r: Reason) => r;

export const TAGS: TagDef[] = [
  {
    kind: 'oneVOne',
    label: '1v1',
    group: 'ball',
    outcomes: [
      { key: 'won', label: 'Won', good: true },
      { key: 'lost', label: 'Lost' },
    ],
    reasons: [
      R({
        key: 'slowed',
        label: 'Slowed down before the move',
        problem: true,
        for: ['lost'],
        fix: { drillId: '1v1-change-of-pace' },
        focus: {
          title: 'Speed into the 1v1',
          inGame: 'Run at them at three-quarter pace and do the move without slowing down. Faster out than in.',
          skills: ['dribbling1v1'],
          categories: ['oneVOne'],
        },
      }),
      R({
        key: 'distance',
        label: 'Too close or too far',
        problem: true,
        for: ['lost'],
        fix: { drillId: '1v1-shoulder-drop' },
        focus: {
          title: 'Move at the right distance',
          inGame: 'Make your move 1.5–2 m from the defender: close enough that they commit, far enough that they cannot tackle.',
          skills: ['dribbling1v1'],
          categories: ['oneVOne'],
        },
      }),
      R({
        key: 'ballWatch',
        label: 'Watched the ball, not the defender',
        problem: true,
        for: ['lost'],
        fix: { drillId: '1v1-passive-defender' },
        focus: {
          title: 'Read the defender',
          inGame: 'Eyes on their hips and front foot as you arrive. Go the way their weight is not.',
          skills: ['dribbling1v1', 'decisionMaking'],
          categories: ['oneVOne'],
        },
      }),
      R({ key: 'goodDefending', label: 'Good defending', problem: false, for: ['lost'] }),
      R({ key: 'shoulderDrop', label: 'Shoulder drop', problem: false, for: ['won'] }),
      R({ key: 'burst', label: 'Outside burst', problem: false, for: ['won'] }),
      R({ key: 'pace', label: 'Change of pace', problem: false, for: ['won'] }),
      R({ key: 'otherMove', label: 'Another move', problem: false, for: ['won'] }),
    ],
    lookFor: [
      'Did you attack at speed, or slow down and invite the tackle?',
      'Was the move 1.5–2 m from the defender?',
      'Did your first touch after the move go forward, past their hip?',
    ],
  },
  {
    kind: 'shot',
    label: 'Shot',
    group: 'ball',
    outcomes: [
      { key: 'goal', label: 'Goal', good: true },
      { key: 'on', label: 'On target', good: true },
      { key: 'off', label: 'Off target' },
      { key: 'blocked', label: 'Blocked' },
    ],
    reasons: [
      R({
        key: 'rushed',
        label: 'Rushed it',
        problem: true,
        for: ['off', 'blocked'],
        fix: { drillId: 'fn-first-time' },
        focus: {
          title: 'Composure in front of goal',
          inGame: 'One look at the goal before the shot. Pick a corner, then strike.',
          skills: ['finishing'],
          categories: ['finishing'],
        },
      }),
      R({
        key: 'leaning',
        label: 'Leaning back',
        problem: true,
        for: ['off'],
        fix: { drillId: 'fn-volleys' },
        focus: {
          title: 'Keep shots down',
          inGame: 'Head and knee over the ball as you strike. Land on your shooting foot.',
          skills: ['finishing'],
          categories: ['finishing'],
        },
      }),
      R({
        key: 'power',
        label: 'Power over placement',
        problem: true,
        for: ['off', 'on'],
        fix: { drillId: 'fn-cut-in-far-post' },
        focus: {
          title: 'Placement over power',
          inGame: 'Side-foot or curl it low into the far corner instead of blasting it.',
          skills: ['finishing'],
          categories: ['finishing'],
        },
      }),
      R({
        key: 'blockedLane',
        label: 'Shot into a defender',
        problem: true,
        for: ['blocked'],
        fix: { drillId: 'fn-cut-in-far-post' },
        focus: {
          title: 'Make a shooting lane',
          inGame: 'One more touch sideways to open the lane, then shoot. Do not shoot through legs.',
          skills: ['finishing', 'decisionMaking'],
          categories: ['finishing'],
        },
      }),
      R({ key: 'weakFootShot', label: 'On my weaker foot', problem: false, fix: { drillId: 'fn-left-finish' } }),
      R({ key: 'goodSave', label: 'Good save', problem: false, for: ['on'] }),
    ],
    lookFor: [
      'Did you look at the goal before shooting?',
      'Placement or power: did you pick a corner?',
      'Was it the right moment, or was there a better pass?',
    ],
  },
  {
    kind: 'leftFoot',
    label: 'Left-foot action',
    group: 'ball',
    outcomes: [
      { key: 'good', label: 'Good', good: true },
      { key: 'poor', label: 'Poor' },
    ],
    reasons: [
      R({
        key: 'leftTechnique',
        label: 'Technique (contact, ankle)',
        problem: true,
        for: ['poor'],
        fix: { drillId: 'wf-wall-passes' },
        focus: {
          title: 'Clean left-foot contact',
          inGame: 'Simple left-foot passes with a locked ankle. Accuracy first, power later.',
          skills: ['weakFoot'],
          categories: ['weakFoot'],
        },
      }),
      R({
        key: 'leftRushed',
        label: 'Rushed it',
        problem: true,
        for: ['poor'],
        fix: { drillId: 'wf-left-on-call' },
        focus: {
          title: 'Calm on your left',
          inGame: 'Take one touch to set it on your left, then play. You have more time than you think.',
          skills: ['weakFoot'],
          categories: ['weakFoot'],
        },
      }),
    ],
    lookFor: [
      'Did you use your left when the ball was on your left side?',
      'Locked ankle and a clean contact?',
      'Did you avoid it when your left was the better option?',
    ],
  },
  {
    kind: 'cross',
    label: 'Cross or cutback',
    group: 'ball',
    outcomes: [
      { key: 'found', label: 'Found someone', good: true },
      { key: 'missed', label: "Didn't" },
    ],
    reasons: [
      R({
        key: 'noLook',
        label: "Didn't look up first",
        problem: true,
        for: ['missed'],
        fix: { drillId: 'cr-left-byline' },
        focus: {
          title: 'Look before you cross',
          inGame: 'Head up two touches before you deliver. See who is there, then choose.',
          skills: ['crossing', 'decisionMaking'],
          categories: ['crossing'],
        },
      }),
      R({
        key: 'wrongCross',
        label: 'Wrong type of cross',
        problem: true,
        for: ['missed'],
        fix: { drillId: 'cr-cutback' },
        focus: {
          title: 'Pick the right delivery',
          inGame: 'Defenders running back: cut it back. Space behind them: low and driven. Crowded box: back post.',
          skills: ['crossing', 'decisionMaking'],
          categories: ['crossing'],
        },
      }),
      R({
        key: 'crossTechnique',
        label: 'Technique',
        problem: true,
        for: ['missed'],
        fix: { drillId: 'cr-whipped-inswinger' },
        focus: {
          title: 'Quality of delivery',
          inGame: 'Plant foot beside the ball, strike through it, and follow through towards the target.',
          skills: ['crossing'],
          categories: ['crossing'],
        },
      }),
    ],
    lookFor: [
      'Did you look up before your last touch?',
      'Cutback, low cross or back post: the right one for the moment?',
      'Did you get it past the first defender?',
    ],
  },
  {
    kind: 'lost',
    label: 'Lost the ball',
    group: 'ball',
    reasons: [
      R({
        key: 'noScan',
        label: "Didn't scan",
        problem: true,
        fix: { drillId: 'rc-scan-receive' },
        focus: {
          title: 'Scan before you receive',
          inGame: 'Check both shoulders while the ball is on its way. Know where the defender is before it arrives.',
          skills: ['decisionMaking', 'firstTouch'],
          categories: ['receiving'],
        },
      }),
      R({
        key: 'closedBody',
        label: 'Closed body',
        problem: true,
        fix: { drillId: 'rc-half-turn-wall' },
        focus: {
          title: 'Receive side-on',
          inGame: 'Open your hips so you can see the pitch and play forward with your first touch.',
          skills: ['firstTouch', 'decisionMaking'],
          categories: ['receiving'],
        },
      }),
      R({
        key: 'heavyTouch',
        label: 'Heavy touch',
        problem: true,
        fix: { drillId: 'rc-left-first-touch' },
        focus: {
          title: 'First touch',
          inGame: 'Soft first touch into space, away from the defender, not into them.',
          skills: ['firstTouch'],
          categories: ['receiving', 'ballMastery'],
        },
      }),
      R({
        key: 'forced',
        label: 'Forced it',
        problem: true,
        fix: { drillId: '1v1-gates-on-call' },
        focus: {
          title: 'Pick the right moment',
          inGame: 'If two defenders are there, recycle it and go again. Take them on when it is one against one.',
          skills: ['decisionMaking'],
          categories: ['oneVOne'],
        },
      }),
      R({
        key: 'badPass',
        label: 'Bad pass',
        problem: true,
        fix: { drillId: 'wf-wall-passes' },
        focus: {
          title: 'Pass quality',
          inGame: 'Simple, firm passes to feet. Look before you pass.',
          skills: ['passing'],
          categories: ['weakFoot'],
        },
      }),
      R({ key: 'fair', label: 'Fair challenge, just lost it', problem: false }),
    ],
    lookFor: [
      'Did you scan before the ball arrived?',
      'Was your body open to the pitch?',
      'What happened in the 5 seconds after: did you reset and show again?',
    ],
  },
  {
    kind: 'safe',
    label: 'Played it safe',
    group: 'ball',
    reasons: [
      R({
        key: 'blank',
        label: 'Mind went blank',
        problem: true,
        fix: { lessonId: 'blank-mind' },
        focus: {
          title: 'A plan before the ball arrives',
          inGame: 'Before you receive, decide: facing your full-back with space means go. Use your if → then plans.',
          skills: ['confidence', 'decisionMaking'],
          categories: ['oneVOne'],
        },
      }),
      R({
        key: 'noSpace',
        label: "Didn't see the space",
        problem: true,
        fix: { drillId: 'rc-scan-receive' },
        focus: {
          title: 'See the space early',
          inGame: 'Scan twice before you receive so you know if the space is there to go forward.',
          skills: ['decisionMaking'],
          categories: ['receiving'],
        },
      }),
      R({
        key: 'tooClose',
        label: 'Defender too close',
        problem: true,
        fix: { drillId: 'rc-half-turn-wall' },
        focus: {
          title: 'Create a yard before you receive',
          inGame: 'Check away, then come short: get a yard of space before the ball arrives so you can turn.',
          skills: ['offBallMovement', 'firstTouch'],
          categories: ['movement', 'receiving'],
        },
      }),
      R({ key: 'rightCall', label: 'It was the right call', problem: false }),
    ],
    lookFor: [
      'Was there space to go forward or take them on?',
      'What did you decide before the ball arrived?',
      'Would a braver option have been on?',
    ],
  },
  {
    kind: 'run',
    label: 'Run',
    group: 'off',
    outcomes: [
      { key: 'got', label: 'Got the ball', good: true },
      { key: 'notFound', label: 'Not found' },
      { key: 'offside', label: 'Offside' },
      { key: 'shouldHave', label: 'Should have run' },
    ],
    reasons: [
      R({
        key: 'tooEarly',
        label: 'Went too early',
        problem: true,
        for: ['offside'],
        fix: { drillId: 'mv-run-in-behind' },
        focus: {
          title: 'Time your runs',
          inGame: 'Go when the passer has it under control with their head up, not before. Curve the run to stay onside.',
          skills: ['offBallMovement'],
          categories: ['movement'],
        },
      }),
      R({
        key: 'ballWatching',
        label: 'Ball-watching',
        problem: true,
        for: ['shouldHave'],
        fix: { drillId: 'mv-wide-or-inside' },
        focus: {
          title: 'Move when the ball moves',
          inGame: 'Every time the ball changes side, move: inside when it is far away, wide when your full-back has it.',
          skills: ['offBallMovement'],
          categories: ['movement'],
        },
      }),
      R({
        key: 'shadow',
        label: 'Stayed behind a defender',
        problem: true,
        for: ['shouldHave', 'notFound'],
        fix: { drillId: 'mv-check-spin' },
        focus: {
          title: 'Get out of the shadow',
          inGame: 'If a defender is between you and the ball, move until the passer can see you.',
          skills: ['offBallMovement'],
          categories: ['movement'],
        },
      }),
      R({
        key: 'tired',
        label: 'Tired',
        problem: true,
        for: ['shouldHave'],
        fix: { drillId: 'sp-repeated-sprints' },
        focus: {
          title: 'Repeat-sprint fitness',
          inGame: 'Walk when the ball is dead so you have legs for the run that matters.',
          skills: ['stamina'],
          categories: ['speed'],
        },
      }),
    ],
    lookFor: [
      'Did the run start at the right moment?',
      'Could the passer see you?',
      'Did it pull a defender and open space for someone else?',
    ],
  },
  {
    kind: 'showed',
    label: 'Showed again',
    group: 'off',
    outcomes: [
      { key: 'fast', label: 'Within 5 s', good: true },
      { key: 'slow', label: 'Slow' },
    ],
    reasons: [],
    lookFor: [
      'How long from losing it to asking for it again?',
      'Did you move into space, hand out, calling for it?',
      'Did your body language say "give it to me"?',
    ],
  },
  {
    kind: 'quiet',
    label: 'Went quiet',
    group: 'off',
    reasons: [
      R({
        key: 'afterMistake',
        label: 'After a mistake',
        problem: true,
        fix: { lessonId: 'demand-the-ball' },
        focus: {
          title: 'Demand it again',
          inGame: 'Lose it, clap, say your reset word, and show for it again within 5 seconds.',
          skills: ['confidence', 'offBallMovement'],
          categories: ['movement'],
        },
      }),
      R({
        key: 'tiredQuiet',
        label: 'Tired',
        problem: true,
        fix: { drillId: 'sp-repeated-sprints' },
        focus: {
          title: 'Repeat-sprint fitness',
          inGame: 'Walk when the ball is dead so you have legs when it comes your way.',
          skills: ['stamina'],
          categories: ['speed'],
        },
      }),
      R({
        key: 'ballFar',
        label: 'Ball never came my side',
        problem: true,
        fix: { drillId: 'mv-wide-or-inside' },
        focus: {
          title: 'Get on the ball more',
          inGame: 'When the ball is far away, come inside towards it. Do not wait for it on the touchline.',
          skills: ['offBallMovement'],
          categories: ['movement'],
        },
      }),
    ],
    lookFor: [
      'What happened just before you went quiet?',
      'Where could you have moved to get on the ball?',
      'How long did it last?',
    ],
  },
  {
    kind: 'trackBack',
    label: 'Tracking back',
    group: 'off',
    outcomes: [
      { key: 'madeIt', label: 'Made it', good: true },
      { key: 'late', label: 'Too late' },
      { key: 'didnt', label: "Didn't" },
    ],
    reasons: [
      R({
        key: 'lateReact',
        label: 'Reacted late',
        problem: true,
        for: ['late', 'didnt'],
        fix: { drillId: 'df-recovery-run' },
        focus: {
          title: 'React the moment it is lost',
          inGame: 'Ball lost: turn and sprint goal-side straight away. Curve the run to the inside.',
          skills: ['defending'],
          categories: ['defending'],
        },
      }),
      R({
        key: 'tiredTrack',
        label: 'Tired',
        problem: true,
        for: ['late', 'didnt'],
        fix: { drillId: 'sp-repeated-sprints' },
        focus: {
          title: 'Repeat-sprint fitness',
          inGame: 'Walk when the ball is dead so you can get back when it matters.',
          skills: ['stamina'],
          categories: ['speed'],
        },
      }),
    ],
    lookFor: [
      'How quickly did you turn after the ball was lost?',
      'Did you run goal-side, on the inside of the attacker?',
      'Did you slow down into a side-on stance before you arrived?',
    ],
  },
  {
    kind: 'press',
    label: 'Press',
    group: 'off',
    outcomes: [
      { key: 'won', label: 'Won it', good: true },
      { key: 'forced', label: 'Forced an error', good: true },
      { key: 'bypassed', label: 'Played round me' },
    ],
    reasons: [
      R({
        key: 'noTrigger',
        label: 'Pressed without a trigger',
        problem: true,
        for: ['bypassed'],
        fix: { drillId: 'df-press-triggers' },
        focus: {
          title: 'Press on a trigger',
          inGame: 'Go on a bad touch, a back-to-goal player or a pass to their full-back. Otherwise hold.',
          skills: ['defending', 'decisionMaking'],
          categories: ['defending'],
        },
      }),
      R({
        key: 'straightRun',
        label: "Ran straight, didn't block the line",
        problem: true,
        for: ['bypassed'],
        fix: { drillId: 'df-press-triggers' },
        focus: {
          title: 'Curve your press',
          inGame: 'Run from inside to outside so your body blocks the pass down the line.',
          skills: ['defending'],
          categories: ['defending'],
        },
      }),
    ],
    lookFor: [
      'Was there a trigger (bad touch, back to goal, slow pass)?',
      'Did you curve the run to block the pass down the line?',
      'Did you slow down in the last 2 m so they could not go past you?',
    ],
  },
  {
    kind: 'moment',
    label: 'Moment',
    group: 'off',
    reasons: [],
    lookFor: [
      'What happened, and what did you see at the time?',
      'What were the options?',
      'What would you do next time? Add a screenshot when you ask Claude.',
    ],
  },
];

const BY_KIND = new Map(TAGS.map((t) => [t.kind, t]));
export const getTag = (kind: FilmTagKind): TagDef => BY_KIND.get(kind)!;

/** Reasons that fit a tag's result (all of them when there's no result yet). */
export function reasonsFor(def: TagDef, outcome: string | undefined): Reason[] {
  return def.reasons.filter((r) => !r.for || !outcome || r.for.includes(outcome));
}

export function findReason(kind: FilmTagKind, key: string): Reason | undefined {
  return getTag(kind).reasons.find((r) => r.key === key);
}
