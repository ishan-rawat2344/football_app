import type { Drill } from '../types';

export const DEFENDING: Drill[] = [
  {
    id: 'df-recovery-run',
    name: 'Recovery run: get goal-side',
    category: 'defending',
    purpose:
      "When your team loses the ball, the most valuable thing a left mid can do is get back goal-side fast: on a curved line towards your own goal, not chasing the ball. This keeps your work-rate sharp and teaches the best angle.",
    setup:
      'Start 20 m up the pitch on the left. A marker 20 m behind you, towards your own goal, is the danger point the attacker is heading for.',
    equipment: ['markers'],
    locations: ['ground'],
    mode: 'either',
    durationMin: 10,
    dose: { sets: 6, reps: '1 recovery run, walk back', restSec: 60 },
    steps: [
      'Jog forwards, facing the opponents\' goal.',
      'On "Turn!" (your partner or the cue caller), turn and sprint back on a curved line: towards your own goal first, then across to the inside of the attacker\'s path.',
      'After 15–20 m, slow down in 3–4 short steps into a side-on defending stance.',
      'Hold the stance for 3 seconds, then walk back.',
    ],
    coachingPoints: [
      'Run to where the danger will be, not where the ball is: towards your own goal first.',
      "Slow down under control, with short steps and low hips, so a simple touch doesn't beat you.",
      'Finish side-on, inside the attacker, showing them towards the line.',
    ],
    mistakes: [
      "Chasing the ball's line and arriving behind the attacker.",
      'Arriving at full speed and lunging.',
      'Easing off when you are "nearly" back.',
    ],
    easier: 'Jog the curved line first to learn the shape.',
    harder: 'Your partner dribbles, and you must get goal-side before they reach the marker.',
    partner:
      'Start 10 m ahead of them with a ball. On "Go!", dribble towards the marker behind them. They try to get goal-side of you before you get there.',
    skills: ['defending', 'stamina', 'pace'],
    blocks: ['position', 'physical'],
    intensity: 'high',
    loadTags: ['sprint', 'cutting'],
    videoQueries: ['recovery run defending winger', 'how to track back as a winger'],
  },
  {
    id: 'df-jockey',
    name: 'Jockey and show them outside',
    category: 'defending',
    purpose:
      "1v1 defending as a wide player: stay on your feet, stay side-on, and show the attacker towards the touchline, where they're least dangerous. No lunging.",
    setup: 'A channel 10 m wide and 15 m long. Your partner, or an imaginary attacker, starts at the far end.',
    equipment: ['markers'],
    locations: ['ground', 'terrace'],
    mode: 'either',
    durationMin: 8,
    dose: { sets: 4, reps: '5 duels', restSec: 45 },
    steps: [
      'Jog out to meet the attacker, slowing over the last 3 m.',
      'Get side-on with your inside foot forward, so the line looks like the open path.',
      'Shuffle backwards, keeping 1–1.5 m away and matching their speed.',
      'If they touch it too far, step in and win it. Otherwise keep showing them outside to the end of the channel.',
      'Solo: shadow-defend down the channel, reacting to "Left", "Right" and "Go" from the cue caller.',
    ],
    coachingPoints: [
      'Low and side-on, weight on the balls of your feet. Never square, never flat-footed.',
      'An arm\'s length away: close enough to pressure, far enough that one touch doesn\'t beat you.',
      'Watch the ball, not their feet or body feints.',
    ],
    mistakes: [
      'Diving in.',
      'Standing square, so they can go either way.',
      'Backing off too far.',
    ],
    easier: 'Your partner walks with the ball.',
    harder: 'Your partner dribbles at jogging pace and really tries to get past.',
    partner:
      'Dribble slowly towards them and try to get past on either side. Walk at first, then jog.',
    skills: ['defending', 'decisionMaking'],
    blocks: ['position'],
    intensity: 'medium',
    loadTags: ['cutting'],
    videoQueries: ['1v1 defending technique jockey', 'how to defend 1v1 as a winger'],
  },
  {
    id: 'df-press-triggers',
    name: 'Pressing triggers',
    category: 'defending',
    purpose:
      "Pressing at the right moment wins the ball high up the pitch, near their goal, where you're dangerous. Pressing at the wrong moment wastes your legs. You'll learn the triggers and the curved press that cuts off the pass down the line.",
    setup:
      'Start in your wide position. One marker is their full-back, on the touchline 12 m away. Another is their centre-back, 15 m inside.',
    equipment: ['markers'],
    locations: ['ground'],
    mode: 'either',
    durationMin: 10,
    dose: { sets: 2, reps: '6 calls', restSec: 120 },
    steps: [
      'Your partner or the cue caller calls a situation: "Bad touch", "Back to goal", "Pass to full-back", "Back to keeper", or "Good touch, facing up".',
      'Triggers mean go: a bad touch, a player with their back to goal, a pass to the full-back while it is travelling, a slow pass.',
      "No trigger means hold: a good touch facing up. Stay compact and don't press alone.",
      'When you go: curve your run from inside to outside, so your body blocks the pass down the line. Sprint 8–10 m, then slow down over the last 2 m.',
      'Walk back after each press.',
    ],
    coachingPoints: [
      'Press on the pass, not after it. Go while the ball is travelling.',
      'Curve your run to cut off one option, usually the pass down the line.',
      "The last two steps are small and controlled, so you don't get dribbled past.",
    ],
    mistakes: [
      'Pressing every ball and being exhausted after 30 minutes.',
      'Running straight at the player.',
      "Pressing alone. If nobody follows you, don't go.",
    ],
    easier: 'Walk-through only, no sprints.',
    harder: 'Calls come faster: 6 in a row with 15 s between.',
    partner:
      'Call out situations one at a time: "bad touch", "good touch", "pass to full-back", and so on. Mix them up.',
    skills: ['defending', 'decisionMaking', 'stamina'],
    blocks: ['position'],
    intensity: 'high',
    loadTags: ['sprint'],
    videoQueries: ['pressing triggers explained football', 'how wingers press full backs'],
  },
];
