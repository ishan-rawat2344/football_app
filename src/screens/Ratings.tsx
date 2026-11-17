import { useEffect, useState } from 'react';
import { BackLink } from '../components/forms';
import { toast } from '../components/Toast';
import { saveRatings } from '../data/dataOps';
import type { Ratings as RatingsMap, RatingSnapshot } from '../db/types';
import { useRatingHistory } from '../hooks/useData';
import { daysBetween, formatShort, todayISO } from '../lib/dates';
import { ALL_SKILLS, RATING_SCALE_HINT, SKILL_GROUPS } from '../profile/meta';

export const RERATE_AFTER_DAYS = 28;

/** Days since the latest rating, or null if you've never rated. */
export function daysSinceLastRating(history: RatingSnapshot[]): number | null {
  const last = history.at(-1);
  return last ? daysBetween(last.date, todayISO()) : null;
}

function Delta({ from, to }: { from: number | undefined; to: number | undefined }) {
  if (from === undefined || to === undefined || from === to) return <span className="delta">–</span>;
  const up = to > from;
  return (
    <span className={`delta ${up ? 'delta--up' : 'delta--down'}`}>
      {up ? '▲' : '▼'} {Math.abs(to - from)}
    </span>
  );
}

export function Ratings() {
  const history = useRatingHistory();
  const [draft, setDraft] = useState<RatingsMap | null>(null);
  const [saving, setSaving] = useState(false);

  const latest = history !== 'loading' ? history.at(-1) : undefined;
  const first = history !== 'loading' ? history[0] : undefined;

  useEffect(() => {
    if (history !== 'loading' && draft === null) {
      // First time: start every slider at 5 so each one can be saved as-is.
      const start = Object.fromEntries(ALL_SKILLS.map((s) => [s.key, 5])) as RatingsMap;
      setDraft({ ...start, ...(history.at(-1)?.ratings ?? {}) });
    }
  }, [history, draft]);

  if (history === 'loading' || draft === null) return null;

  const changed = ALL_SKILLS.some((s) => draft[s.key] !== latest?.ratings[s.key]);
  const complete = ALL_SKILLS.every((s) => draft[s.key] !== undefined);
  const ratedToday = latest?.date === todayISO();

  async function save() {
    if (!draft) return;
    setSaving(true);
    await saveRatings(draft);
    setSaving(false);
    toast(ratedToday ? "Today's ratings updated" : 'Ratings saved');
  }

  return (
    <>
      <BackLink href="/profile" label="Profile" />
      <h1 className="page-title">Skill ratings</h1>
      <p className="page-lede">{RATING_SCALE_HINT}</p>

      <div className="stack">
        {latest && (
          <p className="muted" style={{ margin: 0, fontSize: 'var(--fs-sm)' }}>
            Last rated {formatShort(latest.date)}
            {latest.note ? ` (${latest.note.toLowerCase()})` : ''}. Re-rate about once a month, honestly.
          </p>
        )}

        {SKILL_GROUPS.map((group) => (
          <section className="card" key={group.title}>
            <p className="card__eyebrow">{group.title}</p>
            <div className="stack" style={{ gap: 20 }}>
              {group.skills.map((s) => {
                const value = draft[s.key];
                const prev = latest?.ratings[s.key];
                return (
                  <div className="rating" key={s.key}>
                    <div className="rating__head">
                      <label htmlFor={`r-${s.key}`} className="rating__label">
                        {s.label}
                        <span className="rating__hint">{s.hint}</span>
                      </label>
                      <output className="rating__value" htmlFor={`r-${s.key}`}>
                        {value ?? '–'}
                      </output>
                    </div>
                    <input
                      id={`r-${s.key}`}
                      className="range"
                      type="range"
                      min={1}
                      max={10}
                      step={1}
                      value={value ?? 5}
                      onChange={(e) => setDraft({ ...draft, [s.key]: Number(e.target.value) })}
                    />
                    {prev !== undefined && value !== prev && (
                      <p className="rating__prev">
                        Was {prev} <Delta from={prev} to={value} />
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        <button
          className="btn btn--primary btn--block"
          onClick={save}
          disabled={saving || !complete || (!changed && latest !== undefined)}
        >
          {!complete
            ? 'Rate every skill to save'
            : ratedToday
              ? "Update today's ratings"
              : 'Save ratings'}
        </button>

        {history.length > 1 && first && latest && (
          <section className="card">
            <p className="card__eyebrow">
              Since {formatShort(first.date)} · {history.length} ratings
            </p>
            <ul className="list">
              {ALL_SKILLS.map((s) => (
                <li key={s.key}>
                  <span>{s.label}</span>
                  <span className="muted">
                    {first.ratings[s.key] ?? '–'} → {latest.ratings[s.key] ?? '–'}{' '}
                    <Delta from={first.ratings[s.key]} to={latest.ratings[s.key]} />
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
