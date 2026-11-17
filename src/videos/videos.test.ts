import { describe, expect, it } from 'vitest';
import type { ChannelPref, VideoFeedback } from '../db/types';
import { formatDuration } from '../components/VideoList';
import type { FocusArea } from '../focus/focus';
import { focusQueries } from './queries';
import { excludeReason, lengthFit, rankVideos } from './rank';
import { pacificDate, quotaResetsAt } from './store';
import { parseDuration, searchVideos, testKey, videoDetails, YouTubeError, type VideoDetails } from './youtube';

const NOW = new Date('2026-11-17T00:00:00Z');
const v = (id: string, over: Partial<VideoDetails> = {}): VideoDetails => ({
  videoId: id,
  title: 'How to beat a full back 1v1 | winger tutorial',
  channelId: 'ch-' + id,
  channelTitle: 'Coach ' + id,
  publishedAt: '2025-06-01T00:00:00Z',
  durationSec: 6 * 60,
  views: 200_000,
  likes: 8_000,
  lang: 'en',
  embeddable: true,
  isLive: false,
  ...over,
});
const none = { feedback: new Map<string, VideoFeedback>(), channels: new Map<string, ChannelPref>() };

describe('durations', () => {
  it('parses ISO 8601', () => {
    expect(parseDuration('PT4M13S')).toBe(253);
    expect(parseDuration('PT1H2M')).toBe(3720);
    expect(parseDuration('PT45S')).toBe(45);
    expect(parseDuration('P0D')).toBe(0);
    expect(parseDuration('nonsense')).toBe(0);
  });

  it('prefers 3–12 minute videos for drills', () => {
    expect(lengthFit(5 * 60)).toBe(1);
    expect(lengthFit(2 * 60)).toBe(0.6);
    expect(lengthFit(15 * 60)).toBe(0.5);
    expect(lengthFit(30 * 60)).toBe(0);
  });
});

describe('filters', () => {
  const ok = { lang: 'en' };
  it('drops Shorts, long videos, live streams and non-embeddable videos', () => {
    expect(excludeReason(v('a', { durationSec: 45 }), ok)).toBe('tooShort');
    expect(excludeReason(v('a', { durationSec: 45 * 60 }), ok)).toBe('tooLong');
    expect(excludeReason(v('a', { isLive: true }), ok)).toBe('live');
    expect(excludeReason(v('a', { embeddable: false }), ok)).toBe('notEmbeddable');
  });

  it('drops highlight reels and compilations, but not tutorials that mention them', () => {
    expect(excludeReason(v('a', { title: 'Best winger skills 2025 | Highlights' }), ok)).toBe('notTutorial');
    expect(excludeReason(v('a', { title: 'Top 10 goals of the season' }), ok)).toBe('notTutorial');
    expect(excludeReason(v('a', { title: 'Team A vs Team B extended' }), ok)).toBe('notTutorial');
    expect(excludeReason(v('a', { title: 'Cut inside and shoot #shorts' }), ok)).toBe('notTutorial');
    expect(excludeReason(v('a', { title: 'How to score like the highlights: finishing drill' }), ok)).toBeNull();
  });

  it('respects language only when the uploader set one', () => {
    expect(excludeReason(v('a', { lang: 'es' }), ok)).toBe('language');
    expect(excludeReason(v('a', { lang: 'en-GB' }), ok)).toBeNull();
    expect(excludeReason(v('a', { lang: undefined }), ok)).toBeNull();
  });

  it('respects hidden videos and blocked channels', () => {
    expect(excludeReason(v('a'), { ...ok, feedback: { videoId: 'a', hidden: true, updatedAt: '' } })).toBe('hidden');
    expect(excludeReason(v('a'), { ...ok, channel: { channelId: 'ch-a', blocked: true, affinity: 0 } })).toBe('blockedChannel');
  });
});

