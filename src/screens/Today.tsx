import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { FocusCard } from '../components/FocusCard';
import { KindBadge, SWAP_LABEL, SessionView } from '../components/SessionView';
import { toast } from '../components/Toast';
import { db } from '../db/db';
import type { BodyArea, Game, HealthFlag, MatchLog, PainReport, SessionType } from '../db/types';
import { describeAreas } from '../drills/personal';
import { describeRestriction, type AreaRestriction } from '../plan/adapt';
import type { RunState } from '../session/run';
import { logPain } from '../session/save';
import type { TestResult } from '../db/types';
import { dueTests } from '../tests/results';
import { LOAD_TAG_AREAS } from '../drills/types';
import { useProfile, useRatingHistory, useSetting } from '../hooks/useData';
import { addDays, daysBetween, formatShort } from '../lib/dates';
import { daysSince, timeAgo } from '../lib/format';
import { clearLog, logDay, logPastDay, setGame, setOverride } from '../plan/actions';
import type { Streak } from '../plan/engine';
import type { DayPlan } from '../plan/types';
import { usePlan, useToday } from '../plan/usePlan';
import { BODY_AREA_LABEL } from '../profile/meta';
import { NoProfile } from './profile/NoProfile';
import { RERATE_AFTER_DAYS, daysSinceLastRating } from './Ratings';

const BACKUP_EVERY_DAYS = 7;

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

