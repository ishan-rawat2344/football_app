import { useState } from 'react';
import { KindBadge, SWAP_LABEL, SessionView } from '../components/SessionView';
import { toast } from '../components/Toast';
import { NoProfile } from './profile/NoProfile';
import { addDays, formatShort } from '../lib/dates';
import { setGame, setOverride } from '../plan/actions';
import type { WeekSummary } from '../plan/engine';
import type { DayPlan } from '../plan/types';
import { usePlan, useToday } from '../plan/usePlan';

function Target({ label, done, planned, target }: { label: string; done: number; planned: number; target: number }) {
  const pct = (n: number) => `${Math.min(100, (n / Math.max(1, target)) * 100)}%`;
  return (
    <div className="target">
      <div className="target__head">
        <span>{label}</span>
        <span className="muted">
          {done} done{planned ? ` · ${planned} planned` : ''} · target {target}
        </span>
      </div>
      <div className="target__bar" role="img" aria-label={`${done} of ${target} done, ${planned} more planned`}>
        <span className="target__planned" style={{ width: pct(done + planned) }} />
        <span className="target__done" style={{ width: pct(done) }} />
      </div>
    </div>
  );
}

function WeekCard({ week }: { week: WeekSummary }) {
  return (
    <section className="card">
      <div className="card__head">
        <p className="card__eyebrow" style={{ margin: 0 }}>
          This week
        </p>
        {week.lightWeek && <span className="tag tag--focus">Light week</span>}
      </div>
      <div className="stack" style={{ gap: 14 }}>
        <Target label="Ground sessions" {...week.ground} />
        <Target label="Home sessions" {...week.home} />
      </div>
      <p className="card__body" style={{ marginTop: 12 }}>
        {week.games} game{week.games === 1 ? '' : 's'} · {week.rest} rest day{week.rest === 1 ? '' : 's'}
        {week.lightWeek && ' · Every 4th week is lighter so your body absorbs the work.'}
      </p>
    </section>
  );
}

function dayLabel(date: string, today: string) {
  if (date === today) return 'Today';
  if (date === addDays(today, 1)) return 'Tomorrow';
  return formatShort(date);
}

function DayRow({ day, today, open, onToggle }: { day: DayPlan; today: string; open: boolean; onToggle: () => void }) {
  const isGame = day.kind === 'game';
  const done = day.logged === 'done' || day.logged === 'partial';
  return (
    <li className={`day ${open ? 'day--open' : ''}`}>
      <button className="day__head" onClick={onToggle} aria-expanded={open}>
        <span className="day__when">{dayLabel(day.date, today)}</span>
        <span className="day__what">
          <KindBadge day={day} />
          {day.minutes > 0 && <span className="muted"> {day.minutes} min</span>}
          {done && <span className="status status--ok"> ✓</span>}
          {day.override && <span className="tag">Changed</span>}
        </span>
        <span className="chevron" aria-hidden="true">
          {open ? '⌄' : '›'}
        </span>
      </button>
      {open && (
        <div className="day__body">
          <p className="session-reason" style={{ marginTop: 0 }}>
            {day.reasons[0]}
          </p>
          {day.reasons.slice(1).map((r) => (
            <p key={r} className="session-reason session-reason--extra">
              {r}
            </p>
          ))}
          <SessionView blocks={day.blocks} />
          <div className="swaps">
            <p className="swaps__label">Change this day</p>
            <div className="chips">
              <button
                className="chip"
                aria-pressed={isGame}
                onClick={() => void setGame(day.date, isGame ? null : 'planned').then(() => toast(isGame ? 'Game removed' : 'Game added: plan updated'))}
              >
                {isGame ? '✓ Game' : 'Game this day'}
              </button>
              {day.override && (
                <button className="chip" onClick={() => void setOverride(day.date, null).then(() => toast('Back to the plan'))}>
                  Back to the plan
                </button>
              )}
              {!done &&
                day.options.map((o) => (
                  <button key={o} className="chip" onClick={() => void setOverride(day.date, o).then(() => toast('Plan updated'))}>
                    {SWAP_LABEL[o]}
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </li>
  );
}

export function Plan() {
  const today = useToday();
  const plan = usePlan();
  const [open, setOpen] = useState<string | null>(null);

  if (plan === 'loading') return null;
  if (plan === null) {
    return (
      <>
        <h1 className="page-title">Plan</h1>
        <NoProfile />
      </>
    );
  }

  return (
    <>
      <h1 className="page-title">Plan</h1>
      <p className="page-lede">
        The next 7 days. Days after tomorrow are a best guess until you know about games. Add a game and
        everything re-plans.
      </p>
      <div className="stack">
        <WeekCard week={plan.week} />
        <ul className="days">
          {plan.days.map((d) => (
            <DayRow
              key={d.date}
              day={d}
              today={today}
              open={open === d.date}
              onToggle={() => setOpen(open === d.date ? null : d.date)}
            />
          ))}
        </ul>
      </div>
    </>
  );
}
