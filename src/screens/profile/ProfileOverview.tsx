import type { ReactNode } from 'react';
import { Link } from 'wouter';
import { BackLink } from '../../components/forms';
import type { HealthFlag, Profile } from '../../db/types';
import { useProfile } from '../../hooks/useData';
import { formatShort } from '../../lib/dates';
import { BODY_AREA_LABEL, EQUIPMENT, FOOT_LABELS, TRAINING_WINDOWS } from '../../profile/meta';
import { NoProfile } from './NoProfile';

function Section({
  title,
  edit,
  children,
}: {
  title: string;
  edit: string;
  children: ReactNode;
}) {
  return (
    <section className="card">
      <div className="card__head">
        <h2 className="card__title">{title}</h2>
        <Link href={`/profile/edit/${edit}`} className="btn btn--small btn--secondary">
          Edit
        </Link>
      </div>
      {children}
    </section>
  );
}

function Lines({ items, empty = 'Not set' }: { items: (string | null | false | undefined)[]; empty?: string }) {
  const shown = items.filter((x): x is string => Boolean(x));
  if (!shown.length) return <p className="card__body">{empty}</p>;
  return (
    <ul className="bullets">
      {shown.map((x, i) => (
        <li key={i}>{x}</li>
      ))}
    </ul>
  );
}

export function healthPill(flag: HealthFlag) {
  const cls =
    flag.status === 'active' ? 'status--bad' : flag.status === 'monitor' ? 'status--warn' : 'status--ok';
  const label = flag.status === 'active' ? 'Active' : flag.status === 'monitor' ? 'Monitor' : 'Resolved';
  return <span className={`status ${cls}`}>{label}</span>;
}

const join = (xs: (string | null | undefined | false)[], sep = ' · ') =>
  xs.filter(Boolean).join(sep);

function basicsLine(p: Profile) {
  return join([
    p.age !== null && `${p.age}`,
    p.heightCm !== null && `${p.heightCm} cm`,
    p.weightKg !== null && `${p.weightKg} kg`,
    `${FOOT_LABELS[p.dominantFoot]}-footed`,
    p.positions.join(', '),
  ]);
}

