import { useEffect, useRef, useState } from 'react';
import type { HealthFlag } from '../../db/types';
import { DrillDiagramView } from '../../components/DrillDiagram';
import { CUES, nextCue, type CueSet } from '../../drills/cues';
import { getDiagram } from '../../drills/diagrams';
import { getDrill } from '../../drills/library';
import { BLOCK_LABEL } from '../../drills/meta';
import { describeAreas } from '../../drills/personal';
import { LOAD_TAG_AREAS } from '../../drills/types';
import { painLevel } from '../../plan/adapt';
import { say, setSoundEnabled, soundEnabled, sounds, useNow } from '../../session/device';
import { currentItem, secondsLeft, type RunAction, type RunState } from '../../session/run';
import { logPain } from '../../session/save';
import { PainPicker, type PainPick } from './PainPicker';

function useCueCaller(set: CueSet | undefined, active: boolean, onCue: (word: string) => void) {
  const cb = useRef(onCue);
  cb.current = onCue;
  useEffect(() => {
    if (!set || !active) return;
    let last: string | null = null;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const c = nextCue(set, last);
      timer = setTimeout(() => {
        last = c.word;
        cb.current(c.word);
        schedule();
      }, c.delayMs);
    };
    schedule();
    return () => clearTimeout(timer);
  }, [set, active]);
}

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

const fmt = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : String(s));

