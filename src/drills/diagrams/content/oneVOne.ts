import type { DrillDiagram } from '../types';

/** 1v1 drills. Pitch, attacking upwards, touchline on the left. */
export const ONE_V_ONE: Record<string, DrillDiagram> = {
  '1v1-shoulder-drop': {
    surface: 'pitch',
    size: [20, 34],
    items: [
      { kind: 'line', from: [1, 0], to: [1, 34] },
      { kind: 'text', at: [4.6, 33.6], text: 'Touchline' },
      { kind: 'goal', at: [13, 2], width: 6, label: 'Goal', labelPos: 'left' },
      { kind: 'defender', at: [5, 19], label: 'Defender marker' },
    ],
    start: { me: [5, 30.5], ball: 'me' },
    frames: [
      { step: 0, moves: [{ type: 'dribble', path: [[5, 30.5], [5, 22.6]] }] },
      { step: 1, moves: [{ type: 'feint', path: [[5, 22.6], [2.6, 21.6]] }] },
      { step: 2, moves: [{ type: 'dribble', path: [[5, 22.6], [7.2, 20.6], [9, 18.6]], curve: true }] },
      {
        step: 3,
        moves: [
          { type: 'dribble', path: [[9, 18.6], [11, 13.5]] },
          { type: 'shot', path: [[11, 13.5], [15.4, 2.4]] },
        ],
      },
    ],
  },

  '1v1-outside-burst': {
    surface: 'pitch',
    size: [16, 34],
    items: [
      { kind: 'line', from: [1, 0], to: [1, 34] },
      { kind: 'text', at: [4.6, 33.6], text: 'Touchline' },
      { kind: 'defender', at: [3.6, 19], label: 'Defender marker' },
      { kind: 'cone', at: [2.6, 4], label: 'Crossing point' },
      { kind: 'zone', at: [8, 5.5], size: [4, 4], label: 'Cutback zone', labelPos: 'below' },
    ],
    start: { me: [7, 30.5], ball: 'me' },
    frames: [
      { step: 0, moves: [{ type: 'dribble', path: [[7, 30.5], [6, 22.6]] }] },
      { step: 1, moves: [{ type: 'feint', path: [[6, 22.6], [8.6, 21.8]] }] },
      { step: 2, moves: [{ type: 'pass', path: [[6, 22.6], [2.6, 15.6]] }] },
      {
        step: 3,
        moves: [
          { type: 'run', path: [[6, 22.6], [2.8, 19.6], [2.6, 16.2]], curve: true },
          { type: 'dribble', path: [[2.6, 15.6], [2.6, 5.4]] },
        ],
      },
      { step: 4, moves: [{ type: 'pass', path: [[2.6, 5.4], [9.6, 7.4]] }] },
    ],
  },

  '1v1-stepover-chop': {
    surface: 'pitch',
    size: [12, 22],
    items: [
      { kind: 'line', from: [3, 1], to: [3, 21], dashed: true },
      { kind: 'line', from: [8, 1], to: [8, 21], dashed: true },
      { kind: 'text', at: [5.5, 21.8], text: 'Channel, 5 m wide' },
      { kind: 'defender', at: [5.5, 9.5], label: 'Defender', labelPos: 'right' },
    ],
    start: { me: [4.2, 19.5], ball: 'me' },
    frames: [
      { step: 0, moves: [{ type: 'dribble', path: [[4.2, 19.5], [4.2, 12.2]] }] },
      { step: 1, moves: [{ type: 'feint', path: [[4.6, 12.2], [3.4, 11.2]] }] },
      { step: 2, moves: [{ type: 'dribble', path: [[4.2, 12.2], [6.6, 12]] }] },
      {
        step: 3,
        moves: [
          { type: 'dribble', path: [[6.6, 12], [7, 8.5], [6.8, 6]], curve: true },
          { type: 'shot', path: [[6.8, 6], [6.2, 1]] },
        ],
      },
    ],
  },

  '1v1-change-of-pace': {
    surface: 'pitch',
    size: [12, 34],
    items: [
      { kind: 'line', from: [1.5, 0], to: [1.5, 34] },
      { kind: 'text', at: [6, 33.8], text: 'Touchline' },
      { kind: 'cone', at: [7, 31], label: 'Start' },
      { kind: 'cone', at: [7, 21], label: '10 m' },
      { kind: 'cone', at: [7, 11], label: '20 m' },
      { kind: 'cone', at: [7, 1.5], label: '30 m' },
    ],
    start: { me: [4.4, 31], ball: 'me' },
    frames: [
      { step: 0, moves: [{ type: 'dribble', path: [[4.4, 31], [4.4, 21.5]] }] },
      {
        step: 1,
        moves: [
          { type: 'pass', path: [[4.4, 21.5], [4.4, 15.5]] },
          { type: 'run', path: [[4.4, 21.5], [4.4, 16.2]] },
        ],
        ball: 'me',
      },
      {
        step: 2,
        moves: [
          { type: 'dribble', path: [[4.4, 16.2], [4.4, 11]] },
          { type: 'pass', path: [[4.4, 11], [4.4, 4.5]] },
          { type: 'run', path: [[4.4, 11], [4.4, 5.2]] },
        ],
        ball: 'me',
      },
      { step: 3, moves: [{ type: 'run', path: [[4.4, 5.2], [9.6, 12], [9.6, 26], [4.4, 31]], curve: true }], ball: 'me' },
    ],
  },

  '1v1-gates-on-call': {
    surface: 'pitch',
    size: [14, 22],
    items: [
      { kind: 'cone', at: [7, 21], label: 'Start' },
      { kind: 'defender', at: [7, 10], label: 'Defender', labelPos: 'right' },
      { kind: 'gate', at: [4, 4.5], width: 1.5, label: 'Outside', labelPos: 'above' },
      { kind: 'gate', at: [10, 4.5], width: 1.5, label: 'Inside', labelPos: 'above' },
    ],
    start: { me: [7, 19.5], ball: 'me' },
    frames: [
      { step: 0, cue: 'Cue: "Left" or "Right"' },
      { step: 1, moves: [{ type: 'dribble', path: [[7, 19.5], [7, 13]] }] },
      {
        step: 2,
        cue: '"Left!"',
        moves: [{ type: 'dribble', path: [[7, 13], [5.2, 10.2], [4, 6.2]], curve: true }],
      },
      { step: 3, moves: [{ type: 'dribble', path: [[4, 6.2], [4, 1.6]] }] },
    ],
  },

  '1v1-passive-defender': {
    surface: 'pitch',
    size: [14, 21],
    items: [
      { kind: 'line', from: [2, 3], to: [12, 3] },
      { kind: 'text', at: [10.2, 1.8], text: 'End line = goal' },
      { kind: 'line', from: [2, 3], to: [2, 19], dashed: true },
      { kind: 'line', from: [12, 3], to: [12, 19], dashed: true },
      { kind: 'text', at: [7, 20.6], text: '10 × 15 m channel' },
    ],
    start: { me: [7, 17.5], partner: [7, 10.5], ball: 'me' },
    frames: [
      { step: 0, moves: [{ type: 'feint', by: 'partner', path: [[7, 10.5], [8.6, 10]] }] },
      { step: 1, moves: [{ type: 'dribble', path: [[7, 17.5], [7, 13]] }] },
      {
        step: 2,
        cue: 'They lean inside: go outside',
        moves: [
          { type: 'feint', by: 'partner', path: [[7, 10.5], [8.6, 10]] },
          { type: 'dribble', path: [[7, 13], [4.8, 10.6], [4.4, 7]], curve: true },
        ],
      },
      { step: 3, moves: [{ type: 'dribble', path: [[4.4, 7], [5, 2.4]] }] },
    ],
  },
};
