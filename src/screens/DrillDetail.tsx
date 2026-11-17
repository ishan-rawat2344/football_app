import { useParams } from 'wouter';
import { BackLink } from '../components/forms';
import { formatDose } from '../drills/format';
import { getDrill } from '../drills/library';
import {
  BLOCK_LABEL,
  CATEGORY_LABEL,
  EQUIPMENT_LABEL,
  INTENSITY_LABEL,
  LOCATIONS,
  MODE_LABEL,
} from '../drills/meta';
import { healthWarnings, WEAK_AT } from '../drills/personal';
import { useProfile, useRatingHistory } from '../hooks/useData';
import { ALL_SKILLS } from '../profile/meta';

const SKILL_LABEL = Object.fromEntries(ALL_SKILLS.map((s) => [s.key, s.label]));

export function DrillDetail() {
  const { id = '' } = useParams<{ id: string }>();
  const drill = getDrill(id);
  const profile = useProfile();
  const history = useRatingHistory();

  if (!drill) {
    return (
      <>
        <BackLink href="/drills" label="Drills" />
        <h1 className="page-title">Drill not found</h1>
      </>
    );
  }

  const ratings = history !== 'loading' ? (history.at(-1)?.ratings ?? {}) : {};
  const warnings = profile && profile !== 'loading' ? healthWarnings(drill, profile.health) : [];
  const d = drill;

  return (
    <>
      <BackLink href="/drills" label="Drills" />
      <p className="card__eyebrow" style={{ marginTop: 8 }}>
        {CATEGORY_LABEL[d.category]}
      </p>
      <h1 className="page-title">{d.name}</h1>

      <div className="pills">
        <span className="pill">{d.durationMin} min</span>
        <span className={`pill pill--${d.intensity}`}>{INTENSITY_LABEL[d.intensity]}</span>
        <span className="pill">{MODE_LABEL[d.mode]}</span>
        <span className="pill">{d.locations.map((l) => LOCATIONS.find((x) => x.key === l)?.label).join(' · ')}</span>
      </div>

      <div className="stack" style={{ marginTop: 16 }}>
        {warnings.map((w) => (
          <section key={w.flag.id} className={`card card--alert card--alert-${w.level}`} role="note">
            <p className="card__eyebrow">{w.level === 'stop' ? 'Go easy' : 'Keep an eye on it'}</p>
            <p className="card__body">{w.message}</p>
          </section>
        ))}

        {d.safety && (
          <section className="card card--note" role="note">
            <p className="card__eyebrow">Safety</p>
            <p className="card__body">{d.safety}</p>
          </section>
        )}

        <section className="card">
          <p className="card__eyebrow">Why you're doing this</p>
          <p className="prose">{d.purpose}</p>
          {d.skills.length > 0 && (
            <div className="chips chips--static" style={{ marginTop: 12 }}>
              {d.skills.map((s) => {
                const r = ratings[s];
                const weak = r !== undefined && r <= WEAK_AT;
                return (
                  <span key={s} className={`tag ${weak ? 'tag--focus' : ''}`}>
                    {SKILL_LABEL[s]}
                    {r !== undefined && ` · ${r}/10`}
                  </span>
                );
              })}
            </div>
          )}
        </section>

        <section className="card">
          <p className="card__eyebrow">Setup</p>
          <p className="prose">{d.setup}</p>
          {d.equipment.length > 0 && (
            <>
              <p className="mini-heading">You need</p>
              <ul className="bullets">
                {d.equipment.map((e) => (
                  <li key={e}>{EQUIPMENT_LABEL[e]}</li>
                ))}
              </ul>
            </>
          )}
          <p className="mini-heading">Dose</p>
          <p className="prose">{formatDose(d.dose)}</p>
        </section>

        <section className="card">
          <p className="card__eyebrow">How to do it</p>
          <ol className="steps">
            {d.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </section>

        <section className="card">
          <p className="card__eyebrow">Coaching points</p>
          <ol className="points">
            {d.coachingPoints.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ol>
        </section>

        <section className="card">
          <p className="card__eyebrow">Common mistakes</p>
          <ul className="bullets bullets--x">
            {d.mistakes.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </section>

        <div className="split">
          <section className="card">
            <p className="card__eyebrow">Easier</p>
            <p className="prose">{d.easier}</p>
          </section>
          <section className="card">
            <p className="card__eyebrow">Harder</p>
            <p className="prose">{d.harder}</p>
          </section>
        </div>

        {d.partner && (
          <section className="card">
            <p className="card__eyebrow">With your partner</p>
            <p className="prose">{d.partner}</p>
          </section>
        )}

        <section className="card">
          <p className="card__eyebrow">Tutorial videos</p>
          <p className="card__body">
            Videos arrive in M8. These searches are lined up for this drill:
          </p>
          <ul className="bullets" style={{ marginTop: 8 }}>
            {d.videoQueries.map((q) => (
              <li key={q}>"{q}"</li>
            ))}
          </ul>
        </section>

        <p className="muted" style={{ fontSize: 'var(--fs-xs)', margin: '0 4px' }}>
          Fits in: {d.blocks.map((b) => BLOCK_LABEL[b]).join(', ')}
        </p>
      </div>
    </>
  );
}
