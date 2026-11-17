/**
 * Thin client for the YouTube Data API v3, called straight from the phone with
 * your own key. Quota (checked against the docs, June 2026 change): search.list
 * has its own bucket of 100 calls a day; videos.list costs 1 unit from the
 * shared 10,000. Both reset at midnight US Pacific time.
 */

const API = 'https://www.googleapis.com/youtube/v3';

export interface SearchHit {
  videoId: string;
  /** Position in YouTube's own relevance order (0 = top). */
  rank: number;
}

export interface VideoDetails {
  videoId: string;
  title: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  durationSec: number;
  views: number;
  likes?: number;
  /** e.g. "en", "en-GB", "hi" — when the uploader set it. */
  lang?: string;
  embeddable: boolean;
  isLive: boolean;
}

export type YouTubeErrorKind = 'quota' | 'badKey' | 'notEnabled' | 'referrer' | 'network' | 'other';

export class YouTubeError extends Error {
  constructor(
    public kind: YouTubeErrorKind,
    message: string,
  ) {
    super(message);
  }
}

/** Turn API errors into something a person can act on. */
function toError(status: number, body: unknown): YouTubeError {
  const err = (body as { error?: { errors?: { reason?: string }[]; message?: string } })?.error;
  const reason = err?.errors?.[0]?.reason ?? '';
  if (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded' || reason === 'rateLimitExceeded') {
    return new YouTubeError('quota', "Today's YouTube search limit is used up. It resets at midnight US Pacific time.");
  }
  if (reason === 'keyInvalid' || (status === 400 && /api key/i.test(err?.message ?? ''))) {
    return new YouTubeError('badKey', "That API key wasn't accepted. Check you copied all of it.");
  }
  if (reason === 'accessNotConfigured' || /has not been used|is disabled/i.test(err?.message ?? '')) {
    return new YouTubeError('notEnabled', 'YouTube Data API v3 is not enabled for this key yet. Enable it in Google Cloud (step 3).');
  }
  if (reason === 'forbidden' && /referer|referrer/i.test(err?.message ?? '')) {
    return new YouTubeError('referrer', "The key's website restriction doesn't include this app's address (step 5).");
  }
  if (status === 403 && /referer|referrer/i.test(err?.message ?? '')) {
    return new YouTubeError('referrer', "The key's website restriction doesn't include this app's address (step 5).");
  }
  return new YouTubeError('other', err?.message ?? `YouTube returned an error (${status}).`);
}

async function call(path: string, params: Record<string, string>, key: string, fetcher: typeof fetch): Promise<unknown> {
  const url = `${API}/${path}?${new URLSearchParams({ ...params, key }).toString()}`;
  let res: Response;
  try {
    res = await fetcher(url);
  } catch {
    throw new YouTubeError('network', 'No connection. Videos need the internet; everything else works offline.');
  }
  const body: unknown = await res.json().catch(() => ({}));
  if (!res.ok) throw toError(res.status, body);
  return body;
}

/** One search.list call (1 call from the 100-a-day search allowance). */
export async function searchVideos(
  query: string,
  key: string,
  opts: { lang?: string; max?: number } = {},
  fetcher: typeof fetch = fetch,
): Promise<SearchHit[]> {
  const body = (await call(
    'search',
    {
      part: 'snippet',
      type: 'video',
      q: query,
      maxResults: String(opts.max ?? 25),
      relevanceLanguage: opts.lang ?? 'en',
      videoEmbeddable: 'true',
      safeSearch: 'moderate',
    },
    key,
    fetcher,
  )) as { items?: { id?: { videoId?: string } }[] };
  return (body.items ?? [])
    .map((it, i) => ({ videoId: it.id?.videoId ?? '', rank: i }))
    .filter((h) => h.videoId);
}

/** videos.list for up to 50 ids (1 unit). */
export async function videoDetails(ids: string[], key: string, fetcher: typeof fetch = fetch): Promise<VideoDetails[]> {
  if (!ids.length) return [];
  const body = (await call(
    'videos',
    { part: 'snippet,contentDetails,statistics,status', id: ids.slice(0, 50).join(','), maxResults: '50' },
    key,
    fetcher,
  )) as {
    items?: {
      id: string;
      snippet?: {
        title?: string;
        channelId?: string;
        channelTitle?: string;
        publishedAt?: string;
        defaultAudioLanguage?: string;
        defaultLanguage?: string;
        liveBroadcastContent?: string;
      };
      contentDetails?: { duration?: string };
      statistics?: { viewCount?: string; likeCount?: string };
      status?: { embeddable?: boolean };
    }[];
  };
  return (body.items ?? []).map((v) => ({
    videoId: v.id,
    title: v.snippet?.title ?? '',
    channelId: v.snippet?.channelId ?? '',
    channelTitle: v.snippet?.channelTitle ?? '',
    publishedAt: v.snippet?.publishedAt ?? '',
    durationSec: parseDuration(v.contentDetails?.duration ?? ''),
    views: Number(v.statistics?.viewCount ?? 0),
    likes: v.statistics?.likeCount !== undefined ? Number(v.statistics.likeCount) : undefined,
    lang: v.snippet?.defaultAudioLanguage ?? v.snippet?.defaultLanguage,
    embeddable: v.status?.embeddable !== false,
    isLive: (v.snippet?.liveBroadcastContent ?? 'none') !== 'none',
  }));
}

/** Cheapest possible call to check a key works (1 unit). */
export async function testKey(key: string, fetcher: typeof fetch = fetch): Promise<void> {
  await call('videos', { part: 'id', chart: 'mostPopular', maxResults: '1', regionCode: 'IN' }, key, fetcher);
}

/** ISO 8601 duration ("PT4M13S", "PT1H2M") to seconds. */
export function parseDuration(iso: string): number {
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(iso);
  if (!m) return 0;
  const [, d, h, min, s] = m;
  return Number(d ?? 0) * 86400 + Number(h ?? 0) * 3600 + Number(min ?? 0) * 60 + Number(s ?? 0);
}

export const thumbnailUrl = (videoId: string) => `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
export const embedUrl = (videoId: string) =>
  `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&playsinline=1&modestbranding=1`;
export const watchUrl = (videoId: string) => `https://www.youtube.com/watch?v=${videoId}`;
