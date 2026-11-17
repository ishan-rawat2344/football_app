import type { DrillDiagram, Move, Pt } from '../types';

const run = (...path: Pt[]): Move => ({ type: 'run', path });

/** Defending, speed and warm-ups. Mostly no ball. */
export const PHYSICAL: Record<string, DrillDiagram> = {
  'df-recovery-run': {
    surface: 'pitch',
    size: [20, 32],
    items: [
      { kind: 'line', from: [1, 0], to: [1, 32] },
      { kind: 'cone', at: [9, 25.6], label: 'Danger point', labelPos: 'right' },
      { kind: 'text', at: [11, 31.6], text: 'Your goal is this way ↓' },
      { kind: 'text', at: [11, 1.2], text: 'Their goal ↑' },
    ],
    start: { me: [4, 6.4], ball: null },
    frames: [
      { step: 0, cue: 'Jog forwards', moves: [run([4, 6.4], [4, 3.6])] },
      { step: 1, cue: '"Turn!"', moves: [{ type: 'run', path: [[4, 3.6], [4.6, 11], [6.6, 18.6], [8.6, 21.6]], curve: true }] },
      { step: 2, cue: 'Slow down: 3–4 short steps', moves: [run([8.6, 21.6], [8.8, 23.2])] },
      { step: 3, cue: 'Side-on stance. Hold 3 s' },
    ],
  },

  'df-jockey': {
    surface: 'pitch',
    size: [14, 20],
    items: [
      { kind: 'line', from: [2, 2], to: [2, 18], dashed: true },
      { kind: 'line', from: [12, 2], to: [12, 18], dashed: true },
      { kind: 'text', at: [7, 19.6], text: '10 × 15 m channel' },
    ],
    start: { me: [7, 17], partner: [7, 2.6], ball: 'partner' },
    frames: [
      {
        step: 0,
        cue: 'Meet them, slow the last 3 m',
        moves: [run([7, 17], [7, 10]), { type: 'dribble', by: 'partner', path: [[7, 2.6], [7, 6]] }],
      },
      { step: 1, cue: 'Side-on: show them the line', moves: [{ type: 'feint', path: [[7, 10], [5.4, 11.2]] }] },
      {
        step: 2,
        cue: 'Shuffle back, 1–1.5 m off',
        moves: [run([7, 10], [6, 13.4]), { type: 'dribble', by: 'partner', path: [[7, 6], [5.8, 10.8]] }],
      },
      {
        step: 3,
        cue: 'Show them outside, to the end',
        moves: [run([6, 13.4], [4.4, 17.4]), { type: 'dribble', by: 'partner', path: [[5.8, 10.8], [3.2, 16.6]] }],
      },
      { step: 4, cue: 'Solo: react to "Left", "Right", "Go"' },
    ],
  },

  'df-press-triggers': {
    surface: 'pitch',
    size: [22, 20],
    items: [
      { kind: 'line', from: [1, 0], to: [1, 20] },
      { kind: 'defender', at: [2.6, 5], label: 'Their full-back', labelPos: 'right' },
      { kind: 'defender', at: [17.4, 5], label: 'Their centre-back', labelPos: 'below' },
    ],
    start: { me: [6.4, 16], ball: [16.6, 5.6] },
    frames: [
      { step: 0, cue: 'A situation is called' },
      { step: 1, cue: 'Trigger: pass to the full-back', moves: [{ type: 'pass', by: 'partner', path: [[16.4, 5.6], [3.4, 5.6]] }] },
      { step: 2, cue: 'Good touch, facing up: hold' },
      { step: 3, cue: 'Curve your run: block the line', moves: [{ type: 'run', path: [[6.4, 16], [7.2, 10.4], [4.2, 6.8]], curve: true }] },
      { step: 4, cue: 'Walk back', moves: [{ type: 'run', path: [[4.2, 6.8], [8, 11], [6.4, 16]], curve: true }] },
    ],
  },

  'sp-acceleration': {
    surface: 'pitch',
    size: [8, 15],
    items: [
      { kind: 'cone', at: [2.4, 13], label: 'Start', labelPos: 'left' },
      { kind: 'cone', at: [2.4, 2.6], label: '10 m', labelPos: 'left' },
    ],
    start: { me: [4, 13.4], ball: null },
    frames: [
      { step: 0, cue: 'Reps 1–2: falling start', moves: [run([4, 13.4], [4, 2])] },
      { step: 1, reset: true, cue: 'Reps 3–4: half-kneeling', moves: [run([4, 13.4], [4, 2])] },
      { step: 2, reset: true, cue: 'Reps 5–6: side-on, turn and go', moves: [{ type: 'run', path: [[5.4, 13.6], [4.2, 12], [4, 2]], curve: true }] },
      { step: 3, cue: 'Walk back: full recovery', moves: [{ type: 'run', path: [[4, 2], [6.6, 7.6], [4.4, 13.4]], curve: true }] },
    ],
  },

  'sp-flying-20': {
    surface: 'pitch',
    size: [12, 40],
    items: [
      { kind: 'cone', at: [6, 37], label: 'Start', labelPos: 'right' },
      { kind: 'cone', at: [6, 24], label: '20 m', labelPos: 'right' },
      { kind: 'cone', at: [6, 11], label: '40 m', labelPos: 'right' },
      { kind: 'zone', at: [2.4, 11], size: [7.2, 13] },
      { kind: 'text', at: [6, 17.8], text: 'Fly zone' },
    ],
    start: { me: [4, 37], ball: null },
    frames: [
      { step: 0, cue: 'Build up', moves: [run([4, 37], [4, 24.4])] },
      { step: 1, cue: 'Top speed through the zone', moves: [run([4, 24], [4, 11.4])] },
      { step: 2, cue: 'Ease down over 15 m', moves: [run([4, 11], [4, 2])] },
      { step: 3, cue: 'Walk back. Full rest', moves: [{ type: 'run', path: [[4.6, 2], [10.4, 20], [4.6, 37]], curve: true }] },
    ],
  },

  'sp-ball-sprints': {
    surface: 'pitch',
    size: [10, 34],
    items: [
      { kind: 'cone', at: [7.4, 32], label: '0 m', labelPos: 'right' },
      { kind: 'cone', at: [7.4, 17], label: '15 m', labelPos: 'right' },
      { kind: 'cone', at: [7.4, 2], label: '30 m', labelPos: 'right' },
    ],
    start: { me: [4, 32], ball: 'me' },
    frames: [
      {
        step: 0,
        cue: 'Push it 3–4 m ahead',
        moves: [{ type: 'pass', path: [[4, 31.6], [4, 27.6]] }, run([4, 32], [4, 28.4])],
        ball: 'me',
      },
      {
        step: 1,
        cue: "Touch it again, don't break stride",
        moves: [{ type: 'pass', path: [[4, 28], [4, 21.6]] }, run([4, 28.4], [4, 22.4])],
        ball: 'me',
      },
      {
        step: 2,
        cue: '3–4 touches over 30 m',
        moves: [
          { type: 'pass', path: [[4, 22], [4, 12.4]] },
          run([4, 22.4], [4, 13]),
          { type: 'pass', path: [[4, 12.6], [4, 3]] },
          run([4, 13], [4, 3.6]),
        ],
        ball: 'me',
      },
      { step: 3, cue: 'Odd runs right foot, even runs left' },
    ],
  },

  'sp-cut-and-go': {
    surface: 'pitch',
    size: [12, 22],
    items: [
      { kind: 'cone', at: [4, 18] },
      { kind: 'cone', at: [7.6, 14.4] },
      { kind: 'cone', at: [4, 10.8] },
      { kind: 'cone', at: [7.6, 7.2], label: '5 m apart', labelPos: 'right' },
    ],
    start: { me: [4, 21.4], ball: null },
    frames: [
      { step: 0, cue: 'Sprint to the first marker', moves: [run([4, 21.4], [4, 18.6])] },
      {
        step: 1,
        cue: 'Plant, hips low, push off at 45°',
        moves: [{ type: 'feint', path: [[4, 18.6], [3.2, 18.4]] }, run([4, 18.4], [7.4, 14.8])],
      },
      { step: 2, cue: 'Through all the markers', moves: [run([7.4, 14.8], [4.2, 11.2], [7.4, 7.6], [5, 3])] },
      { step: 3, cue: 'Sets 3–4: 90° cuts' },
    ],
  },

  'sp-repeated-sprints': {
    surface: 'pitch',
    size: [8, 24],
    items: [
      { kind: 'cone', at: [5.6, 22], label: 'Start', labelPos: 'right' },
      { kind: 'cone', at: [5.6, 2], label: '20 m', labelPos: 'right' },
    ],
    start: { me: [2.8, 22], ball: null },
    frames: [
      { step: 0, cue: 'Sprint', moves: [run([2.8, 22], [2.8, 2])] },
      { step: 1, cue: 'Jog back. Next one starts at 25 s', moves: [{ type: 'run', path: [[3, 2], [4.6, 12], [3, 22]], curve: true }] },
      { step: 2, reset: true, cue: '6 sprints, then walk 4 minutes', moves: [run([2.8, 22], [2.8, 2])] },
      { step: 3, cue: 'Second set' },
    ],
  },

  'sp-tempo-runs': {
    surface: 'pitch',
    size: [10, 30],
    items: [
      { kind: 'cone', at: [6.4, 28], label: 'Start', labelPos: 'right' },
      { kind: 'cone', at: [6.4, 2], label: '50–60 m', labelPos: 'right' },
    ],
    start: { me: [2.6, 28], ball: null },
    frames: [
      { step: 0, cue: 'About 70%: quick but relaxed', moves: [run([2.6, 28], [2.6, 2.4])] },
      { step: 1, cue: 'Walk 30 s' },
      { step: 2, cue: 'Next run back the other way. 6 runs', moves: [run([4.2, 2.4], [4.2, 28])] },
      { step: 3, cue: 'Rest 2 min, then a second set' },
    ],
  },

  'warmup-winger': {
    surface: 'pitch',
    size: [12, 24],
    items: [
      { kind: 'cone', at: [8.4, 22], label: 'Start', labelPos: 'right' },
      { kind: 'cone', at: [8.4, 2], label: '20 m', labelPos: 'right' },
    ],
    start: { me: [3.4, 22], ball: null },
    frames: [
      { step: 0, cue: 'Easy jog, up and back, twice', moves: [run([3.4, 21.6], [3.4, 2.6]), run([5.8, 2.6], [5.8, 21.6])] },
      { step: 1, reset: true, cue: 'Hip out, then hip in', moves: [run([3.4, 21.6], [3.4, 2.6]), run([5.8, 2.6], [5.8, 21.6])] },
      { step: 2, reset: true, cue: 'Side shuffles: low, feet never cross', moves: [run([3.4, 21.6], [3.4, 2.6]), run([5.8, 2.6], [5.8, 21.6])] },
      {
        step: 3,
        reset: true,
        cue: 'Forward 5 m, back 2 m',
        moves: [run([3.4, 21.6], [3.4, 16.6]), run([4.2, 16.6], [4.2, 18.6]), run([3.4, 18.6], [3.4, 13.6]), run([4.2, 13.6], [4.2, 15.6])],
      },
      { step: 4, cue: 'At the marker: planks, squats, balance', me: [3.4, 22] },
      { step: 5, cue: 'Hops: stick each landing' },
      { step: 6, reset: true, cue: 'Build-ups: 70%, 80%, 90%', moves: [run([3.4, 21.6], [3.4, 2.6])] },
      { step: 7, reset: true, cue: 'Plant and cut 45°, build to 80%', moves: [run([3.4, 21.6], [3.4, 16.6], [7, 12.8], [7, 8.4])] },
    ],
  },

  'warmup-pregame': {
    surface: 'pitch',
    size: [18, 18],
    items: [
      { kind: 'wall', from: [8, 0.6], to: [17.4, 0.6], label: 'Wall or teammate', labelPos: 'below' },
      { kind: 'zone', at: [9, 9.6], size: [6, 6], label: 'Touches', labelPos: 'below' },
      { kind: 'text', at: [3, 17.6], text: '15 m' },
    ],
    start: { me: [3, 16], ball: [12, 12.6] },
    frames: [
      { step: 0, cue: 'Easy jog, hip out and in, shuffles', moves: [run([3, 16], [3, 2]), run([4.4, 2], [4.4, 15.4])] },
      { step: 1, cue: 'Lunges, leg swings, ankle bounces' },
      {
        step: 2,
        reset: true,
        cue: 'Both feet, sole rolls, croquetas',
        me: [10.4, 14.4],
        moves: [{ type: 'dribble', path: [[10.4, 14.6], [13.6, 13.6], [10.6, 11.8], [13.4, 10.6]], curve: true }],
      },
      {
        step: 3,
        cue: '10 left, 10 right',
        moves: [
          { type: 'pass', path: [[13.2, 10.2], [12.8, 1.1]] },
          { type: 'pass', path: [[12.8, 1.1], [12.6, 9.6]] },
        ],
      },
      { step: 4, reset: true, cue: 'Build-ups: 80%, 90%, 95%', moves: [run([16.6, 16.6], [16.6, 3])] },
      { step: 5, cue: 'Two quick changes of direction', moves: [run([16.6, 16.6], [16.6, 12], [13.6, 9], [13.6, 5])] },
      { step: 6, cue: 'Breathe. Cue words. First action' },
    ],
  },
};
