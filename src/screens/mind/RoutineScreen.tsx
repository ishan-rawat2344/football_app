import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'wouter';
import { BackLink } from '../../components/forms';
import { db, putSetting } from '../../db/db';
import { useProfile } from '../../hooks/useData';
import { formatShort } from '../../lib/dates';
import { eveningChecklist, morningChecklist, routineTimes, type ChecklistItem } from '../../mind/routine';
import { usePlan } from '../../plan/usePlan';
import { NoProfile } from '../profile/NoProfile';

type Mode = 'evening' | 'morning';

function Checklist({ items, storeKey }: { items: ChecklistItem[]; storeKey: string }) {
  const done = useLiveQuery(async () => ((await db.settings.get(storeKey))?.value as string[] | undefined) ?? [], [storeKey], null);
  if (done === null) return null;
  const toggle = (id: string) =>
    void putSetting(storeKey, done.includes(id) ? done.filter((x) => x !== id) : [...done, id]);
  const count = items.filter((i) => done.includes(i.id)).length;
  return (
    <>
      <p className="muted" style={{ margin: '0 0 8px', fontSize: 'var(--fs-sm)' }}>
        {count} of {items.length} done
      </p>
      <ul className="checklist">
        {items.map((it) => {
          const on = done.includes(it.id);
          return (
            <li key={it.id} className={`check ${on ? 'check--on' : ''}`}>
              <button className="check__box" aria-pressed={on} aria-label={`${it.title}: ${on ? 'done' : 'not done'}`} onClick={() => toggle(it.id)}>
                {on ? '✓' : ''}
              </button>
              <div className="check__text">
                <p className="check__title">{it.title}</p>
                <p className="check__detail">{it.detail}</p>
                {it.link && (
                  <Link href={it.link.href} className="btn btn--small btn--secondary" style={{ marginTop: 8 }}>
                    {it.link.label}
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/** The night before and the morning of a game, as tickable checklists. */
export function RoutineScreen() {
  const profile = useProfile();
  const plan = usePlan(2);
  const today = plan && plan !== 'loading' ? plan.days[0] : undefined;
  const auto: Mode = today?.kind === 'game' ? 'morning' : 'evening';
  const [mode, setMode] = useState<Mode | null>(null);
  if (profile === 'loading' || plan === 'loading') return null;
  if (!profile || !today) return <NoProfile />;

  const m = mode ?? auto;
  const times = routineTimes(profile.schedule.gameStartTime);
  // Tick state belongs to the game it's for: tonight's list is for tomorrow's game.
  const gameDate = m === 'morning' ? today.date : plan!.days[1]?.date ?? today.date;
  const items = m === 'evening' ? eveningChecklist(profile, times) : morningChecklist(profile, times);
  const context =
    today.kind === 'game'
      ? 'Game today.'
      : today.gameTomorrow
        ? `Game tomorrow, ${formatShort(gameDate)}.`
        : 'No game in the next day, so here is the routine to read through ahead of time.';

  return (
    <>
      <BackLink href="/mind" label="Mind" />
      <h1 className="page-title">Pre-match routine</h1>
      <p className="page-lede">
        {context}
        {times && ` Kick-off ${times.kickoff}.`}
      </p>
      <div className="stack">
        <div className="segmented" role="group" aria-label="When">
          <button aria-pressed={m === 'evening'} onClick={() => setMode('evening')}>
            The night before
          </button>
          <button aria-pressed={m === 'morning'} onClick={() => setMode('morning')}>
            Game morning
          </button>
        </div>
        <section className="card">
          <Checklist items={items} storeKey={`routine:${gameDate}:${m}`} />
        </section>
        {!times && (
          <p className="field__hint">
            Add your usual kick-off time in Profile → Schedule and the app works out your bedtime and snack window.
          </p>
        )}
      </div>
    </>
  );
}
