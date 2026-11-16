import { Link } from 'wouter';
import { formatShort, todayISO } from '../lib/dates';
import { isInstalledApp } from '../lib/storage';

const ROADMAP = [
  { label: 'Your profile and ratings', milestone: 'M1' },
  { label: 'The drill library', milestone: 'M2' },
  { label: 'Your rolling training plan', milestone: 'M3' },
  { label: 'Session mode for the pitch', milestone: 'M4' },
  { label: 'Match log and weekly focus', milestone: 'M5' },
  { label: 'Tests, charts and personal bests', milestone: 'M6' },
  { label: 'Mentality coach', milestone: 'M7' },
  { label: 'YouTube tutorials', milestone: 'M8' },
  { label: 'Ask Claude', milestone: 'M9' },
];

export function Today() {
  const installed = isInstalledApp();
  return (
    <>
      <p className="card__eyebrow" style={{ marginTop: 8 }}>
        {formatShort(todayISO())}
      </p>
      <h1 className="page-title">Today</h1>
      <p className="page-lede">Your session for the day will show here.</p>

      <div className="stack">
        <section className="card card--hero">
          <p className="card__eyebrow">Milestone 0</p>
          <h2 className="card__title">Touchline is set up.</h2>
          <p className="card__body">
            This version is the app shell: it installs on your phone, stores data on the device and
            works offline. Your profile arrives in M1 and your first plan in M3.
          </p>
        </section>

        {!installed && (
          <section className="card">
            <p className="card__eyebrow">First step</p>
            <h2 className="card__title">Add it to your home screen</h2>
            <p className="card__body">
              In Safari, tap Share, then <strong>Add to Home Screen</strong>. Open Touchline from the
              icon from now on. That keeps your data safe and lets it work offline.
            </p>
          </section>
        )}

        <section className="card">
          <p className="card__eyebrow">Check it works</p>
          <p className="card__body" style={{ marginBottom: 12 }}>
            Settings shows whether the database, offline mode and home-screen install are working.
          </p>
          <Link href="/settings" className="btn btn--secondary btn--block">
            Open system check
          </Link>
        </section>

        <section className="card">
          <p className="card__eyebrow">What's coming</p>
          <ul className="list">
            {ROADMAP.map((r) => (
              <li key={r.milestone}>
                <span>{r.label}</span>
                <span className="coming">{r.milestone}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
