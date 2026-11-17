import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { BackLink } from '../../components/forms';
import { useProfile } from '../../hooks/useData';
import { resetWord } from '../../mind/routine';
import { say, sounds, unlockAudio } from '../../session/device';

const STEP_MS = 1300;

/** The reset routine, big enough to read at a glance, with a practice run. */
export function ResetScreen() {
  const profile = useProfile();
  const [step, setStep] = useState<number | null>(null);
  const word = profile && profile !== 'loading' ? resetWord(profile.mind.cueWords) : 'Next';

  const steps = [
    { big: 'Clap', small: 'One clap, or wipe your hands on your shorts.' },
    { big: 'Breathe out', small: 'One long breath out. Shoulders down.' },
    { big: `"${word}"`, small: 'Say it, out loud or in your head.' },
    { big: 'Show for it', small: 'Within 5 seconds: press, recover, or hand out and call for the ball.' },
  ];

  // Practice run: walk through the four steps on a beat, with a beep and the word spoken.
  useEffect(() => {
    if (step === null) return;
    if (step >= steps.length) {
      sounds.done();
      const t = setTimeout(() => setStep(null), 1500);
      return () => clearTimeout(t);
    }
    sounds.tick();
    if (step === 2) say(word);
    const t = setTimeout(() => setStep(step + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [step, steps.length, word]);

  return (
    <>
      <BackLink href="/mind" label="Mind" />
      <h1 className="page-title">Reset</h1>
      <p className="page-lede">Three seconds after a mistake. The same every time, so it needs no thinking.</p>

      <ol className="reset">
        {steps.map((s, i) => (
          <li key={s.big} className={`reset__step ${step === i ? 'reset__step--on' : ''} ${step !== null && step > i ? 'reset__step--done' : ''}`}>
            <span className="reset__n">{i + 1}</span>
            <span>
              <span className="reset__big">{s.big}</span>
              <span className="reset__small">{s.small}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className="stack" style={{ marginTop: 16 }}>
        <button
          className="btn btn--primary btn--block btn--lg"
          disabled={step !== null}
          onClick={() => {
            unlockAudio();
            setStep(0);
          }}
        >
          {step === null ? 'Practise it' : step >= steps.length ? 'Done. Again whenever you like.' : 'Go…'}
        </button>
        <p className="field__hint">
          Then practise it for real in the "Show again" drill, every time a rep goes wrong. Change the word in your cue
          words.
        </p>
        <Link href="/drills/mv-show-again" className="btn btn--secondary btn--block">
          Show again: the 5-second rule
        </Link>
        <Link href="/mind/lessons/reset" className="btn btn--ghost btn--block">
          Why it works
        </Link>
      </div>
    </>
  );
}
