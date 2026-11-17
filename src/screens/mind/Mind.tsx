import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'wouter';
import { db } from '../../db/db';
import { useProfile } from '../../hooks/useData';
import { lowerFirst } from '../../lib/format';
import { LESSONS, lessonsFor } from '../../mind/lessons';
import { resetWord } from '../../mind/routine';
import { usePlan } from '../../plan/usePlan';
import { NoProfile } from '../profile/NoProfile';

export function Mind() {
  const profile = useProfile();
  const plan = usePlan(2);
  const read = useLiveQuery(async () => new Set((await db.lessonProgress.toArray()).map((x) => x.lessonId)), [], null);
  if (profile === 'loading' || plan === 'loading' || read === null) return null;
  if (!profile) {
    return (
      <>
        <h1 className="page-title">Mind</h1>
        <NoProfile />
      </>
    );
  }

  const today = plan?.days[0];
  const routineMode = today?.kind === 'game' ? 'Game morning' : today?.gameTomorrow ? 'Tonight, before your game' : null;
  const focusKeys = plan?.focus.areas.map((a) => a.key) ?? [];
  const forFocus = plan?.focus.basedOn === 'matches' ? lessonsFor(focusKeys).slice(0, 2) : [];
  const reset = resetWord(profile.mind.cueWords);

  return (
    <>
      <h1 className="page-title">Mind</h1>
      <p className="page-lede">Keep wanting the ball, especially after you lose it.</p>

      <div className="stack">
        {routineMode && (
          <Link href="/mind/routine" className="card card--hero card--link">
            <div>
              <p className="card__eyebrow">{routineMode}</p>
              <h2 className="card__title">Pre-match routine</h2>
              <p className="card__body">
                {today?.kind === 'game' ? 'Water, snack, activation, cue words, first action.' : 'Kit, dinner, your plans, visualisation, bedtime.'}
              </p>
            </div>
            <span className="chevron" aria-hidden="true" style={{ color: '#fff' }}>
              ›
            </span>
          </Link>
        )}

        {forFocus.length > 0 && (
          <section className="card">
            <p className="card__eyebrow">For this week's focus</p>
            <ul className="list">
              {forFocus.map((l) => (
                <li key={l.id}>
                  <Link href={`/mind/lessons/${l.id}`} className="list-link">
                    <span>{l.title}</span>
                    <span className="chevron" aria-hidden="true">
                      ›
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="tiles">
          <Link href="/mind/reset" className="tile">
            <span className="tile__title">Reset</span>
            <span className="tile__sub">After a mistake: clap, breathe, "{reset}", show again.</span>
          </Link>
          <Link href="/mind/visualise" className="tile">
            <span className="tile__title">Visualise</span>
            <span className="tile__sub">3 minutes. Three game moments in your own words.</span>
          </Link>
          <Link href="/mind/routine" className="tile">
            <span className="tile__title">Routine</span>
            <span className="tile__sub">The night before and the morning of a game.</span>
          </Link>
        </div>

        <section className="card">
          <div className="card__head">
            <p className="card__eyebrow" style={{ margin: 0 }}>
              Your words
            </p>
            <Link href="/profile/edit/mind" className="btn btn--small btn--secondary">
              Edit
            </Link>
          </div>
          {profile.mind.cueWords.length > 0 ? (
            <div className="chips chips--static" style={{ marginBottom: 12 }}>
              {profile.mind.cueWords.map((w) => (
                <span key={w} className="chip" aria-pressed="true">
                  {w}
                </span>
              ))}
            </div>
          ) : (
            <p className="card__body">No cue words yet. Two or three short ones work best.</p>
          )}
          <p className="mini-heading">If → then</p>
          {profile.mind.ifThen.length ? (
            <ul className="ifthen">
              {profile.mind.ifThen.map((x) => (
                <li key={x.id}>
                  <span className="ifthen__if">If {lowerFirst(x.when)}</span>
                  <span className="ifthen__then">→ {lowerFirst(x.then)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="card__body">No plans yet. Add one: a situation you can see, and the move you'll make.</p>
          )}
        </section>

        <section className="card">
          <p className="card__eyebrow">
            Lessons · {LESSONS.filter((l) => read.has(l.id)).length} of {LESSONS.length} read
          </p>
          <ul className="list">
            {LESSONS.map((l) => (
              <li key={l.id}>
                <Link href={`/mind/lessons/${l.id}`} className="list-link">
                  <span>
                    {l.title}
                    <br />
                    <span className="muted" style={{ fontSize: 'var(--fs-xs)' }}>
                      {l.minutes} min{read.has(l.id) ? ' · ✓ read' : ''}
                    </span>
                  </span>
                  <span className="chevron" aria-hidden="true">
                    ›
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
