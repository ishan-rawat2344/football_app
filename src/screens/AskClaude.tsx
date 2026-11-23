import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { useParams } from 'wouter';
import { buildPack, SECTIONS, TOPICS, wordCount, type Section, type Topic } from '../ask/pack';
import { TextArea } from '../components/forms';
import { toast } from '../components/Toast';
import { db } from '../db/db';
import { useProfile } from '../hooks/useData';
import { addDays } from '../lib/dates';
import { usePlan, useToday } from '../plan/usePlan';
import { weeklyLoads } from '../tests/results';
import { NoProfile } from './profile/NoProfile';

const CLAUDE_URL = 'https://claude.ai/new';

const PLACEHOLDER: Record<Topic, string> = {
  week: 'e.g. I feel tired this week. Should I skip the hard session?',
  game: 'e.g. I kept passing back when I could have gone 1v1. Why?',
  weakFoot: 'e.g. Which weak-foot drills can I do in a small room?',
  mind: 'e.g. How do I stop going quiet after one bad touch?',
  body: 'e.g. What should I ask the physio?',
  other: 'Ask anything about your football',
};

const isTopic = (t: string | undefined): t is Topic => !!t && TOPICS.some((x) => x.key === t);

export function AskClaude() {
  const params = useParams<{ topic?: string }>();
  const [topic, setTopic] = useState<Topic>(isTopic(params.topic) ? params.topic : 'week');
  const [question, setQuestion] = useState('');
  const [include, setInclude] = useState<Set<Section>>(() => new Set(SECTIONS.map((s) => s.key)));
  const [manual, setManual] = useState(false);
  const manualRef = useRef<HTMLTextAreaElement>(null);

  const profile = useProfile();
  const plan = usePlan();
  const today = useToday();
  const data = useLiveQuery(
    async () => {
      const [ratings, logs, pain, matches, tests] = await Promise.all([
        db.ratingSnapshots.orderBy('date').toArray(),
        db.sessionLogs.where('date').aboveOrEqual(addDays(today, -14)).toArray(),
        db.painReports.where('date').aboveOrEqual(addDays(today, -28)).toArray(),
        db.matchLogs.orderBy('date').reverse().limit(5).toArray(),
        db.testResults.toArray(),
      ]);
      const film = await db.filmTags.where('matchId').anyOf(matches.map((m) => m.id!)).toArray();
      return { ratings, logs, pain, matches, tests, film };
    },
    [today],
    null,
  );

  // Follow the link you came from (e.g. Mind → "Talk it through" opens on Mental side).
  useEffect(() => {
    setTopic(isTopic(params.topic) ? params.topic : 'week');
  }, [params.topic]);

  // A question about pain needs the health section.
  useEffect(() => {
    if (topic === 'body') setInclude((s) => (s.has('health') ? s : new Set([...s, 'health'])));
  }, [topic]);

  const pack = useMemo(() => {
    if (!profile || profile === 'loading' || !data) return '';
    const ready = plan && plan !== 'loading' ? plan : null;
    return buildPack(
      {
        today,
        profile,
        ...data,
        focus: ready?.focus,
        days: ready?.days,
        restrictions: ready?.days[0]?.restrictions,
        loads: ready ? weeklyLoads(ready.input.logs, ready.input.games, ready.input.matches ?? [], today, 4) : undefined,
      },
      { topic, question, include },
    );
  }, [profile, data, plan, today, topic, question, include]);

  useEffect(() => {
    if (!manual) return;
    manualRef.current?.scrollIntoView({ block: 'center' });
    manualRef.current?.select();
  }, [manual]);

  if (profile === null) {
    return (
      <>
        <h1 className="page-title">Ask Claude</h1>
        <NoProfile />
      </>
    );
  }

  function toggle(s: Section) {
    setInclude((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  function copy(open: boolean, e?: MouseEvent) {
    if (!pack) {
      e?.preventDefault();
      return;
    }
    if (!navigator.clipboard?.writeText) {
      e?.preventDefault();
      setManual(true);
      return;
    }
    // Start the copy inside the tap (iPhone requires that); the link opens Claude.
    navigator.clipboard
      .writeText(pack)
      .then(() => toast(open ? 'Copied. In Claude, paste it and send.' : 'Copied.'))
      .catch(() => setManual(true));
  }

  const current = TOPICS.find((t) => t.key === topic)!;

  return (
    <>
      <h1 className="page-title">Ask Claude</h1>
      <p className="page-lede">
        A second opinion with your whole picture. It's free: the app copies a summary of your data, and you paste it
        into Claude.
      </p>

      <div className="stack">
        <section className="card">
          <p className="card__eyebrow">What about?</p>
          <div className="chips" role="group" aria-label="Topic">
            {TOPICS.map((t) => (
              <button key={t.key} type="button" className="chip" aria-pressed={topic === t.key} onClick={() => setTopic(t.key)}>
                {t.label}
              </button>
            ))}
          </div>
          {current.ask && <p className="ask-quote">“{current.ask}”</p>}
          <div style={{ marginTop: 12 }}>
            <TextArea
              label={topic === 'other' ? 'Your question' : 'Anything to add? (optional)'}
              value={question}
              onChange={setQuestion}
              placeholder={PLACEHOLDER[topic]}
              rows={3}
            />
          </div>
        </section>

        {topic === 'body' && (
          <section className="card card--alert card--alert-caution" role="note">
            <p className="card__eyebrow">Physio first</p>
            <p className="card__body">
              Claude can't examine you. If the pain is getting worse, there when resting, or comes with swelling, see a
              physio or doctor before training on it.
            </p>
          </section>
        )}

        <section className="card">
          <p className="card__eyebrow">What to include</p>
          <div className="chips" role="group" aria-label="What to include">
            {SECTIONS.map((s) => (
              <button key={s.key} type="button" className="chip" aria-pressed={include.has(s.key)} onClick={() => toggle(s.key)}>
                {s.label}
              </button>
            ))}
          </div>
          <p className="field__hint" style={{ marginTop: 10 }}>
            Your name is never included. Switch off anything you'd rather not share.
          </p>
          <details className="pack-preview">
            <summary className="field__hint">See exactly what gets copied · {wordCount(pack)} words</summary>
            <pre>{pack}</pre>
          </details>
        </section>

        <div className="stack" style={{ gap: 8 }}>
          <a
            className="btn btn--primary btn--block"
            href={CLAUDE_URL}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!pack}
            onClick={(e) => copy(true, e)}
          >
            Copy and open Claude
          </a>
          <button type="button" className="btn btn--secondary btn--block" disabled={!pack} onClick={() => copy(false)}>
            Copy only
          </button>
        </div>

        {manual && (
          <section className="card">
            <p className="card__eyebrow">Copy it by hand</p>
            <p className="card__body" style={{ marginBottom: 10 }}>
              This phone didn't allow automatic copying. Press and hold the text, tap Select All, then Copy.
            </p>
            <textarea ref={manualRef} className="input input--area" rows={8} readOnly value={pack} />
          </section>
        )}

        <p className="field__hint" style={{ margin: '0 4px' }}>
          In Claude, start a new chat, press and hold the message box, tap Paste and send. You need a free Claude account.
          Nothing leaves this phone until you paste it.
        </p>
      </div>
    </>
  );
}
