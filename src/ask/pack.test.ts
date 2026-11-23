import { describe, expect, it } from 'vitest';
import type { Profile } from '../db/types';
import { defaultProfile } from '../profile/meta';
import { buildPack, SECTIONS, TOPICS, type PackData, type Section } from './pack';

const T = '2026-11-17';
const ALL = new Set<Section>(SECTIONS.map((s) => s.key));

function data(over: Partial<PackData> = {}): PackData {
  const profile: Profile = {
    ...defaultProfile(),
    name: 'Sam Example',
    age: 25,
    country: 'Testland',
    game: { level: 'Casual', format: '7-a-side', surface: 'turf', teamShape: '', matchMinutes: 60, minutesPlayed: 50 },
    health: [
      {
        id: 'h1',
        title: 'Old ankle knock',
        areas: ['ankleLeft'],
        status: 'monitor',
        amberAt: 3,
        since: 'spring',
        notes: 'cleared',
        rules: 'no hard cutting when sore',
      },
    ],
    mind: { strengths: ['work rate'], problemMoment: '', afterMistake: '', drivers: '', cueWords: ['Go'], ifThen: [{ id: 'a', when: 'I lose it', then: 'I clap and show again' }] },
  };
  return {
    today: T,
    profile,
    ratings: [
      { date: '2026-10-01', ratings: { weakFoot: 2, pace: 7 } },
      { date: '2026-11-01', ratings: { weakFoot: 3, pace: 7 } },
    ],
    logs: [
      { date: '2026-11-15', status: 'done', sessionType: 'home', minutes: 25, rpe: 5, drillRatings: { 'bm-juggling-ladder': 'hard' } },
      { date: '2026-10-01', status: 'done', sessionType: 'home', minutes: 25, rpe: 5 },
    ],
    pain: [{ date: '2026-11-14', area: 'ankleLeft', score: 3, when: 'after' }],
    matches: [
      { date: '2026-11-16', minutes: 50, goals: 1, dribblesAttempted: 4, dribblesWon: 2, shots: 3, shotsOnTarget: 1, leftFootTouches: 2, wentWell: 'pressing' },
      { date: '2026-11-12', minutes: 50, goals: 0, wentWell: 'older game note' },
    ],
    tests: [
      { testId: 'sprint-30', date: '2026-10-20', value: 4.6 },
      { testId: 'sprint-30', date: '2026-11-17', value: 4.4 },
    ],
    ...over,
  };
}

describe('Ask Claude pack', () => {
  it('starts with the coaching brief and your question', () => {
    const text = buildPack(data(), { topic: 'week', question: 'Should I add a third ground session?', include: ALL });
    expect(text).toMatch(/^You're my football coach/);
    expect(text).toContain(TOPICS.find((t) => t.key === 'week')!.ask);
    expect(text).toContain('Should I add a third ground session?');
    expect(text).toMatch(/Don't diagnose injuries/);
  });

  it('includes your data, but never your name', () => {
    const text = buildPack(data(), { topic: 'game', include: ALL });
    expect(text).not.toContain('Sam Example');
    expect(text).toContain('25 years old');
    expect(text).toContain('Weak foot: 3 (+1 since');
    expect(text).toMatch(/1v1s 2\/4 won/);
    expect(text).toContain('pressing');
    expect(text).toContain('Old ankle knock');
    expect(text).toMatch(/Left ankle 3\/10 after training/);
    expect(text).toMatch(/4\.40 s on .*best 4\.40 s, first 4\.60 s/);
    expect(text).toContain('If I lose it, then I clap and show again');
    // only the last 2 weeks of training
    expect(text).toMatch(/Home session \(done, 25 min, effort 5\/10/);
    expect(text).toMatch(/too hard/);
    expect(text.match(/Home session \(/g)).toHaveLength(1);
  });

  it('leaves out what you switch off', () => {
    const include = new Set<Section>(['about', 'games']);
    const text = buildPack(data(), { topic: 'other', question: 'Hi', include });
    expect(text).not.toContain('Old ankle knock');
    expect(text).not.toContain('Pain I logged');
    expect(text).not.toContain('skill ratings');
    expect(text).toContain('Recent games');
  });

  it('works with a blank profile and no data, without "undefined" or "null"', () => {
    const blank: PackData = { today: T, profile: defaultProfile(), ratings: [], logs: [], pain: [], matches: [], tests: [] };
    for (const t of TOPICS) {
      const text = buildPack(blank, { topic: t.key, include: ALL });
      expect(text, t.key).not.toMatch(/undefined|null|NaN/);
      expect(text, t.key).toContain('## My question');
    }
  });
});

describe('Ask Claude pack: Film room', () => {
  it('lists the tagged moments of the latest game with minutes, results, reasons and notes', () => {
    const d = data();
    d.matches[0] = { ...d.matches[0]!, id: 7, filmKickoff: 60, recordingUrl: 'https://youtu.be/dQw4w9WgXcQ' };
    d.film = [
      { matchId: 7, t: 660, kind: 'lost', reasons: ['noScan'], createdAt: '' },
      { matchId: 7, t: 300, kind: 'oneVOne', outcome: 'lost', reasons: ['slowed'], note: 'should have gone outside', createdAt: '' },
      { matchId: 7, t: 900, kind: 'lost', reasons: ['noScan'], createdAt: '' },
      { matchId: 99, t: 10, kind: 'shot', createdAt: '' },
    ];
    const text = buildPack(d, { topic: 'game', include: ALL });
    expect(text).toContain('Film room: 3 moments I tagged');
    expect(text).toContain("5' (video 5:00): 1v1: lost, because: slowed down before the move. My note: \"should have gone outside\"");
    expect(text).toContain("Pattern: 2 of 2 times you lost the ball: didn't scan");
    expect(text.indexOf("5' (video")).toBeLessThan(text.indexOf("11' (video"));
    expect(text).not.toContain('video 0:10');
  });
});
