import type { DrillDiagram } from '../types';

/** Finishing, crossing and movement. Pitch, attacking upwards, touchline on the left. */
export const ATTACKING: Record<string, DrillDiagram> = {
  'fn-cut-in-far-post': {
    surface: 'pitch',
    size: [20, 22],
    items: [
      { kind: 'goal', at: [13, 1.5], width: 5, label: 'Goal', labelPos: 'left' },
      { kind: 'zone', at: [10.6, 1.6], size: [1, 1] },
      { kind: 'zone', at: [14.4, 1.6], size: [1, 1] },
      { kind: 'defender', at: [3.6, 14.4], label: 'Defender marker', labelPos: 'right' },
      { kind: 'text', at: [6.8, 21.6], text: '18 m out, 8 m wide' },
    ],
    start: { me: [2.6, 19.6], ball: 'me' },
    frames: [
      { step: 0, moves: [{ type: 'dribble', path: [[2.6, 19.6], [2.8, 16.8]] }] },
      { step: 1, cue: 'Cut inside', moves: [{ type: 'dribble', path: [[2.8, 16.8], [5, 15.9], [6.8, 14.6]], curve: true }] },
      { step: 2, moves: [{ type: 'dribble', path: [[6.8, 14.6], [8.2, 13.6]] }] },
      { step: 3, cue: 'Start it outside the far post', moves: [{ type: 'shot', path: [[8.2, 13.6], [17, 6], [15, 2]], curve: true }] },
      { step: 4, cue: 'Count corner hits' },
    ],
  },

  'fn-back-post-run': {
    surface: 'pitch',
    size: [24, 20],
    items: [
      { kind: 'goal', at: [12, 1.5], width: 6 },
      { kind: 'cone', at: [9, 5.6], label: 'Back-post zone', labelPos: 'left' },
      { kind: 'text', at: [6, 19.4], text: 'Start wide, 15 m out' },
    ],
    start: { me: [2.4, 16.5], partner: [21, 9.5], ball: 'partner' },
    frames: [
      { step: 0, cue: 'Ball on the right' },
      { step: 1, cue: "Hold wide, on the defender's blind side" },
      { step: 2, cue: 'Crosser looks up: go', moves: [{ type: 'run', path: [[2.4, 16.5], [4.6, 10.4], [8.6, 6.4]], curve: true }] },
      {
        step: 3,
        cue: 'First time',
        moves: [
          { type: 'pass', by: 'partner', path: [[21, 9.5], [16, 4.6], [9.2, 6]], curve: true },
          { type: 'shot', path: [[9.2, 6], [10.4, 1.9]] },
        ],
      },
      { step: 4, cue: 'Solo: toss it up, volley after one bounce' },
    ],
  },

  'fn-volleys': {
    surface: 'pitch',
    size: [10, 11],
    items: [
      { kind: 'goal', at: [5, 1.2], width: 6, label: 'Target, knee to waist high', labelPos: 'below' },
      { kind: 'text', at: [7.8, 9.4], text: '8 m' },
    ],
    start: { me: [5, 9.4], ball: 'me' },
    frames: [
      { step: 0, cue: 'Drop it at knee height' },
      { step: 1, cue: 'Side-foot', moves: [{ type: 'shot', path: [[5, 9], [3.6, 1.6]] }] },
      { step: 2, reset: true, cue: 'Laces, toes down', moves: [{ type: 'shot', path: [[5, 9], [6.4, 1.6]] }] },
      { step: 3, reset: true, cue: 'Half-volley after one bounce', moves: [{ type: 'shot', path: [[5, 9], [3.6, 1.6]] }] },
      { step: 4, reset: true, cue: 'Left foot, side-foot', moves: [{ type: 'shot', path: [[5, 9], [6.4, 1.6]] }] },
    ],
  },

  'fn-first-time': {
    surface: 'pitch',
    size: [14, 12],
    items: [
      { kind: 'wall', from: [0.4, 0.6], to: [13.6, 0.6], target: { at: [9.2, 0.6], width: 4 } },
      { kind: 'text', at: [9.2, 2], text: 'Goal marked on the wall' },
    ],
    start: { me: [3, 10], ball: 'me' },
    frames: [
      { step: 0, cue: '10 m out, at an angle' },
      {
        step: 1,
        cue: 'Firmly, beside the target',
        moves: [
          { type: 'pass', path: [[3.2, 9.6], [4.8, 0.9]] },
          { type: 'pass', path: [[4.8, 0.9], [5.8, 7.8]] },
        ],
      },
      {
        step: 2,
        cue: 'First time into a corner',
        moves: [
          { type: 'run', path: [[3, 10], [5.2, 8.6]] },
          { type: 'shot', path: [[5.8, 7.8], [10.6, 1]] },
        ],
      },
      { step: 3, cue: 'Right, then left, then alternate' },
    ],
  },

  'fn-left-finish': {
    surface: 'pitch',
    size: [18, 13],
    items: [
      { kind: 'goal', at: [9, 1.2], width: 6 },
      { kind: 'cone', at: [9, 9.6], label: '8 m', labelPos: 'below' },
      { kind: 'cone', at: [4.2, 11.4], label: 'Left half-space', labelPos: 'below' },
      { kind: 'cone', at: [13.8, 11.4], label: 'Right half-space', labelPos: 'below' },
    ],
    start: { me: [9, 8.6], ball: 'me' },
    frames: [
      {
        step: 0,
        cue: 'Ball still, left foot',
        moves: [
          { type: 'shot', path: [[9, 8.2], [7, 1.6]] },
          { type: 'shot', path: [[4.4, 10.6], [6.8, 1.6]] },
          { type: 'shot', path: [[13.6, 10.6], [11, 1.6]] },
        ],
      },
      {
        step: 1,
        reset: true,
        cue: 'Ball rolling: second touch',
        moves: [
          { type: 'dribble', path: [[9, 8.6], [9, 6.6]] },
          { type: 'shot', path: [[9, 6.6], [11.2, 1.6]] },
        ],
      },
      {
        step: 2,
        reset: true,
        cue: 'Cut onto your left, far post',
        moves: [
          { type: 'dribble', path: [[13.8, 10.6], [13.2, 9], [11.6, 8.4]], curve: true },
          { type: 'shot', path: [[11.6, 8.4], [6.6, 1.6]] },
        ],
      },
    ],
  },

  'cr-whipped-inswinger': {
    surface: 'pitch',
    size: [30, 28],
    items: [
      { kind: 'line', from: [1, 1], to: [29, 1], dashed: true },
      { kind: 'text', at: [8, 2.6], text: 'Goal line (markers)' },
      { kind: 'zone', at: [21.5, 4.6], size: [4, 4], label: 'Back post', labelPos: 'below' },
      { kind: 'zone', at: [17.6, 11.2], size: [4, 4], label: 'Penalty spot', labelPos: 'below' },
      { kind: 'text', at: [10, 27.4], text: '25 m out, 15 m wide' },
    ],
    start: { me: [5, 25.6], ball: 'me' },
    frames: [
      { step: 0, cue: 'Two touches inside', moves: [{ type: 'dribble', path: [[5, 25.6], [5.6, 20.4], [8, 18]], curve: true }] },
      { step: 1, cue: 'Look up first', moves: [{ type: 'look', path: [[8, 18], [21.6, 8.6]] }] },
      { step: 2, cue: 'Curl it back towards goal', moves: [{ type: 'pass', path: [[8, 18], [17.6, 4.6], [23.4, 6.6]], curve: true }] },
      { step: 3, reset: true, cue: 'Set 3: back post or penalty spot', moves: [{ type: 'pass', path: [[8, 18], [14.6, 11.4], [19.6, 13]], curve: true }] },
      { step: 4, cue: 'Count first-bounce landings' },
    ],
  },

  'cr-left-byline': {
    surface: 'pitch',
    size: [26, 24],
    items: [
      { kind: 'line', from: [1, 0], to: [1, 24] },
      { kind: 'line', from: [1, 1], to: [25, 1], dashed: true },
      { kind: 'goal', at: [18, 1], width: 7 },
      { kind: 'zone', at: [12.6, 1.4], size: [4, 3.6], label: 'Near post', labelPos: 'below' },
      { kind: 'zone', at: [16, 9.4], size: [4, 4], label: 'Penalty spot', labelPos: 'below' },
    ],
    start: { me: [3, 21.4], ball: 'me' },
    frames: [
      {
        step: 0,
        cue: 'Push it down the line',
        moves: [
          { type: 'pass', path: [[3, 21], [3, 15.6]] },
          { type: 'run', path: [[3, 21.4], [3, 16.2]] },
        ],
        ball: 'me',
      },
      {
        step: 1,
        cue: 'Head up two touches out',
        moves: [
          { type: 'dribble', path: [[3, 16.2], [3, 5]] },
          { type: 'look', path: [[3, 5], [13.6, 3.6]] },
        ],
      },
      { step: 2, cue: 'Set 1: driven, near post', moves: [{ type: 'pass', path: [[3.4, 4.4], [13.6, 3.4]] }] },
      { step: 3, reset: true, cue: 'Set 2: lofted to the spot', moves: [{ type: 'pass', path: [[3.4, 4.4], [10.8, 4.8], [17.6, 11.2]], curve: true }] },
      { step: 4, cue: 'Set 3: pick from what you saw' },
    ],
  },

  'cr-cutback': {
    surface: 'pitch',
    size: [24, 24],
    items: [
      { kind: 'line', from: [1, 0], to: [1, 24] },
      { kind: 'line', from: [1, 1], to: [23, 1], dashed: true },
      { kind: 'goal', at: [16, 1], width: 7 },
      { kind: 'zone', at: [14.5, 8.4], size: [3, 3], label: 'Zone, 8–10 m out', labelPos: 'below' },
    ],
    start: { me: [3, 21.4], ball: 'me' },
    frames: [
      { step: 0, cue: 'At speed', moves: [{ type: 'dribble', path: [[3, 21.4], [3, 8]] }] },
      { step: 1, cue: '1–3 m from the byline', moves: [{ type: 'dribble', path: [[3, 8], [3, 2.6]] }] },
      { step: 2, cue: 'Set 1: left-foot cutback', moves: [{ type: 'pass', path: [[3.4, 2.6], [15.8, 9.8]] }] },
      {
        step: 3,
        reset: true,
        cue: 'Set 2: drag onto your right',
        moves: [
          { type: 'dribble', path: [[3, 2.6], [4.8, 3.4]] },
          { type: 'pass', path: [[4.8, 3.4], [15.8, 10]] },
        ],
      },
      { step: 4, cue: 'Set 3: mix them. Count' },
    ],
  },

  'cr-early-cross': {
    surface: 'pitch',
    size: [26, 34],
    items: [
      { kind: 'line', from: [1, 0], to: [1, 34] },
      { kind: 'goal', at: [17, 1.2], width: 7 },
      { kind: 'zone', at: [10, 7.2], size: [14, 4], label: 'Corridor, 6–10 m out', labelPos: 'below' },
      { kind: 'text', at: [8.6, 33.4], text: '30 m from goal' },
    ],
    start: { me: [4, 31], ball: 'me' },
    frames: [
      {
        step: 0,
        moves: [
          { type: 'pass', path: [[4, 30.6], [4.4, 26.8]] },
          { type: 'run', path: [[4, 31], [4.4, 27.4]] },
        ],
        ball: 'me',
      },
      { step: 1, cue: "Cross without stopping", moves: [{ type: 'pass', path: [[4.6, 27], [11, 15], [18, 9.2]], curve: true }] },
      { step: 2, cue: 'Right after a touch in, or left on the outside' },
    ],
  },

  'mv-run-in-behind': {
    surface: 'pitch',
    size: [22, 30],
    items: [
      { kind: 'line', from: [1, 0], to: [1, 30] },
      { kind: 'line', from: [1, 12], to: [21, 12], dashed: true },
      { kind: 'cone', at: [3, 12] },
      { kind: 'cone', at: [10, 12] },
      { kind: 'cone', at: [17, 12], label: 'Their back line', labelPos: 'above' },
      { kind: 'text', at: [18.4, 29.4], text: 'Passer, 15 m back' },
    ],
    start: { me: [4.6, 13.4], partner: [12, 27.4], ball: 'partner' },
    frames: [
      { step: 0, cue: 'Watch the ball and the line', moves: [{ type: 'look', path: [[4.6, 13.4], [11.4, 26.6]] }] },
      { step: 1, cue: 'Check towards the ball', moves: [{ type: 'run', path: [[4.6, 13.4], [5.6, 16.4]] }] },
      {
        step: 2,
        cue: "Trigger: passer's head up",
        moves: [{ type: 'run', path: [[5.6, 16.4], [3, 13.2], [3.8, 9], [6.6, 5.4]], curve: true }],
      },
      {
        step: 3,
        moves: [
          { type: 'pass', by: 'partner', path: [[12, 27], [7, 5.6]] },
          { type: 'dribble', path: [[6.8, 5.4], [10.4, 1.4]] },
        ],
      },
    ],
  },

  'mv-check-spin': {
    surface: 'pitch',
    size: [10, 22],
    items: [{ kind: 'defender', at: [5, 6.6], label: 'Defender', labelPos: 'right' }],
    start: { me: [5, 8.2], partner: [5, 20.6], ball: 'partner' },
    frames: [
      { step: 0, cue: 'Start next to the marker' },
      { step: 1, cue: 'Check: three sharp steps', moves: [{ type: 'run', path: [[5, 8.2], [5, 11]] }] },
      { step: 2, cue: 'Spin and sprint 10 m', moves: [{ type: 'run', path: [[5, 11], [6.6, 8.4], [6.6, 1.2]], curve: true }] },
      { step: 3, cue: 'Partner: to feet, or in behind', moves: [{ type: 'pass', by: 'partner', path: [[5, 20.2], [6.6, 2]] }] },
      { step: 4, cue: 'Solo: wall on the check, kick ahead on the spin' },
    ],
  },

  'mv-wide-or-inside': {
    surface: 'pitch',
    size: [30, 34],
    items: [
      { kind: 'line', from: [1, 0], to: [1, 34] },
      { kind: 'line', from: [10, 0], to: [10, 34], dashed: true },
      { kind: 'line', from: [20, 0], to: [20, 34], dashed: true },
      { kind: 'goal', at: [20, 1.2], width: 7 },
      { kind: 'text', at: [5.5, 33.4], text: 'Wide' },
      { kind: 'text', at: [15, 33.4], text: 'Half-space' },
      { kind: 'text', at: [25, 33.4], text: 'Middle' },
    ],
    start: { me: [6, 18], ball: [20, 22] },
    frames: [
      { step: 0, cue: 'A situation is called' },
      { step: 1, cue: 'Jog there, then freeze' },
      {
        step: 2,
        cue: '"Ball on the right"',
        ball: [28.4, 14],
        moves: [{ type: 'run', path: [[6, 18], [11, 10], [15.6, 5.2]], curve: true }],
      },
      {
        step: 3,
        reset: true,
        cue: '"Our left-back has it"',
        ball: [4, 30],
        moves: [{ type: 'run', path: [[15.6, 5.2], [6, 10], [3, 16.4]], curve: true }],
      },
      {
        step: 4,
        reset: true,
        cue: '"Ball in the middle"',
        ball: [20, 20],
        moves: [{ type: 'run', path: [[3, 16.4], [2.6, 11.4]] }],
      },
      {
        step: 5,
        reset: true,
        cue: '"Ball lost": goal-side',
        ball: [17, 11],
        moves: [{ type: 'run', path: [[2.6, 11.4], [4, 18], [7, 24]], curve: true }],
      },
      { step: 6, cue: 'Can the ball reach you?', moves: [{ type: 'look', path: [[7, 24], [16.4, 11.8]] }] },
    ],
  },

  'mv-show-again': {
    surface: 'terrace',
    size: [16, 12],
    items: [
      { kind: 'wall', from: [0.4, 0.6], to: [15.6, 0.6] },
      { kind: 'text', at: [1.4, 1.8], text: 'Wall' },
      { kind: 'cone', at: [12.6, 9], label: 'Lose it here', labelPos: 'above' },
    ],
    start: { me: [3, 9], ball: 'me' },
    frames: [
      {
        step: 0,
        cue: 'Lose it on purpose',
        moves: [
          { type: 'dribble', path: [[3, 9], [11.6, 9]] },
          { type: 'pass', path: [[11.8, 9.2], [15, 11.2]] },
        ],
      },
      { step: 1, cue: 'Clap. "Next". Sprint to press', moves: [{ type: 'run', path: [[11.6, 9], [13.8, 10.6]] }] },
      { step: 2, cue: 'Show: hand out, call for it', moves: [{ type: 'run', path: [[13.8, 10.6], [11.4, 8], [9.6, 6.4]], curve: true }] },
      {
        step: 3,
        cue: 'Play forward',
        moves: [
          { type: 'pass', path: [[9.8, 0.9], [9.6, 6]] },
          { type: 'pass', path: [[9.8, 6], [12.6, 1]] },
        ],
      },
      { step: 4, cue: 'Count: under 5 seconds' },
    ],
  },
};
