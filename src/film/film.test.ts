import { describe, expect, it } from 'vitest';
import type { FilmTag } from '../db/types';
import { getDrill } from '../drills/library';
import { weeklyFocus } from '../focus/focus';
import { getLesson } from '../mind/lessons';
import { defaultProfile } from '../profile/meta';
import { filmFocusAreas, patterns, statsFromTags, statsPatch } from './analysis';
import { clock, matchMinute, parseClock, parseStart, parseYouTube, watchLink } from './link';
import { reasonsFor, TAGS, getTag } from './tags';

let seq = 1;
const tag = (kind: FilmTag['kind'], over: Partial<FilmTag> = {}): FilmTag => ({
  id: seq++,
  matchId: 1,
  t: 100 + seq,
  kind,
  createdAt: '2026-11-23T00:00:00Z',
  ...over,
});

describe('YouTube links', () => {
  it('reads every common link format', () => {
    const id = 'dQw4w9WgXcQ';
    expect(parseYouTube(`https://www.youtube.com/watch?v=${id}`)).toEqual({ videoId: id });
    expect(parseYouTube(`https://youtu.be/${id}?t=95`)).toEqual({ videoId: id, start: 95 });
    expect(parseYouTube(`https://m.youtube.com/watch?v=${id}&t=1m5s`)).toEqual({ videoId: id, start: 65 });
    expect(parseYouTube(`https://www.youtube.com/live/${id}?si=abc`)).toEqual({ videoId: id });
    expect(parseYouTube(`https://youtube.com/shorts/${id}`)).toEqual({ videoId: id });
    expect(parseYouTube(`https://www.youtube-nocookie.com/embed/${id}`)).toEqual({ videoId: id });
  });

  it('says no to anything else', () => {
    expect(parseYouTube('https://vimeo.com/12345')).toBeNull();
    expect(parseYouTube('not a link')).toBeNull();
    expect(parseYouTube('https://www.youtube.com/watch?v=short')).toBeNull();
    expect(parseYouTube('')).toBeNull();
  });

  it('handles times', () => {
    expect(parseStart('1h2m3s')).toBe(3723);
    expect(parseStart('nonsense')).toBeUndefined();
    expect(clock(65)).toBe('1:05');
    expect(clock(3725)).toBe('1:02:05');
    expect(parseClock('23:15')).toBe(1395);
    expect(parseClock('1:02:05')).toBe(3725);
    expect(parseClock('abc')).toBeNull();
    expect(matchMinute(200, 100)).toBe("2'");
    expect(matchMinute(50, 100)).toBe('pre');
    expect(matchMinute(65, undefined)).toBe('1:05');
    expect(watchLink('dQw4w9WgXcQ', 61.7)).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=61s');
  });
});

describe('tag content', () => {
  it('every fix points at a real drill or lesson, and problems can become a focus', () => {
    for (const t of TAGS) {
      expect(t.lookFor).toHaveLength(3);
      for (const r of t.reasons) {
        if (r.fix?.drillId) expect(getDrill(r.fix.drillId), `${t.kind}.${r.key}`).toBeDefined();
        if (r.fix?.lessonId) expect(getLesson(r.fix.lessonId), `${t.kind}.${r.key}`).toBeDefined();
        if (r.problem) expect(r.focus, `${t.kind}.${r.key}`).toBeDefined();
        for (const o of r.for ?? []) expect(t.outcomes?.some((x) => x.key === o), `${t.kind}.${r.key}.${o}`).toBe(true);
      }
    }
  });

  it('has the 12 buttons from the plan, 6 on the ball and 6 off it', () => {
    expect(TAGS).toHaveLength(12);
    expect(TAGS.filter((t) => t.group === 'ball')).toHaveLength(6);
  });

  it('shows only the reasons that fit the result', () => {
    const lostReasons = reasonsFor(getTag('oneVOne'), 'lost').map((r) => r.key);
    expect(lostReasons).toContain('slowed');
    expect(lostReasons).not.toContain('shoulderDrop');
    expect(reasonsFor(getTag('oneVOne'), undefined).length).toBe(getTag('oneVOne').reasons.length);
  });

  it('has no personal details in it', () => {
    const PERSONAL = /you said|rate yourself|\d\/10 for|right ankle|sprain|6:30|kvaratskhelia|vin[ií]cius/i;
    expect(JSON.stringify(TAGS)).not.toMatch(PERSONAL);
  });
});

