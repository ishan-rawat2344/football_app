import { useState } from 'react';
import { SystemCheck } from '../components/SystemCheck';
import { getTheme, setTheme, type ThemeChoice } from '../lib/theme';

const THEMES: { value: ThemeChoice; label: string }[] = [
  { value: 'system', label: 'Auto' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export function Settings() {
  const [theme, setThemeState] = useState<ThemeChoice>(getTheme);

  function choose(t: ThemeChoice) {
    setTheme(t);
    setThemeState(t);
  }

  return (
    <>
      <h1 className="page-title">Settings</h1>
      <p className="page-lede">Your data stays on this phone.</p>

      <div className="stack">
        <SystemCheck />

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

        <section className="card">
          <p className="card__eyebrow">Coming here</p>
          <ul className="list">
            <li>
              <span>Profile, ratings and health flags</span>
              <span className="coming">M1</span>
            </li>
            <li>
              <span>Backup and restore</span>
              <span className="coming">M1</span>
            </li>
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
