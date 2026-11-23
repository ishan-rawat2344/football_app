import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'wouter';
import { BarChart, LineChart, Sparkline } from '../components/charts';
import { db } from '../db/db';
import type { MatchLog, TestResult } from '../db/types';
import { averages } from '../focus/focus';
import { useProfile } from '../hooks/useData';
import { formatShort, fromISODate, todayISO } from '../lib/dates';
import type { Streak } from '../plan/engine';
import { usePlan } from '../plan/usePlan';
import { formatValue, TESTS } from '../tests/defs';
import { dueTests, footRatio, forTest, personalBest, weeklyLoads } from '../tests/results';

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

function FilmCard({ matches }: { matches: MatchLog[] }) {
  const counts = useLiveQuery(
    async () => {
      const map = new Map<number, number>();
      for (const t of await db.filmTags.toArray()) map.set(t.matchId, (map.get(t.matchId) ?? 0) + 1);
      return map;
    },
    [],
    new Map<number, number>(),
  );
  return (
    <section className="card">
      <p className="card__eyebrow">Film room</p>
      <p className="card__body" style={{ marginBottom: 8 }}>
        Watch a game, tag your moments, and find your patterns.
      </p>
      <ul className="list">
        {matches.slice(0, 3).map((m) => {
          const n = counts.get(m.id!) ?? 0;
          const status = m.filmReviewedAt ? 'reviewed' : n ? `${n} tag${n === 1 ? '' : 's'}` : m.recordingUrl ? 'video added' : 'no video yet';
          return (
            <li key={m.id}>
              <span>
                {formatShort(m.date)} <span className="muted">· {status}</span>
              </span>
              <Link href={`/film/${m.id}`} className="btn btn--small btn--secondary">
                {n && !m.filmReviewedAt ? 'Continue' : 'Open'}
              </Link>
            </li>
          );
        })}
      </ul>
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
  const plan = usePlan(1);
  const matches = useLiveQuery(() => db.matchLogs.orderBy('date').reverse().toArray(), [], null);
  const results = useLiveQuery(() => db.testResults.toArray(), [], null);
  if (profile === 'loading' || matches === null || results === null || plan === 'loading') return null;
  const today = todayISO();

  return (
    <>
      <h1 className="page-title">Progress</h1>
      <p className="page-lede">Tests every 4 weeks, your games against your targets, and how much you train.</p>

      <div className="stack">
        <Link href={`/match/new/${today}`} className="btn btn--primary btn--block btn--lg">
          Log a match
        </Link>

        {matches.length > 0 && <FilmCard matches={matches} />}

        <TestsCard results={results} today={today} />

        <BestsCard results={results} matches={matches} streak={plan?.streak} />

        {matches.length >= 2 && profile && <MatchCharts matches={matches} targets={profile.matchTargets} />}

        {plan && (
          <LoadCard
            weeks={weeklyLoads(plan.input.logs, plan.input.games, plan.input.matches ?? [], today, 8)}
          />
        )}

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
              <Link href="/ask/game" className="btn btn--secondary btn--block" style={{ marginTop: 14 }}>
                Ask Claude about your last game
              </Link>
            </section>
          </>
        )}
      </div>
    </>
  );
}

