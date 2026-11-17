import { describe, expect, it } from 'vitest';
import { getDrill } from '../drills/library';
import { defaultProfile } from '../profile/meta';
import { LESSONS, lessonsFor } from './lessons';
import { eveningChecklist, fmtTime, morningChecklist, resetWord, routineTimes, visualisationScript } from './routine';

const GENDERED = /\b(he|him|his|she|her|hers)\b/i;

describe('lessons', () => {
  it('are complete and practical', () => {
    expect(LESSONS.length).toBeGreaterThanOrEqual(10);
    expect(new Set(LESSONS.map((l) => l.id)).size).toBe(LESSONS.length);
    for (const l of LESSONS) {
      expect(l.situation.length, l.id).toBeGreaterThan(20);
      expect(l.whatsGoingOn.length, l.id).toBeGreaterThanOrEqual(2);
      expect(l.doThis).toHaveLength(3);
      expect(l.basedOn.length, l.id).toBeGreaterThan(5);
      expect(l.helpsWith.length, l.id).toBeGreaterThan(0);
    }
  });

  it('link only to drills that exist', () => {
    for (const l of LESSONS) {
      const href = l.practice?.href;
      if (href?.startsWith('/drills/')) expect(getDrill(href.slice('/drills/'.length)), l.id).toBeDefined();
    }
  });

  it('never gender anyone and never use motivational quotes', () => {
    for (const l of LESSONS) {
      const text = JSON.stringify(l);
      expect(text, l.id).not.toMatch(GENDERED);
      expect(text, l.id).not.toMatch(/never give up|believe in yourself|no pain,? no gain|champions are made/i);
    }
  });

  it('lessons are matched to this week\'s focus', () => {
    expect(lessonsFor(['afterLoss'])[0]!.id).toBe('reset');
    expect(lessonsFor(['attempts']).map((l) => l.id)).toContain('losing-the-ball');
  });
});

describe('pre-match routine', () => {
  it('works out bedtime and snack window from kick-off, across midnight', () => {
    expect(routineTimes('06:30')).toEqual({ kickoff: '06:30', wake: '05:30', bed: '22:00', snackFrom: '05:30', snackTo: '06:00' });
    expect(routineTimes('19:00')?.bed).toBe('10:30');
    expect(routineTimes('')).toBeNull();
    expect(fmtTime(-30)).toBe('23:30');
  });

  it('checklists use your own plans and cue words', () => {
    const p = defaultProfile();
    p.mind.cueWords = ['Scan', 'Next'];
    p.mind.ifThen = [{ id: 'a', when: 'The defender stands off', then: 'Go inside' }];
    const t = routineTimes('06:30');
    expect(eveningChecklist(p, t).find((i) => i.id === 'bed')!.title).toBe('Asleep by 22:00');
    expect(eveningChecklist(p, t).find((i) => i.id === 'plans')!.detail).toContain('If the defender stands off → go inside');
    expect(morningChecklist(p, t).find((i) => i.id === 'breathe')!.detail).toContain('"Scan", "Next"');
    expect(morningChecklist(p, null).find((i) => i.id === 'snack')!.title).toBe('Small snack, 30–60 min before');
  });

  it('picks the reset word', () => {
    expect(resetWord(['Scan', 'Next'])).toBe('Next');
    expect(resetWord(['Scan', 'Go'])).toBe('Go');
    expect(resetWord([])).toBe('Next');
  });
});

describe('visualisation', () => {
  it('is about 3 minutes and uses your plan, cue word and stronger foot', () => {
    const p = defaultProfile();
    p.dominantFoot = 'left';
    p.mind.cueWords = ['Eyes up'];
    p.mind.ifThen = [{ id: 'a', when: 'They show me inside', then: 'Go down the line' }];
    const s = visualisationScript(p);
    const total = s.reduce((t, x) => t + x.seconds, 0);
    expect(total).toBeGreaterThanOrEqual(150);
    expect(total).toBeLessThanOrEqual(240);
    const text = s.map((x) => x.text).join(' ');
    expect(text).toContain('"Eyes up"');
    expect(text).toContain('if they show me inside, then go down the line'.replace(/^if/, 'If'));
    expect(text).toContain('left foot');
    expect(text).not.toMatch(GENDERED);
  });
});

describe('lowerFirst', () => {
  it('keeps "I" and acronyms, lowers everything else', async () => {
    const { lowerFirst } = await import('../lib/format');
    expect(lowerFirst('I lose the ball')).toBe('I lose the ball');
    expect(lowerFirst("I'm tired")).toBe("I'm tired");
    expect(lowerFirst('The defender stands off')).toBe('the defender stands off');
    expect(lowerFirst('Drop the shoulder')).toBe('drop the shoulder');
  });
});
