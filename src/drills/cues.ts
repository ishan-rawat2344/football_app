/**
 * Cue caller: in session mode, the phone calls these out at random moments
 * (and shows them big on screen, in case the phone is on silent) so you can
 * train reactions and decisions alone.
 */
export interface CueSet {
  words: string[];
  /** Random gap between calls, in seconds. */
  every: [min: number, max: number];
}

export const CUES: Record<string, CueSet> = {
  '1v1-gates-on-call': { words: ['Left', 'Right'], every: [5, 9] },
  'rc-scan-receive': { words: ['Turn', 'Man on'], every: [3, 6] },
  'rc-half-turn-wall': { words: ['Left', 'Right'], every: [4, 7] },
  'wf-left-on-call': { words: ['Now'], every: [5, 10] },
  'bm-box-turns': { words: ['Turn'], every: [3, 7] },
  'df-recovery-run': { words: ['Turn'], every: [8, 15] },
  'df-jockey': { words: ['Left', 'Right', 'Go'], every: [3, 6] },
  'df-press-triggers': {
    words: ['Bad touch', 'Good touch', 'Pass to full-back', 'Back to goal', 'Back to keeper'],
    every: [10, 18],
  },
  'sp-cut-and-go': { words: ['Left', 'Right'], every: [2, 4] },
  'mv-run-in-behind': { words: ['Go'], every: [8, 14] },
  'mv-wide-or-inside': {
    words: ['Ball on the right', 'Our left-back has it', 'Our striker has it', 'Ball lost'],
    every: [8, 14],
  },
};

/** Pick the next cue and when to say it. `rand` is injectable for tests. */
export function nextCue(set: CueSet, last: string | null, rand: () => number = Math.random) {
  // Avoid saying the same word twice in a row when there's a choice.
  const options = set.words.length > 1 ? set.words.filter((w) => w !== last) : set.words;
  const word = options[Math.floor(rand() * options.length)]!;
  const [min, max] = set.every;
  const delayMs = Math.round((min + rand() * (max - min)) * 1000);
  return { word, delayMs };
}
