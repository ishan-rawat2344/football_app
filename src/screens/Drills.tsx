import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import type { Ratings } from '../db/types';
import { DRILLS } from '../drills/library';
import { CATEGORIES, CATEGORY_LABEL, LOCATIONS } from '../drills/meta';
import { healthWarnings, priorityScore, weakSkillsHit } from '../drills/personal';
import type { Drill, DrillCategory, DrillLocation } from '../drills/types';
import { useProfile, useRatingHistory } from '../hooks/useData';
import { ALL_SKILLS } from '../profile/meta';

type Filters = {
  category: DrillCategory | 'all';
  where: DrillLocation | 'any';
  partner: 'any' | 'solo' | 'partner';
  query: string;
};

// Kept outside the component so filters survive opening a drill and coming back.
let remembered: Filters = { category: 'all', where: 'any', partner: 'any', query: '' };

const SKILL_LABEL = Object.fromEntries(ALL_SKILLS.map((s) => [s.key, s.label]));

function matches(d: Drill, f: Filters): boolean {
  if (f.category !== 'all' && d.category !== f.category) return false;
  if (f.where !== 'any' && !d.locations.includes(f.where)) return false;
  if (f.partner === 'solo' && d.mode === 'partner') return false;
  if (f.partner === 'partner' && d.mode === 'solo') return false;
  if (f.query) {
    const q = f.query.toLowerCase();
    const text = `${d.name} ${d.purpose} ${CATEGORY_LABEL[d.category]}`.toLowerCase();
    if (!text.includes(q)) return false;
  }
  return true;
}

export function Drills() {
  const [filters, setFiltersState] = useState<Filters>(remembered);
  const profile = useProfile();
  const history = useRatingHistory();

  // Build on `remembered`, not the render's `filters`, so two quick taps
  // never apply a stale filter.
  const setFilters = (patch: Partial<Filters>) => {
    remembered = { ...remembered, ...patch };
    setFiltersState(remembered);
  };

  const ratings: Ratings = history !== 'loading' ? (history.at(-1)?.ratings ?? {}) : {};
  const flags = profile && profile !== 'loading' ? profile.health : [];

  const list = useMemo(() => {
    const shown = DRILLS.filter((d) => matches(d, filters));
    // "For you": drills on your weakest skills first; warm-ups and cool-downs last.
    const order = (d: Drill) =>
      d.category === 'warmup' || d.category === 'cooldown' ? -1 : priorityScore(d, ratings);
    return shown
      .map((d, i) => ({ d, i, score: order(d) }))
      .sort((a, b) => b.score - a.score || a.i - b.i)
      .map((x) => x.d);
  }, [filters, ratings]);

  const hasRatings = Object.keys(ratings).length > 0;

  return (
    <>
      <h1 className="page-title">Drills</h1>
      <p className="page-lede">
        {DRILLS.length} drills for a left winger.{' '}
        {hasRatings
          ? 'Sorted for you: drills on your weakest skills come first.'
          : 'Rate your skills and this list sorts itself around your weaknesses.'}{' '}
        <Link href="/videos">Saved videos</Link>
      </p>

      <div className="stack">
        <input
          className="input"
          type="search"
          placeholder="Search drills"
          aria-label="Search drills"
          value={filters.query}
          onChange={(e) => setFilters({ query: e.target.value })}
        />

        <div className="chips chips--scroll" role="group" aria-label="Category">
          <button
            type="button"
            className="chip"
            aria-pressed={filters.category === 'all'}
            onClick={() => setFilters({ category: 'all' })}
          >
            All
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              className="chip"
              aria-pressed={filters.category === c.key}
              onClick={() => setFilters({ category: c.key })}
            >
              {c.short}
            </button>
          ))}
        </div>

        <div className="segmented" role="group" aria-label="Where">
          {[{ key: 'any' as const, label: 'Anywhere' }, ...LOCATIONS].map((l) => (
            <button key={l.key} type="button" aria-pressed={filters.where === l.key} onClick={() => setFilters({ where: l.key })}>
              {l.label}
            </button>
          ))}
        </div>

        <div className="segmented" role="group" aria-label="Partner">
          {(
            [
              { key: 'any', label: 'Any' },
              { key: 'solo', label: 'On my own' },
              { key: 'partner', label: 'With partner' },
            ] as const
          ).map((m) => (
            <button key={m.key} type="button" aria-pressed={filters.partner === m.key} onClick={() => setFilters({ partner: m.key })}>
              {m.label}
            </button>
          ))}
        </div>

        <p className="muted" style={{ margin: '4px 0 0', fontSize: 'var(--fs-sm)' }}>
          {list.length === DRILLS.length ? `All ${list.length} drills` : `${list.length} of ${DRILLS.length} drills`}
        </p>

        {list.length === 0 && (
          <section className="card">
            <p className="card__body">No drills match. Try fewer filters.</p>
          </section>
        )}

        <ul className="drill-list">
          {list.map((d) => {
            const weak = weakSkillsHit(d, ratings);
            const warn = healthWarnings(d, flags);
            return (
              <li key={d.id}>
                <Link href={`/drills/${d.id}`} className="drill-row">
                  <span className="drill-row__main">
                    <span className="drill-row__name">{d.name}</span>
                    <span className="drill-row__meta">
                      {CATEGORY_LABEL[d.category]} · {d.durationMin} min ·{' '}
                      {d.locations.map((l) => LOCATIONS.find((x) => x.key === l)?.label).join(', ')}
                      {d.mode === 'partner' ? ' · partner' : ''}
                    </span>
                    {(weak.length > 0 || warn.length > 0) && (
                      <span className="drill-row__tags">
                        {weak.slice(0, 2).map((s) => (
                          <span key={s} className="tag tag--focus">
                            {SKILL_LABEL[s]}
                          </span>
                        ))}
                        {warn.length > 0 && (
                          <span className={`tag ${warn.some((w) => w.level === 'stop') ? 'tag--bad' : 'tag--warn'}`}>
                            {warn.some((w) => w.level === 'stop') ? 'Go easy' : 'Watch'}
                          </span>
                        )}
                      </span>
                    )}
                  </span>
                  <span className={`intensity-dot intensity-dot--${d.intensity}`} aria-label={`${d.intensity} intensity`} />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
