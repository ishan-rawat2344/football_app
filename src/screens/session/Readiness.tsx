import { useState } from 'react';
import type { DayPlan } from '../../plan/types';
import { needsLightVersion, type Readiness } from '../../session/run';

type Opt<K extends keyof Readiness> = { value: Readiness[K]; label: string };

const QUESTIONS: { key: keyof Readiness; q: string; options: Opt<keyof Readiness>[] }[] = [
  {
    key: 'sleep',
    q: 'Sleep last night',
    options: [
      { value: 'good', label: 'Good' },
      { value: 'ok', label: 'OK' },
      { value: 'poor', label: 'Poor' },
    ],
  },
  {
    key: 'legs',
    q: 'Your legs',
    options: [
      { value: 'fresh', label: 'Fresh' },
      { value: 'ok', label: 'OK' },
      { value: 'heavy', label: 'Heavy' },
    ],
  },
  {
    key: 'soreness',
    q: 'Soreness',
    options: [
      { value: 'none', label: 'None' },
      { value: 'bit', label: 'A bit' },
      { value: 'sore', label: 'Sore' },
    ],
  },
];

/** Three taps before the session. Low readiness → the light version. */
export function ReadinessView({
  day,
  onStart,
  onCancel,
}: {
  day: DayPlan;
  onStart: (r: Readiness, light: boolean) => void;
  onCancel: () => void;
}) {
  const [r, setR] = useState<Partial<Readiness>>({});
  const complete = r.sleep && r.legs && r.soreness;
  const light = complete ? needsLightVersion(r as Readiness) : false;
  const [forceFull, setForceFull] = useState(false);

  return (
    <div className="run run--ready">
      <div className="run__top">
        <button className="run__x" onClick={onCancel} aria-label="Close">
          ✕
        </button>
        <span className="run__progress">Before you start</span>
        <span />
      </div>
      <div className="run__body">
        <p className="run__eyebrow">{day.title}</p>
        <h1 className="run__title">How are you today?</h1>
        <div className="stack" style={{ gap: 20, marginTop: 8 }}>
          {QUESTIONS.map((q) => (
            <div key={q.key}>
              <p className="run__q">{q.q}</p>
              <div className="run__choices">
                {q.options.map((o) => (
                  <button
                    key={o.value}
                    className="run__choice"
                    aria-pressed={r[q.key] === o.value}
                    onClick={() => setR({ ...r, [q.key]: o.value })}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        {complete && (
          <p className={`run__verdict ${light && !forceFull ? 'run__verdict--light' : ''}`} role="status">
            {light
              ? forceFull
                ? 'Full session, your call. Stop if anything hurts.'
                : 'Light version today: no flat-out speed work, fewer sets. Your body is asking for it.'
              : "You're good to go."}
          </p>
        )}
        {complete && light && (
          <button className="btn btn--ghost" style={{ alignSelf: 'flex-start', color: 'inherit' }} onClick={() => setForceFull(!forceFull)}>
            {forceFull ? 'Use the light version' : 'Do the full session anyway'}
          </button>
        )}
      </div>
      <div className="run__controls">
        <button className="run__big" disabled={!complete} onClick={() => onStart(r as Readiness, light && !forceFull)}>
          Start
        </button>
      </div>
    </div>
  );
}
