import type { DrillDiagram, Move, Pt } from '../types';

/** A pass to the wall and the rebound back. */
const wallPass = (from: Pt, wallX: number, back: Pt): Move[] => [
  { type: 'pass', path: [from, [wallX, 0.9]] },
  { type: 'pass', path: [[wallX, 0.9], back] },
];

const WALL = (w: number) => ({ kind: 'wall' as const, from: [0.4, 0.5] as Pt, to: [w - 0.4, 0.5] as Pt });

/** Weak foot, receiving and ball mastery: mostly the terrace wall. Wall at the top. */
export const WALL_AND_TOUCH: Record<string, DrillDiagram> = {
  'wf-wall-passes': {
    surface: 'terrace',
    size: [8, 7],
    items: [
      WALL(8),
      { kind: 'text', at: [1.4, 1.6], text: 'Wall' },
      { kind: 'line', from: [3.2, 4.2], to: [4.8, 4.2], label: '3 m (tape)', labelPos: 'right' },
      { kind: 'line', from: [3.2, 6.2], to: [4.8, 6.2], dashed: true, label: 'Later 5 m', labelPos: 'right' },
    ],
    start: { me: [4, 3.6], ball: 'me' },
    frames: [
      { step: 0, cue: 'Left foot: control, pass', moves: wallPass([4.2, 3.3], 4.5, [4.2, 3.4]), ball: 'me' },
      { step: 1, reset: true, cue: 'Inside of the foot only', moves: wallPass([4.2, 3.3], 4.5, [4.2, 3.4]), ball: 'me' },
      { step: 2, reset: true, cue: 'One-touch, left. Count', moves: wallPass([4.2, 3.3], 4.5, [4.2, 3.4]), ball: 'me' },
      {
        step: 3,
        reset: true,
        cue: 'Alternate left and right',
        moves: [...wallPass([4.4, 3.3], 4.9, [3.7, 3.4]), ...wallPass([3.7, 3.3], 3.3, [4.4, 3.4])],
        ball: 'me',
      },
      { step: 4, reset: true, cue: 'One-touch left: your test', moves: wallPass([4.2, 3.3], 4.5, [4.2, 3.4]), ball: 'me' },
    ],
  },

  'wf-long-pass': {
    surface: 'pitch',
    size: [12, 24],
    items: [{ kind: 'zone', at: [6.5, 3.5], size: [3, 3], label: 'Target, 15 m (later 20 m)', labelPos: 'below' }],
    start: { me: [3, 21], ball: 'me' },
    frames: [
      { step: 0, cue: 'Driven, along the ground', moves: [{ type: 'pass', path: [[3.3, 20.6], [8, 5.2]] }] },
      {
        step: 1,
        reset: true,
        cue: 'Lofted: approach at 30°',
        moves: [
          { type: 'run', path: [[1.4, 23.4], [2.7, 21.4]] },
          { type: 'pass', path: [[3.3, 20.6], [7.4, 12], [8, 5.2]], curve: true },
        ],
      },
      {
        step: 2,
        reset: true,
        cue: 'On the move',
        moves: [
          { type: 'dribble', path: [[3, 21], [3.6, 17.4]] },
          { type: 'pass', path: [[3.8, 17.2], [8, 5.2]] },
        ],
      },
    ],
  },

  'wf-left-dribble': {
    surface: 'pitch',
    size: [10, 30],
    items: [
      { kind: 'cone', at: [4, 26] },
      { kind: 'cone', at: [6, 23] },
      { kind: 'cone', at: [4, 20] },
      { kind: 'cone', at: [6, 17] },
      { kind: 'cone', at: [4, 14] },
      { kind: 'cone', at: [6, 11], label: '3 m apart', labelPos: 'right' },
      { kind: 'cone', at: [5, 1.2], label: '10 m', labelPos: 'right' },
    ],
    start: { me: [5, 29], ball: 'me' },
    frames: [
      {
        step: 0,
        cue: 'Left foot only',
        moves: [
          {
            type: 'dribble',
            path: [[5, 29], [2.8, 26], [7.2, 23], [2.8, 20], [7.2, 17], [2.8, 14], [7.2, 11]],
            curve: true,
          },
        ],
      },
      { step: 1, cue: 'Then 10 m at speed', moves: [{ type: 'dribble', path: [[7.2, 11], [5, 3.4]] }] },
      { step: 2, cue: 'Again, eyes up between touches' },
    ],
  },

  'wf-left-on-call': {
    surface: 'terrace',
    size: [8, 11],
    items: [WALL(8), { kind: 'text', at: [1.4, 1.6], text: 'Wall' }, { kind: 'text', at: [6.4, 5.8], text: '5 m' }],
    start: { me: [4, 5.6], partner: [4, 9.6], ball: 'me' },
    frames: [
      { step: 0, cue: 'Right foot, two-touch', moves: wallPass([4.3, 5.3], 4.5, [4.3, 5.3]), ball: 'me' },
      {
        step: 1,
        cue: '"Now!" First-time, left',
        moves: [
          { type: 'pass', path: [[4.5, 0.9], [3.7, 5.2]] },
          { type: 'pass', path: [[3.7, 5.2], [3.4, 0.9]] },
        ],
      },
      { step: 2, reset: true, cue: 'Back to two-touch', moves: wallPass([4.3, 5.3], 4.5, [4.3, 5.3]), ball: 'me' },
      {
        step: 3,
        cue: '"Now!" Left touch into space',
        moves: [
          { type: 'dribble', path: [[4, 5.6], [2.2, 6.4]] },
          { type: 'pass', path: [[2.4, 6.1], [3, 0.9]] },
        ],
      },
    ],
  },

  'rc-half-turn-wall': {
    surface: 'terrace',
    size: [8, 9],
    items: [
      WALL(8),
      { kind: 'text', at: [1.4, 1.6], text: 'Wall' },
      { kind: 'cone', at: [1.4, 7.8], label: 'Space', labelPos: 'right' },
      { kind: 'cone', at: [6.6, 7.8], label: 'Space', labelPos: 'left' },
    ],
    start: { me: [4, 5.4], ball: 'me' },
    frames: [
      { step: 0, cue: 'Side-on, hips open', moves: [{ type: 'feint', path: [[4, 5.4], [2.9, 6.3]] }] },
      { step: 1, moves: [{ type: 'pass', path: [[4.2, 5.1], [4.4, 0.9]] }] },
      {
        step: 2,
        cue: 'Back foot, across your body',
        moves: [
          { type: 'pass', path: [[4.4, 0.9], [4.1, 5.1]] },
          { type: 'dribble', path: [[4, 5.4], [2.2, 7.2]] },
        ],
      },
      {
        step: 3,
        reset: true,
        cue: 'Next rep: the other way',
        moves: [
          { type: 'pass', path: [[2.4, 6.9], [3.8, 0.9]] },
          { type: 'pass', path: [[3.8, 0.9], [4.2, 5.1]] },
          { type: 'dribble', path: [[4.1, 5.4], [5.8, 7.2]] },
        ],
      },
      { step: 4, cue: 'Sets 3–4: receive with your left' },
    ],
  },

  'rc-scan-receive': {
    surface: 'terrace',
    size: [8, 12],
    items: [WALL(8), { kind: 'text', at: [1.4, 1.6], text: 'Wall' }, { kind: 'text', at: [6.6, 4], text: '6 m' }],
    start: { me: [4, 6.6], partner: [4, 10.6], ball: 'me' },
    frames: [
      { step: 0, moves: [{ type: 'pass', path: [[4.2, 6.3], [4.4, 0.9]] }] },
      {
        step: 1,
        cue: 'Check both shoulders',
        moves: [
          { type: 'look', path: [[4, 6.6], [1.6, 9.6]] },
          { type: 'look', path: [[4, 6.6], [6.4, 9.6]] },
        ],
      },
      { step: 2, cue: 'Hand up = "Man on"' },
      {
        step: 3,
        cue: '"Turn": half-turn and go',
        moves: [
          { type: 'pass', path: [[4.4, 0.9], [4.1, 6.2]] },
          { type: 'dribble', path: [[4, 6.6], [1.8, 8.4]] },
        ],
      },
      { step: 4, cue: 'Solo: the cue caller calls it' },
    ],
  },

  'rc-back-to-goal': {
    surface: 'pitch',
    size: [10, 14],
    items: [
      { kind: 'line', from: [1, 0], to: [1, 14] },
      { kind: 'text', at: [1.8, 13.6], text: 'Touchline' },
      { kind: 'defender', at: [4.2, 3.6], label: 'Defender marker', labelPos: 'right' },
      { kind: 'text', at: [8.4, 0.8], text: 'Goal ↑' },
    ],
    start: { me: [4, 6.2], partner: [4, 11.6], ball: 'partner' },
    frames: [
      { step: 0, cue: 'Back to goal, side-on' },
      { step: 1, moves: [{ type: 'pass', by: 'partner', path: [[4, 11.2], [4.1, 7.6]] }] },
      {
        step: 2,
        cue: 'Step to it, glance back',
        moves: [
          { type: 'run', path: [[4, 6.2], [4, 7]] },
          { type: 'look', path: [[4, 7], [4.2, 4.6]] },
        ],
      },
      { step: 3, cue: 'Body between ball and defender' },
      {
        step: 4,
        cue: 'Tight inside? Roll down the line',
        moves: [{ type: 'dribble', path: [[4, 7.4], [2.4, 6], [2.2, 1.4]], curve: true }],
      },
    ],
  },

  'rc-aerial-control': {
    surface: 'terrace',
    size: [8, 8],
    items: [WALL(8), { kind: 'text', at: [1.4, 1.6], text: 'Wall' }],
    start: { me: [4, 3.4], partner: [4, 7.2], ball: 'partner' },
    frames: [
      { step: 0, cue: 'Toss it up, or partner throws', moves: [{ type: 'pass', by: 'partner', path: [[4, 6.8], [5.2, 5.2], [4.3, 3.8]], curve: true }] },
      { step: 1, cue: 'Thigh, drop, pass off the wall', moves: [{ type: 'pass', path: [[4.2, 3.1], [4.4, 0.9]] }] },
      { step: 2, reset: true, cue: 'Chest', moves: [{ type: 'pass', by: 'partner', path: [[4, 6.8], [5.2, 5.2], [4.3, 3.8]], curve: true }] },
      { step: 3, reset: true, cue: 'Right instep', moves: [{ type: 'pass', by: 'partner', path: [[4, 6.8], [5.2, 5.2], [4.3, 3.8]], curve: true }] },
      { step: 4, reset: true, cue: 'Left instep', moves: [{ type: 'pass', by: 'partner', path: [[4, 6.8], [5.2, 5.2], [4.3, 3.8]], curve: true }] },
    ],
  },

  'rc-left-first-touch': {
    surface: 'terrace',
    size: [9, 9],
    items: [WALL(9), { kind: 'text', at: [1.4, 1.6], text: 'Wall' }, { kind: 'cone', at: [1.8, 6.8], label: 'Space', labelPos: 'below' }],
    start: { me: [5, 6.6], ball: 'me' },
    frames: [
      { step: 0, cue: 'Right foot', moves: [{ type: 'pass', path: [[5.2, 6.3], [5.4, 0.9]] }] },
      {
        step: 1,
        cue: 'Inside of the left, towards the space',
        moves: [
          { type: 'pass', path: [[5.4, 0.9], [5, 6.2]] },
          { type: 'dribble', path: [[5, 6.6], [2.8, 6.8]] },
        ],
      },
      { step: 2, cue: 'Left foot again', moves: [{ type: 'pass', path: [[2.9, 6.4], [3.8, 0.9]] }] },
      { step: 3, cue: 'Sets 3–4: outside of the left' },
    ],
  },

  'bm-croqueta': {
    surface: 'room',
    size: [4, 5],
    items: [{ kind: 'defender', at: [2, 2.3], label: "Defender's foot", labelPos: 'right' }],
    start: { me: [2, 4.3], ball: 'me' },
    frames: [
      { step: 0, cue: 'Standing: 10 slow taps', moves: [{ type: 'feint', path: [[1.5, 4.3], [2.5, 4.3]] }] },
      {
        step: 1,
        cue: 'Right to left, one step before it',
        moves: [{ type: 'dribble', path: [[2.5, 4.3], [2.6, 3.1], [1.3, 2.5], [1.3, 0.8]], curve: true }],
      },
      {
        step: 2,
        reset: true,
        cue: 'Left to right',
        moves: [{ type: 'dribble', path: [[1.5, 4.3], [1.4, 3.1], [2.7, 2.5], [2.7, 0.8]], curve: true }],
      },
      {
        step: 3,
        reset: true,
        cue: 'Croqueta, then burst',
        moves: [
          { type: 'dribble', path: [[2.5, 4.3], [2.6, 3.1], [1.3, 2.5], [1.3, 1.7]], curve: true },
          { type: 'pass', path: [[1.3, 1.7], [1.3, 0.3]] },
        ],
      },
      { step: 4, cue: 'Jog in, croqueta, go' },
    ],
  },

  'bm-box-turns': {
    surface: 'terrace',
    size: [6, 6],
    items: [
      { kind: 'cone', at: [1.5, 1.5] },
      { kind: 'cone', at: [4.5, 1.5], label: '3 m', labelPos: 'right' },
      { kind: 'cone', at: [1.5, 4.5] },
      { kind: 'cone', at: [4.5, 4.5] },
    ],
    start: { me: [3, 3.2], ball: 'me' },
    frames: [
      { step: 0, moves: [{ type: 'dribble', path: [[3, 3.2], [3, 1.7]] }] },
      { step: 1, cue: 'Set 1 drag-back · 2 Cruyff · 3 inside · 4 outside', moves: [{ type: 'feint', path: [[3.1, 1.6], [3.6, 1.7], [3.5, 2.3]], curve: true }] },
      {
        step: 2,
        moves: [
          { type: 'dribble', path: [[3.2, 1.8], [3, 3]] },
          { type: 'dribble', path: [[3, 3], [4.3, 3]] },
        ],
      },
      { step: 3, cue: 'Switch the turning foot each time', moves: [{ type: 'feint', path: [[4.4, 2.9], [4.4, 2.4], [3.8, 2.4]], curve: true }] },
    ],
  },
};
