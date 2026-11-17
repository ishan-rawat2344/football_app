import { useState } from 'react';
import { Link } from 'wouter';
import { KindBadge, SWAP_LABEL, SessionView } from '../components/SessionView';
import { toast } from '../components/Toast';
import type { HealthFlag, SessionType } from '../db/types';
import { useProfile, useRatingHistory, useSetting } from '../hooks/useData';
import { addDays, daysBetween, formatShort } from '../lib/dates';
import { daysSince, timeAgo } from '../lib/format';
import { clearLog, logDay, logPastDay, setGame, setOverride } from '../plan/actions';
import type { DayPlan } from '../plan/types';
import { usePlan, useToday } from '../plan/usePlan';
import { BODY_AREA_LABEL } from '../profile/meta';
import { NoProfile } from './profile/NoProfile';
import { RERATE_AFTER_DAYS, daysSinceLastRating } from './Ratings';

const BACKUP_EVERY_DAYS = 7;

const ROADMAP = [
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

function HealthCard({ flags, today }: { flags: HealthFlag[]; today: string }) {
  const watch = flags.filter((f) => f.status !== 'resolved');
  if (!watch.length) return null;
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

const IN_A_SENTENCE: Partial<Record<SessionType, string>> = {
  groundHard: 'hard ground session',
  groundTech: 'technical ground session',
  home: 'home session',
  sharp: 'sharp session',
  recovery: 'recovery session',
};

/** "Did you do yesterday's session?" — keeps the weekly targets honest. */
function YesterdayCheck({ date, kind }: { date: string; kind: SessionType }) {
  const what = IN_A_SENTENCE[kind];
  if (!what) return null;
  return (
    <section className="card">
      <p className="card__eyebrow">Yesterday</p>
      <h2 className="card__title">Did you do your {what}?</h2>
      <p className="card__body" style={{ marginBottom: 16 }}>
        The plan counts it towards this week's targets and avoids two hard days in a row.
      </p>
      <div className="row">
        <button className="btn btn--secondary" onClick={() => void logPastDay(date, null)}>
          No
        </button>
        <button className="btn btn--primary" onClick={() => void logPastDay(date, kind)}>
          Yes, done
        </button>
      </div>
    </section>
  );
}

function TodaySession({ day }: { day: DayPlan }) {
  const [busy, setBusy] = useState(false);
  const tomorrow = addDays(day.date, 1);
  const done = day.logged === 'done' || day.logged === 'partial';

  async function run(fn: () => Promise<void>, message?: string) {
    setBusy(true);
    try {
      await fn();
      if (message) toast(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={`card card--session ${day.kind === 'game' ? 'card--session-game' : ''}`}>
      <div className="card__head">
        <p className="card__eyebrow" style={{ margin: 0 }}>
          Today{day.lightWeek ? ' · light week' : ''}
        </p>
        <KindBadge day={day} />
      </div>
      <h2 className="session-title">
        {day.title}
        {day.minutes > 0 && <span className="session-title__min"> · {day.minutes} min</span>}
      </h2>
      <p className="session-reason">{day.reasons[0]}</p>
      {day.reasons.slice(1).map((r) => (
        <p key={r} className="session-reason session-reason--extra">
          {r}
        </p>
      ))}

      {day.askGameTomorrow && !done && (
        <div className="ask">
          <p className="ask__q">Signed up for a game tomorrow?</p>
          <p className="ask__hint">If yes, today becomes a short, sharp session instead.</p>
          <div className="row">
            <button className="btn btn--secondary" disabled={busy} onClick={() => run(() => setGame(tomorrow, 'none'))}>
              No
            </button>
            <button
              className="btn btn--primary"
              disabled={busy}
              onClick={() => run(() => setGame(tomorrow, 'planned'), 'Game tomorrow: plan updated')}
            >
              Yes
            </button>
          </div>
        </div>
      )}

      <SessionView blocks={day.blocks} />

      {day.kind === 'rest' && (
        <p className="card__body" style={{ marginTop: 8 }}>
          Nothing to do. A walk is fine. Sleep well.
        </p>
      )}

      {day.kind !== 'rest' && day.kind !== 'game' && day.kind !== 'missed' && (
        <div style={{ marginTop: 16 }}>
          {done ? (
            <div className="done-row">
              <span className="status status--ok">✓ Done</span>
              <button className="btn btn--ghost btn--small" disabled={busy} onClick={() => run(() => clearLog(day.date))}>
                Undo
              </button>
            </div>
          ) : day.logged === 'skipped' ? (
            <div className="done-row">
              <span className="status status--warn">Skipped</span>
              <button className="btn btn--ghost btn--small" disabled={busy} onClick={() => run(() => clearLog(day.date))}>
                Undo
              </button>
            </div>
          ) : (
            <div className="row" style={{ gridTemplateColumns: '1fr 2fr' }}>
              <button className="btn btn--secondary" disabled={busy} onClick={() => run(() => logDay(day, 'skipped'), 'Logged as skipped')}>
                Skip
              </button>
              <button className="btn btn--primary" disabled={busy} onClick={() => run(() => logDay(day, 'done'), 'Nice. Session logged')}>
                Mark done
              </button>
            </div>
          )}
          <p className="field__hint" style={{ marginTop: 8 }}>
            Session mode with timers, effort and pain check-ins arrives in M4.
          </p>
        </div>
      )}

      {day.kind === 'game' && (
        <div className="row" style={{ marginTop: 16 }}>
          <button className="btn btn--secondary" disabled={busy} onClick={() => run(() => setGame(day.date, 'cancelled'), 'Game removed: plan updated')}>
            Game cancelled
          </button>
        </div>
      )}

      {!done && (day.options.length > 0 || day.override) && (
        <div className="swaps">
          <p className="swaps__label">Change today</p>
          <div className="chips">
            {day.override && (
              <button className="chip" onClick={() => run(() => setOverride(day.date, null), 'Back to the plan')}>
                Back to the plan
              </button>
            )}
            {day.options.map((o) => (
              <button key={o} className="chip" onClick={() => run(() => setOverride(day.date, o), 'Plan updated')}>
                {o === 'home' && (day.kind === 'groundHard' || day.kind === 'groundTech')
                  ? "Can't get to the ground"
                  : o === 'groundTech' && day.kind === 'recovery'
                    ? 'Feeling fresh: technical ground session'
                    : SWAP_LABEL[o]}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function GamesCard({ today, days }: { today: string; days: DayPlan[] }) {
  const tomorrow = addDays(today, 1);
  const todayIsGame = days[0]?.kind === 'game';
  const tomorrowIsGame = days[1]?.kind === 'game';
  const next = days.find((d) => d.kind === 'game');
  return (
    <section className="card">
      <p className="card__eyebrow">Games</p>
      <p className="card__body" style={{ marginBottom: 12 }}>
        {next
          ? `Next game: ${next.date === today ? 'today' : next.date === tomorrow ? 'tomorrow' : formatShort(next.date)}.`
          : 'No games in the plan. Tap as soon as you sign up, and the week re-plans around it.'}
      </p>
      <div className="row">
        <button
          className={`btn ${todayIsGame ? 'btn--toggle-on' : 'btn--secondary'}`}
          aria-pressed={todayIsGame}
          onClick={() => void setGame(today, todayIsGame ? null : 'planned')}
        >
          {todayIsGame ? '✓ Game today' : 'Game today'}
        </button>
        <button
          className={`btn ${tomorrowIsGame ? 'btn--toggle-on' : 'btn--secondary'}`}
          aria-pressed={tomorrowIsGame}
          onClick={() => void setGame(tomorrow, tomorrowIsGame ? null : 'planned')}
        >
          {tomorrowIsGame ? '✓ Game tomorrow' : 'Game tomorrow'}
        </button>
      </div>
    </section>
  );
}

export function Today() {
  const today = useToday();
  const profile = useProfile();
  const history = useRatingHistory();
  const lastBackupAt = useSetting<string>('lastBackupAt');
  const plan = usePlan();

  if (profile === 'loading' || history === 'loading' || lastBackupAt === 'loading' || plan === 'loading') return null;

  const sinceRating = daysSinceLastRating(history);
  const sinceBackup = daysSince(lastBackupAt);
  const needsBackup = profile !== null && (sinceBackup === null || sinceBackup >= BACKUP_EVERY_DAYS);
  const needsRating = profile !== null && (sinceRating === null || sinceRating >= RERATE_AFTER_DAYS);
  const day = plan?.days[0];

  return (
    <>
      <p className="card__eyebrow" style={{ marginTop: 8 }}>
        {formatShort(today)}
      </p>
      <h1 className="page-title">
        {profile ? `${greeting()}${profile.name ? `, ${profile.name}` : ''}` : 'Today'}
      </h1>
      {!profile && <p className="page-lede">Your session for the day will show here.</p>}

      <div className="stack" style={{ marginTop: profile ? 12 : 0 }}>
        {!profile && <NoProfile />}

        {plan && plan.yesterday && plan.yesterdayPlanned && (
          <YesterdayCheck date={plan.yesterday.date} kind={plan.yesterdayPlanned as SessionType} />
        )}

        {day && <TodaySession day={day} />}

        {plan && <GamesCard today={today} days={plan.days} />}

        {profile && <HealthCard flags={profile.health} today={today} />}

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

        {profile && profile.goals.weeks4.length > 0 && (
          <section className="card">
            <p className="card__eyebrow">Your next 4 weeks</p>
            <ul className="bullets">
              {profile.goals.weeks4.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
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
