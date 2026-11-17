import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'wouter';
import { VideoCard, VideoList, useVideoPrefs } from '../components/VideoList';
import { db } from '../db/db';
import { useProfile } from '../hooks/useData';
import { usePlan } from '../plan/usePlan';
import { focusQueries } from '../videos/queries';
import { getApiKey, quotaResetsAt, SEARCH_SAFE_LIMIT, savedVideos, searchesToday, setChannel } from '../videos/store';

export function Videos() {
  const plan = usePlan();
  const profile = useProfile();
  const prefs = useVideoPrefs();
  const hasKey = useLiveQuery(async () => !!(await getApiKey()), [], 'loading' as const);
  const used = useLiveQuery(() => searchesToday(), [], 0);
  const saved = useLiveQuery(() => savedVideos(), [], []);
  const hiddenCount = useLiveQuery(() => db.videoFeedback.filter((f) => !!f.hidden).count(), [], 0);
  const lang = profile && profile !== 'loading' ? profile.prefs.videoLanguage : undefined;

  const channels = prefs ? [...prefs.channels.values()] : [];
  const trusted = channels.filter((c) => c.trusted);
  const blocked = channels.filter((c) => c.blocked);
  const areas = plan && plan !== 'loading' ? plan.focus.areas : [];

  async function unhideAll() {
    const hidden = await db.videoFeedback.filter((f) => !!f.hidden).toArray();
    await db.videoFeedback.bulkPut(hidden.map((f) => ({ ...f, hidden: false, updatedAt: new Date().toISOString() })));
  }

  return (
    <>
      <h1 className="page-title">Videos</h1>
      <p className="page-lede">
        Tutorials for a winger, picked from YouTube. They get better as you save, mark helpful or hide them.
      </p>

      <div className="stack">
        {hasKey === false && (
          <section className="card card--note">
            <p className="card__eyebrow">One-time setup</p>
            <p className="card__body">
              Videos need a free YouTube key. It takes about 5 minutes and you only do it once.
            </p>
            <Link href="/youtube" className="btn btn--primary btn--block" style={{ marginTop: 14 }}>
              Set up YouTube
            </Link>
          </section>
        )}

        {hasKey === true && areas.map((a, i) => (
          <section key={a.key + i} className="card">
            <p className="card__eyebrow">This week's focus {areas.length > 1 ? i + 1 : ''}</p>
            <h2 className="card__title">{a.title}</h2>
            <VideoList queries={focusQueries(a)} lang={lang} />
          </section>
        ))}

        <section className="card">
          <p className="card__eyebrow">Saved</p>
          {saved.length === 0 ? (
            <p className="card__body">Tap Save on any video and it lands here. Saved videos stay until you remove them.</p>
          ) : (
            <div className="video-list">
              {saved.map((v) => (
                <VideoCard key={v.videoId} video={v} prefs={prefs} />
              ))}
            </div>
          )}
        </section>

        {(trusted.length > 0 || blocked.length > 0 || hiddenCount > 0) && (
          <section className="card">
            <p className="card__eyebrow">Your choices</p>
            <ul className="list">
              {trusted.map((c) => (
                <li key={c.channelId} className="channel-row">
                  <span>
                    <span className="tag tag--focus">Trusted</span> {c.channelTitle ?? 'A channel'}
                  </span>
                  <button className="btn btn--small btn--ghost" onClick={() => setChannel(c.channelId, c.channelTitle ?? '', { trusted: false })}>
                    Remove
                  </button>
                </li>
              ))}
              {blocked.map((c) => (
                <li key={c.channelId} className="channel-row">
                  <span>
                    <span className="tag">Never show</span> {c.channelTitle ?? 'A channel'}
                  </span>
                  <button className="btn btn--small btn--ghost" onClick={() => setChannel(c.channelId, c.channelTitle ?? '', { blocked: false })}>
                    Undo
                  </button>
                </li>
              ))}
              {hiddenCount > 0 && (
                <li className="channel-row">
                  <span>
                    {hiddenCount} hidden video{hiddenCount === 1 ? '' : 's'}
                  </span>
                  <button className="btn btn--small btn--ghost" onClick={unhideAll}>
                    Show again
                  </button>
                </li>
              )}
            </ul>
          </section>
        )}

        {hasKey === true && (
          <p className="field__hint" style={{ margin: '0 4px' }}>
            {used} of {SEARCH_SAFE_LIMIT} searches used today. Resets at {quotaResetsAt()}. Results are kept on this phone
            for 2 weeks, so most screens don't search again.{' '}
            <Link href="/youtube">YouTube setup</Link>
          </p>
        )}
      </div>
    </>
  );
}