const ROADMAP = [
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

function TodaySession({ day, activeRun }: { day: DayPlan; activeRun: RunState | null }) {
  const [busy, setBusy] = useState(false);
  const [, navigate] = useLocation();
  const resumable = activeRun?.date === day.date && activeRun.phase !== 'done';
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
            <div className="stack" style={{ gap: 8 }}>
              <button className="btn btn--primary btn--block btn--lg" disabled={busy} onClick={() => navigate(`/session/${day.date}`)}>
                {resumable ? 'Resume session' : 'Start session'}
              </button>
              <div className="row">
                <button className="btn btn--secondary" disabled={busy} onClick={() => run(() => logDay(day, 'skipped'), 'Logged as skipped')}>
                  Skip today
                </button>
                <button className="btn btn--secondary" disabled={busy} onClick={() => navigate(`/session/${day.date}/log`)}>
                  Log it
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {day.kind === 'game' && (
        <div className="row" style={{ marginTop: 16, gridTemplateColumns: '1fr 2fr' }}>
          <button className="btn btn--secondary" disabled={busy} onClick={() => run(() => setGame(day.date, 'cancelled'), 'Game removed: plan updated')}>
            Cancelled
          </button>
          <button className="btn btn--primary" disabled={busy} onClick={() => navigate(`/match/new/${day.date}`)}>
            Log your match
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

/** The plan is protecting these areas because of pain you logged. */
function ProtectingCard({ restrictions }: { restrictions: AreaRestriction[] }) {
  if (!restrictions.length) return null;
  const red = restrictions.some((r) => r.level === 'red');
  return (
    <section className={`card card--alert ${red ? 'card--alert-stop' : 'card--alert-caution'}`} role="note">
      <p className="card__eyebrow">{red ? 'Pain is high' : 'Protecting'}</p>
      <ul className="bullets">
        {restrictions.map((r) => (
          <li key={r.area}>
            {cap(describeRestriction(r))}. Drills that load it are out until {formatShort(r.until)}.
          </li>
        ))}
      </ul>
      {red && (
        <p className="card__body" style={{ marginTop: 10, color: 'var(--text)' }}>
          Don't train through it. If it hasn't settled in a day or two, or it hurts at rest, see a physio or
          doctor.
        </p>
      )}
    </section>
  );
}

/** "How's your groin this morning?" after a session where you logged pain. */
function MorningCheck({ today, pain }: { today: string; pain: PainReport[] }) {
  const yesterday = addDays(today, -1);
  const areas = [
    ...new Set(pain.filter((p) => p.date === yesterday && p.score >= 1 && p.when !== 'nextMorning').map((p) => p.area)),
  ].filter((a) => !pain.some((p) => p.date === today && p.when === 'nextMorning' && p.area === a));
  const [scores, setScores] = useState<Partial<Record<BodyArea, number>>>({});
  if (!areas.length) return null;
  return (
    <section className="card">
      <p className="card__eyebrow">Morning check</p>
      {areas.map((a) => {
        const v = scores[a] ?? 0;
        return (
          <div key={a} style={{ marginBottom: 16 }}>
            <div className="rating__head">
              <label className="card__title" style={{ margin: 0 }} htmlFor={`m-${a}`}>
                How's your {describeAreas([a])} this morning?
              </label>
              <output className={`pain-score pain-score--${v >= 5 ? 'red' : v >= 2 ? 'amber' : 'green'}`}>{v}</output>
            </div>
            <input id={`m-${a}`} className="range" type="range" min={0} max={10} value={v} onChange={(e) => setScores({ ...scores, [a]: Number(e.target.value) })} />
            <button
              className="btn btn--secondary btn--block"
              style={{ marginTop: 8 }}
              onClick={() =>
                void logPain({ date: today, area: a, score: v, when: 'nextMorning' }).then(() =>
                  toast(v >= 2 ? 'Logged. The plan will go easy on it.' : 'Logged. Good news.'),
                )
              }
            >
              Save
            </button>
          </div>
        );
      })}
      <p className="field__hint">Pain that's still there the next morning tells the plan more than pain during training.</p>
    </section>
  );
}

/** A game in the last few days with no match log yet. */
function LogMatchPrompt({ today, games, matches }: { today: string; games: Game[]; matches: MatchLog[] }) {
  const pending = games
    .filter((g) => (g.status === 'planned' || g.status === 'played') && g.date < today && g.date >= addDays(today, -3))
    .filter((g) => !matches.some((m) => m.date === g.date))
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!pending) return null;
  return (
    <section className="card">
      <p className="card__eyebrow">Your last game</p>
      <h2 className="card__title">How did {formatShort(pending.date)} go?</h2>
      <p className="card__body" style={{ marginBottom: 16 }}>
        30 seconds of numbers sets next week's focus. Fill in details from the recording later.
      </p>
      <Link href={`/match/new/${pending.date}`} className="btn btn--primary btn--block">
        Log the match
      </Link>
    </section>
  );
}

/** Tests due, matched to where today's session happens. */
function TestDayCard({ day, results, today }: { day: DayPlan; results: TestResult[]; today: string }) {
  const atGround = day.kind === 'groundHard' || day.kind === 'groundTech';
  const atHome = day.kind === 'home';
  if (!atGround && !atHome) return null;
  const due = dueTests(results, today).filter((d) =>
    atGround ? d.test.where === 'ground' : d.test.where === 'terrace' || d.test.where === 'room',
  );
  // Sprinting only on a hard ground day; nothing that loads an area you're protecting.
  const protectedAreas = new Set(day.restrictions.map((r) => r.area));
  const fit = due
    .filter((d) => d.test.id !== 'sprint-30' || day.kind === 'groundHard')
    .filter((d) => !d.test.loadTags.some((t) => LOAD_TAG_AREAS[t].some((a) => protectedAreas.has(a))));
  if (!fit.length) return null;
  const baseline = results.length === 0;
  return (
    <section className="card">
      <p className="card__eyebrow">{baseline ? 'Baseline tests' : 'Test day'}</p>
      <p className="card__body" style={{ marginBottom: 8 }}>
        {baseline
          ? 'Do these after your warm-up today to set your starting numbers.'
          : 'Due again (every 4 weeks). Do them after your warm-up.'}
      </p>
      <ul className="list">
        {fit.map((d) => (
          <li key={d.test.id}>
            <Link href={`/tests/${d.test.id}`} className="list-link">
              <span>{d.test.name}</span>
              <span className="chevron" aria-hidden="true">
                ›
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The night before a game, and game morning: open the pre-match routine. */
function RoutineCard({ day, nextDate }: { day: DayPlan; nextDate?: string }) {
  const morning = day.kind === 'game';
  const evening = !morning && day.gameTomorrow;
  const key = morning ? `routine:${day.date}:morning` : `routine:${nextDate}:evening`;
  const done = useLiveQuery(async () => ((await db.settings.get(key))?.value as string[] | undefined)?.length ?? 0, [key], 0);
  if (!morning && !evening) return null;
  return (
    <Link href="/mind/routine" className="card card--hero card--link">
      <div>
        <p className="card__eyebrow">{morning ? 'Game morning' : 'Tonight'}</p>
        <h2 className="card__title">Pre-match routine</h2>
        <p className="card__body">
          {morning ? 'Water, a small snack, activation, cue words, first action.' : 'Kit, dinner, your plans, 3 minutes of visualisation, bedtime.'}
          {done > 0 && ` ${done} of 5 done.`}
        </p>
      </div>
      <span className="chevron" aria-hidden="true" style={{ color: '#fff' }}>
        ›
      </span>
    </Link>
  );
}

function StreakPill({ streak }: { streak: Streak }) {
  if (!streak.current && !streak.best) return null;
  return (
    <span className="streak">
      {streak.current} in a row
      {streak.best > streak.current && <span className="muted"> · best {streak.best}</span>}
    </span>
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
  const activeRun = useLiveQuery(async () => ((await db.settings.get('activeRun'))?.value as RunState | undefined) ?? null, [], null);
  const testResults = useLiveQuery(() => db.testResults.toArray(), [], [] as TestResult[]);

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
      {plan && <StreakPill streak={plan.streak} />}

      <div className="stack" style={{ marginTop: profile ? 12 : 0 }}>
        {!profile && <NoProfile />}

        {plan && plan.yesterday && plan.yesterdayPlanned && (
          <YesterdayCheck date={plan.yesterday.date} kind={plan.yesterdayPlanned as SessionType} />
        )}

        {plan && <MorningCheck today={today} pain={plan.input.pain ?? []} />}

        {day && <ProtectingCard restrictions={day.restrictions} />}

        {plan && <LogMatchPrompt today={today} games={plan.input.games} matches={plan.input.matches ?? []} />}

        {day && day.kind === 'game' && <RoutineCard day={day} />}

        {day && <TodaySession day={day} activeRun={activeRun} />}

        {day && day.kind !== 'game' && <RoutineCard day={day} nextDate={plan?.days[1]?.date} />}

        {day && !day.logged && <TestDayCard day={day} results={testResults} today={today} />}

        {plan && <FocusCard focus={plan.focus} ratings={plan.input.ratings} />}

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
