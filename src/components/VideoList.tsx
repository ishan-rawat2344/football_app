import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { Link } from 'wouter';
import { db } from '../db/db';
import type { ChannelPref, VideoFeedback } from '../db/types';
import type { Ranked } from '../videos/rank';
import { loadVideos, quotaResetsAt, SEARCH_SAFE_LIMIT, setChannel, setFeedback, type VideoResult } from '../videos/store';
import { embedUrl, thumbnailUrl, watchUrl, type VideoDetails } from '../videos/youtube';
import { BookmarkIcon, HideIcon, MoreIcon, PlayIcon, ThumbIcon } from './Icons';
import { toast } from './Toast';

// ---------------------------------------------------------------- formatting

export function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = String(sec % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

function age(iso: string, now = Date.now()): string {
  const days = (now - new Date(iso).getTime()) / 86_400_000;
  if (!Number.isFinite(days)) return '';
  if (days < 1) return 'today';
  if (days < 31) return `${Math.round(days)} day${Math.round(days) === 1 ? '' : 's'} ago`;
  if (days < 365) return `${Math.round(days / 30.4)} month${Math.round(days / 30.4) === 1 ? '' : 's'} ago`;
  const y = Math.round(days / 365.25);
  return `${y} year${y === 1 ? '' : 's'} ago`;
}

// ---------------------------------------------------------------- live prefs

export function useVideoPrefs() {
  return useLiveQuery(
    async () => {
      const [fb, ch] = await Promise.all([db.videoFeedback.toArray(), db.channelPrefs.toArray()]);
      return {
        feedback: new Map<string, VideoFeedback>(fb.map((f) => [f.videoId, f])),
        channels: new Map<string, ChannelPref>(ch.map((c) => [c.channelId, c])),
      };
    },
    [],
    null,
  );
}

type Prefs = NonNullable<ReturnType<typeof useVideoPrefs>>;

// ---------------------------------------------------------------- one video

export function VideoCard({ video, tags = [], prefs }: { video: VideoDetails; tags?: string[]; prefs: Prefs | null }) {
  const [playing, setPlaying] = useState(false);
  const [menu, setMenu] = useState(false);
  const fb = prefs?.feedback.get(video.videoId);
  const ch = prefs?.channels.get(video.channelId);
  const shownTags = tags.filter((t) => t !== 'Saved' && !(t === 'Trusted channel' && !ch?.trusted));

  async function toggle(field: 'saved' | 'liked') {
    const on = !fb?.[field];
    await setFeedback(video, { [field]: on });
    if (field === 'saved') toast(on ? 'Saved. Find it in Videos.' : 'Removed from saved.');
    if (field === 'liked' && on) toast('Noted. More like this.');
  }

  async function hide() {
    await setFeedback(video, { hidden: true, saved: false });
    toast('Hidden. You can bring it back in Videos.');
  }

  async function channel(patch: { trusted?: boolean; blocked?: boolean }) {
    await setChannel(video.channelId, video.channelTitle, patch);
    setMenu(false);
    if (patch.trusted) toast(`${video.channelTitle} goes to the top from now on.`);
    if (patch.trusted === false) toast(`${video.channelTitle} is no longer trusted.`);
    if (patch.blocked) toast(`You won't see ${video.channelTitle} again.`);
  }

  return (
    <article className="video">
      {playing ? (
        <div className="video__frame">
          <iframe
            src={`${embedUrl(video.videoId)}&autoplay=1`}
            title={video.title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      ) : (
        <button className="video__thumb" onClick={() => setPlaying(true)} aria-label={`Play: ${video.title}`}>
          <img src={thumbnailUrl(video.videoId)} alt="" loading="lazy" width={320} height={180} />
          <span className="video__play">
            <PlayIcon size={22} />
          </span>
          <span className="video__len">{formatDuration(video.durationSec)}</span>
        </button>
      )}

      <div className="video__body">
        <p className="video__title">{video.title}</p>
        <p className="video__meta">
          {video.channelTitle} · {compact.format(video.views)} views{video.publishedAt && ` · ${age(video.publishedAt)}`}
        </p>
        {shownTags.length > 0 && (
          <div className="video__tags">
            {shownTags.map((t) => (
              <span key={t} className={`tag ${t === 'Trusted channel' ? 'tag--focus' : ''}`}>
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="video__actions">
          <button className="video__act" aria-pressed={!!fb?.saved} onClick={() => toggle('saved')}>
            <BookmarkIcon size={18} filled={!!fb?.saved} />
            {fb?.saved ? 'Saved' : 'Save'}
          </button>
          <button className="video__act" aria-pressed={!!fb?.liked} onClick={() => toggle('liked')}>
            <ThumbIcon size={18} filled={!!fb?.liked} />
            Helpful
          </button>
          <button className="video__act" onClick={hide}>
            <HideIcon size={18} />
            Hide
          </button>
          <button className="video__act video__act--icon" aria-expanded={menu} aria-label="Channel options" onClick={() => setMenu(!menu)}>
            <MoreIcon size={18} />
          </button>
        </div>

        {menu && (
          <div className="video__menu">
            <button className="btn btn--small btn--secondary" onClick={() => channel({ trusted: !ch?.trusted })}>
              {ch?.trusted ? 'Stop trusting this channel' : 'Trust this channel'}
            </button>
            <button className="btn btn--small btn--ghost" onClick={() => channel({ blocked: true })}>
              Never show this channel
            </button>
            <a className="btn btn--small btn--ghost" href={watchUrl(video.videoId)} target="_blank" rel="noreferrer">
              Open in YouTube
            </a>
          </div>
        )}
      </div>
    </article>
  );
}

// ---------------------------------------------------------------- a search

/** True once the element has come near the screen (so off-screen lists don't spend searches). */
function useSeen<T extends Element>(): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (seen || !ref.current) return;
    if (typeof IntersectionObserver === 'undefined') {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setSeen(true), {
      rootMargin: '300px',
    });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [seen]);
  return [ref, seen];
}

function Notice({ result }: { result: VideoResult }) {
  if (result.blocked === 'noKey') {
    return (
      <div className="video-note">
        <p className="card__body">Add your free YouTube key to see tutorial videos here. It takes about 5 minutes, once.</p>
        <Link href="/youtube" className="btn btn--secondary btn--small" style={{ marginTop: 10 }}>
          Set up YouTube
        </Link>
      </div>
    );
  }
  if (result.blocked === 'offline') {
    return <p className="card__body">Videos need the internet. Everything else works offline.</p>;
  }
  if (result.blocked === 'limit' || result.error?.kind === 'quota') {
    return (
      <p className="card__body">
        You've used today's {SEARCH_SAFE_LIMIT} searches. New searches from {quotaResetsAt()}; videos you've already
        seen still show.
      </p>
    );
  }
  if (result.error) {
    const fixable = ['badKey', 'notEnabled', 'referrer'].includes(result.error.kind);
    return (
      <div className="video-note">
        <p className="card__body">{result.error.message}</p>
        {fixable && (
          <Link href="/youtube" className="btn btn--secondary btn--small" style={{ marginTop: 10 }}>
            Check YouTube setup
          </Link>
        )}
      </div>
    );
  }
  return null;
}

/**
 * Ranked tutorials for a list of searches. Shows the first search; "Different
 * search" moves to the next one (each new search uses 1 of today's searches).
 */
export function VideoList({ queries, show = 2, lang }: { queries: string[]; show?: number; lang?: string }) {
  const [qi, setQi] = useState(0);
  const [result, setResult] = useState<VideoResult | null>(null);
  const [more, setMore] = useState(false);
  const [ref, seen] = useSeen<HTMLDivElement>();
  const prefs = useVideoPrefs();
  const query = queries[qi] ?? '';

  useEffect(() => {
    if (!seen || !query) return;
    let live = true;
    setResult(null);
    setMore(false);
    loadVideos(query, { lang }).then((r) => live && setResult(r));
    return () => {
      live = false;
    };
  }, [seen, query, lang]);

  const visible: Ranked[] = (result?.ranked ?? []).filter((r) => {
    if (!prefs) return true;
    return !prefs.feedback.get(r.video.videoId)?.hidden && !prefs.channels.get(r.video.channelId)?.blocked;
  });
  const shown = visible.slice(0, more ? 8 : show);

  return (
    <div ref={ref} className="video-list">
      {!result && seen && query && (
        <div className="video video--loading" aria-label="Loading videos">
          <div className="video__thumb" />
          <div className="video__body">
            <div className="skeleton" style={{ width: '80%' }} />
            <div className="skeleton" style={{ width: '50%' }} />
          </div>
        </div>
      )}

      {result && <Notice result={result} />}

      {result && !result.blocked && !(result.error && !visible.length) && visible.length === 0 && (
        <p className="card__body">No good tutorials turned up for this search.</p>
      )}

      {shown.map((r) => (
        <VideoCard key={r.video.videoId} video={r.video} tags={r.tags} prefs={prefs} />
      ))}

      {result && (visible.length > shown.length || (queries.length > 1 && !result.blocked)) && (
        <div className="row video-list__more">
          {visible.length > shown.length && (
            <button className="btn btn--small btn--secondary" onClick={() => setMore(true)}>
              Show {Math.min(8, visible.length) - shown.length} more
            </button>
          )}
          {queries.length > 1 && !result.blocked && (
            <button className="btn btn--small btn--ghost" onClick={() => setQi((qi + 1) % queries.length)}>
              Different search
            </button>
          )}
        </div>
      )}
      {result && query && (result.ranked.length > 0 || qi > 0) && (
        <p className="field__hint">
          Search: “{query}”{result.source === 'cache' && result.fetchedAt ? ' · saved on this phone' : ''}
        </p>
      )}
    </div>
  );
}
