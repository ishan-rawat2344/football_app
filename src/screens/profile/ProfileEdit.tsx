import { useEffect, useState, type JSX } from 'react';
import { useLocation, useParams } from 'wouter';
import {
  BackLink,
  Chips,
  ListEditor,
  NumberInput,
  PairListEditor,
  SaveBar,
  Segmented,
  Stepper,
  TextArea,
  TextInput,
} from '../../components/forms';
import { toast } from '../../components/Toast';
import { saveProfile } from '../../data/dataOps';
import type { HealthFlag, IfThenPlan, Profile, RoleModel } from '../../db/types';
import { useProfile } from '../../hooks/useData';
import {
  BODY_AREAS,
  EQUIPMENT,
  HEALTH_STATUS,
  POSITIONS,
  TRAINING_WINDOWS,
} from '../../profile/meta';
import { newId } from '../../profile/normalize';
import { NoProfile } from './NoProfile';

type Update = (fn: (p: Profile) => Profile) => void;
type EditorProps = { p: Profile; update: Update };

/** Replace one field inside one section, e.g. sub(update, 'game', 'format')(value). */
function sub<K extends keyof Profile>(update: Update, key: K) {
  return <F extends keyof Profile[K]>(field: F) =>
    (value: Profile[K][F]) =>
      update((p) => ({ ...p, [key]: { ...(p[key] as object), [field]: value } }));
}

const SECTIONS: Record<string, { title: string; Editor: (props: EditorProps) => JSX.Element }> = {
  basics: { title: 'Basics', Editor: BasicsEditor },
  game: { title: 'Your game', Editor: GameEditor },
  goals: { title: 'Goals and targets', Editor: GoalsEditor },
  schedule: { title: 'Schedule, places and kit', Editor: ScheduleEditor },
  body: { title: 'Fitness and lifestyle', Editor: BodyEditor },
  health: { title: 'Health', Editor: HealthEditor },
  mind: { title: 'Mind', Editor: MindEditor },
};

export function ProfileEdit() {
  const { section = '' } = useParams<{ section: string }>();
  const [, navigate] = useLocation();
  const profile = useProfile();
  const [draft, setDraft] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);

  // Take a private copy once; later live updates shouldn't overwrite edits in progress.
  useEffect(() => {
    if (profile && profile !== 'loading' && !draft) setDraft(structuredClone(profile));
  }, [profile, draft]);

  const meta = SECTIONS[section];
  if (!meta) {
    return (
      <>
        <BackLink href="/profile" label="Profile" />
        <h1 className="page-title">Not found</h1>
      </>
    );
  }
  if (profile === 'loading') return null;
  if (!profile) return <NoProfile />;
  if (!draft) return null;

  const update: Update = (fn) => setDraft((d) => (d ? fn(d) : d));

  async function save() {
    if (!draft) return;
    setSaving(true);
    await saveProfile(cleanUp(draft));
    toast('Saved');
    navigate('/profile');
  }

  const { Editor, title } = meta;
  return (
    <>
      <BackLink href="/profile" label="Profile" />
      <h1 className="page-title">{title}</h1>
      <div className="stack form">
        <Editor p={draft} update={update} />
      </div>
      <SaveBar onSave={save} onCancel={() => navigate('/profile')} saving={saving} />
    </>
  );
}

/** Drop empty list rows before saving. */
function cleanUp(p: Profile): Profile {
  const nonEmpty = (xs: string[]) => xs.map((x) => x.trim()).filter(Boolean);
  return {
    ...p,
    name: p.name.trim(),
    style: {
      ...p.style,
      weapons: nonEmpty(p.style.weapons),
      goalSources: nonEmpty(p.style.goalSources),
      roleModels: p.style.roleModels.filter((r) => r.name.trim()),
    },
    goals: {
      weeks4: nonEmpty(p.goals.weeks4),
      months3: nonEmpty(p.goals.months3),
      year1: nonEmpty(p.goals.year1),
    },
    health: p.health.filter((h) => h.title.trim()),
    mind: {
      ...p.mind,
      strengths: nonEmpty(p.mind.strengths),
      cueWords: nonEmpty(p.mind.cueWords),
      ifThen: p.mind.ifThen.filter((x) => x.when.trim() || x.then.trim()),
    },
  };
}

