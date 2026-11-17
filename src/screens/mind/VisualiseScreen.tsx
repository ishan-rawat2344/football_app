import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { useProfile } from '../../hooks/useData';
import { visualisationScript } from '../../mind/routine';
import { say, sounds, unlockAudio, useNow, useWakeLock } from '../../session/device';

/** A calm full-screen player: one scene at a time, timed, read aloud if you like. */
export function VisualiseScreen() {
  const [, navigate] = useLocation();
  const profile = useProfile();
  const [index, setIndex] = useState<number | null>(null); // null = not started
  const [sceneStart, setSceneStart] = useState(0);
  const [readAloud, setReadAloud] = useState(true);
  const running = index !== null;
  const now = useNow(250);
  useWakeLock(running);
  const spoken = useRef<number | null>(null);

  const scenes = profile && profile !== 'loading' ? visualisationScript(profile) : [];
  const scene = index !== null ? scenes[index] : undefined;
  const left = scene ? Math.max(0, Math.ceil(scene.seconds - (now - sceneStart) / 1000)) : 0;

  // Read each scene once, as it starts.
  useEffect(() => {
    if (index === null || !scene || spoken.current === index) return;
    spoken.current = index;
    if (readAloud) say(scene.text);
  }, [index, scene, readAloud]);

  // Move on when a scene's time is up.
  useEffect(() => {
    if (index === null || !scene || left > 0) return;
    if (index + 1 < scenes.length) {
      sounds.tick();
      setIndex(index + 1);
      setSceneStart(Date.now());
    } else {
      sounds.done();
      setIndex(null);
      spoken.current = null;
      navigate('/mind');
    }
  }, [left, index, scene, scenes.length, navigate]);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  if (profile === 'loading') return null;

  return (
    <div className="run run--rest visualise">
      <div className="run__top">
        <button className="run__x" aria-label="Close" onClick={() => navigate('/mind')}>
          ✕
        </button>
        <span className="run__progress">{running ? `${index! + 1} of ${scenes.length}` : 'Visualise · 3 min'}</span>
        <button
          className="run__icon"
          aria-label={readAloud ? 'Reading aloud' : 'Not reading aloud'}
          aria-pressed={readAloud}
          onClick={() => {
            setReadAloud(!readAloud);
            if (readAloud) window.speechSynthesis?.cancel();
          }}
        >
          {readAloud ? '🔊' : '🔇'}
        </button>
      </div>
      <div className="run__body" style={{ justifyContent: 'center' }}>
        {!running ? (
          <>
            <p className="run__eyebrow">Before a game, or before sleep</p>
            <h1 className="run__title">Three game moments, in your own words</h1>
            <p className="visualise__text">
              Sit or lie still. The phone moves you through each moment and, if you like, reads it to you. See it,
              hear it, feel it: as if it's happening.
            </p>
          </>
        ) : (
          <>
            <p className="run__eyebrow">{scene!.title}</p>
            <p className="visualise__text visualise__text--big">{scene!.text}</p>
            <p className="visualise__left">{left}</p>
          </>
        )}
      </div>
      <div className="run__controls">
        {!running ? (
          <button
            className="run__big"
            onClick={() => {
              unlockAudio();
              spoken.current = null;
              setIndex(0);
              setSceneStart(Date.now());
            }}
          >
            Begin
          </button>
        ) : (
          <button
            className="run__big"
            onClick={() => {
              window.speechSynthesis?.cancel();
              if (index! + 1 < scenes.length) {
                setIndex(index! + 1);
                setSceneStart(Date.now());
              } else navigate('/mind');
            }}
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
