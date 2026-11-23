import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'wouter';
import { BackLink, Stepper, TextArea, TextInput } from '../components/forms';
import { toast } from '../components/Toast';
import { db } from '../db/db';
import type { MatchLog } from '../db/types';
import { useProfile } from '../hooks/useData';
import { formatShort, todayISO } from '../lib/dates';
import { setGame } from '../plan/actions';

function Scale({
  label,
  value,
  onChange,
  low,
  high,
}: {
  label: string;
  value: number | undefined;
  onChange: (n: number) => void;
  low: string;
  high: string;
}) {
  return (
    <div className="field">
      <p className="field__label">{label}</p>
      <div className="rpe" role="group" aria-label={label}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button key={n} type="button" className="rpe__btn" aria-pressed={value === n} onClick={() => onChange(n)}>
            {n}
          </button>
        ))}
      </div>
      <p className="field__hint" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>1 = {low}</span>
        <span>10 = {high}</span>
      </p>
    </div>
  );
}

function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T | undefined;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="field">
      <p className="field__label">{label}</p>
      <div className="segmented" role="group" aria-label={label}>
        {options.map((o) => (
          <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const isUrl = (s: string) => /^https?:\/\/\S+$/i.test(s.trim());

/**
 * The 30-second match log. Numbers first (steppers), a few taps, and
 * optional words. Routes: /match/new/:date and /match/:id (edit).
 */
export function MatchForm() {
  const params = useParams<{ id?: string; date?: string }>();
  const [, navigate] = useLocation();
  const profile = useProfile();
  const editingId = params.id ? Number(params.id) : null;
  const [m, setM] = useState<MatchLog | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile === 'loading') return;
    if (editingId !== null) {
      void db.matchLogs.get(editingId).then((x) => setM(x ?? null));
    } else {
      setM({
        date: params.date ?? todayISO(),
        minutes: (profile && profile.game.minutesPlayed) || 60,
        goals: 0,
        assists: 0,
        dribblesAttempted: 0,
        dribblesWon: 0,
        shots: 0,
        shotsOnTarget: 0,
        leftFootTouches: 0,
      });
    }
  }, [editingId, params.date, profile]);

  if (profile === 'loading' || m === null) return null;

  const set = <K extends keyof MatchLog>(k: K, v: MatchLog[K]) => setM({ ...m, [k]: v });
  const n = (k: keyof MatchLog) => (m[k] as number | undefined) ?? 0;
  const urlBad = !!m.recordingUrl && !isUrl(m.recordingUrl);

  async function save() {
    if (!m) return;
    setSaving(true);
    const clean: MatchLog = {
      ...m,
      recordingUrl: m.recordingUrl?.trim() || undefined,
      wentWell: m.wentWell?.trim() || undefined,
      wentBadly: m.wentBadly?.trim() || undefined,
      keyMoments: m.keyMoments?.trim() || undefined,
      mental: m.mental?.trim() || undefined,
    };
    await db.matchLogs.put(clean);
    await setGame(clean.date, 'played');
    toast(editingId ? 'Match updated' : 'Match logged. Your weekly focus is updated.');
    navigate('/progress');
  }

  async function remove() {
    if (editingId === null || !window.confirm('Delete this match log?')) return;
    await db.transaction('rw', db.matchLogs, db.filmTags, async () => {
      await db.matchLogs.delete(editingId);
      await db.filmTags.where('matchId').equals(editingId).delete();
    });
    toast('Match deleted');
    navigate('/progress');
  }

  return (
    <>
      <BackLink href="/progress" label="Progress" />
      <h1 className="page-title">{editingId ? 'Edit match' : 'Log your match'}</h1>
      <p className="page-lede">
        {formatShort(m.date)}. Numbers first; the words are optional. Fill in the rest from the recording later.
      </p>

      <div className="stack form">
        <section className="card stack">
          <TextInput label="Date" type="date" value={m.date} onChange={(v) => v && set('date', v)} />
          <Stepper label="Minutes you played" unit="min" step={5} value={n('minutes')} min={0} max={120} onChange={(v) => set('minutes', v)} />
          <div className="pair">
            <Stepper label="Goals" value={n('goals')} max={20} onChange={(v) => set('goals', v)} />
            <Stepper label="Assists" value={n('assists')} max={20} onChange={(v) => set('assists', v)} />
          </div>
        </section>

        <section className="card stack">
          <p className="card__eyebrow">On the ball</p>
          <div className="pair">
            <Stepper
              label="1v1s tried"
              value={n('dribblesAttempted')}
              max={40}
              onChange={(v) => setM({ ...m, dribblesAttempted: v, dribblesWon: Math.min(n('dribblesWon'), v) })}
            />
            <Stepper label="1v1s won" value={n('dribblesWon')} max={n('dribblesAttempted')} onChange={(v) => set('dribblesWon', v)} />
          </div>
          <div className="pair">
            <Stepper
              label="Shots"
              value={n('shots')}
              max={40}
              onChange={(v) => setM({ ...m, shots: v, shotsOnTarget: Math.min(n('shotsOnTarget'), v) })}
            />
            <Stepper label="On target" value={n('shotsOnTarget')} max={n('shots')} onChange={(v) => set('shotsOnTarget', v)} />
          </div>
          <Stepper
            label="Left-foot actions"
            hint="Deliberate passes, crosses and shots with your left."
            value={n('leftFootTouches')}
            max={60}
            onChange={(v) => set('leftFootTouches', v)}
          />
          <Choice
            label="How much of the ball did you get?"
            value={m.involvement}
            options={[
              { value: 'lots', label: 'Lots' },
              { value: 'some', label: 'Some' },
              { value: 'barely', label: 'Barely' },
            ]}
            onChange={(v) => set('involvement', v)}
          />
        </section>

        <section className="card stack">
          <p className="card__eyebrow">How it felt</p>
          <Scale label="How hard was the game?" value={m.rpe} onChange={(v) => set('rpe', v)} low="very easy" high="max" />
          <Scale label="Confidence on the ball" value={m.confidence} onChange={(v) => set('confidence', v)} low="hid from it" high="wanted every ball" />
          <Choice
            label="After losing the ball, did you keep asking for it?"
            value={m.keptAsking}
            options={[
              { value: 'yes', label: 'Yes' },
              { value: 'mostly', label: 'Mostly' },
              { value: 'no', label: 'No' },
            ]}
            onChange={(v) => set('keptAsking', v)}
          />
        </section>

        <section className="card stack">
          <p className="card__eyebrow">In your words (optional)</p>
          <TextArea label="What went well?" rows={2} value={m.wentWell ?? ''} onChange={(v) => set('wentWell', v)} />
          <TextArea label="What went badly?" rows={2} value={m.wentBadly ?? ''} onChange={(v) => set('wentBadly', v)} />
          <TextArea label="Key moments" rows={2} value={m.keyMoments ?? ''} placeholder="e.g. 12:40 beat the full-back outside, cross blocked" onChange={(v) => set('keyMoments', v)} />
          <TextArea label="How were you mentally?" rows={2} value={m.mental ?? ''} onChange={(v) => set('mental', v)} />
          <TextInput
            label="Recording link"
            value={m.recordingUrl ?? ''}
            placeholder="https://youtube.com/…"
            hint={urlBad ? 'That doesn\'t look like a link (it should start with https://).' : 'Paste it when the video goes up. Open it from this match later.'}
            onChange={(v) => set('recordingUrl', v)}
          />
          {m.recordingUrl && !urlBad && (
            <a className="btn btn--secondary btn--block" href={m.recordingUrl.trim()} target="_blank" rel="noopener noreferrer">
              Open recording ↗
            </a>
          )}
        </section>

        {editingId !== null && (
          <section className="card">
            <p className="card__eyebrow">Film room</p>
            <p className="card__body" style={{ marginBottom: 12 }}>
              Watch the video here, tag your moments, then review them. Your tags can fill in the numbers above.
            </p>
            <Link href={`/film/${editingId}`} className="btn btn--primary btn--block">
              Open in the Film room
            </Link>
          </section>
        )}

        {editingId !== null && (
          <button className="btn btn--ghost btn--danger-text btn--block" onClick={remove}>
            Delete this match
          </button>
        )}
      </div>
      <div className="save-bar">
        <button type="button" className="btn btn--secondary" onClick={() => navigate('/progress')}>
          Cancel
        </button>
        <button type="button" className="btn btn--primary" onClick={save} disabled={saving || urlBad}>
          {saving ? 'Saving…' : editingId ? 'Save changes' : 'Save match'}
        </button>
      </div>
    </>
  );
}
