import { Link } from 'wouter';
import type { HealthFlag } from '../db/types';
import { useProfile, useRatingHistory, useSetting } from '../hooks/useData';
import { daysBetween, formatShort, todayISO } from '../lib/dates';
import { daysSince, timeAgo } from '../lib/format';
import { BODY_AREA_LABEL } from '../profile/meta';
import { NoProfile } from './profile/NoProfile';
import { RERATE_AFTER_DAYS, daysSinceLastRating } from './Ratings';

const BACKUP_EVERY_DAYS = 7;

const ROADMAP = [
  { label: 'The drill library', milestone: 'M2' },
  { label: 'Your rolling training plan', milestone: 'M3' },
  { label: 'Session mode for the pitch', milestone: 'M4' },
  { label: 'Match log and weekly focus', milestone: 'M5' },
  { label: 'Tests, charts and personal bests', milestone: 'M6' },
  { label: 'Mentality coach', milestone: 'M7' },
  { label: 'YouTube tutorials', milestone: 'M8' },
  { label: 'Ask Claude', milestone: 'M9' },
];

function greeting(now = new Date()) {
  const h = now.getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

function HealthCard({ flags }: { flags: HealthFlag[] }) {
  const watch = flags.filter((f) => f.status !== 'resolved');
  if (!watch.length) return null;
  const today = todayISO();
  return (
    <section className="card">
      <p className="card__eyebrow">Look after</p>
      <ul className="list">
        {watch.map((f) => {
          const due = f.reviewBy ? daysBetween(today, f.reviewBy) : null;
          return (
            <li key={f.id} style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 4 }}>
              <strong>{f.title}</strong>
              <span className="muted">
                {f.areas.map((a) => BODY_AREA_LABEL[a]).join(', ')}
                {f.areas.length ? ' · ' : ''}
                amber at {f.amberAt}/10
                {f.reviewBy && due !== null && due > 3 && ` · review ${formatShort(f.reviewBy)}`}
              </span>
              {due !== null && due <= 3 && (
                <span className="notice notice--warn" style={{ marginTop: 6 }}>
                  {due < 0 ? 'Review date has passed' : due === 0 ? 'Review date is today' : `Review date in ${due} days`}
                  : if it still hurts, book a physio before training harder.
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function Today() {
  const profile = useProfile();
  const history = useRatingHistory();
  const lastBackupAt = useSetting<string>('lastBackupAt');

  if (profile === 'loading' || history === 'loading' || lastBackupAt === 'loading') return null;

  const sinceRating = daysSinceLastRating(history);
  const sinceBackup = daysSince(lastBackupAt);
  const needsBackup = profile !== null && (sinceBackup === null || sinceBackup >= BACKUP_EVERY_DAYS);
  const needsRating = profile !== null && (sinceRating === null || sinceRating >= RERATE_AFTER_DAYS);

  return (
    <>
      <p className="card__eyebrow" style={{ marginTop: 8 }}>
        {formatShort(todayISO())}
      </p>
      <h1 className="page-title">
        {profile ? `${greeting()}${profile.name ? `, ${profile.name}` : ''}` : 'Today'}
      </h1>
      <p className="page-lede">
        {profile
          ? 'Your daily session lands here from M3. For now, your coach knows who you are.'
          : 'Your session for the day will show here.'}
      </p>

      <div className="stack">
        {!profile && <NoProfile />}

        {profile && profile.goals.weeks4.length > 0 && (
          <section className="card card--hero">
            <p className="card__eyebrow">Your next 4 weeks</p>
            <ul className="bullets bullets--hero">
              {profile.goals.weeks4.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          </section>
        )}

        {profile && <HealthCard flags={profile.health} />}

        {needsRating && (
          <section className="card">
            <p className="card__eyebrow">Ratings</p>
            <h2 className="card__title">
              {sinceRating === null ? 'Rate your skills' : 'Time to re-rate yourself'}
            </h2>
            <p className="card__body" style={{ marginBottom: 16 }}>
              {sinceRating === null
                ? 'Fourteen quick sliders. They decide what your plan works on first.'
                : `It's been ${sinceRating} days. Honest ratings keep the plan pointed at the right things.`}
            </p>
            <Link href="/ratings" className="btn btn--secondary btn--block">
              Rate now
            </Link>
          </section>
        )}

        {needsBackup && (
          <section className="card">
            <p className="card__eyebrow">Backup</p>
            <h2 className="card__title">
              {sinceBackup === null ? 'Make your first backup' : `Last backup ${timeAgo(lastBackupAt)}`}
            </h2>
            <p className="card__body" style={{ marginBottom: 16 }}>
              Your data lives only on this phone. One tap saves a copy to Files or iCloud Drive.
            </p>
            <Link href="/data" className="btn btn--secondary btn--block">
              Back up
            </Link>
          </section>
        )}

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
