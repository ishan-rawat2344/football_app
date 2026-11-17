import { Link } from 'wouter';
import type { DayOverride } from '../db/types';
import { getDrill } from '../drills/library';
import { BLOCK_LABEL } from '../drills/meta';
import type { DayKind, DayPlan, PlannedBlock } from '../plan/types';

export const KIND_SHORT: Record<DayKind, string> = {
  game: 'Game',
  groundHard: 'Ground · hard',
  groundTech: 'Ground · technical',
  home: 'Home',
  sharp: 'Sharp',
  recovery: 'Recovery',
  rest: 'Rest',
  missed: 'Missed',
};

export const SWAP_LABEL: Record<DayOverride, string> = {
  ground: 'Ground session',
  groundTech: 'Technical ground session',
  home: 'Home session',
  rest: 'Rest',
};

export function KindBadge({ day }: { day: Pick<DayPlan, 'kind' | 'intensity'> }) {
  const cls = day.kind === 'game' ? 'kind--game' : `kind--${day.intensity}`;
  return <span className={`kind ${cls}`}>{KIND_SHORT[day.kind]}</span>;
}

/** The blocks of a session, with each drill linking to its page. */
export function SessionView({ blocks }: { blocks: PlannedBlock[] }) {
  if (!blocks.length) return null;
  return (
    <ol className="session">
      {blocks.map((b, bi) => (
        <li key={bi} className="session__block">
          <p className="session__label">{BLOCK_LABEL[b.block]}</p>
          <ul className="session__items">
            {b.items.map((it) => {
              const d = getDrill(it.drillId);
              if (!d) return null;
              return (
                <li key={it.drillId}>
                  <Link href={`/drills/${d.id}`} className="session__item">
                    <span className="session__name">
                      {d.name}
                      {it.level === -1 && <span className="tag tag--warn">Easier</span>}
                    </span>
                    <span className="session__min">{it.minutes}′</span>
                  </Link>
                  {it.note && <p className="session__note">{it.note}</p>}
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ol>
  );
}
