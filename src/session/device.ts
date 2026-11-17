/**
 * Phone features for the pitch: keep the screen awake, beep, and speak cues.
 * Everything fails quietly; the screen always shows the same information
 * in big type and colour, so nothing depends on sound working.
 */
import { useEffect, useState } from 'react';

// ---------------------------------------------------------------- sound

let ctx: AudioContext | null = null;
const SOUND_KEY = 'touchline-sound';

export function soundEnabled(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setSoundEnabled(on: boolean) {
  try {
    localStorage.setItem(SOUND_KEY, on ? 'on' : 'off');
  } catch {
    // ignore
  }
}

/**
 * Must run inside a tap (browsers only allow audio after a user gesture).
 * On iPhone, the "playback" audio session lets beeps play with the ringer
 * switch on silent, like a media app (Safari 16.4+; ignored elsewhere).
 */
export function unlockAudio() {
  try {
    const nav = navigator as Navigator & { audioSession?: { type: string } };
    if (nav.audioSession) nav.audioSession.type = 'playback';
  } catch {
    // ignore
  }
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
  }
}

export function beep(freq = 880, ms = 160, volume = 0.35) {
  if (!ctx || !soundEnabled()) return;
  try {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + ms / 1000 + 0.02);
  } catch {
    // ignore
  }
}

export const sounds = {
  go: () => beep(880, 220),
  rest: () => beep(523, 320),
  tick: () => beep(660, 90, 0.25),
  done: () => {
    beep(784, 160);
    setTimeout(() => beep(1047, 260), 170);
  },
};

export function say(text: string) {
  if (!soundEnabled() || !('speechSynthesis' in window)) return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.05;
    u.lang = 'en-GB';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------- screen

/** Keeps the screen on while `active` (re-acquired when you come back to the app). */
export function useWakeLock(active: boolean): boolean {
  const [held, setHeld] = useState(false);
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = async () => {
      try {
        lock = await navigator.wakeLock.request('screen');
        if (!cancelled) setHeld(true);
        lock.addEventListener('release', () => setHeld(false));
      } catch {
        setHeld(false);
      }
    };
    void acquire();
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !cancelled) void acquire();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      void lock?.release().catch(() => undefined);
    };
  }, [active]);
  return held;
}

/** Re-renders every `ms` so countdowns stay live. */
export function useNow(ms = 250): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}