describe('ranking', () => {
  const hits = ['a', 'b', 'c'].map((id, rank) => ({ videoId: id, rank }));

  it("keeps YouTube's relevance order when everything else is equal", () => {
    const r = rankVideos({ hits, details: ['a', 'b', 'c'].map((id) => v(id)), ...none, now: NOW });
    expect(r.map((x) => x.video.videoId)).toEqual(['a', 'b', 'c']);
  });

  it('a trusted channel and liked channels move up; a disliked channel moves down', () => {
    const channels = new Map<string, ChannelPref>([
      ['ch-c', { channelId: 'ch-c', trusted: true, affinity: 0 }],
      ['ch-a', { channelId: 'ch-a', affinity: -2 }],
    ]);
    const r = rankVideos({ hits, details: ['a', 'b', 'c'].map((id) => v(id)), feedback: new Map(), channels, now: NOW });
    expect(r[0]!.video.videoId).toBe('c');
    expect(r[0]!.tags).toContain('Trusted channel');
    expect(r.at(-1)!.video.videoId).toBe('a');
  });

  it('excluded videos never appear and missing details are skipped', () => {
    const r = rankVideos({ hits, details: [v('a', { durationSec: 30 }), v('b')], ...none, now: NOW });
    expect(r.map((x) => x.video.videoId)).toEqual(['b']);
  });
});

describe('API client', () => {
  const fake = (status: number, body: unknown) =>
    (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

  it('parses search results in order', async () => {
    const hits = await searchVideos('q', 'k', {}, fake(200, { items: [{ id: { videoId: 'x' } }, { id: {} }, { id: { videoId: 'y' } }] }));
    expect(hits).toEqual([
      { videoId: 'x', rank: 0 },
      { videoId: 'y', rank: 2 },
    ]);
  });

  it('parses video details', async () => {
    const [d] = await videoDetails(
      ['x'],
      'k',
      fake(200, {
        items: [
          {
            id: 'x',
            snippet: { title: 'T', channelId: 'c', channelTitle: 'C', publishedAt: '2026-01-01T00:00:00Z', defaultAudioLanguage: 'en' },
            contentDetails: { duration: 'PT5M' },
            statistics: { viewCount: '1000', likeCount: '50' },
            status: { embeddable: true },
          },
        ],
      }),
    );
    expect(d).toMatchObject({ videoId: 'x', durationSec: 300, views: 1000, likes: 50, lang: 'en', embeddable: true });
  });

  it('turns API errors into readable messages', async () => {
    const quota = fake(403, { error: { errors: [{ reason: 'quotaExceeded' }], message: 'x' } });
    await expect(searchVideos('q', 'k', {}, quota)).rejects.toMatchObject({ kind: 'quota' });
    const bad = fake(400, { error: { errors: [{ reason: 'keyInvalid' }], message: 'API key not valid' } });
    await expect(testKey('k', bad)).rejects.toMatchObject({ kind: 'badKey' });
    const off = fake(403, { error: { errors: [{ reason: 'accessNotConfigured' }], message: 'has not been used' } });
    await expect(testKey('k', off)).rejects.toMatchObject({ kind: 'notEnabled' });
    const ref = fake(403, { error: { errors: [{ reason: 'forbidden' }], message: 'Requests from referer are blocked.' } });
    await expect(testKey('k', ref)).rejects.toMatchObject({ kind: 'referrer' });
    const offline = (async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;
    await expect(testKey('k', offline)).rejects.toBeInstanceOf(YouTubeError);
  });
});

describe('daily search allowance', () => {
  it('counts days in US Pacific time, like YouTube', () => {
    // 07:59 UTC is still the previous day in California (UTC−8 in November)
    expect(pacificDate(new Date('2026-11-17T07:59:00Z'))).toBe('2026-11-16');
    expect(pacificDate(new Date('2026-11-17T08:01:00Z'))).toBe('2026-11-17');
    // summer time (UTC−7)
    expect(pacificDate(new Date('2026-07-01T06:59:00Z'))).toBe('2026-06-30');
    expect(pacificDate(new Date('2026-07-01T07:01:00Z'))).toBe('2026-07-01');
  });

  it('gives a reset time', () => {
    expect(quotaResetsAt(new Date('2026-11-17T12:00:00Z'))).toMatch(/\d{1,2}[:.]\d{2}/);
  });
});

describe('focus searches', () => {
  const area = (key: FocusArea['key'], skills: FocusArea['skills'] = ['finishing']): FocusArea => ({
    key,
    skills,
    title: '',
    why: '',
    inGame: '',
    categories: [],
    gap: 1,
  });

  it('has searches for every focus area and skill', () => {
    const keys: FocusArea['key'][] = ['attempts', 'leftFoot', 'involvement', 'shots', 'onTarget', 'dribbleSuccess', 'afterLoss', 'confidence'];
    for (const k of keys) expect(focusQueries(area(k)).length, k).toBeGreaterThan(0);
    expect(focusQueries(area('rating', ['crossing']))[0]).toMatch(/cross/);
  });

  it('formats durations', () => {
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(3725)).toBe('1:02:05');
  });
});
