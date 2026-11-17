import { useState } from 'react';
import { Link } from 'wouter';
import { SystemCheck } from '../components/SystemCheck';
import { useProfile, useRatingHistory, useSetting } from '../hooks/useData';
import { formatShort } from '../lib/dates';
import { timeAgo } from '../lib/format';
import { getTheme, setTheme, type ThemeChoice } from '../lib/theme';
import { FOOT_LABELS } from '../profile/meta';
import { NoProfile } from './profile/NoProfile';

const THEMES: { value: ThemeChoice; label: string }[] = [
  { value: 'system', label: 'Auto' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export function Settings() {
  const [theme, setThemeState] = useState<ThemeChoice>(getTheme);
  const profile = useProfile();
  const history = useRatingHistory();
  const lastBackupAt = useSetting<string>('lastBackupAt');

  function choose(t: ThemeChoice) {
    setTheme(t);
    setThemeState(t);
  }

  const lastRating = history !== 'loading' ? history.at(-1) : undefined;

  return (
    <>
      <h1 className="page-title">Settings</h1>
      <p className="page-lede">Your data stays on this phone.</p>

      <div className="stack">
        {profile === null && <NoProfile compact />}

        {profile && profile !== 'loading' && (
          <section className="card">
            <p className="card__eyebrow">You</p>
            <h2 className="card__title">{profile.name || 'Your profile'}</h2>
            <p className="card__body" style={{ marginBottom: 16 }}>
              {FOOT_LABELS[profile.dominantFoot]}-footed · {profile.positions.join(', ')}
              {lastRating && ` · ratings from ${formatShort(lastRating.date)}`}
            </p>
            <div className="row">
              <Link href="/profile" className="btn btn--secondary">
                Profile
              </Link>
              <Link href="/ratings" className="btn btn--secondary">
                Ratings
              </Link>
            </div>
          </section>
        )}

        <section className="card">
          <p className="card__eyebrow">Your data</p>
          <p className="card__body" style={{ marginBottom: 16 }}>
            Last backup: <strong>{lastBackupAt === 'loading' ? '…' : timeAgo(lastBackupAt)}</strong>
          </p>
          <Link href="/data" className="btn btn--secondary btn--block">
            Back up, restore or import
          </Link>
        </section>

        <section className="card">
          <p className="card__eyebrow">Appearance</p>
          <div className="segmented" role="group" aria-label="Theme">
            {THEMES.map((t) => (
              <button key={t.value} aria-pressed={theme === t.value} onClick={() => choose(t.value)}>
                {t.label}
              </button>
            ))}
          </div>
          <p className="card__body" style={{ marginTop: 12 }}>
            Auto follows your phone's light or dark setting.
          </p>
        </section>

        <SystemCheck />

        <section className="card">
          <p className="card__eyebrow">Coming here</p>
          <ul className="list">
            <li>
              <span>YouTube API key</span>
              <span className="coming">M8</span>
            </li>
            <li>
              <span>Ask Claude</span>
              <span className="coming">M9</span>
            </li>
          </ul>
        </section>
      </div>
    </>
  );
}
