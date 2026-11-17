import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useLocation, useParams } from 'wouter';
import { BackLink } from '../../components/forms';
import { toast } from '../../components/Toast';
import { db } from '../../db/db';
import { getLesson, LESSONS } from '../../mind/lessons';

export function LessonScreen() {
  const { id = '' } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const lesson = getLesson(id);
  const isRead = useLiveQuery(async () => !!(await db.lessonProgress.get(id)), [id], false);

  if (!lesson) {
    return (
      <>
        <BackLink href="/mind" label="Mind" />
        <h1 className="page-title">Lesson not found</h1>
      </>
    );
  }

  const idx = LESSONS.findIndex((l) => l.id === id);
  const next = LESSONS[idx + 1];

  async function done() {
    await db.lessonProgress.put({ lessonId: id, readAt: new Date().toISOString() });
    toast('Lesson read');
    navigate(next ? `/mind/lessons/${next.id}` : '/mind');
  }

  return (
    <>
      <BackLink href="/mind" label="Mind" />
      <p className="card__eyebrow" style={{ marginTop: 8 }}>
        Lesson {idx + 1} of {LESSONS.length} · {lesson.minutes} min
      </p>
      <h1 className="page-title">{lesson.title}</h1>

      <div className="stack" style={{ marginTop: 12 }}>
        <section className="card card--hero">
          <p className="card__eyebrow">The moment</p>
          <p className="prose" style={{ color: '#fff' }}>
            {lesson.situation}
          </p>
        </section>

        <section className="card">
          <p className="card__eyebrow">What's going on</p>
          <div className="stack" style={{ gap: 10 }}>
            {lesson.whatsGoingOn.map((p) => (
              <p key={p} className="prose">
                {p}
              </p>
            ))}
          </div>
        </section>

        <section className="card">
          <p className="card__eyebrow">Do this</p>
          <ol className="points">
            {lesson.doThis.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ol>
        </section>

        <section className="card">
          <p className="card__eyebrow">Try it this week</p>
          <p className="prose">{lesson.tryThisWeek}</p>
          {lesson.practice && (
            <Link href={lesson.practice.href} className="btn btn--secondary btn--block" style={{ marginTop: 12 }}>
              {lesson.practice.label}
            </Link>
          )}
        </section>

        <p className="field__hint" style={{ margin: '0 4px' }}>
          Based on: {lesson.basedOn}
        </p>

        <button className="btn btn--primary btn--block" onClick={done}>
          {isRead ? (next ? 'Next lesson' : 'Back to Mind') : next ? 'Got it: next lesson' : 'Got it'}
        </button>
      </div>
    </>
  );
}