export function RunView({
  run,
  dispatch,
  flags,
  onEnd,
}: {
  run: RunState;
  dispatch: (a: RunAction) => void;
  flags: HealthFlag[];
  onEnd: () => void;
}) {
  const now = useNow(250);
  const item = currentItem(run)!;
  const drill = getDrill(item.drillId)!;
  const diagram = getDiagram(item.drillId);
  const left = secondsLeft(run, now);
  const paused = run.pausedLeft !== null;
  const [showSteps, setShowSteps] = useState(false);
  const [showDiagram, setShowDiagram] = useState(false);
  const [painOpen, setPainOpen] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: 'amber' | 'red' } | null>(null);
  const [sound, setSound] = useState(soundEnabled);
  const cueSet = CUES[item.drillId];
  const [cueOn, setCueOn] = useState(true);
  const [cueWord, setCueWord] = useState<string | null>(null);

  // Drive the clock.
  useEffect(() => {
    dispatch({ type: 'tick', now });
  }, [now, dispatch]);

  // Sounds on every change of phase, set or drill.
  const step = `${run.index}-${run.set}-${run.phase}`;
  useEffect(() => {
    if (run.phase === 'work') sounds.go();
    else if (run.phase === 'rest') sounds.rest();
    else if (run.phase === 'rate') sounds.done();
  }, [step, run.phase]);

  // Warm-ups and cool-downs are sequences: show their steps from the start.
  useEffect(() => {
    setShowSteps(item.block === 'warmup' || item.block === 'cooldown');
    setShowDiagram(false);
  }, [run.index, item.block]);

  // 3-2-1 countdown beeps.
  const prevLeft = useRef<number | null>(left);
  useEffect(() => {
    if (left !== null && left !== prevLeft.current && left > 0 && left <= 3 && !paused) sounds.tick();
    prevLeft.current = left;
  }, [left, paused]);

  useCueCaller(cueSet, cueOn && run.phase === 'work' && !paused, (word) => {
    setCueWord(word);
    say(word);
    setTimeout(() => setCueWord((c) => (c === word ? null : c)), 1600);
  });

  async function onPain(p: PainPick) {
    setPainOpen(false);
    const report = await logPain({ date: run.date, area: p.area, score: p.score, when: 'during' });
    const level = painLevel(report, flags);
    if (level === 'green') {
      setMessage({ text: `Logged: ${describeAreas([p.area])} ${p.score}/10. Keep going, and stop if it rises.`, tone: 'amber' });
      return;
    }
    // Skip everything left in the session that loads this area.
    const affected = run.items
      .slice(run.index)
      .filter((it) => getDrill(it.drillId)?.loadTags.some((t) => LOAD_TAG_AREAS[t].includes(p.area)))
      .map((it) => it.drillId);
    if (affected.length) dispatch({ type: 'skipDrills', drillIds: affected, now: Date.now() });
    setMessage(
      level === 'red'
        ? {
            tone: 'red',
            text: `${p.score}/10 is too much to train through. Stop the session and rest. If it doesn't settle in a day or two, see a physio or doctor.`,
          }
        : {
            tone: 'amber',
            text: `${cap(describeAreas([p.area]))} at ${p.score}/10: skipping ${affected.length} drill${affected.length === 1 ? '' : 's'} that load it. The plan will protect it for the next 3 days.`,
          },
    );
  }

  const total = run.items.length;
  const position = run.index + 1;
  const phaseClass = run.phase === 'rest' ? 'run--rest' : run.phase === 'rate' ? 'run--rate' : 'run--work';
  const levelText = item.level === -1 ? drill.easier : item.level === 1 ? drill.harder : null;

  return (
    <div className={`run ${phaseClass}`}>
      <div className="run__top">
        <button
          className="run__x"
          aria-label="End session"
          onClick={() => {
            if (window.confirm('End the session now? You can still log what you did.')) onEnd();
          }}
        >
          ✕
        </button>
        <span className="run__progress">
          Drill {position} of {total}
          {run.phase !== 'rate' && item.sets > 1 && ` · set ${run.set} of ${item.sets}`}
        </span>
        <button
          className="run__icon"
          aria-label={sound ? 'Sound on' : 'Sound off'}
          aria-pressed={sound}
          onClick={() => {
            setSoundEnabled(!sound);
            setSound(!sound);
          }}
        >
          {sound ? '🔊' : '🔇'}
        </button>
      </div>

      <div className="run__body">
        <p className="run__eyebrow">
          {BLOCK_LABEL[item.block]}
          {run.light && ' · light version'}
        </p>
        <h1 className="run__title">{drill.name}</h1>
        {levelText && (
          <p className="run__level">
            <strong>{item.level === -1 ? 'Easier: ' : 'Harder: '}</strong>
            {levelText}
          </p>
        )}
        {item.note && <p className="run__note">{item.note}</p>}

        {message && (
          <div className={`run__message run__message--${message.tone}`} role="alert">
            <p>{message.text}</p>
            <div className="row">
              <button className="btn btn--secondary btn--small" onClick={() => setMessage(null)}>
                OK
              </button>
              {message.tone === 'red' && (
                <button className="btn btn--danger btn--small" onClick={onEnd}>
                  End session
                </button>
              )}
            </div>
          </div>
        )}

        {run.phase === 'rate' ? (
          <div className="run__rate">
            <p className="run__q">How was it?</p>
            <div className="stack" style={{ gap: 10 }}>
              <button className="run__choice run__choice--wide" onClick={() => dispatch({ type: 'rate', rating: 'easy', now: Date.now() })}>
                Too easy
              </button>
              <button className="run__choice run__choice--wide" onClick={() => dispatch({ type: 'rate', rating: 'right', now: Date.now() })}>
                About right
              </button>
              <button className="run__choice run__choice--wide" onClick={() => dispatch({ type: 'rate', rating: 'hard', now: Date.now() })}>
                Too hard
              </button>
            </div>
            <p className="run__hint">Too hard once → easier next time. Too easy twice → harder.</p>
          </div>
        ) : (
          <>
            <div className="run__clock" aria-live="polite">
              <p className="run__phase">{run.phase === 'rest' ? 'Rest' : paused ? 'Paused' : item.workSec ? 'Work' : 'Go'}</p>
              {left !== null ? (
                <p className="run__digits">{fmt(left)}</p>
              ) : (
                <p className="run__reps">{item.reps}</p>
              )}
              {left !== null && run.phase === 'work' && (
                <button className="run__finish" onClick={() => dispatch({ type: 'setDone', now: Date.now() })}>
                  Finish this set now
                </button>
              )}
              {left !== null && run.phase === 'work' && <p className="run__reps-small">{item.reps}</p>}
            </div>

            {cueSet && run.phase === 'work' && (
              <button className="run__cue-toggle" aria-pressed={cueOn} onClick={() => setCueOn(!cueOn)}>
                Cue caller: {cueOn ? 'on' : 'off'}
              </button>
            )}
            {cueWord && (
              <div className="run__cue" aria-live="assertive">
                {cueWord}
              </div>
            )}

            {run.phase === 'work' && (
              <ol className="run__points">
                {drill.coachingPoints.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ol>
            )}
            <div className="run__toggles">
              <button className="run__steps-toggle" onClick={() => setShowSteps(!showSteps)}>
                {showSteps ? 'Hide steps' : 'How to do it'}
              </button>
              {diagram && (
                <button className="run__steps-toggle" aria-pressed={showDiagram} onClick={() => setShowDiagram(!showDiagram)}>
                  {showDiagram ? 'Hide diagram' : 'Diagram'}
                </button>
              )}
            </div>
            {showDiagram && diagram && (
              <div className="run__diagram">
                <DrillDiagramView key={drill.id} drill={drill} diagram={diagram} />
              </div>
            )}
            {showSteps && (
              <ol className="run__steps">
                {drill.steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            )}
          </>
        )}
      </div>

      {painOpen && (
        <div className="sheet" role="dialog" aria-label="Log pain">
          <div className="sheet__panel">
            <p className="sheet__title">Where does it hurt?</p>
            <PainPicker onSave={onPain} onCancel={() => setPainOpen(false)} saveLabel="Log pain" />
          </div>
        </div>
      )}

      {run.phase !== 'rate' && (
        <div className="run__controls">
          <button className="run__side" onClick={() => setPainOpen(true)}>
            Pain
          </button>
          {run.phase === 'rest' ? (
            <button className="run__big" onClick={() => dispatch({ type: 'skipRest', now: Date.now() })}>
              Skip rest
            </button>
          ) : item.workSec ? (
            <button className="run__big" onClick={() => dispatch({ type: paused ? 'resume' : 'pause', now: Date.now() })}>
              {paused ? 'Resume' : 'Pause'}
            </button>
          ) : (
            <button className="run__big" onClick={() => dispatch({ type: 'setDone', now: Date.now() })}>
              {item.sets > 1 ? 'Set done' : 'Done'}
            </button>
          )}
          <button className="run__side" onClick={() => dispatch({ type: 'skipDrill', now: Date.now() })}>
            Skip ›
          </button>
        </div>
      )}
    </div>
  );
}
