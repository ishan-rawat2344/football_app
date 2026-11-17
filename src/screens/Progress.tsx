import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'wouter';
import { db } from '../db/db';
import type { MatchLog } from '../db/types';
import { averages } from '../focus/focus';
import { useProfile } from '../hooks/useData';
import { formatShort, todayISO } from '../lib/dates';

const r1 = (n: number) => (Math.round(n * 10) / 10).toString();
const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : '–');

function Stat({ label, value, sub, ok }: { label: string; value: string; sub?: string; ok?: boolean }) {
  return (
    <div className="stat">
      <span className="stat__value">
        {value}
        {ok && <span className="stat__mark stat__mark--ok">✓</span>}
      </span>
      <span className="stat__label">{label}</span>
      {sub && <span className="stat__sub">{sub}</span>}
    </div>
  );
}

function Season({ matches, targets }: { matches: MatchLog[]; targets: { dribbleAttemptsMin: number; leftFootPassesMin: number } }) {
  const a = averages(matches);
  const sum = (k: keyof MatchLog) => matches.reduce((t, m) => t + ((m[k] as number | undefined) ?? 0), 0);
  const goals = sum('goals');
  const assists = sum('assists');
  const att = sum('dribblesAttempted');
  const won = sum('dribblesWon');
  const shots = sum('shots');
  const onT = sum('shotsOnTarget');
  return (
    <section className="card">
      <p className="card__eyebrow">
        {matches.length} game{matches.length === 1 ? '' : 's'} logged
      </p>
      <div className="stats">
        <Stat label="Goals" value={String(goals)} sub={`${r1(goals / matches.length)} a game`} />
        <Stat label="Assists" value={String(assists)} sub={`${r1(assists / matches.length)} a game`} />
        <Stat
          label="1v1s a game"
          value={r1(a.attempts)}
          sub={`${pct(won, att)} won`}
          ok={a.attempts >= targets.dribbleAttemptsMin}
        />
        <Stat label="Left-foot actions" value={r1(a.leftFoot)} sub="a game" ok={a.leftFoot >= targets.leftFootPassesMin} />
        <Stat label="Shots a game" value={r1(a.shots)} sub={`${pct(onT, shots)} on target`} />
        <Stat label="Confidence" value={a.confidence !== null ? r1(a.confidence) : '–'} sub="out of 10" />
      </div>
      <p className="field__hint" style={{ marginTop: 10 }}>
        ✓ = meeting your per-game minimum ({targets.dribbleAttemptsMin} 1v1s, {targets.leftFootPassesMin} left-foot actions).
      </p>
    </section>
  );
}

function MatchRow({ m }: { m: MatchLog }) {
  const ga = [m.goals ? `${m.goals} G` : '', m.assists ? `${m.assists} A` : ''].filter(Boolean).join(' · ') || 'No G/A';
  return (
    <li>
      <Link href={`/match/${m.id}`} className="match-row">
        <span className="match-row__date">{formatShort(m.date)}</span>
        <span className="match-row__main">
          <strong>{ga}</strong>
          <span className="muted">
            1v1 {m.dribblesWon ?? 0}/{m.dribblesAttempted ?? 0} · LF {m.leftFootTouches ?? 0}
            {m.confidence ? ` · conf ${m.confidence}` : ''}
          </span>
        </span>
        <span className="chevron" aria-hidden="true">
          ›
        </span>
      </Link>
    </li>
  );
}

export function Progress() {
  const profile = useProfile();
  const matches = useLiveQuery(() => db.matchLogs.orderBy('date').reverse().toArray(), [], null);
  if (profile === 'loading' || matches === null) return null;

  return (
    <>
      <h1 className="page-title">Progress</h1>
      <p className="page-lede">Your games, measured against your targets. Tests and charts arrive in M6.</p>

      <div className="stack">
        <Link href={`/match/new/${todayISO()}`} className="btn btn--primary btn--block btn--lg">
          Log a match
        </Link>

        {matches.length === 0 ? (
          <section className="card">
            <p className="card__eyebrow">Matches</p>
            <p className="card__body">
              No games logged yet. After your next game, tap Log a match: it takes about 30 seconds and sets
              next week's focus.
            </p>
          </section>
        ) : (
          <>
            {profile && <Season matches={matches} targets={profile.matchTargets} />}
            {matches.length >= 2 && profile && (
              <section className="card">
                <p className="card__eyebrow">Last 3 games vs before</p>
                <Trend matches={matches} />
              </section>
            )}
            <section className="card">
              <p className="card__eyebrow">All games</p>
              <ul className="match-list">
                {matches.map((m) => (
                  <MatchRow key={m.id} m={m} />
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </>
  );
}

/** Recent form against earlier games, so improvement is visible before the charts arrive. */
function Trend({ matches }: { matches: MatchLog[] }) {
  const recent = averages(matches.slice(0, 3));
  const before = matches.length > 3 ? averages(matches.slice(3)) : null;
  const rows: [string, number, number | null][] = [
    ['1v1s tried', recent.attempts, before?.attempts ?? null],
    ['Left-foot actions', recent.leftFoot, before?.leftFoot ?? null],
    ['Shots', recent.shots, before?.shots ?? null],
    ['Confidence', recent.confidence ?? 0, before?.confidence ?? null],
  ];
  return (
    <ul className="list">
      {rows.map(([label, now, then]) => (
        <li key={label}>
          <span>{label}</span>
          <span className="muted">
            {r1(now)}
            {then !== null && (
              <span className={`delta ${now > then ? 'delta--up' : now < then ? 'delta--down' : ''}`}>
                {' '}
                {now > then ? '▲' : now < then ? '▼' : '–'} from {r1(then)}
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
