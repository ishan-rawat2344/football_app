/**
 * Video search with a cache, a daily search counter, and your feedback.
 *
 * - Results are cached for 14 days and deleted after 30 (YouTube's policy:
 *   stored API data must be refreshed or deleted within 30 days).
 * - Searches are counted per US Pacific day; the app stops at 95 of the 100
 *   daily searches so there's always a little headroom.
 * - The API key lives only in this phone's database (never in the code,
 *   the site, or backups). In local development a key in .env is used.
 */
import { db, getSetting, putSetting } from '../db/db';
import type { ChannelPref, VideoFeedback, VideoRecord } from '../db/types';
import { rankVideos, type Ranked } from './rank';
import { searchVideos, videoDetails, YouTubeError, type VideoDetails } from './youtube';

export const FRESH_DAYS = 14;
export const MAX_DAYS = 30;
export const SEARCHES_PER_DAY = 100;
export const SEARCH_SAFE_LIMIT = 95;
const KEY_SETTING = 'youtubeApiKey';

const DAY_MS = 86_400_000;
const ageDays = (iso: string, now: number) => (now - new Date(iso).getTime()) / DAY_MS;

// ---------------------------------------------------------------- key

export async function getApiKey(): Promise<string | null> {
  const stored = await getSetting<string>(KEY_SETTING);
  if (stored) return stored;
  // Development only: Vite drops this branch from production builds.
  if (import.meta.env.DEV && import.meta.env.VITE_YOUTUBE_API_KEY) return import.meta.env.VITE_YOUTUBE_API_KEY;
  return null;
}

export async function setApiKey(key: string | null): Promise<void> {
  if (key) await putSetting(KEY_SETTING, key.trim());
  else await db.settings.delete(KEY_SETTING);
}

// ---------------------------------------------------------------- daily searches

/** The YouTube quota day: the date in US Pacific time. */
export function pacificDate(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(now);
}