function BasicsEditor({ p, update }: EditorProps) {
  return (
    <section className="card stack">
      <TextInput
        label="What should your coach call you?"
        value={p.name}
        onChange={(name) => update((x) => ({ ...x, name }))}
        placeholder="First name or nickname"
      />
      <NumberInput label="Age" value={p.age} onChange={(age) => update((x) => ({ ...x, age }))} />
      <NumberInput
        label="Height"
        unit="cm"
        value={p.heightCm}
        onChange={(heightCm) => update((x) => ({ ...x, heightCm }))}
      />
      <NumberInput
        label="Weight"
        unit="kg"
        step={0.5}
        value={p.weightKg}
        onChange={(weightKg) => update((x) => ({ ...x, weightKg }))}
      />
      <TextInput label="Country" value={p.country} onChange={(country) => update((x) => ({ ...x, country }))} />
      <Segmented
        label="Stronger foot"
        value={p.dominantFoot}
        options={[
          { value: 'right', label: 'Right' },
          { value: 'left', label: 'Left' },
          { value: 'both', label: 'Both' },
        ]}
        onChange={(dominantFoot) => update((x) => ({ ...x, dominantFoot }))}
      />
      <Chips
        label="Positions you play"
        hint="Put your main one first by tapping it first."
        value={p.positions}
        options={POSITIONS.map((o) => ({ key: o.key, label: o.key }))}
        onChange={(positions) => update((x) => ({ ...x, positions: positions.length ? positions : x.positions }))}
      />
    </section>
  );
}

function GameEditor({ p, update }: EditorProps) {
  const game = sub(update, 'game');
  const style = sub(update, 'style');
  return (
    <>
      <section className="card stack">
        <TextInput label="Level" value={p.game.level} onChange={game('level')} placeholder="e.g. Casual weekly games" />
        <TextInput label="Format" value={p.game.format} onChange={game('format')} placeholder="e.g. 9/10-a-side" />
        <TextInput label="Surface" value={p.game.surface} onChange={game('surface')} placeholder="e.g. Artificial turf" />
        <TextArea label="Team shape and your role" rows={2} value={p.game.teamShape} onChange={game('teamShape')} />
        <NumberInput label="Game length" unit="min" value={p.game.matchMinutes} onChange={game('matchMinutes')} />
        <NumberInput label="Minutes you usually play" unit="min" value={p.game.minutesPlayed} onChange={game('minutesPlayed')} />
      </section>
      <section className="card stack">
        <ListEditor label="Your weapons" items={p.style.weapons} onChange={style('weapons')} addLabel="Add a weapon" />
        <ListEditor label="Where your goals come from" items={p.style.goalSources} onChange={style('goalSources')} />
        <TextArea label="Your go-to 1v1 move right now" value={p.style.goTo1v1} onChange={style('goTo1v1')} />
        <TextArea label="A good game looks like…" rows={2} value={p.style.goodGame} onChange={style('goodGame')} />
        <TextArea label="A bad game looks like…" rows={2} value={p.style.badGame} onChange={style('badGame')} />
        <PairListEditor<RoleModel>
          label="Players you want to play like"
          items={p.style.roleModels}
          onChange={style('roleModels')}
          fields={[
            { key: 'name', label: 'Player' },
            { key: 'what', label: 'What to copy' },
          ]}
          makeEmpty={() => ({ name: '', what: '' })}
          addLabel="Add a player"
        />
      </section>
    </>
  );
}

function GoalsEditor({ p, update }: EditorProps) {
  const goals = sub(update, 'goals');
  const t = sub(update, 'matchTargets');
  return (
    <>
      <section className="card stack">
        <ListEditor label="In 4 weeks" items={p.goals.weeks4} onChange={goals('weeks4')} addLabel="Add a goal" />
        <ListEditor label="In 3 months" items={p.goals.months3} onChange={goals('months3')} addLabel="Add a goal" />
        <ListEditor label="In 1 year" items={p.goals.year1} onChange={goals('year1')} addLabel="Add a goal" />
      </section>
      <section className="card stack">
        <p className="card__eyebrow">Per-game targets</p>
        <p className="card__body">Your weekly focus compares your match logs with these.</p>
        <Stepper label="1v1 attempts: minimum" value={p.matchTargets.dribbleAttemptsMin} onChange={t('dribbleAttemptsMin')} max={30} />
        <Stepper label="1v1 attempts: target" value={p.matchTargets.dribbleAttemptsTarget} onChange={t('dribbleAttemptsTarget')} max={30} />
        <Stepper label="Left-foot passes: minimum" value={p.matchTargets.leftFootPassesMin} onChange={t('leftFootPassesMin')} max={50} />
      </section>
    </>
  );
}

function triState(v: boolean | null): 'yes' | 'no' | 'unknown' {
  return v === null ? 'unknown' : v ? 'yes' : 'no';
}
const fromTri = (v: 'yes' | 'no' | 'unknown') => (v === 'unknown' ? null : v === 'yes');
const TRI = [
  { value: 'yes' as const, label: 'Yes' },
  { value: 'no' as const, label: 'No' },
  { value: 'unknown' as const, label: 'Not sure' },
];

