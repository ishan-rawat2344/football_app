import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'wouter';
import { BackLink } from '../components/forms';
import { toast } from '../components/Toast';
import { db } from '../db/db';
import type { FilmTag, FilmTagKind, MatchLog } from '../db/types';
import { getDrill } from '../drills/library';
import { patterns, statsFromTags, statsPatch, type Pattern } from '../film/analysis';
import { clock, matchMinute, parseClock, parseYouTube } from '../film/link';
import { playerProblem, useYouTubePlayer } from '../film/player';
import { getTag, reasonsFor, TAGS, type Reason } from '../film/tags';
import { formatShort } from '../lib/dates';
import { getLesson } from '../mind/lessons';

type Mode = 'tag' | 'review' | 'summary';
type Player = ReturnType<typeof useYouTubePlayer>;

const byTime = (a: FilmTag, b: FilmTag) => a.t - b.t || (a.id ?? 0) - (b.id ?? 0);

function tagTitle(t: FilmTag, kickoff: number | undefined) {
  const def = getTag(t.kind);
  const outcome = def.outcomes?.find((o) => o.key === t.outcome)?.label;
  return `${matchMinute(t.t, kickoff)} ${def.label}${outcome ? `: ${outcome.toLowerCase()}` : ''}`;
}

/** A link to the drill or lesson that fixes a reason. */
function FixLink({ reason }: { reason: Reason }) {
  const drill = reason.fix?.drillId ? getDrill(reason.fix.drillId) : undefined;
  const lesson = reason.fix?.lessonId ? getLesson(reason.fix.lessonId) : undefined;
  if (drill) {
    return (
      <Link href={`/drills/${drill.id}`} className="chip chip--link">
        Drill: {drill.name}
      </Link>
    );
  }
  if (lesson) {
    return (
      <Link href={`/mind/lessons/${lesson.id}`} className="chip chip--link">
        Lesson: {lesson.title}
      </Link>
    );
  }
  return null;
}

// ---------------------------------------------------------------- tag

