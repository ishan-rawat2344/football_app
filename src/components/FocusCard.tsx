import { Link } from 'wouter';
import type { Ratings } from '../db/types';
import { DRILLS } from '../drills/library';
import { priorityScore } from '../drills/personal';
import type { FocusArea, FocusResult } from '../focus/focus';

/** Two good drills for a focus area: on its skills, in its categories. */
function drillsFor(area: FocusArea, ratings: Ratings) {
  return DRILLS.filter((d) => d.skills.some((s) => area.skills.includes(s)))
    .filter((d) => !area.categories.length || area.categories.includes(d.category))
    .filter((d) => d.mode !== 'partner')
    .map((d, i) => ({ d, i, s: priorityScore(d, ratings) + d.skills.filter((s) => area.skills.includes(s)).length * 4 }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .slice(0, 2)
    .map((x) => x.d);
}

export function FocusCard({ focus, ratings, compact = false }: { focus: FocusResult; ratings: Ratings; compact?: boolean }) {
  if (!focus.areas.length && !focus.wins.length) return null;
  return (
    <section className="card">
      <p className="card__eyebrow">This week's focus</p>
      {!focus.areas.length && (
        <p className="card__body" style={{ color: 'var(--text)' }}>
          You hit your targets in recent games. The plan keeps working on your weakest ratings.
        </p>
      )}
      <div className="stack" style={{ gap: 14 }}>
        {focus.areas.map((a, i) => (
          <div key={a.key + i} className="focus">
            <p className="focus__title">
              <span className="focus__n">{i + 1}</span>
              {a.title}
            </p>
            <p className="focus__why">{a.why}</p>
            {!compact && (
              <>
                <p className="focus__tip">
                  <strong>Next game: </strong>
                  {a.inGame}
                </p>
                <div className="chips">
                  {drillsFor(a, ratings).map((d) => (
                    <Link key={d.id} href={`/drills/${d.id}`} className="chip chip--link">
                      {d.name}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      {!compact && focus.wins.length > 0 && (
        <ul className="wins">
          {focus.wins.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
      <p className="field__hint" style={{ marginTop: 12 }}>
        {focus.basedOn === 'matches'
          ? `From your last ${focus.matchCount === 1 ? 'game' : `${focus.matchCount} games`}. Your sessions this week lean towards it.`
          : 'From your ratings until you log a game. Your sessions lean towards it.'}
      </p>
    </section>
  );
}
