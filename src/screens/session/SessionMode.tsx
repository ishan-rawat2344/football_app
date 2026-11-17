import { useCallback, useEffect, useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { usePlan } from '../../plan/usePlan';
import { unlockAudio, useWakeLock } from '../../session/device';
import { initRun, runReducer, type RunAction, type RunState } from '../../session/run';
import { loadActiveRun, saveActiveRun } from '../../session/save';
import { NoProfile } from '../profile/NoProfile';
import { ReadinessView } from './Readiness';
import { RunView } from './RunView';
import { SessionSummary } from './Summary';

/**
 * Full-screen session mode: readiness → drills → log. Also handles
 * /session/:date/log (log a session done without session mode).
 */
export function SessionMode() {
  const { date = '' } = useParams<{ date: string }>();
  const [location, navigate] = useLocation();
  const logOnly = location.endsWith('/log');
  const plan = usePlan();
  const [run, setRun] = useState<RunState | null | 'loading'>('loading');

  useEffect(() => {
    void loadActiveRun().then((r) => setRun(r && r.date === date ? r : null));
  }, [date]);

  useWakeLock(run !== 'loading' && run !== null && run.phase !== 'done');

  const dispatch = useCallback((a: RunAction) => {
    setRun((prev) => {
      if (!prev || prev === 'loading') return prev;
      const next = runReducer(prev, a);
      if (next !== prev) void saveActiveRun(next);
      return next;
    });
  }, []);

  if (plan === 'loading' || run === 'loading') return null;
  if (plan === null) return <NoProfile />;

  const day = plan.days.find((d) => d.date === date);
  const flags = plan.input.profile.health;

  if (!day || day.kind === 'rest' || day.kind === 'missed' || !day.blocks.length) {
    return (
      <div className="summary">
        <h1 className="page-title">Nothing to run</h1>
        <p className="page-lede">There's no session planned for this day.</p>
        <button className="btn btn--secondary btn--block" onClick={() => navigate('/')}>
          Back to Today
        </button>
      </div>
    );
  }

  if (logOnly) return <SessionSummary mode="log" day={day} flags={flags} />;

  if (!run) {
    return (
      <ReadinessView
        day={day}
        onCancel={() => navigate('/')}
        onStart={(readiness, light) => {
          unlockAudio();
          const r = initRun({ date, kind: day.kind as RunState['kind'], blocks: day.blocks, now: Date.now(), readiness, light });
          setRun(r);
          void saveActiveRun(r);
        }}
      />
    );
  }

  if (run.phase === 'done') return <SessionSummary mode="run" day={day} run={run} flags={flags} />;

  return (
    <RunView
      run={run}
      dispatch={dispatch}
      flags={flags}
      onEnd={() => dispatch({ type: 'end', now: Date.now() })}
    />
  );
}