function ScheduleEditor({ p, update }: EditorProps) {
  const s = sub(update, 'schedule');
  const pl = sub(update, 'places');
  const pt = sub(update, 'partner');
  return (
    <>
      <section className="card stack">
        <p className="card__eyebrow">Games</p>
        <Stepper label="Games per week: fewest" value={p.schedule.gamesPerWeekMin} onChange={s('gamesPerWeekMin')} max={7} />
        <Stepper label="Games per week: most" value={p.schedule.gamesPerWeekMax} onChange={s('gamesPerWeekMax')} max={7} />
        <TextInput label="Usual kick-off time" type="time" value={p.schedule.gameStartTime} onChange={s('gameStartTime')} />
        <Stepper
          label="How far ahead you know about a game"
          unit={p.schedule.gameNoticeDays === 1 ? 'day' : 'days'}
          value={p.schedule.gameNoticeDays}
          onChange={s('gameNoticeDays')}
          max={14}
        />
      </section>
      <section className="card stack">
        <p className="card__eyebrow">Training</p>
        <Stepper label="Ground sessions per week" value={p.schedule.groundSessionsPerWeek} onChange={s('groundSessionsPerWeek')} max={7} />
        <Stepper label="Ground sessions: most in a week" value={p.schedule.groundSessionsMax} onChange={s('groundSessionsMax')} max={7} />
        <Stepper label="Home sessions per week" value={p.schedule.homeSessionsPerWeek} onChange={s('homeSessionsPerWeek')} max={7} />
        <Chips label="When you can train" value={p.schedule.trainingWindows} options={TRAINING_WINDOWS} onChange={s('trainingWindows')} />
      </section>
      <section className="card stack">
        <p className="card__eyebrow">Places</p>
        <TextArea label="Your ground" rows={2} value={p.places.ground} onChange={pl('ground')} />
        <NumberInput label="Travel time to the ground" unit="min" value={p.places.groundTravelMin} onChange={pl('groundTravelMin')} />
        <Segmented label="Does the ground have goals?" value={triState(p.places.groundHasGoals)} options={TRI} onChange={(v) => pl('groundHasGoals')(fromTri(v))} />
        <Segmented label="Does the ground have lights?" value={triState(p.places.groundHasLights)} options={TRI} onChange={(v) => pl('groundHasLights')(fromTri(v))} />
        <Segmented
          label="A wall you can pass against"
          value={p.places.hasWall ? 'yes' : 'no'}
          options={[
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
          ]}
          onChange={(v) => pl('hasWall')(v === 'yes')}
        />
        <TextArea label="Space at home" rows={2} value={p.places.homeSpace} onChange={pl('homeSpace')} />
      </section>
      <section className="card stack">
        <p className="card__eyebrow">Kit and partner</p>
        <Chips label="Equipment you have" value={p.equipment} options={EQUIPMENT} onChange={(equipment) => update((x) => ({ ...x, equipment }))} />
        <Segmented
          label="Training partner"
          value={p.partner.available}
          options={[
            { value: 'never', label: 'Never' },
            { value: 'occasional', label: 'Sometimes' },
            { value: 'regular', label: 'Often' },
          ]}
          onChange={pt('available')}
        />
        <TextArea label="About your partner" rows={2} value={p.partner.notes} onChange={pt('notes')} />
      </section>
    </>
  );
}

function BodyEditor({ p, update }: EditorProps) {
  const f = sub(update, 'fitness');
  const l = sub(update, 'lifestyle');
  return (
    <>
      <section className="card stack">
        <p className="card__eyebrow">Fitness (with good form)</p>
        <NumberInput label="Push-ups" value={p.fitness.pushUps} onChange={f('pushUps')} />
        <NumberInput label="Bodyweight squats" value={p.fitness.squats} onChange={f('squats')} />
        <NumberInput label="Plank" unit="sec" value={p.fitness.plankSec} onChange={f('plankSec')} />
        <NumberInput label="Single-leg balance, eyes open" unit="sec" value={p.fitness.singleLegBalanceSec} onChange={f('singleLegBalanceSec')} />
        <TextArea label="Other training you do" rows={2} value={p.fitness.otherTraining} onChange={f('otherTraining')} />
        <TextArea label="Your warm-up habit" rows={2} value={p.fitness.warmUpHabit} onChange={f('warmUpHabit')} />
      </section>
      <section className="card stack">
        <p className="card__eyebrow">Sleep and food</p>
        <NumberInput label="Sleep before games" unit="hours" step={0.5} value={p.lifestyle.sleepBeforeGamesH} onChange={l('sleepBeforeGamesH')} />
        <NumberInput label="Sleep on normal nights" unit="hours" step={0.5} value={p.lifestyle.sleepNormalH} onChange={l('sleepNormalH')} />
        <TextArea label="What you eat before games" rows={2} value={p.lifestyle.preGameFood} onChange={l('preGameFood')} />
        <TextArea label="Diet notes" rows={2} value={p.lifestyle.dietNotes} onChange={l('dietNotes')} />
      </section>
    </>
  );
}

