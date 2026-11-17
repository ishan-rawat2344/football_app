import { describe, expect, it } from 'vitest';
import type { HealthFlag } from '../db/types';
import { SKILL_KEYS } from '../profile/meta';
import { CATEGORIES } from './meta';
import { DRILLS, getDrill } from './library';
import { healthWarnings, priorityScore, weakSkillsHit } from './personal';
import { LOAD_TAG_AREAS } from './types';

/** Words that mean the text is gendering a player we haven't been told about. */
const GENDERED = /\b(he|him|his|she|her|hers)\b/i;

describe('drill library content', () => {
  it('has a solid library', () => {
    expect(DRILLS.length).toBeGreaterThanOrEqual(45);
  });

  it('has unique ids', () => {
    const ids = DRILLS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('covers every category', () => {
    for (const c of CATEGORIES) {
      expect(DRILLS.some((d) => d.category === c.key), c.key).toBe(true);
    }
  });

  it.each(DRILLS.map((d) => [d.id, d] as const))('%s is written in full coach format', (_id, d) => {
    expect(d.name.length).toBeGreaterThan(3);
    expect(d.purpose.length).toBeGreaterThan(60);
    expect(d.setup.length).toBeGreaterThan(15);
    expect(d.steps.length).toBeGreaterThanOrEqual(2);
    expect(d.coachingPoints).toHaveLength(3);
    expect(d.mistakes.length).toBeGreaterThanOrEqual(2);
    expect(d.easier.length).toBeGreaterThan(5);
    expect(d.harder.length).toBeGreaterThan(5);
    expect(d.locations.length).toBeGreaterThan(0);
    expect(d.blocks.length).toBeGreaterThan(0);
    expect(d.durationMin).toBeGreaterThan(0);
    expect(d.dose.sets).toBeGreaterThan(0);
    expect(d.dose.restSec).toBeGreaterThanOrEqual(0);
    expect(d.videoQueries.length).toBeGreaterThan(0);
    for (const s of d.skills) expect(SKILL_KEYS).toContain(s);
    if (d.category !== 'warmup' && d.category !== 'cooldown') {
      expect(d.skills.length, 'non-warm-up drills must train a skill').toBeGreaterThan(0);
    }
    if (d.mode === 'partner') expect(d.partner, 'partner drills explain the partner role').toBeTruthy();
  });

  it('keeps kicking, sprinting and jumping out of the small room', () => {
    for (const d of DRILLS.filter((x) => x.locations.includes('room'))) {
      const noisy = d.loadTags.filter((t) => t === 'kicking' || t === 'sprint' || t === 'plyometric');
      expect(noisy, d.id).toEqual([]);
    }
  });

  it('gives every high-risk drill a safety note', () => {
    for (const d of DRILLS) {
      const risky =
        d.loadTags.includes('adductor') && d.intensity !== 'low'
          ? true
          : d.loadTags.includes('hamstring') || d.loadTags.includes('plyometric');
      if (risky) expect(d.safety, d.id).toBeTruthy();
    }
  });

  it('never genders the player or the defender', () => {
    for (const d of DRILLS) {
      const text = [
        d.name,
        d.purpose,
        d.setup,
        ...d.steps,
        ...d.coachingPoints,
        ...d.mistakes,
        d.easier,
        d.harder,
        d.partner ?? '',
        d.safety ?? '',
      ].join(' ');
      expect(text, d.id).not.toMatch(GENDERED);
    }
  });

  it('contains nothing personal (the repo is public; your data stays on your phone)', () => {
    // Personal context is added at runtime from the profile on the phone,
    // e.g. your ratings on skill chips and warnings from your health notes.
    const PERSONAL =
      /you said|you rate|rate yourself|is your \d|an \d+\/10|\d\/10 for|your right ankle|right ankle sprain|you sprained|your sprained|6:30|kvaratskhelia|vin[ií]cius|doesn't come to mind\\"/i;
    for (const d of DRILLS) {
      const text = JSON.stringify(d);
      expect(text, d.id).not.toMatch(PERSONAL);
    }
  });

  it('covers every left-winger topic asked for', () => {
    const has = (id: string) => expect(getDrill(id), id).toBeDefined();
    // 1v1 outside on the left foot, and cutting inside onto the right
    has('1v1-outside-burst');
    has('1v1-shoulder-drop');
    has('1v1-change-of-pace');
    // receiving on the half-turn, back to goal near the line
    has('rc-half-turn-wall');
    has('rc-back-to-goal');
    // crossing: early, whipped, cutback, on the run
    has('cr-early-cross');
    has('cr-whipped-inswinger');
    has('cr-cutback');
    // finishing: cut in far post, back post
    has('fn-cut-in-far-post');
    has('fn-back-post-run');
    // movement and defending
    has('mv-run-in-behind');
    has('mv-wide-or-inside');
    has('df-recovery-run');
    has('df-press-triggers');
    has('df-jockey');
    // physical and prevention
    has('sp-acceleration');
    has('sp-flying-20');
    has('sp-cut-and-go');
    has('sp-repeated-sprints');
    has('ip-nordic');
    has('ip-copenhagen');
    has('ip-ankle-strength');
  });
});

describe('personal priority', () => {
  const ratings = { weakFoot: 2, firstTouch: 4, pace: 8, defending: 8, offBallMovement: 3 };

  it('ranks weak-foot work above pace work for this player', () => {
    const weak = getDrill('wf-wall-passes')!;
    const pace = getDrill('sp-flying-20')!;
    expect(priorityScore(weak, ratings)).toBeGreaterThan(priorityScore(pace, ratings));
  });

  it('lists which weak skills a drill hits', () => {
    expect(weakSkillsHit(getDrill('wf-wall-passes')!, ratings)).toEqual(['weakFoot', 'firstTouch']);
    expect(weakSkillsHit(getDrill('sp-flying-20')!, ratings)).toEqual([]);
  });
});

describe('health warnings', () => {
  const groin: HealthFlag = {
    id: 'g',
    title: 'Groin pain, both sides',
    areas: ['groinLeft', 'groinRight'],
    status: 'active',
    amberAt: 3,
    since: '',
    notes: '',
    rules: '',
  };
  const ankle: HealthFlag = { ...groin, id: 'a', title: 'Right ankle', areas: ['ankleRight'], status: 'monitor' };

  it('stops-level warning for an active groin on the Copenhagen plank', () => {
    const w = healthWarnings(getDrill('ip-copenhagen')!, [groin]);
    expect(w).toHaveLength(1);
    expect(w[0]?.level).toBe('stop');
    expect(w[0]?.message).toContain('3/10');
  });

  it('only a caution for light drills, even with an active note (the squeeze is groin rehab)', () => {
    const w = healthWarnings(getDrill('ip-adductor-squeeze')!, [groin]);
    expect(w[0]?.level).toBe('caution');
    expect(w[0]?.message).toContain('is active');
  });

  it('caution-level warning for a monitored ankle on cutting drills', () => {
    const w = healthWarnings(getDrill('sp-cut-and-go')!, [ankle]);
    expect(w[0]?.level).toBe('caution');
  });

  it('no warning when the drill does not load the area', () => {
    expect(healthWarnings(getDrill('wf-wall-passes')!, [groin, ankle])).toEqual([]);
  });

  it('ignores resolved notes and notes without areas', () => {
    expect(healthWarnings(getDrill('ip-copenhagen')!, [{ ...groin, status: 'resolved' }])).toEqual([]);
    expect(healthWarnings(getDrill('ip-copenhagen')!, [{ ...groin, areas: [] }])).toEqual([]);
  });

  it('maps every load tag to at least one body area', () => {
    for (const areas of Object.values(LOAD_TAG_AREAS)) expect(areas.length).toBeGreaterThan(0);
  });
});

describe('describeAreas', () => {
  it('reads naturally', async () => {
    const { describeAreas } = await import('./personal');
    expect(describeAreas(['groinLeft', 'groinRight'])).toBe('groin (both sides)');
    expect(describeAreas(['ankleRight'])).toBe('right ankle');
    expect(describeAreas(['ankleRight', 'kneeLeft'])).toBe('right ankle and left knee');
  });
});
