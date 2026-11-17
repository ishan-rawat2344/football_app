import { useState } from 'react';
import { Link } from 'wouter';
import { saveProfile } from '../../data/dataOps';
import { defaultProfile } from '../../profile/meta';

/** Shown wherever a profile is needed but none exists yet. */
export function NoProfile({ compact = false }: { compact?: boolean }) {
  const [busy, setBusy] = useState(false);

  async function startBlank() {
    setBusy(true);
    await saveProfile(defaultProfile());
  }

  return (
    <section className={compact ? 'card' : 'card card--hero'}>
      <p className="card__eyebrow">Set up</p>
      <h2 className="card__title">Bring in your profile</h2>
      <p className="card__body" style={{ marginBottom: 16 }}>
        Import the profile file made from your interview. It has your ratings, goals, schedule and
        health notes, so your coach starts out knowing you.
      </p>
      <div className="stack">
        <Link href="/data" className="btn btn--primary btn--block">
          Import profile file
        </Link>
        <button className="btn btn--secondary btn--block" onClick={startBlank} disabled={busy}>
          Start with a blank profile
        </button>
      </div>
    </section>
  );
}