const shortDate = (iso: string) => fromISODate(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

function TestsCard({ results, today }: { results: TestResult[]; today: string }) {
  const due = dueTests(results, today);
  const ratio = footRatio(results);
  const neverDone = results.length === 0;
  return (
    <section className="card">
      <div className="card__head">
        <p className="card__eyebrow" style={{ margin: 0 }}>
          Tests · every 4 weeks
        </p>
        {due.length > 0 && <span className="tag tag--focus">{neverDone ? 'Baseline due' : `${due.length} due`}</span>}
      </div>
      {neverDone && (
        <p className="card__body" style={{ marginBottom: 8 }}>
          Do each test once to set your baseline. Spread them over a ground session and a home session. Then
          every 4 weeks you can see exactly what improved.
        </p>
      )}
      <ul className="match-list">
        {TESTS.map((t) => {
          const rs = forTest(results, t.id);
          const latest = rs.at(-1);
          const pb = personalBest(t, results);
          const isDue = due.some((d) => d.test.id === t.id);
          return (
            <li key={t.id}>
              <Link href={`/tests/${t.id}`} className="test-row">
                <span className="test-row__name">
                  {t.name}
                  <span className="test-row__sub">
                    {!latest
                      ? 'Not done yet'
                      : `${shortDate(latest.date)}${pb && rs.length > 1 ? ` · PB ${formatValue(t, pb.value)}` : ''}${isDue ? ' · due' : ''}`}
                  </span>
                </span>
                <Sparkline values={rs.map((r) => (t.better === 'lower' ? -r.value : r.value))} />
                <span className="test-row__value">{latest ? formatValue(t, latest.value) : '–'}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      {ratio && (
        <p className="field__hint" style={{ marginTop: 10 }}>
          Weak foot vs strong foot (wall passes, {shortDate(ratio.date)}): your left does{' '}
          <strong>{Math.round(ratio.ratio * 100)}%</strong> of your right. Closing that gap is the goal.
        </p>
      )}
      <p className="field__hint" style={{ marginTop: 6 }}>Sparklines point up when you improve, even for times.</p>
    </section>
  );
}

function BestsCard({ results, matches, streak }: { results: TestResult[]; matches: MatchLog[]; streak?: Streak }) {
  const testPBs = TESTS.map((t) => ({ t, pb: personalBest(t, results) })).filter((x) => x.pb);
  const best = (k: keyof MatchLog) =>
    matches.reduce<MatchLog | null>((b, m) => (((m[k] as number) ?? 0) > (((b?.[k] as number) ?? 0)) ? m : b), null);
  const matchBests: [string, MatchLog | null, keyof MatchLog][] = [
    ['Goals in a game', best('goals'), 'goals'],
    ['Assists in a game', best('assists'), 'assists'],
    ['1v1s won in a game', best('dribblesWon'), 'dribblesWon'],
    ['Left-foot actions in a game', best('leftFootTouches'), 'leftFootTouches'],
  ];
  const shown = matchBests.filter(([, m, k]) => m && ((m[k] as number) ?? 0) > 0);
  if (!testPBs.length && !shown.length && !streak?.best) return null;
  return (
    <section className="card">
      <p className="card__eyebrow">Personal bests</p>
      <ul className="list">
        {testPBs.map(({ t, pb }) => (
          <li key={t.id}>
            <span>{t.name}</span>
            <span>
              <strong>{formatValue(t, pb!.value)}</strong> <span className="muted">{shortDate(pb!.date)}</span>
            </span>
          </li>
        ))}
        {shown.map(([label, m, k]) => (
          <li key={label}>
            <span>{label}</span>
            <span>
              <strong>{m![k] as number}</strong> <span className="muted">{shortDate(m!.date)}</span>
            </span>
          </li>
        ))}
        {!!streak?.best && (
          <li>
            <span>Longest streak</span>
            <strong>{streak.best} sessions</strong>
          </li>
        )}
      </ul>
    </section>
  );
}

/** One measure per chart (never two y-axes), each with its own target line. */
function MatchCharts({ matches, targets }: { matches: MatchLog[]; targets: { dribbleAttemptsMin: number; leftFootPassesMin: number } }) {
  const ordered = [...matches].reverse().slice(-12);
  const series = (k: keyof MatchLog) => ordered.map((m) => ({ x: m.date, y: (m[k] as number | undefined) ?? 0 }));
  const conf = ordered.filter((m) => typeof m.confidence === 'number').map((m) => ({ x: m.date, y: m.confidence! }));
  return (
    <section className="card stack" style={{ gap: 18 }}>
      <p className="card__eyebrow" style={{ margin: 0 }}>
        Game by game · last {ordered.length}
      </p>
      <div>
        <p className="chart__title">1v1s tried</p>
        <LineChart
          points={series('dribblesAttempted')}
          format={(n) => String(Math.round(n))}
          target={{ value: targets.dribbleAttemptsMin, label: `min ${targets.dribbleAttemptsMin}` }}
          label={`1v1s tried per game: ${ordered.map((m) => m.dribblesAttempted ?? 0).join(', ')}`}
        />
      </div>
      <div>
        <p className="chart__title">Left-foot actions</p>
        <LineChart
          points={series('leftFootTouches')}
          format={(n) => String(Math.round(n))}
          target={{ value: targets.leftFootPassesMin, label: `min ${targets.leftFootPassesMin}` }}
          label={`Left-foot actions per game: ${ordered.map((m) => m.leftFootTouches ?? 0).join(', ')}`}
        />
      </div>
      {conf.length >= 2 && (
        <div>
          <p className="chart__title">Confidence (out of 10)</p>
          <LineChart points={conf} format={(n) => String(Math.round(n))} label={`Confidence per game: ${conf.map((c) => c.y).join(', ')}`} />
        </div>
      )}
      <details>
        <summary className="field__hint">Show as a table</summary>
        <table className="table">
          <thead>
            <tr>
              <th>Game</th>
              <th>1v1 tried</th>
              <th>Left foot</th>
              <th>Conf.</th>
            </tr>
          </thead>
          <tbody>
            {ordered.map((m) => (
              <tr key={m.id}>
                <td>{shortDate(m.date)}</td>
                <td>{m.dribblesAttempted ?? 0}</td>
                <td>{m.leftFootTouches ?? 0}</td>
                <td>{m.confidence ?? '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}

function LoadCard({ weeks }: { weeks: { week: string; load: number; sessions: number }[] }) {
  if (!weeks.some((w) => w.load > 0)) return null;
  const thisWeek = weeks.at(-1)!;
  return (
    <section className="card">
      <p className="card__eyebrow">Training load · last 8 weeks</p>
      <p className="card__body" style={{ marginBottom: 8 }}>
        Effort × minutes, games included. Steady beats spiky: big jumps are when injuries happen.
      </p>
      <BarChart
        bars={weeks.map((w) => ({
          key: w.week,
          label: shortDate(w.week),
          value: w.load,
          detail: `${w.sessions} session${w.sessions === 1 ? '' : 's'}${w === thisWeek ? ' · this week so far' : ''}`,
          partial: w === thisWeek,
        }))}
        format={(n) => (n >= 1000 ? `${Math.round(n / 100) / 10}K` : String(Math.round(n)))}
        label={`Weekly training load: ${weeks.map((w) => `${shortDate(w.week)} ${w.load}`).join(', ')}`}
      />
    </section>
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