function HealthEditor({ p, update }: EditorProps) {
  const setFlags = (health: HealthFlag[]) => update((x) => ({ ...x, health }));
  const setFlag = (i: number, patch: Partial<HealthFlag>) =>
    setFlags(p.health.map((h, j) => (j === i ? { ...h, ...patch } : h)));
  const add = () =>
    setFlags([
      ...p.health,
      { id: newId('health'), title: '', areas: [], status: 'active', amberAt: 3, since: '', notes: '', rules: '' },
    ]);
  const remove = (i: number) => {
    if (window.confirm('Remove this health note?')) setFlags(p.health.filter((_, j) => j !== i));
  };

  return (
    <>
      <section className="card card--note">
        <p className="card__body">
          These notes tell your plan what to go easy on. The app never diagnoses: if something hurts
          more, lasts, or worries you, see a physio or doctor.
        </p>
      </section>
      {p.health.map((h, i) => (
        <section className="card stack" key={h.id}>
          <TextInput label="What is it?" value={h.title} onChange={(title) => setFlag(i, { title })} placeholder="e.g. Right ankle sprain" />
          <Segmented
            label="Status"
            value={h.status}
            options={HEALTH_STATUS.map((s) => ({ value: s.key, label: s.label }))}
            onChange={(status) => setFlag(i, { status })}
            hint={HEALTH_STATUS.find((s) => s.key === h.status)?.hint}
          />
          <Chips label="Where" value={h.areas} options={BODY_AREAS} onChange={(areas) => setFlag(i, { areas })} />
          <Stepper
            label="Amber at pain score"
            hint="At this score (0–10) or above, drills that load this area get pulled from your plan."
            value={h.amberAt}
            min={1}
            max={10}
            unit="/ 10"
            onChange={(amberAt) => setFlag(i, { amberAt })}
          />
          <TextInput label="Since" value={h.since} onChange={(since) => setFlag(i, { since })} placeholder="e.g. Jun 2026" />
          <TextInput
            label="Review by"
            type="date"
            hint="If it's still there by this date, get it checked."
            value={h.reviewBy ?? ''}
            onChange={(v) => setFlag(i, { reviewBy: v || undefined })}
          />
          <TextArea label="Notes" value={h.notes} onChange={(notes) => setFlag(i, { notes })} />
          <TextArea label="What the coach should do" value={h.rules} onChange={(rules) => setFlag(i, { rules })} />
          <button type="button" className="btn btn--ghost btn--danger-text" onClick={() => remove(i)}>
            Remove this note
          </button>
        </section>
      ))}
      <button type="button" className="btn btn--secondary btn--block" onClick={add}>
        + Add a health note
      </button>
    </>
  );
}

function MindEditor({ p, update }: EditorProps) {
  const m = sub(update, 'mind');
  return (
    <>
      <section className="card stack">
        <ListEditor
          label="Cue words"
          hint="Two or three words you say to yourself in a game. Short beats clever."
          items={p.mind.cueWords}
          onChange={m('cueWords')}
          addLabel="Add a cue word"
          multiline={false}
        />
        <PairListEditor<IfThenPlan>
          label="If → then plans"
          hint="Decide before the game, so you don't have to think in it."
          items={p.mind.ifThen}
          onChange={m('ifThen')}
          fields={[
            { key: 'when', label: 'If…', placeholder: 'e.g. the defender stands off me' },
            { key: 'then', label: 'Then I…', placeholder: 'e.g. drop the shoulder and go inside' },
          ]}
          makeEmpty={() => ({ id: newId('ifthen'), when: '', then: '' })}
          addLabel="Add a plan"
        />
      </section>
      <section className="card stack">
        <ListEditor label="Mental strengths" items={p.mind.strengths} onChange={m('strengths')} />
        <TextArea label="The moment it goes wrong" value={p.mind.problemMoment} onChange={m('problemMoment')} />
        <TextArea label="What happens after a mistake" value={p.mind.afterMistake} onChange={m('afterMistake')} />
        <TextArea label="What's behind it" rows={2} value={p.mind.drivers} onChange={m('drivers')} />
      </section>
    </>
  );
}
