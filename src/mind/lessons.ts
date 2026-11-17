/**
 * Short lessons for real winger moments. Each one: the situation, what's
 * going on (the sport-psychology idea behind it, named honestly), three
 * things to do, and something to try this week. No motivational quotes.
 */
export interface Lesson {
  id: string;
  title: string;
  minutes: number;
  /** The moment in a game this is about. */
  situation: string;
  /** What's actually happening, in plain words. */
  whatsGoingOn: string[];
  doThis: [string, string, string];
  tryThisWeek: string;
  /** Drill or app screen to practise it. */
  practice?: { label: string; href: string };
  /** The idea it's based on, so you can look it up. */
  basedOn: string;
  /** Weekly-focus keys this lesson helps with. */
  helpsWith: string[];
}

export const LESSONS: Lesson[] = [
  {
    id: 'losing-the-ball',
    title: 'Losing the ball is part of the job',
    minutes: 2,
    situation:
      'You take on the full-back, lose it, and a voice says: "Don\'t try that again."',
    whatsGoingOn: [
      "Wingers lose the ball more than almost anyone, because the job is to take risks in the final third. Even the best dribblers in the world lose a big share of their take-ons. A winger who never loses the ball usually never creates anything either.",
      "Whether a 1v1 works depends on things you don't control: the defender, the bounce, a teammate's run. Whether you try it is fully yours. Judging yourself on the attempt (the process) instead of the result (the outcome) keeps you trying, and trying is where the goals come from.",
    ],
    doThis: [
      'Count attempts, not wins. Your minimum is set in your profile; the match log tracks it.',
      'After a lost 1v1, take the next good chance to go again. The second attempt matters more than the first.',
      'Tell yourself the truth: "That was one attempt. Good." Then move on.',
    ],
    tryThisWeek: 'In your next game, log your 1v1 attempts honestly, including the ones that failed.',
    practice: { label: '1v1 against a passive defender', href: '/drills/1v1-passive-defender' },
    basedOn: 'Process goals versus outcome goals.',
    helpsWith: ['attempts', 'dribbleSuccess', 'confidence'],
  },
  {
    id: 'blank-mind',
    title: 'When your mind goes blank on the ball',
    minutes: 3,
    situation: 'The ball arrives and nothing comes, so you play it back or sideways, fast.',
    whatsGoingOn: [
      "The blank is mostly an information problem, not a confidence problem. If you haven't looked around before the ball arrives, your brain has nothing to choose from at the exact moment it needs to choose. Under pressure it takes the safest exit.",
      'Players who scan (quick looks over the shoulder) more often before receiving tend to play forward more. Under pressure your attention narrows; a picture you loaded before the ball came, and a plan you decided earlier, are what survive.',
    ],
    doThis: [
      'Two looks before every ball: one over each shoulder while the pass is travelling.',
      'Know your first option before it arrives: "If they stand off, turn. If they\'re tight, set it and spin."',
      'Use one cue word to fire the action, for example "Face up".',
    ],
    tryThisWeek: 'Do "Scan, receive, go" at home with the cue caller on. Count your looks.',
    practice: { label: 'Scan, receive, go', href: '/drills/rc-scan-receive' },
    basedOn: 'Visual exploration (scanning) and attentional narrowing under pressure.',
    helpsWith: ['involvement', 'confidence', 'attempts'],
  },
  {
    id: 'if-then',
    title: 'Decide before the game: if → then plans',
    minutes: 2,
    situation: "You can do the step-over in training, but in a game it never comes out.",
    whatsGoingOn: [
      "Under pressure there's no time to choose between five moves. Linking a situation to an action in advance (\"If X happens, then I do Y\") makes the action fire automatically when the situation shows up.",
      'This is called an implementation intention. It is one of the best-supported tools for turning what you mean to do into what you actually do.',
    ],
    doThis: [
      'Keep two plans at most, written in your own words.',
      'Make the "if" something you can see: the defender square-on, the ball on the other wing, a bad touch from the full-back.',
      'Rehearse them in training and in your pre-match visualisation, so they are familiar on the day.',
    ],
    tryThisWeek: 'Read your plans in the Mind tab the night before your next game, and use one in the first 10 minutes.',
    practice: { label: 'Gates on the call', href: '/drills/1v1-gates-on-call' },
    basedOn: 'Implementation intentions.',
    helpsWith: ['attempts', 'confidence'],
  },
  {
    id: 'reset',
    title: 'The reset: three seconds after a mistake',
    minutes: 2,
    situation: 'You lose it, the attack breaks the other way, and you feel the urge to hide.',
    whatsGoingOn: [
      'After a mistake, attention turns inward: replaying it, wondering what people think. A short physical routine moves your attention back outward, to the next action.',
      "It works because it's the same every time and needs no thinking. Performers in many sports use this kind of refocusing routine between points, shots and plays.",
    ],
    doThis: [
      'Physical cue: one clap, or wipe your hands on your shorts.',
      'One long breath out, and say your reset word.',
      'Next action within 5 seconds: press, recover, or show for the ball.',
    ],
    tryThisWeek: 'Practise the reset in the "Show again" drill until it feels automatic, then use it in your next game.',
    practice: { label: 'Show again: the 5-second rule', href: '/drills/mv-show-again' },
    basedOn: 'Refocusing routines and attentional control.',
    helpsWith: ['afterLoss', 'confidence'],
  },
  {
    id: 'spotlight',
    title: 'What are they thinking of me?',
    minutes: 2,
    situation: 'You\'re about to try the risky pass and think: "If this goes wrong, they\'ll think I\'m useless."',
    whatsGoingOn: [
      'People overestimate how much others notice their mistakes. In experiments, people guessed that far more others had noticed something embarrassing than actually had. This is called the spotlight effect.',
      "In a game, your teammates are busy with their own jobs. Most won't remember your lost ball by the next attack. What they do remember is who keeps asking for it, and who makes things happen.",
    ],
    doThis: [
      'When the thought comes, name it ("spotlight") and switch to your next action.',
      'Judge your game by your own targets (attempts, left-foot actions), not by opinions you imagine.',
      "After a game, ask a teammate what they noticed. It's usually far less than you think.",
    ],
    tryThisWeek: 'Each time you catch the "what will they think" thought in a game, take on your full-back the next time you can.',
    basedOn: 'The spotlight effect.',
    helpsWith: ['confidence', 'attempts', 'afterLoss'],
  },
  {
    id: 'body-language',
    title: 'Body language after a mistake',
    minutes: 2,
    situation: 'Head down, hands on hips, a slow jog back.',
    whatsGoingOn: [
      'Body language speaks to three audiences: your teammates (who decide whether to pass to you again), your opponent (who senses a target), and you.',
      'A slumped body tends to go with slumped thinking. Chest up and a hand out tell everyone, including you, that you are still in the game.',
    ],
    doThis: [
      'Chest up and eyes up within two seconds of a mistake.',
      'Hand out: show for the next ball.',
      'Sprint the first three steps of your recovery run, even if you jog after that.',
    ],
    tryThisWeek: "Ask your partner, or check the recording, for how you look in the 10 seconds after you lose the ball.",
    basedOn: 'Nonverbal behaviour in sport.',
    helpsWith: ['afterLoss', 'confidence'],
  },
  {
    id: 'demand-the-ball',
    title: 'Demanding the ball',
    minutes: 2,
    situation: "You're free, but nobody passes to you.",
    whatsGoingOn: [
      'Teammates pass to players they notice and trust. A free winger who stays silent is invisible, especially in fast small-sided games.',
      'Short, clear calls help the passer decide quickly. So does being where they can see you.',
    ],
    doThis: [
      "Get into the passer's eyeline and point where you want it: to feet, or into the space ahead of you.",
      'Use short calls: "Yes!", "Line!" (down the line), "Feet!". Call "Man on!" and "Turn!" for others too.',
      'After you pass, move and ask again.',
    ],
    tryThisWeek: 'Set yourself to call for the ball at least 10 times in your next game. Count roughly.',
    practice: { label: 'Check short, spin long', href: '/drills/mv-check-spin' },
    basedOn: 'Communication and coordination in team sport.',
    helpsWith: ['involvement', 'afterLoss'],
  },
  {
    id: 'criticism',
    title: 'When a teammate has a go at you',
    minutes: 1,
    situation: '"Pass it!" "Stay wide!" shouted at you after a move breaks down.',
    whatsGoingOn: [
      'There is often one useful piece of information inside a shout. The tone is a separate thing.',
      "Arguing in the moment rarely helps. Your next action answers it better than words.",
    ],
    doThis: [
      'Ask yourself: is there one thing to change? If yes, do it.',
      'Take the note, drop the tone.',
      'If it keeps happening, talk after the game: "What did you want me to do there?"',
    ],
    tryThisWeek: 'After your next game, write in the match log one thing a teammate said that was actually useful.',
    basedOn: 'Feedback processing and emotional regulation.',
    helpsWith: ['confidence'],
  },
  {
    id: 'confidence-evidence',
    title: 'Confidence comes from evidence',
    minutes: 2,
    situation: "You feel confident in training but not when it matters.",
    whatsGoingOn: [
      "Confidence that lasts comes mostly from your own experience of doing the thing successfully (mastery experiences), not from pep talks.",
      "That's why the logs matter. Every attempt, personal best and target hit is evidence. Rehearsing the exact game moments in training means that on game day you have done it before.",
    ],
    doThis: [
      'Before a game, read your recent wins on the Progress tab: targets hit, personal bests.',
      'Keep targets small enough to hit (like 3 attempts). Hitting them builds belief.',
      'In training, practise the exact moments from your games, not just tricks.',
    ],
    tryThisWeek: 'The night before your next game, look at your Personal bests and pick one to remember on the way to the pitch.',
    practice: { label: 'Your progress', href: '/progress' },
    basedOn: 'Self-efficacy theory (mastery experiences).',
    helpsWith: ['confidence'],
  },
  {
    id: 'nerves',
    title: 'Nerves: turn them into energy',
    minutes: 1,
    situation: 'Heart racing in the warm-up, legs a bit shaky.',
    whatsGoingOn: [
      "A racing heart before a game is your body getting ready to perform. It isn't a sign that something is wrong.",
      'Telling yourself "I\'m excited" tends to work better than "calm down", because it relabels the same feeling as useful. If it\'s too much, slow breathing with a longer breath out than in brings it down.',
    ],
    doThis: [
      'Three breaths: in for 4, out for 6.',
      'Say "This is energy."',
      'Make your first action simple and early: a touch, a pass, a sprint.',
    ],
    tryThisWeek: 'Use the three breaths at the end of your pre-game activation, before the first whistle.',
    practice: { label: 'Pre-game activation', href: '/drills/warmup-pregame' },
    basedOn: 'Arousal reappraisal and paced breathing.',
    helpsWith: ['confidence'],
  },
];

const BY_ID = new Map(LESSONS.map((l) => [l.id, l]));
export const getLesson = (id: string) => BY_ID.get(id);

/** Lessons that help with this week's focus areas, most relevant first. */
export function lessonsFor(focusKeys: string[]): Lesson[] {
  return LESSONS.filter((l) => l.helpsWith.some((k) => focusKeys.includes(k)))
    .map((l) => ({ l, hits: l.helpsWith.filter((k) => focusKeys.includes(k)).length }))
    .sort((a, b) => b.hits - a.hits)
    .map((x) => x.l);
}