describe('stats from tags', () => {
  it('counts 1v1s, shots, goals and left-foot actions', () => {
    const tags = [
      tag('oneVOne', { outcome: 'won' }),
      tag('oneVOne', { outcome: 'lost' }),
      tag('oneVOne'),
      tag('shot', { outcome: 'goal' }),
      tag('shot', { outcome: 'on' }),
      tag('shot', { outcome: 'off' }),
      tag('leftFoot', { outcome: 'good' }),
      tag('leftFoot'),
      tag('run'),
    ];
    const s = statsFromTags(tags);
    expect(s).toMatchObject({ dribblesAttempted: 3, dribblesWon: 1, shots: 3, shotsOnTarget: 2, goals: 1, leftFootTouches: 2 });
    expect(s.missingOutcome).toBe(3); // a 1v1, a left-foot action and a run
    expect(statsPatch(s)).not.toHaveProperty('keptAsking');
  });

  it("only fills in what you tagged: no left-foot tags doesn't mean zero", () => {
    const patch = statsPatch(statsFromTags([tag('oneVOne', { outcome: 'lost' })]));
    expect(patch).toEqual({ dribblesAttempted: 1, dribblesWon: 0 });
  });

  it('works out whether you kept asking for the ball', () => {
    expect(statsFromTags([tag('lost'), tag('showed')]).keptAsking).toBe('yes');
    expect(statsFromTags([tag('lost'), tag('showed'), tag('quiet')]).keptAsking).toBe('mostly');
    expect(statsFromTags([tag('lost'), tag('quiet'), tag('quiet')]).keptAsking).toBe('no');
    expect(statsFromTags([tag('lost')]).keptAsking).toBeUndefined();
    expect(statsFromTags([tag('run')]).keptAsking).toBeUndefined();
  });
});

describe('patterns and focus', () => {
  const losses = [
    tag('lost', { reasons: ['noScan'] }),
    tag('lost', { reasons: ['noScan', 'closedBody'] }),
    tag('lost', { reasons: ['noScan'], matchId: 2 }),
    tag('lost', { reasons: ['fair'] }),
    tag('oneVOne', { outcome: 'lost', reasons: ['slowed'] }),
  ];

  it('finds problems that keep coming up, not one-offs or non-problems', () => {
    const p = patterns(losses);
    expect(p).toHaveLength(1);
    expect(p[0]).toMatchObject({ count: 3, of: 4, games: 2 });
    expect(p[0]!.text).toBe("3 of 4 times you lost the ball: didn't scan");
    expect(patterns(losses, 1).map((x) => x.reason.key)).toEqual(expect.arrayContaining(['noScan', 'closedBody', 'slowed']));
  });

  it('3 or more becomes a weekly focus area', () => {
    const areas = filmFocusAreas(losses);
    expect(areas).toHaveLength(1);
    expect(areas[0]).toMatchObject({ key: 'film', title: 'Scan before you receive' });
    expect(areas[0]!.why).toContain('your last 2 reviewed games');
  });

  it('only tags from your recent games count towards the week', () => {
    const profile = defaultProfile();
    const match = (id: number, date: string) => ({
      id,
      date,
      dribblesAttempted: 5,
      dribblesWon: 3,
      shots: 4,
      shotsOnTarget: 2,
      leftFootTouches: 6,
      confidence: 7,
    });
    const today = '2026-11-23';
    const recent = weeklyFocus({ matches: [match(1, '2026-11-20'), match(2, '2026-11-18')], profile, ratings: {}, today, filmTags: losses });
    expect(recent.areas.map((a) => a.key)).toContain('film');
    const old = weeklyFocus({ matches: [match(1, '2026-10-01'), match(3, '2026-11-20')], profile, ratings: {}, today, filmTags: losses });
    expect(old.areas.map((a) => a.key)).not.toContain('film');
  });
});
