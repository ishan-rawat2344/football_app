/**
 * Solo tests, every 4 weeks. Each one is simple enough to do alone (or with
 * your non-footballer partner holding a stopwatch) and repeatable, so the
 * numbers compare fairly over time.
 */
import type { SkillKey } from '../db/types';
import type { LoadTag } from '../drills/types';

export type TestTimer =
  | { kind: 'countdown'; seconds: number } // e.g. 60 s wall passes
  | { kind: 'stopwatch' }; // e.g. slalom, balance, plank

export interface TestDef {
  id: string;
  name: string;
  /** What the number means, e.g. "seconds" or "passes". */
  unit: string;
  unitShort: string;
  better: 'lower' | 'higher';
  decimals: number;
  min: number;
  max: number;
  where: 'ground' | 'terrace' | 'room';
  setup: string;
  steps: string[];
  /** How to keep it fair from one test day to the next. */
  fair: string;
  timer?: TestTimer;
  /** 0–10 score entered with ten buttons. */
  outOfTen?: boolean;
  partner?: string;
  skills: SkillKey[];
  loadTags: LoadTag[];
}

export const TEST_EVERY_DAYS = 28;

export const TESTS: TestDef[] = [
  {
    id: 'sprint-30',
    name: '30 m sprint',
    unit: 'seconds',
    unitShort: 's',
    better: 'lower',
    decimals: 2,
    min: 3,
    max: 10,
    where: 'ground',
    setup: 'Measure 30 m with the tape and mark both ends. Do the full winger warm-up first.',
    steps: [
      'Start from a standstill, one foot forward, no rocking.',
      'Your partner starts the stopwatch on your first movement and stops it as your chest crosses the line.',
      'Three runs, walking back for full rest (2–3 minutes) between them.',
      'Record your best run.',
    ],
    fair: 'Same surface, same footwear, same timer each time. Not the day after a game.',
    timer: { kind: 'stopwatch' },
    partner:
      'They start the stopwatch on your first movement and stop it when your chest crosses the line. Solo option: film the run in slow motion from the side of the finish and read the time off the video.',
    skills: ['pace'],
    loadTags: ['sprint'],
  },
  {
    id: 'slalom',
    name: 'Cone slalom with the ball',
    unit: 'seconds',
    unitShort: 's',
    better: 'lower',
    decimals: 1,
    min: 5,
    max: 60,
    where: 'ground',
    setup: '6 markers in a straight line, 2 m apart (10 m in total). Start 2 m before the first marker.',
    steps: [
      'Start the stopwatch, put the phone down at the start, and go.',
      'Dribble in and out of every marker to the end, round the last one, and slalom back.',
      'Stop the stopwatch when you pass the start again.',
      'Two attempts; record the better one. A missed marker means that attempt does not count.',
    ],
    fair: 'Same spacing, same ball. The second or so for tapping the phone is the same every time, so it compares fairly.',
    timer: { kind: 'stopwatch' },
    skills: ['dribbling1v1', 'firstTouch'],
    loadTags: ['cutting'],
  },
  {
    id: 'wall-left-60',
    name: 'Left-foot wall passes in 60 s',
    unit: 'passes',
    unitShort: 'passes',
    better: 'higher',
    decimals: 0,
    min: 0,
    max: 150,
    where: 'terrace',
    setup: 'Stand 3 m from the wall: tape a line so it is the same every time.',
    steps: [
      'Start the 60 s countdown.',
      'One-touch passes against the wall with your left foot only, from behind the line.',
      'Count out loud. A pass with your right foot, or from in front of the line, does not count.',
      'Record the total.',
    ],
    fair: 'Same distance, same wall, same ball pressure.',
    timer: { kind: 'countdown', seconds: 60 },
    skills: ['weakFoot', 'passing'],
    loadTags: [],
  },
  {
    id: 'wall-right-60',
    name: 'Right-foot wall passes in 60 s',
    unit: 'passes',
    unitShort: 'passes',
    better: 'higher',
    decimals: 0,
    min: 0,
    max: 150,
    where: 'terrace',
    setup: 'Same as the left-foot test: 3 m from the wall, behind the taped line.',
    steps: [
      'Start the 60 s countdown.',
      'One-touch passes against the wall with your right foot only.',
      'Count out loud and record the total.',
    ],
    fair: 'Done on the same day as the left-foot test, so the two compare: the gap between your feet is the number to close.',
    timer: { kind: 'countdown', seconds: 60 },
    skills: ['passing'],
    loadTags: [],
  },
  {
    id: 'juggling',
    name: 'Juggling record',
    unit: 'touches',
    unitShort: 'touches',
    better: 'higher',
    decimals: 0,
    min: 0,
    max: 2000,
    where: 'terrace',
    setup: 'Any flat space with room around you.',
    steps: [
      'Juggle with any part except your hands, as many touches in a row as you can.',
      'Three attempts.',
      'Record your best attempt.',
    ],
    fair: 'Same ball, properly pumped up.',
    skills: ['firstTouch', 'weakFoot'],
    loadTags: [],
  },
  {
    id: 'crossing-10',
    name: 'Crossing accuracy',
    unit: 'out of 10',
    unitShort: '/10',
    better: 'higher',
    decimals: 0,
    min: 0,
    max: 10,
    where: 'ground',
    setup:
      'Mark a 4 × 4 m zone at the back post, 6 m from the goal line. Start 25 m out on the left, 15 m from the centre line.',
    steps: [
      'Ten crosses, ball moving: one touch to set it, then cross.',
      'Five with your right foot (after cutting in), five with your left (down the line).',
      'A cross counts if its first bounce lands in the zone.',
      'Record how many of the 10 counted.',
    ],
    fair: 'Same distances every time: use the tape measure.',
    outOfTen: true,
    skills: ['crossing', 'weakFoot'],
    loadTags: ['kicking'],
  },
  {
    id: 'finishing-10',
    name: 'Cut-in finishing',
    unit: 'out of 10',
    unitShort: '/10',
    better: 'higher',
    decimals: 0,
    min: 0,
    max: 10,
    where: 'ground',
    setup:
      'A goal, or a wall with the far corner marked as a 1 m target. Start 18 m from goal, 8 m wide on the left, with a marker as the defender 5 m ahead.',
    steps: [
      'Dribble at the marker, cut inside onto your right, and shoot within two touches of the cut.',
      'Ten shots.',
      'A shot counts if it hits the far-corner target.',
      'Record how many of the 10 counted.',
    ],
    fair: 'Same start point and target size every time.',
    outOfTen: true,
    skills: ['finishing', 'dribbling1v1'],
    loadTags: ['kicking', 'cutting'],
  },
  {
    id: 'balance-closed',
    name: 'Single-leg balance, eyes closed',
    unit: 'seconds',
    unitShort: 's',
    better: 'higher',
    decimals: 0,
    min: 0,
    max: 120,
    where: 'room',
    setup: 'Barefoot on a flat floor, near a wall you can touch if needed. Test the ankle you have sprained before, or your weaker side.',
    steps: [
      'Stand on one leg, hands on hips, knee slightly bent.',
      'Close your eyes and start the stopwatch.',
      'Stop it when your other foot touches down, your hands leave your hips, or you open your eyes.',
      'Best of three.',
    ],
    fair: 'Same leg, same surface, barefoot every time.',
    timer: { kind: 'stopwatch' },
    skills: ['strength'],
    loadTags: ['ankle'],
  },
  {
    id: 'plank',
    name: 'Front plank hold',
    unit: 'seconds',
    unitShort: 's',
    better: 'higher',
    decimals: 0,
    min: 0,
    max: 600,
    where: 'room',
    setup: 'A mat or towel.',
    steps: [
      'Forearm plank, body straight from head to heels.',
      'Start the stopwatch.',
      'Stop when your hips sag or rise and you cannot fix them.',
      'One attempt.',
    ],
    fair: 'Stop on form, not on pain: the number only counts with a straight body.',
    timer: { kind: 'stopwatch' },
    skills: ['strength', 'stamina'],
    loadTags: [],
  },
];

const BY_ID = new Map(TESTS.map((t) => [t.id, t]));
export const getTest = (id: string) => BY_ID.get(id);

export function formatValue(t: TestDef, v: number): string {
  const n = v.toFixed(t.decimals);
  return t.outOfTen ? `${n}/10` : t.unitShort === 's' ? `${n} s` : `${n} ${t.unitShort}`;
}
