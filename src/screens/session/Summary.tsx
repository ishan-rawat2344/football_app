import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { useLocation } from 'wouter';
import { Stepper } from '../../components/forms';
import { toast } from '../../components/Toast';
import { db } from '../../db/db';
import type { HealthFlag, SessionType } from '../../db/types';
import { getDrill } from '../../drills/library';
import { describeAreas } from '../../drills/personal';
import { painLevel } from '../../plan/adapt';
import type { DayPlan } from '../../plan/types';
import { elapsedMinutes, runStatus, type DrillRating, type RunState } from '../../session/run';
import { clearActiveRun, saveSession } from '../../session/save';
import { PainPicker, type PainPick } from './PainPicker';

const RPE_WORDS: Record<number, string> = {
  1: 'Very easy',
  2: 'Easy',
  3: 'Easy',
  4: 'Moderate',
  5: 'Moderate',
  6: 'Somewhat hard',
  7: 'Hard',
  8: 'Hard',
  9: 'Very hard',
  10: 'Max effort',
};

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

const RATING_LABEL: Record<DrillRating, string> = { easy: 'Too easy', right: 'About right', hard: 'Too hard' };

/**
 * End of a session (mode "run"), or logging one without session mode
 * (mode "log"). Effort, pain and notes, then save.
 */
export function SessionSummary({
  mode,
  day,
  run,
  flags,
}: {
  mode: 'run' | 'log';
  day: DayPlan;
  run?: RunState;
  flags: HealthFlag[];
}) {
  const [, navigate] = useLocation();
  const [rpe, setRpe] = useState<number | null>(null);
  const [status, setStatus] = useState<'done' | 'partial'>(run ? runStatus(run) : 'done');
  const [minutes, setMinutes] = useState(run ? elapsedMinutes(run, Date.now()) : day.minutes);
  const [painAfter, setPainAfter] = useState<PainPick[]>([]);
  const [adding, setAdding] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const duringPain = useLiveQuery(
    () => db.painReports.where('date').equals(day.date).filter((p) => p.when === 'during').toArray(),
    [day.date],
    [],
  );

  const rated = run ? Object.entries(run.ratings) : [];
  const countable = run ? run.items.filter((i) => i.block !== 'warmup' && i.block !== 'cooldown') : [];
  const doneCount = run ? countable.filter((i) => run.finished.includes(i.drillId)).length : 0;

  async function save() {
    if (rpe === null) return;
    setSaving(true);
    await saveSession({
      date: day.date,
      kind: day.kind as SessionType,
      blocks: day.blocks,
      status,
      minutes,
      rpe,
      readiness: run?.readiness,
      light: run?.light,
      ratings: run?.ratings ?? {},
      skipped: run?.skipped ?? [],
      notes,
      painAfter: painAfter.map((p) => ({ area: p.area, score: p.score })),
    });
    const worst = [...duringPain, ...painAfter.map((p) => ({ ...p, when: 'after' as const, date: day.date }))]
      .map((p) => painLevel(p, flags))
      .sort()
      .at(-1);
    toast(
      worst === 'red'
        ? 'Saved. Pain is high: rest, and see a physio if it does not settle.'
        : worst === 'amber'
          ? 'Saved. The plan will go easy on that area.'
          : 'Session saved. Nice work.',
    );
    navigate('/');
  }

  async function discard() {
    if (!window.confirm('Discard this session? Nothing from it will be saved (pain you logged stays).')) return;
    await clearActiveRun();
    navigate('/');
  }

  return (
    <div className="summary">
      <p className="card__eyebrow" style={{ marginTop: 8 }}>
        {day.title}
      </p>
      <h1 className="page-title">
        {mode === 'log'
          ? 'Log your session'
          : run?.endedEarly
            ? 'Session ended'
            : status === 'partial'
              ? 'Session done'
              : 'Session complete'}
      </h1>
      {run && (
        <p className="page-lede">
          {elapsedMinutes(run, Date.now())} min · {doneCount} of {countable.length} drills
          {run.light ? ' · light version' : ''}
        </p>
      )}

      <div className="stack">
        {mode === 'log' && (
          <section className="card stack">
            <div className="segmented" role="group" aria-label="How much did you do">
              <button aria-pressed={status === 'done'} onClick={() => setStatus('done')}>
                All of it
              </button>
              <button aria-pressed={status === 'partial'} onClick={() => setStatus('partial')}>
                Part of it
              </button>
            </div>
            <Stepper label="How long" unit="min" value={minutes} min={5} max={150} onChange={setMinutes} />
          </section>
        )}

        <section className="card">
          <p className="card__eyebrow">Effort</p>
          <p className="card__body" style={{ marginBottom: 12 }}>
            How hard was the whole session, from 1 to 10?
          </p>
          <div className="rpe" role="group" aria-label="Effort from 1 to 10">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button key={n} className="rpe__btn" aria-pressed={rpe === n} onClick={() => setRpe(n)}>
                {n}
              </button>
            ))}
          </div>
          <p className="rpe__word">{rpe ? RPE_WORDS[rpe] : 'Tap a number'}</p>
        </section>

        {rated.length > 0 && (
          <section className="card">
            <p className="card__eyebrow">Your ratings</p>
            <ul className="list">
              {rated.map(([id, r]) => (
                <li key={id}>
                  <span>{getDrill(id)?.name}</span>
                  <span className={`tag ${r === 'hard' ? 'tag--warn' : r === 'easy' ? 'tag--focus' : ''}`}>
                    {RATING_LABEL[r]}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="card">
          <p className="card__eyebrow">Pain</p>
          {duringPain.length > 0 && (
            <ul className="bullets" style={{ marginBottom: 12 }}>
              {duringPain.map((p) => (
                <li key={p.id}>
                  {cap(describeAreas([p.area]))}: {p.score}/10 during
                </li>
              ))}
            </ul>
          )}
          {painAfter.map((p, i) => (
            <p key={i} className="notice notice--warn" style={{ marginTop: 0, marginBottom: 8 }}>
              {cap(describeAreas([p.area]))}: {p.score}/10 now{' '}
              <button className="btn btn--ghost btn--small" onClick={() => setPainAfter(painAfter.filter((_, j) => j !== i))}>
                Remove
              </button>
            </p>
          ))}
          {adding ? (
            <PainPicker
              saveLabel="Add"
              onSave={(p) => {
                setPainAfter([...painAfter, p]);
                setAdding(false);
              }}
              onCancel={() => setAdding(false)}
            />
          ) : (
            <>
              <p className="card__body" style={{ marginBottom: 12 }}>
                {painAfter.length || duringPain.length ? 'Anything else hurting now?' : 'Does anything hurt now, even a little?'}
              </p>
              <button className="btn btn--secondary btn--block" onClick={() => setAdding(true)}>
                Add pain
              </button>
            </>
          )}
        </section>

        <section className="card">
          <label className="field__label" htmlFor="notes">
            Notes (optional)
          </label>
          <textarea
            id="notes"
            className="input input--area"
            rows={3}
            placeholder="What worked? What didn't?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{ marginTop: 8 }}
          />
        </section>

        <button className="btn btn--primary btn--block" disabled={rpe === null || saving} onClick={save}>
          {rpe === null ? 'Rate your effort to save' : 'Save session'}
        </button>
        {mode === 'run' && (
          <button className="btn btn--ghost btn--block btn--danger-text" onClick={discard}>
            Discard session
          </button>
        )}
        {mode === 'log' && (
          <button className="btn btn--ghost btn--block" onClick={() => navigate('/')}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
