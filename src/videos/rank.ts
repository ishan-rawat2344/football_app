/**
 * Which videos you see, in what order. Pure, so it's tested.
 *
 * Filters out: Shorts and very short clips, very long videos, live streams,
 * non-embeddable videos, other languages (when the uploader set one),
 * highlight reels, compilations and game clips, anything you hid, and
 * channels you blocked.
 * Ranks by: YouTube's relevance order, views, like rate, recency, a good
 * length for a drill, channels you trust, and channels you've liked.
 */
import type { ChannelPref, VideoFeedback } from '../db/types';
import type { VideoDetails } from './youtube';

export const MIN_SEC = 90;
export const MAX_SEC = 20 * 60;

const TUTORIAL = /\b(how to|tutorial|drills?|training|tips?|learn|exercises?|session|explained|technique|guide|masterclass|improve|routine|workout)\b/i;
const NOT_TUTORIAL =
  /\b(highlights?|compilations?|best goals|top \d+|goals? of the|skills? (?:show|mix)|full match|extended|reaction|vlog|\d{4}\/\d{2}|fifa ?\d{2}|fc ?2\d|efootball|pes ?\d{2}|edit)\b|\bvs\.?\b|#shorts/i;

export type ExcludeReason =
  | 'tooShort'
  | 'tooLong'
  | 'live'
  | 'notEmbeddable'
  | 'language'
  | 'notTutorial'
  | 'hidden'
  | 'blockedChannel';

export function excludeReason(
  v: VideoDetails,
  prefs: { feedback?: VideoFeedback; channel?: ChannelPref; lang: string },
): ExcludeReason | null {
  if (prefs.feedback?.hidden) return 'hidden';
  if (prefs.channel?.blocked) return 'blockedChannel';
  if (v.isLive) return 'live';
  if (!v.embeddable) return 'notEmbeddable';
  if (v.durationSec < MIN_SEC) return 'tooShort';
  if (v.durationSec > MAX_SEC) return 'tooLong';
  if (v.lang && !v.lang.toLowerCase().startsWith(prefs.lang.toLowerCase())) return 'language';
  if (NOT_TUTORIAL.test(v.title) && !TUTORIAL.test(v.title)) return 'notTutorial';
  return null;
}

export interface Ranked {
  video: VideoDetails;
  score: number;
  /** Short labels for why it's here. */
  tags: string[];
}

/** 0–1 for how well the length suits a drill video: 3–12 minutes is ideal. */
export function lengthFit(sec: number): number {
  const min = sec / 60;
  if (min >= 3 && min <= 12) return 1;
  if (min >= 1.5 && min < 3) return 0.6;
  if (min > 12 && min <= 20) return 0.5;
  return 0;
}

export function rankVideos(args: {
  hits: { videoId: string; rank: number }[];
  details: VideoDetails[];
  feedback: Map<string, VideoFeedback>;
  channels: Map<string, ChannelPref>;
  lang?: string;
  now?: Date;
}): Ranked[] {
  const lang = args.lang ?? 'en';
  const now = (args.now ?? new Date()).getTime();
  const byId = new Map(args.details.map((d) => [d.videoId, d]));
  const total = Math.max(1, args.hits.length);
  const out: Ranked[] = [];

  for (const hit of args.hits) {
    const v = byId.get(hit.videoId);
    if (!v) continue;
    const fb = args.feedback.get(v.videoId);
    const ch = args.channels.get(v.channelId);
    if (excludeReason(v, { feedback: fb, channel: ch, lang })) continue;

    const tags: string[] = [];
    const relevance = 1 - hit.rank / total; // YouTube's own order still matters most
    const views = Math.min(1, Math.log10(v.views + 1) / 7); // 10M views ≈ 1
    const likeRate = v.likes !== undefined && v.views > 0 ? Math.min(1, (v.likes / v.views) * 25) : 0.4;
    const years = Math.max(0, (now - new Date(v.publishedAt).getTime()) / (365.25 * 86_400_000));
    const recency = 1 / (1 + years / 3);
    const fit = lengthFit(v.durationSec);
    let score = relevance * 3 + views * 2 + likeRate + recency + fit;

    if (TUTORIAL.test(v.title)) score += 0.5;
    if (ch?.trusted) {
      score += 2;
      tags.push('Trusted channel');
    }
    if (ch && ch.affinity) score += Math.max(-2, Math.min(2, ch.affinity * 0.7));
    if (ch && ch.affinity > 0 && !ch.trusted) tags.push('From a channel you liked');
    if (fb?.saved) tags.push('Saved');
    if (v.views >= 1_000_000) tags.push('Popular');
    if (years < 1) tags.push('New');

    out.push({ video: v, score, tags });
  }
  return out.sort((a, b) => b.score - a.score);
}