/** Local time when the daily allowance resets (midnight US Pacific). */
export function quotaResetsAt(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const secsIntoPacificDay = get('hour') * 3600 + get('minute') * 60 + get('second');
  const reset = new Date(now.getTime() + (86_400 - secsIntoPacificDay) * 1000);
  return reset.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const searchKey = (now = new Date()) => `ytSearches:${pacificDate(now)}`;

export async function searchesToday(): Promise<number> {
  return (await getSetting<number>(searchKey())) ?? 0;
}

/** In a transaction, so two lists searching at once both get counted. */
async function countSearch(): Promise<void> {
  await db.transaction('rw', db.settings, async () => {
    await putSetting(searchKey(), (await searchesToday()) + 1);
  });
}

// ---------------------------------------------------------------- cache

const queryKey = (q: string, lang: string) => `${lang}:${q.trim().toLowerCase()}`;

function toRecord(d: VideoDetails, fetchedAt: string): VideoRecord {
  return { ...d, fetchedAt };
}

function toDetails(r: VideoRecord): VideoDetails {
  return {
    videoId: r.videoId,
    title: r.title,
    channelId: r.channelId,
    channelTitle: r.channelTitle,
    publishedAt: r.publishedAt,
    durationSec: r.durationSec,
    views: r.views,
    likes: r.likes,
    lang: r.lang,
    embeddable: r.embeddable !== false,
    isLive: !!r.isLive,
  };
}

/** Delete cached results, video details and channel names older than 30 days. */
export async function purgeExpired(now = Date.now()): Promise<void> {
  const cutoff = new Date(now - MAX_DAYS * DAY_MS).toISOString();
  await db.searchCache.where('fetchedAt').below(cutoff).delete();
  await db.videos.where('fetchedAt').below(cutoff).delete();
  const stale = (await db.channelPrefs.toArray()).filter((c) => c.channelTitle && (!c.titleAt || c.titleAt < cutoff));
  if (stale.length) await db.channelPrefs.bulkPut(stale.map(({ channelTitle: _t, titleAt: _a, ...c }) => c));
}

/** Run when the app opens: keep saved videos fresh, then clear anything too old. */
export async function maintainVideos(): Promise<void> {
  try {
    await refreshKeptVideos();
    await purgeExpired();
  } catch {
    // never block the app over video housekeeping
  }
}

async function prefs() {
  const [feedback, channels] = await Promise.all([db.videoFeedback.toArray(), db.channelPrefs.toArray()]);
  return {
    feedback: new Map(feedback.map((f) => [f.videoId, f])),
    channels: new Map(channels.map((c) => [c.channelId, c])),
  };
}

export interface VideoResult {
  ranked: Ranked[];
  source: 'cache' | 'network' | 'none';
  fetchedAt?: string;
  error?: YouTubeError;
  /** Why nothing was fetched, when there's nothing to show. */
  blocked?: 'noKey' | 'offline' | 'limit';
}

/**
 * Videos for one search, best first. Uses the cache when it's fresh; searches
 * YouTube (1 of today's searches + 1 unit) only when needed and allowed.
 */
export async function loadVideos(query: string, opts: { lang?: string; allowSearch?: boolean } = {}): Promise<VideoResult> {
  const lang = opts.lang ?? 'en';
  const now = Date.now();
  const key = queryKey(query, lang);
  const cached = await db.searchCache.get(key);
  const p = await prefs();

  const fromCache = async (): Promise<VideoResult | null> => {
    if (!cached || ageDays(cached.fetchedAt, now) > MAX_DAYS) return null;
    const recs = (await db.videos.bulkGet(cached.videoIds)).filter((r): r is VideoRecord => !!r);
    const hits = cached.videoIds.map((videoId, rank) => ({ videoId, rank }));
    return {
      ranked: rankVideos({ hits, details: recs.map(toDetails), ...p, lang }),
      source: 'cache',
      fetchedAt: cached.fetchedAt,
    };
  };

  if (cached && ageDays(cached.fetchedAt, now) <= FRESH_DAYS) return (await fromCache())!;

  const apiKey = await getApiKey();
  const stale = await fromCache();
  if (opts.allowSearch === false) return stale ?? { ranked: [], source: 'none' };
  if (!apiKey) return stale ?? { ranked: [], source: 'none', blocked: 'noKey' };
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return stale ?? { ranked: [], source: 'none', blocked: 'offline' };
  if ((await searchesToday()) >= SEARCH_SAFE_LIMIT) return stale ?? { ranked: [], source: 'none', blocked: 'limit' };

  try {
    await countSearch();
    const hits = await searchVideos(query, apiKey, { lang });
    const details = await videoDetails(hits.map((h) => h.videoId), apiKey);
    const fetchedAt = new Date(now).toISOString();
    await db.transaction('rw', db.searchCache, db.videos, db.channelPrefs, async () => {
      await db.searchCache.put({ queryKey: key, videoIds: hits.map((h) => h.videoId), fetchedAt });
      await db.videos.bulkPut(details.map((d) => toRecord(d, fetchedAt)));
      // refresh the names of channels you trust/blocked/liked when they turn up again
      const known = await db.channelPrefs.bulkGet([...new Set(details.map((d) => d.channelId))]);
      const renamed = known
        .filter((c): c is ChannelPref => !!c)
        .map((c) => ({ ...c, channelTitle: details.find((d) => d.channelId === c.channelId)!.channelTitle, titleAt: fetchedAt }));
      if (renamed.length) await db.channelPrefs.bulkPut(renamed);
    });
    return { ranked: rankVideos({ hits, details, ...p, lang }), source: 'network', fetchedAt };
  } catch (err) {
    const error = err instanceof YouTubeError ? err : new YouTubeError('other', String(err));
    if (error.kind === 'quota') await putSetting(searchKey(), SEARCHES_PER_DAY);
    return stale ? { ...stale, error } : { ranked: [], source: 'none', error };
  }
}

/** Saved/liked videos: refresh details older than 25 days (1 unit per 50), so they never pass 30. */
export async function refreshKeptVideos(): Promise<void> {
  const apiKey = await getApiKey();
  if (!apiKey || (typeof navigator !== 'undefined' && navigator.onLine === false)) return;
  const kept = (await db.videoFeedback.toArray()).filter((f) => f.saved || f.liked).map((f) => f.videoId);
  if (!kept.length) return;
  const recs = await db.videos.bulkGet(kept);
  const now = Date.now();
  const due = kept.filter((_id, i) =>!recs[i] || ageDays(recs[i]!.fetchedAt, now) > 25);
  for (let i = 0; i < due.length; i += 50) {
    try {
      const details = await videoDetails(due.slice(i, i + 50), apiKey);
      const fetchedAt = new Date().toISOString();
      await db.videos.bulkPut(details.map((d) => toRecord(d, fetchedAt)));
    } catch {
      return; // try again next time
    }
  }
}

// ---------------------------------------------------------------- feedback

const now = () => new Date().toISOString();

/** Save / like / hide. Likes and hides also teach the app about the channel. */
export async function setFeedback(video: VideoDetails, patch: Partial<Pick<VideoFeedback, 'saved' | 'liked' | 'hidden'>>): Promise<void> {
  await db.transaction('rw', db.videoFeedback, db.channelPrefs, async () => {
    const prev = await db.videoFeedback.get(video.videoId);
    const next: VideoFeedback = { videoId: video.videoId, ...prev, ...patch, updatedAt: now() };
    await db.videoFeedback.put(next);

    let delta = 0;
    if (patch.liked !== undefined && patch.liked !== !!prev?.liked) delta += patch.liked ? 1 : -1;
    if (patch.hidden !== undefined && patch.hidden !== !!prev?.hidden) delta += patch.hidden ? -1 : 1;
    if (delta) {
      const ch = (await db.channelPrefs.get(video.channelId)) ?? { channelId: video.channelId, affinity: 0 };
      await db.channelPrefs.put({ ...ch, channelTitle: video.channelTitle, titleAt: now(), affinity: ch.affinity + delta });
    }
  });
}

export async function setChannel(channelId: string, channelTitle: string, patch: Pick<ChannelPref, 'trusted' | 'blocked'>): Promise<void> {
  const ch = (await db.channelPrefs.get(channelId)) ?? { channelId, affinity: 0 };
  await db.channelPrefs.put({
    ...ch,
    channelTitle,
    titleAt: now(),
    ...patch,
    // trusting un-blocks and vice versa
    ...(patch.trusted ? { blocked: false } : {}),
    ...(patch.blocked ? { trusted: false } : {}),
  });
}

export async function savedVideos(): Promise<VideoDetails[]> {
  const ids = (await db.videoFeedback.toArray()).filter((f) => f.saved && !f.hidden).map((f) => f.videoId);
  const recs = await db.videos.bulkGet(ids);
  return recs.filter((r): r is VideoRecord => !!r).map(toDetails);
}