function TagPanel({ match, tags, player }: { match: MatchLog; tags: FilmTag[]; player: Player }) {
  const [manual, setManual] = useState('');
  const [lastId, setLastId] = useState<number | null>(null);
  const last = tags.find((t) => t.id === lastId);
  const manualTime = parseClock(manual);
  const live = player.status === 'ready';

  function now(): number | null {
    return live ? player.time() : manualTime;
  }

  async function add(kind: FilmTagKind) {
    const t = now();
    if (t === null) {
      toast(live ? 'Play the video first' : 'Type the video time first (e.g. 23:15)');
      return;
    }
    const id = (await db.filmTags.add({ matchId: match.id!, t, kind, createdAt: new Date().toISOString() })) as number;
    setLastId(id);
    navigator.vibrate?.(15);
  }

  async function setKickoff() {
    const t = now();
    if (t === null) {
      toast(live ? 'Play the video to kick-off first' : 'Type the video time of kick-off first');
      return;
    }
    await db.matchLogs.update(match.id!, { filmKickoff: t });
    toast(`Kick-off set at ${clock(t)} in the video`);
  }

  async function undo() {
    if (!last?.id) return;
    await db.filmTags.delete(last.id);
    setLastId(null);
    toast('Tag removed');
  }

  const recent = [...tags].sort((a, b) => (b.id ?? 0) - (a.id ?? 0)).slice(0, 4);

  return (
    <div className="stack" style={{ gap: 14 }}>
      {!live && (
        <label className="film-manual">
          <span>Video time</span>
          <input
            className="input"
            inputMode="numeric"
            placeholder="23:15"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            aria-label="Video time, minutes and seconds"
          />
        </label>
      )}

      <div className="film-kickoff">
        {match.filmKickoff !== undefined ? (
          <span>
            Kick-off at <strong>{clock(match.filmKickoff)}</strong> in the video
          </span>
        ) : (
          <span>Mark kick-off so tags show the match minute.</span>
        )}
        <button className="btn btn--small btn--secondary" onClick={setKickoff}>
          {match.filmKickoff !== undefined ? 'Reset to now' : 'Kick-off now'}
        </button>
      </div>

      {(['ball', 'off'] as const).map((g) => (
        <section key={g}>
          <p className="film-group">{g === 'ball' ? 'On the ball' : 'Off the ball'}</p>
          <div className="film-grid">
            {TAGS.filter((t) => t.group === g).map((t) => (
              <button key={t.kind} className={`film-tag film-tag--${g}`} onClick={() => add(t.kind)}>
                {t.label}
              </button>
            ))}
          </div>
        </section>
      ))}

      {last && (
        <div className="film-last" role="status">
          <div className="film-last__row">
            <span>
              Saved: <strong>{tagTitle(last, match.filmKickoff)}</strong>
            </span>
            <button className="btn btn--small btn--ghost" onClick={undo}>
              Undo
            </button>
          </div>
          {getTag(last.kind).outcomes && (
            <div className="chips">
              {getTag(last.kind).outcomes!.map((o) => (
                <button
                  key={o.key}
                  className="chip"
                  aria-pressed={last.outcome === o.key}
                  onClick={() => db.filmTags.update(last.id!, { outcome: last.outcome === o.key ? undefined : o.key })}
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {recent.length > 0 && (
        <ul className="film-recent">
          {recent.map((t) => (
            <li key={t.id}>
              <button onClick={() => player.seek(t.t - 3)} disabled={!live}>
                {tagTitle(t, match.filmKickoff)}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="field__hint">
        Tap the moment it happens. Results and reasons can wait for Review. {tags.length} tag
        {tags.length === 1 ? '' : 's'} so far.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------- review

function ReviewPanel({ match, tags, player }: { match: MatchLog; tags: FilmTag[]; player: Player }) {
  const sorted = useMemo(() => [...tags].sort(byTime), [tags]);
  const [index, setIndex] = useState(0);
  const tag = sorted[Math.min(index, sorted.length - 1)];
  const [note, setNote] = useState(tag?.note ?? '');
  const tagId = tag?.id;
  const seek = player.seek;
  const status = player.status;

  // Jump to 5 s before the tag whenever it changes.
  useEffect(() => {
    if (tag) setNote(tag.note ?? '');
    if (tag && status === 'ready') seek(tag.t - 5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagId, status]);

  if (!tag) {
    return <p className="card__body">No tags yet. Tag a few moments first, then come back to review them.</p>;
  }

  const def = getTag(tag.kind);
  const reasons = reasonsFor(def, tag.outcome);
  const chosen = (tag.reasons ?? []).map((k) => def.reasons.find((r) => r.key === k)).filter((r): r is Reason => !!r);

  function toggleReason(key: string) {
    const cur = tag!.reasons ?? [];
    void db.filmTags.update(tag!.id!, { reasons: cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key] });
  }

  function setOutcome(key: string) {
    const outcome = tag!.outcome === key ? undefined : key;
    // drop reasons that don't fit the new result
    const fits = reasonsFor(def, outcome).map((r) => r.key);
    void db.filmTags.update(tag!.id!, { outcome, reasons: (tag!.reasons ?? []).filter((k) => fits.includes(k)) });
  }

  function saveNote() {
    const n = note.trim() || undefined;
    if (n !== tag!.note) void db.filmTags.update(tag!.id!, { note: n });
  }

  async function remove() {
    if (!window.confirm('Delete this tag?')) return;
    await db.filmTags.delete(tag!.id!);
    setIndex(Math.max(0, Math.min(index, sorted.length - 2)));
  }

  const go = (i: number) => {
    saveNote();
    setIndex(Math.max(0, Math.min(sorted.length - 1, i)));
  };

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="film-review__head">
        <button className="btn btn--small btn--secondary" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous tag">
          ‹
        </button>
        <div>
          <p className="film-review__count">
            Tag {index + 1} of {sorted.length}
          </p>
          <p className="film-review__title">
            {matchMinute(tag.t, match.filmKickoff)} · {def.label}
          </p>
        </div>
        <button
          className="btn btn--small btn--secondary"
          onClick={() => go(index + 1)}
          disabled={index >= sorted.length - 1}
          aria-label="Next tag"
        >
          ›
        </button>
      </div>

      {player.status === 'ready' && (
        <button className="btn btn--small btn--ghost" onClick={() => player.seek(tag.t - 5)}>
          Watch it again
        </button>
      )}

      {def.outcomes && (
        <div>
          <p className="mini-heading">Result</p>
          <div className="chips">
            {def.outcomes.map((o) => (
              <button key={o.key} className="chip" aria-pressed={tag.outcome === o.key} onClick={() => setOutcome(o.key)}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {reasons.length > 0 && (
        <div>
          <p className="mini-heading">{def.outcomes?.find((o) => o.key === tag.outcome)?.good ? 'What worked' : 'Why'}</p>
          <div className="chips">
            {reasons.map((r) => (
              <button key={r.key} className="chip" aria-pressed={!!tag.reasons?.includes(r.key)} onClick={() => toggleReason(r.key)}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {chosen.some((r) => r.fix) && (
        <div className="chips">
          {chosen.map((r) => (
            <FixLink key={r.key} reason={r} />
          ))}
        </div>
      )}

      <div>
        <p className="mini-heading">What to look for</p>
        <ul className="bullets">
          {def.lookFor.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </div>

      <label className="field">
        <span className="field__label">Note (optional)</span>
        <textarea
          className="input input--area"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={saveNote}
          placeholder="What you saw, what you'd do next time"
        />
      </label>

      <div className="film-jump" aria-label="All tags">
        {sorted.map((t, i) => (
          <button
            key={t.id}
            className={`film-jump__tag ${getTag(t.kind).outcomes && !t.outcome ? 'film-jump__tag--todo' : ''}`}
            aria-current={i === index ? 'true' : undefined}
            onClick={() => go(i)}
          >
            {matchMinute(t.t, match.filmKickoff)} {getTag(t.kind).label}
          </button>
        ))}
      </div>
      <p className="field__hint">A dot means the tag still needs a result.</p>

      <button className="btn btn--small btn--danger-text" onClick={remove}>
        Delete this tag
      </button>
    </div>
  );
}

// ---------------------------------------------------------------- summary

const STAT_ROWS: { key: keyof MatchLog; label: string }[] = [
  { key: 'dribblesAttempted', label: '1v1s tried' },
  { key: 'dribblesWon', label: '1v1s won' },
  { key: 'shots', label: 'Shots' },
  { key: 'shotsOnTarget', label: 'On target' },
  { key: 'goals', label: 'Goals' },
  { key: 'leftFootTouches', label: 'Left-foot actions' },
  { key: 'keptAsking', label: 'Kept asking after losing it' },
];

function PatternList({ items }: { items: Pattern[] }) {
  return (
    <ul className="film-patterns">
      {items.map((p) => (
        <li key={`${p.kind}-${p.reason.key}`}>
          <p>{p.text}</p>
          <FixLink reason={p.reason} />
        </li>
      ))}
    </ul>
  );
}

function SummaryPanel({ match, tags }: { match: MatchLog; tags: FilmTag[] }) {
  const stats = statsFromTags(tags);
  const patch = statsPatch(stats);
  const differs = STAT_ROWS.some((r) => patch[r.key] !== undefined && patch[r.key] !== match[r.key]);

  // Patterns across your last 3 reviewed games (with tags), this one included.
  const across = useLiveQuery(async () => {
    const all = await db.filmTags.toArray();
    const ids = [...new Set(all.map((t) => t.matchId))];
    const matches = (await db.matchLogs.bulkGet(ids)).filter((m): m is MatchLog => !!m);
    const last3 = matches.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
    const keep = new Set(last3.map((m) => m.id));
    return { tags: all.filter((t) => keep.has(t.matchId)), games: last3.length };
  }, []);

  async function useNumbers() {
    if (!window.confirm('Replace these numbers in your match log with the ones from your tags?')) return;
    await db.matchLogs.update(match.id!, patch);
    toast('Match log updated. Your weekly focus is updated too.');
  }

  async function markReviewed() {
    await db.matchLogs.update(match.id!, { filmReviewedAt: match.filmReviewedAt ? undefined : new Date().toISOString() });
  }

  const byKind = TAGS.map((def) => {
    const mine = tags.filter((t) => t.kind === def.kind);
    const parts = (def.outcomes ?? [])
      .map((o) => [o.label.toLowerCase(), mine.filter((t) => t.outcome === o.key).length] as const)
      .filter(([, n]) => n > 0)
      .map(([l, n]) => `${n} ${l}`);
    return { def, n: mine.length, parts };
  }).filter((x) => x.n > 0);

  const thisGame = patterns(tags);
  const acrossGames = across && across.games > 1 ? patterns(across.tags, 3) : [];

  return (
    <div className="stack" style={{ gap: 18 }}>
      {tags.length === 0 ? (
        <p className="card__body">Nothing tagged yet.</p>
      ) : (
        <ul className="list">
          {byKind.map(({ def, n, parts }) => (
            <li key={def.kind}>
              <span>{def.label}</span>
              <span className="muted">
                {n}
                {parts.length ? ` (${parts.join(', ')})` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}

      {tags.length > 0 && (
        <div>
          <p className="mini-heading">Your match log</p>
          <table className="table">
            <thead>
              <tr>
                <th />
                <th>In the log</th>
                <th>From tags</th>
              </tr>
            </thead>
            <tbody>
              {STAT_ROWS.map((r) => (
                <tr key={r.key}>
                  <td>{r.label}</td>
                  <td>{String(match[r.key] ?? '–')}</td>
                  <td className={patch[r.key] !== undefined && patch[r.key] !== match[r.key] ? 'film-diff' : ''}>
                    {String(patch[r.key] ?? '–')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {stats.missingOutcome > 0 && (
            <p className="field__hint" style={{ marginTop: 8 }}>
              {stats.missingOutcome} tag{stats.missingOutcome === 1 ? ' needs a result' : 's need a result'} (in Review), so
              "won" and "on target" may be low.
            </p>
          )}
          <button className="btn btn--secondary btn--block" style={{ marginTop: 10 }} onClick={useNumbers} disabled={!differs}>
            {differs ? 'Use these numbers' : 'Your log matches your tags'}
          </button>
        </div>
      )}

      {thisGame.length > 0 && (
        <div>
          <p className="mini-heading">Patterns this game</p>
          <PatternList items={thisGame} />
        </div>
      )}
      {acrossGames.length > 0 && (
        <div>
          <p className="mini-heading">Across your last {across!.games} reviewed games</p>
          <PatternList items={acrossGames} />
          <p className="field__hint">3 or more of the same can become one of your weekly focus areas.</p>
        </div>
      )}

      <div className="stack" style={{ gap: 8 }}>
        <Link href="/ask/game" className="btn btn--primary btn--block">
          Ask Claude about this game
        </Link>
        <p className="field__hint">
          Your tags, reasons and notes go into the summary. Claude can't watch the video: add 2–3 phone screenshots of
          key moments to get comments on your positioning.
        </p>
        <button className="btn btn--secondary btn--block" onClick={markReviewed}>
          {match.filmReviewedAt ? 'Reviewed ✓ (tap to undo)' : 'Mark this game as reviewed'}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- screen

function LinkCard({ match }: { match: MatchLog }) {
  const [url, setUrl] = useState(match.recordingUrl ?? '');
  const ok = parseYouTube(url);
  return (
    <section className="card">
      <p className="card__eyebrow">Add the video</p>
      <p className="card__body" style={{ marginBottom: 12 }}>
        {match.recordingUrl
          ? "This match's recording link isn't a YouTube link the Film room can play."
          : 'Paste the YouTube link of this match.'}
      </p>
      <input
        className="input"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://youtu.be/…"
        inputMode="url"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        aria-label="YouTube link"
      />
      <button
        className="btn btn--primary btn--block"
        style={{ marginTop: 12 }}
        disabled={!ok}
        onClick={() => db.matchLogs.update(match.id!, { recordingUrl: url.trim() })}
      >
        Use this video
      </button>
    </section>
  );
}

export function FilmRoom() {
  const { id = '' } = useParams<{ id: string }>();
  const matchId = Number(id);
  const match = useLiveQuery(async () => (await db.matchLogs.get(matchId)) ?? null, [matchId], 'loading' as const);
  const tags = useLiveQuery(() => db.filmTags.where('matchId').equals(matchId).toArray(), [matchId], []);
  const link = match && match !== 'loading' ? parseYouTube(match.recordingUrl) : null;
  const player = useYouTubePlayer(link?.videoId ?? null, link?.start);
  const [mode, setMode] = useState<Mode>('tag');
  const top = useRef<HTMLDivElement>(null);

  if (match === 'loading') return null;
  if (match === null) {
    return (
      <>
        <BackLink href="/progress" label="Progress" />
        <h1 className="page-title">Match not found</h1>
      </>
    );
  }

  const problem = playerProblem(player.status);
  const todo = tags.filter((t) => getTag(t.kind).outcomes && !t.outcome).length;

  return (
    <div className="film" ref={top}>
      <div className="film__head">
        <BackLink href={`/match/${match.id}`} label="Match" />
        <h1 className="page-title">Film room</h1>
        <p className="page-lede">{formatShort(match.date)}</p>
      </div>

      {!link ? (
        <LinkCard match={match} />
      ) : (
        <>
          <div className="film__player">
            <div className="film__frame" ref={player.host} />
            {player.status === 'loading' && <div className="film__frame film__frame--loading" aria-label="Loading video" />}
          </div>
          {problem && (
            <section className="card card--note" role="note">
              <p className="card__body">
                {problem} You can still tag: watch it in the YouTube app and type the video time for each tag.
              </p>
              <a
                className="btn btn--small btn--secondary"
                style={{ marginTop: 10 }}
                href={match.recordingUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open in YouTube
              </a>
            </section>
          )}

          <div className="film__panel">
            <div className="segmented" role="group" aria-label="Film room mode">
              {(
                [
                  ['tag', 'Tag'],
                  ['review', todo ? `Review (${todo})` : 'Review'],
                  ['summary', 'Summary'],
                ] as const
              ).map(([m, label]) => (
                <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}>
                  {label}
                </button>
              ))}
            </div>

            <section className="card">
              {mode === 'tag' && <TagPanel match={match} tags={tags} player={player} />}
              {mode === 'review' && <ReviewPanel match={match} tags={tags} player={player} />}
              {mode === 'summary' && <SummaryPanel match={match} tags={tags} />}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
