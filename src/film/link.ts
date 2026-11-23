/** Reading YouTube links: the video id and an optional start time. */

const ID = /^[A-Za-z0-9_-]{11}$/;

/** "1h2m3s", "95s", "95" → seconds. */
export function parseStart(t: string | null): number | undefined {
  if (!t) return undefined;
  if (/^\d+$/.test(t)) return Number(t);
  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(t);
  if (!m || !m[0]) return undefined;
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

export interface YouTubeLink {
  videoId: string;
  start?: number;
}

/** Any normal YouTube link: watch, youtu.be, live, shorts, embed. Null if it isn't one. */
export function parseYouTube(raw: string | undefined | null): YouTubeLink | null {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www|m|music)\./, '');
  let id: string | null = null;
  if (host === 'youtu.be') id = url.pathname.slice(1).split('/')[0] ?? null;
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (url.pathname === '/watch') id = url.searchParams.get('v');
    else {
      const m = /^\/(?:live|shorts|embed|v)\/([^/?#]+)/.exec(url.pathname);
      id = m?.[1] ?? null;
    }
  }
  if (!id || !ID.test(id)) return null;
  const start = parseStart(url.searchParams.get('t') ?? url.searchParams.get('start'));
  return start ? { videoId: id, start } : { videoId: id };
}

/** "1:05", "1:02:05" */
export function clock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** "mm:ss" or "h:mm:ss" typed by hand → seconds. */
export function parseClock(text: string): number | null {
  const parts = text.trim().split(':');
  if (!parts.length || parts.length > 3 || parts.some((p) => !/^\d{1,2}$/.test(p) && !/^\d+$/.test(p))) return null;
  return parts.reduce((acc, p) => acc * 60 + Number(p), 0);
}

/** Match minute ("23'") from video time and where kick-off is. */
export function matchMinute(t: number, kickoff: number | undefined): string {
  if (kickoff === undefined) return clock(t);
  if (t < kickoff) return 'pre';
  return `${Math.floor((t - kickoff) / 60) + 1}'`;
}

export const watchLink = (videoId: string, t: number) => `https://www.youtube.com/watch?v=${videoId}&t=${Math.max(0, Math.floor(t))}s`;
