import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'wouter';
import { LineChart } from '../components/charts';
import { BackLink } from '../components/forms';
import { toast } from '../components/Toast';
import { db } from '../db/db';
import type { TestResult } from '../db/types';
import { describeAreas, healthWarnings } from '../drills/personal';
import { LOAD_TAG_AREAS, type Drill } from '../drills/types';
import { useProfile } from '../hooks/useData';
import { formatShort, todayISO } from '../lib/dates';
import { timeAgo } from '../lib/format';
import { usePlan } from '../plan/usePlan';
import { sounds, unlockAudio, useWakeLock } from '../session/device';
import { formatValue, getTest, type TestTimer } from '../tests/defs';
import { forTest, isNewPB, personalBest, trend } from '../tests/results';

function useTicker(active: boolean, ms = 100) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [active, ms]);
  return now;
}

/** 60 s countdown with 3-2-1 beeps, or a stopwatch you can use as the result. */
function TimerTool({ timer, onUse }: { timer: TestTimer; onUse: (seconds: number) => void }) {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [stoppedAt, setStoppedAt] = useState<number | null>(null);
  const running = startedAt !== null && stoppedAt === null;
  const now = useTicker(running);
  useWakeLock(running);
  const lastBeep = useRef<number | null>(null);

  const elapsed = startedAt === null ? 0 : ((stoppedAt ?? now) - startedAt) / 1000;
  const remaining = timer.kind === 'countdown' ? Math.max(0, timer.seconds - elapsed) : 0;

  useEffect(() => {
    if (!running || timer.kind !== 'countdown') return;
    const whole = Math.ceil(remaining);
    if (remaining <= 0) {
      sounds.done();
      setStoppedAt(startedAt! + timer.seconds * 1000);
    } else if (whole <= 3 && whole !== lastBeep.current) {
      lastBeep.current = whole;
      sounds.tick();
    }
  }, [remaining, running, timer, startedAt]);

  function start() {
    unlockAudio();
    sounds.go();
    lastBeep.current = null;
    setStoppedAt(null);
    setStartedAt(Date.now());
  }

  const display =
    timer.kind === 'countdown'
      ? String(Math.ceil(remaining))
      : elapsed < 60
        ? elapsed.toFixed(1)
        : `${Math.floor(elapsed / 60)}:${(elapsed % 60).toFixed(1).padStart(4, '0')}`;

  return (
    <div className="timer">
      <span className={`timer__digits ${running ? 'timer__digits--live' : ''}`} aria-live="off">
        {display}
      </span>
      {!running ? (
        <div className="row" style={{ width: '100%' }}>
          <button className="btn btn--primary btn--lg" onClick={start}>
            {startedAt === null ? (timer.kind === 'countdown' ? 'Start 60 s' : 'Start') : 'Again'}
          </button>
          {timer.kind === 'stopwatch' && stoppedAt !== null && (
            <button className="btn btn--secondary btn--lg" onClick={() => onUse(Math.round(elapsed * 100) / 100)}>
              Use {elapsed.toFixed(1)} s
            </button>
          )}
        </div>
      ) : (
        <button
          className="btn btn--secondary btn--lg btn--block"
          onClick={() => {
            if (timer.kind === 'stopwatch') sounds.done();
            setStoppedAt(Date.now());
          }}
        >
          Stop
        </button>
      )}
      {timer.kind === 'countdown' && stoppedAt !== null && !running && (
        <p className="field__hint">Time's up. Enter your count below.</p>
      )}
    </div>
  );
}

