/**
 * Pre-match routine, reset word and visualisation script. Everything
 * personal (kick-off time, cue words, if → then plans) comes from the
 * profile on the phone at runtime, never from this file.
 */
import type { Profile } from '../db/types';
import { lowerFirst } from '../lib/format';

/** Wake this long before kick-off: time to wake up properly, eat, travel, warm up. */
export const WAKE_BEFORE_MIN = 60;
/** Hours in bed before a game. */
export const SLEEP_HOURS = 7.5;

const DAY = 24 * 60;

export function parseTime(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h < 24 && min < 60 ? h * 60 + min : null;
}

export function fmtTime(minutes: number): string {
  const m = ((Math.round(minutes) % DAY) + DAY) % DAY;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export interface RoutineTimes {
  kickoff: string;
  wake: string;
  bed: string;
  snackFrom: string;
  snackTo: string;
}

/** null when no kick-off time is set in the profile. */
export function routineTimes(kickoff: string): RoutineTimes | null {
  const k = parseTime(kickoff);
  if (k === null) return null;
  const wake = k - WAKE_BEFORE_MIN;
  return {
    kickoff: fmtTime(k),
    wake: fmtTime(wake),
    bed: fmtTime(wake - SLEEP_HOURS * 60),
    snackFrom: fmtTime(k - 60),
    snackTo: fmtTime(k - 30),
  };
}

/** The word you say in the reset: "Next" if it's one of your cue words, else your last one. */
export function resetWord(cueWords: string[]): string {
  return cueWords.find((w) => w.trim().toLowerCase() === 'next') ?? cueWords.at(-1) ?? 'Next';
}

export interface ChecklistItem {
  id: string;
  title: string;
  detail: string;
  link?: { label: string; href: string };
}

export function eveningChecklist(p: Profile, t: RoutineTimes | null): ChecklistItem[] {
  return [
    {
      id: 'kit',
      title: 'Kit ready',
      detail: 'Boots or turf shoes, socks, water bottle and a snack by the door. One less thing to think about in the morning.',
    },
    {
      id: 'dinner',
      title: 'A proper dinner',
      detail: 'Carbs (rice, roti, pasta or potatoes) plus some protein. Early game tomorrow, so tonight is your main fuel.',
    },
    {
      id: 'plans',
      title: 'Read your if → then plans',
      detail: p.mind.ifThen.length
        ? `Pick the one you'll use first: ${p.mind.ifThen.map((x) => `"If ${lowerFirst(x.when)} → ${lowerFirst(x.then)}"`).join(' or ')}.`
        : 'Write one in the Mind tab: a situation you can see, and the move you will make.',
      link: { label: 'Your plans', href: '/profile/edit/mind' },
    },
    {
      id: 'visualise',
      title: 'Visualisation (3 minutes)',
      detail: 'In bed, before you sleep. Three game moments with your cue words.',
      link: { label: 'Start', href: '/mind/visualise' },
    },
    {
      id: 'bed',
      title: t ? `Asleep by ${t.bed}` : 'An early night',
      detail: t
        ? `That's ${SLEEP_HOURS} hours before a ${t.wake} wake-up for a ${t.kickoff} kick-off. Phone away 30 minutes before.`
        : 'Aim for 7–8 hours. Set your usual kick-off time in your profile and the app works out a bedtime.',
    },
  ];
}

export function morningChecklist(p: Profile, t: RoutineTimes | null): ChecklistItem[] {
  return [
    {
      id: 'water',
      title: t ? `Water when you wake (${t.wake})` : 'Water when you wake',
      detail: 'A big glass (about 400–500 ml), then sips on the way. You lose water overnight.',
    },
    {
      id: 'snack',
      title: t ? `Small snack, ${t.snackFrom}–${t.snackTo}` : 'Small snack, 30–60 min before',
      detail: 'Something light and easy on the stomach: a banana, a few dates, or toast with honey. Better than playing empty.',
    },
    {
      id: 'activation',
      title: 'Pre-game activation (10 min)',
      detail: 'Touches with your left foot early on: what you touch first, you use later.',
      link: { label: 'Open it', href: '/drills/warmup-pregame' },
    },
    {
      id: 'breathe',
      title: 'Three breaths and your cue words',
      detail: `In for 4, out for 6. Then say them: ${p.mind.cueWords.length ? p.mind.cueWords.map((w) => `"${w}"`).join(', ') : 'add some in the Mind tab'}.`,
    },
    {
      id: 'first',
      title: 'Decide your first action',
      detail: p.mind.ifThen[0]
        ? `First chance: ${lowerFirst(p.mind.ifThen[0].then)}. Win or lose, it counts.`
        : 'First time you face your full-back, go at them. Win or lose, it counts.',
    },
  ];
}

export interface Scene {
  id: string;
  title: string;
  seconds: number;
  text: string;
}

/** A 3-minute script: settle, three game moments, finish. Uses your own words. */
export function visualisationScript(p: Profile): Scene[] {
  const cue = p.mind.cueWords[0] ?? 'Face up';
  const reset = resetWord(p.mind.cueWords);
  const plan = p.mind.ifThen[0];
  const foot = p.dominantFoot === 'left' ? 'left' : 'right';
  return [
    {
      id: 'settle',
      title: 'Settle',
      seconds: 30,
      text: 'Close your eyes. Breathe in for 4, out for 6. Picture the pitch: the turf, the touchline beside you, the early light.',
    },
    {
      id: 'first-ball',
      title: 'The first ball',
      seconds: 50,
      text: `The ball is coming to you out wide. Before it arrives you look over your shoulder, twice. You see where the full-back is. Body open, first touch forward into space. Say it: "${cue}".`,
    },
    {
      id: 'one-v-one',
      title: 'The 1v1',
      seconds: 50,
      text: plan
        ? `If ${lowerFirst(plan.when)}, then ${lowerFirst(plan.then)}. See it happen: the defender's weight shifts, you go, the touch takes you past, and the shot comes off your ${foot} foot.`
        : `The defender stands off you, square-on. You go at them: the shoulder drops, the touch takes you past, and the shot comes off your ${foot} foot.`,
    },
    {
      id: 'after-loss',
      title: 'After losing it',
      seconds: 50,
      text: `You lose the ball. Clap once. Breathe out. "${reset}". Three hard steps back, then turn and show for it, hand out, calling. The ball comes back to you and you take your full-back on again.`,
    },
    {
      id: 'finish',
      title: 'Ready',
      seconds: 15,
      text: 'Open your eyes. You have already done it three times today.',
    },
  ];
}