export function ProfileOverview() {
  const profile = useProfile();
  if (profile === 'loading') return null;
  if (!profile) return <NoProfile />;
  const p = profile;

  const equipment = EQUIPMENT.filter((e) => p.equipment.includes(e.key)).map((e) => e.label);
  const windows = TRAINING_WINDOWS.filter((w) => p.schedule.trainingWindows.includes(w.key)).map(
    (w) => w.label.toLowerCase(),
  );

  return (
    <>
      <BackLink href="/settings" label="Settings" />
      <h1 className="page-title">{p.name || 'Your profile'}</h1>
      <p className="page-lede">{basicsLine(p)}</p>

      <div className="stack">
        <Link href="/ratings" className="card card--link">
          <div>
            <h2 className="card__title">Skill ratings</h2>
            <p className="card__body">Rate yourself and see how you've changed.</p>
          </div>
          <span aria-hidden="true" className="chevron">›</span>
        </Link>

        <Section title="Basics" edit="basics">
          <Lines
            items={[
              p.name ? `Name: ${p.name}` : 'Name: not set',
              basicsLine(p),
              p.country && `Lives in ${p.country}`,
            ]}
          />
        </Section>

        <Section title="Your game" edit="game">
          <Lines
            items={[
              join([p.game.format, p.game.surface]),
              p.game.teamShape,
              p.game.matchMinutes !== null &&
                `Games ~${p.game.matchMinutes} min, you play ~${p.game.minutesPlayed ?? '?'} min`,
              p.style.weapons.length > 0 && `Weapons: ${p.style.weapons.join('; ')}`,
              p.style.goalSources.length > 0 && `Goals come from: ${p.style.goalSources.join('; ')}`,
              p.style.roleModels.length > 0 &&
                `Plays like: ${p.style.roleModels.map((r) => r.name).join(', ')}`,
            ]}
          />
        </Section>

        <Section title="Goals and targets" edit="goals">
          <p className="mini-heading">4 weeks</p>
          <Lines items={p.goals.weeks4} />
          <p className="mini-heading">3 months</p>
          <Lines items={p.goals.months3} />
          <p className="mini-heading">1 year</p>
          <Lines items={p.goals.year1} />
          <p className="mini-heading">Per game</p>
          <Lines
            items={[
              `1v1 attempts: at least ${p.matchTargets.dribbleAttemptsMin}, aim for ${p.matchTargets.dribbleAttemptsTarget}`,
              `Left-foot passes: at least ${p.matchTargets.leftFootPassesMin}`,
            ]}
          />
        </Section>

        <Section title="Schedule, places and kit" edit="schedule">
          <Lines
            items={[
              `${p.schedule.gamesPerWeekMin}–${p.schedule.gamesPerWeekMax} games a week${
                p.schedule.gameStartTime ? ` at ${p.schedule.gameStartTime}` : ''
              }, known ${p.schedule.gameNoticeDays} day${p.schedule.gameNoticeDays === 1 ? '' : 's'} ahead`,
              `${p.schedule.groundSessionsPerWeek} ground sessions a week (max ${p.schedule.groundSessionsMax}), ${p.schedule.homeSessionsPerWeek} home sessions`,
              windows.length > 0 && `Trains: ${windows.join(', ')}`,
              p.places.ground && `Ground: ${p.places.ground}`,
              p.places.hasWall && 'Has a wall to pass against',
              equipment.length > 0 && `Kit: ${equipment.join(', ')}`,
              p.partner.available !== 'never' && `Partner: ${p.partner.available}`,
            ]}
          />
        </Section>

        <Section title="Fitness and lifestyle" edit="body">
          <Lines
            items={[
              join(
                [
                  p.fitness.pushUps !== null && `${p.fitness.pushUps} push-ups`,
                  p.fitness.squats !== null && `${p.fitness.squats} squats`,
                  p.fitness.plankSec !== null && `${p.fitness.plankSec}s plank`,
                  p.fitness.singleLegBalanceSec !== null &&
                    `${p.fitness.singleLegBalanceSec}s single-leg balance`,
                ],
                ', ',
              ),
              p.lifestyle.sleepBeforeGamesH !== null &&
                `Sleep: ~${p.lifestyle.sleepBeforeGamesH} h before games, ~${p.lifestyle.sleepNormalH ?? '?'} h otherwise`,
              p.lifestyle.preGameFood && `Before games: ${p.lifestyle.preGameFood}`,
            ]}
          />
        </Section>

        <Section title="Health" edit="health">
          {p.health.length === 0 ? (
            <p className="card__body">Nothing recorded.</p>
          ) : (
            <ul className="list">
              {p.health.map((f) => (
                <li key={f.id} style={{ alignItems: 'flex-start' }}>
                  <span>
                    <strong>{f.title}</strong>
                    <br />
                    <span className="muted">
                      {join([
                        f.areas.map((a) => BODY_AREA_LABEL[a]).join(', '),
                        f.status !== 'resolved' && `amber at ${f.amberAt}/10`,
                        f.reviewBy && `review ${formatShort(f.reviewBy)}`,
                      ])}
                    </span>
                  </span>
                  {healthPill(f)}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Mind" edit="mind">
          {p.mind.cueWords.length > 0 && (
            <div className="chips chips--static" style={{ marginBottom: 12 }}>
              {p.mind.cueWords.map((w) => (
                <span key={w} className="chip" aria-pressed="true">
                  {w}
                </span>
              ))}
            </div>
          )}
          <Lines
            items={[
              p.mind.problemMoment && `The moment: ${p.mind.problemMoment}`,
              ...p.mind.ifThen.map((x) => `If ${x.when.toLowerCase()} → ${x.then.toLowerCase()}`),
            ]}
          />
        </Section>
      </div>
    </>
  );
}