export function TestScreen() {
  const { id = '' } = useParams<{ id: string }>();
  const t = getTest(id);
  const profile = useProfile();
  const plan = usePlan(1);
  const results = useLiveQuery(() => db.testResults.where('testId').equals(id).toArray(), [id], null);
  const [value, setValue] = useState<string>('');
  const [notes, setNotes] = useState('');

  if (!t) {
    return (
      <>
        <BackLink href="/progress" label="Progress" />
        <h1 className="page-title">Test not found</h1>
      </>
    );
  }
  if (results === null || profile === 'loading' || plan === 'loading') return null;

  const sorted = forTest(results, t.id);
  const tr = trend(t, results);
  const pb = personalBest(t, results);
  const num = Number(value);
  const valid = value.trim() !== '' && Number.isFinite(num) && num >= t.min && num <= t.max;

  // Health: same rules as drills.
  const asDrill = { loadTags: t.loadTags, intensity: t.id === 'sprint-30' ? 'high' : 'medium' } as Drill;
  const warnings = profile ? healthWarnings(asDrill, profile.health) : [];
  const blocked = (plan?.days[0]?.restrictions ?? []).filter((r) =>
    t.loadTags.some((tag) => LOAD_TAG_AREAS[tag].includes(r.area)),
  );

  async function save() {
    if (!t || !valid) return;
    const pbNow = isNewPB(t, sorted, num);
    await db.testResults.add({ testId: t.id, date: todayISO(), value: num, notes: notes.trim() || undefined });
    setValue('');
    setNotes('');
    toast(pbNow && sorted.length ? `New personal best: ${formatValue(t, num)}!` : `Saved: ${formatValue(t, num)}`);
  }

  async function remove(r: TestResult) {
    if (r.id === undefined || !window.confirm(`Delete ${formatValue(t!, r.value)} from ${formatShort(r.date)}?`)) return;
    await db.testResults.delete(r.id);
  }

  const pbIndex = pb ? sorted.findIndex((r) => r.id === pb.id) : -1;
  const fmt = (n: number) => (t.outOfTen ? String(Math.round(n)) : n.toFixed(t.decimals === 2 ? 1 : 0));

  return (
    <>
      <BackLink href="/progress" label="Progress" />
      <p className="card__eyebrow" style={{ marginTop: 8 }}>
        Test · every 4 weeks · {t.better === 'lower' ? 'lower is better' : 'higher is better'}
      </p>
      <h1 className="page-title">{t.name}</h1>
      <p className="page-lede">
        {tr.latest ? `Last done ${timeAgo(tr.latest.date)}.` : 'Not done yet: today sets your baseline.'}
        {pb && sorted.length > 1 && ` PB ${formatValue(t, pb.value)} (${formatShort(pb.date)}).`}
      </p>

      <div className="stack">
        {blocked.length > 0 && (
          <section className="card card--alert card--alert-stop" role="note">
            <p className="card__eyebrow">Skip this test for now</p>
            <p className="card__body">
              You logged pain in your {blocked.map((b) => describeAreas([b.area])).join(' and ')}, which this test loads.
              Do it once that's settled: a result taken while protecting an area isn't a fair comparison anyway.
            </p>
          </section>
        )}
        {!blocked.length &&
          warnings.map((w) => (
            <section key={w.flag.id} className={`card card--alert card--alert-${w.level}`} role="note">
              <p className="card__eyebrow">{w.level === 'stop' ? 'Go easy' : 'Keep an eye on it'}</p>
              <p className="card__body">{w.message}</p>
            </section>
          ))}

        {sorted.length > 0 && (
          <section className="card">
            <p className="card__eyebrow">
              {sorted.length} result{sorted.length === 1 ? '' : 's'}
              {tr.improvement !== null &&
                ` · ${tr.improvement > 0 ? 'better' : tr.improvement < 0 ? 'worse' : 'same'} than your first by ${formatValue(t, Math.abs(tr.improvement))}`}
            </p>
            <LineChart
              points={sorted.map((r) => ({ x: r.date, y: r.value }))}
              format={fmt}
              highlight={pbIndex >= 0 && sorted.length > 1 ? { index: pbIndex, label: 'PB' } : undefined}
              label={`${t.name}: ${sorted.map((r) => `${formatValue(t, r.value)} on ${formatShort(r.date)}`).join(', ')}`}
            />
          </section>
        )}

        <section className="card">
          <p className="card__eyebrow">Setup</p>
          <p className="prose">{t.setup}</p>
          <p className="mini-heading">How to do it</p>
          <ol className="steps">
            {t.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          <p className="notice notice--warn">{t.fair}</p>
          {t.partner && <p className="field__hint" style={{ marginTop: 10 }}>{t.partner}</p>}
        </section>

        {t.timer && (
          <section className="card">
            <p className="card__eyebrow">{t.timer.kind === 'countdown' ? 'Countdown' : 'Stopwatch'}</p>
            <TimerTool timer={t.timer} onUse={(s) => setValue(String(s))} />
          </section>
        )}

        <section className="card stack">
          <p className="card__eyebrow">Your result</p>
          {t.outOfTen ? (
            <div className="ten" role="group" aria-label="Result out of 10">
              {Array.from({ length: 11 }, (_, i) => i).map((n) => (
                <button key={n} className="rpe__btn" aria-pressed={value === String(n)} onClick={() => setValue(String(n))}>
                  {n}
                </button>
              ))}
            </div>
          ) : (
            <div className="input-unit" style={{ justifyContent: 'center' }}>
              <input
                className="input result-input"
                type="number"
                inputMode="decimal"
                step={t.decimals ? 1 / 10 ** t.decimals : 1}
                min={t.min}
                max={t.max}
                value={value}
                aria-label={`Result in ${t.unit}`}
                onChange={(e) => setValue(e.target.value)}
              />
              <span className="input-unit__label">{t.unit}</span>
            </div>
          )}
          {value !== '' && !valid && (
            <p className="field__hint" style={{ color: 'var(--danger)', textAlign: 'center' }}>
              Between {t.min} and {t.max} {t.unit}.
            </p>
          )}
          <input className="input" placeholder="Notes (optional): surface, wind, how you felt" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <button className="btn btn--primary btn--block" disabled={!valid || blocked.length > 0} onClick={save}>
            Save result
          </button>
        </section>

        {sorted.length > 0 && (
          <section className="card">
            <p className="card__eyebrow">All results</p>
            <ul className="list">
              {[...sorted].reverse().map((r) => (
                <li key={r.id}>
                  <span>
                    {formatShort(r.date)}
                    {r.notes && <span className="muted"> · {r.notes}</span>}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {pb?.id === r.id && sorted.length > 1 && <span className="pb">PB</span>}
                    <strong>{formatValue(t, r.value)}</strong>
                    <button className="remove-btn" aria-label={`Delete result from ${formatShort(r.date)}`} onClick={() => void remove(r)}>
                      ×
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}

