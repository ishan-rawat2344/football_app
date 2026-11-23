/**
 * YouTube's own embedded player (IFrame Player API). Free, no key. It lets
 * the app read the current time and jump around; it can't see the picture.
 * The script loads from youtube.com only when the Film room opens.
 */
import { useEffect, useRef, useState } from 'react';

interface YTPlayer {
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  playVideo(): void;
  pauseVideo(): void;
  destroy(): void;
}

interface YTNamespace {
  Player: new (
    el: HTMLElement,
    opts: {
      videoId: string;
      host?: string;
      width?: string | number;
      height?: string | number;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: () => void;
        onError?: (e: { data: number }) => void;
        onStateChange?: (e: { data: number }) => void;
      };
    },
  ) => YTPlayer;
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let loading: Promise<YTNamespace> | null = null;

export function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        if (window.YT) resolve(window.YT);
      };
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.async = true;
      s.onerror = () => {
        loading = null;
        s.remove();
        reject(new Error('offline'));
      };
      document.head.appendChild(s);
    });
  }
  return loading;
}

export type PlayerStatus = 'loading' | 'ready' | 'blocked' | 'missing' | 'offline' | 'error';

/** YouTube's error codes, in words. */
export function playerProblem(status: PlayerStatus): string | null {
  switch (status) {
    case 'blocked':
    case 'missing':
      // YouTube uses the same codes for both, so say both.
      return "YouTube won't play this video inside the app. It may be private or deleted, the link may be wrong, or the uploader may not allow it in other apps.";
    case 'offline':
      return "Can't reach YouTube. The video needs the internet; your tags still save.";
    case 'error':
      return "The video didn't load.";
    default:
      return null;
  }
}

export function useYouTubePlayer(videoId: string | null, start?: number) {
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const [status, setStatus] = useState<PlayerStatus>('loading');

  useEffect(() => {
    const box = host.current;
    if (!videoId || !box) return;
    let cancelled = false;
    setStatus('loading');
    // YouTube replaces this element with its iframe.
    const mount = document.createElement('div');
    box.replaceChildren(mount);
    loadYouTubeApi()
      .then((YT) => {
        if (cancelled) return;
        player.current = new YT.Player(mount, {
          videoId,
          width: '100%',
          height: '100%',
          host: 'https://www.youtube-nocookie.com',
          playerVars: { playsinline: 1, rel: 0, modestbranding: 1, start: Math.floor(start ?? 0) },
          events: {
            onReady: () => !cancelled && setStatus('ready'),
            onError: (e) => {
              if (cancelled) return;
              setStatus(e.data === 101 || e.data === 150 || e.data === 153 ? 'blocked' : e.data === 100 || e.data === 2 ? 'missing' : 'error');
            },
          },
        });
      })
      .catch(() => !cancelled && setStatus('offline'));
    return () => {
      cancelled = true;
      try {
        player.current?.destroy();
      } catch {
        // already gone
      }
      player.current = null;
      box.replaceChildren();
    };
    // start only matters for the first load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  return {
    host,
    status,
    /** Seconds into the video, or null when the player isn't ready. */
    time: (): number | null => {
      if (status !== 'ready' || !player.current) return null;
      const t = player.current.getCurrentTime();
      return Number.isFinite(t) ? t : null;
    },
    seek: (t: number, play = true) => {
      if (!player.current || status !== 'ready') return;
      player.current.seekTo(Math.max(0, t), true);
      if (play) player.current.playVideo();
    },
    pause: () => player.current?.pauseVideo(),
  };
}
