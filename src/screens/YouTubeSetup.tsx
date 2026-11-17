import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'wouter';
import { BackLink } from '../components/forms';
import { toast } from '../components/Toast';
import { getApiKey, quotaResetsAt, SEARCH_SAFE_LIMIT, searchesToday, setApiKey } from '../videos/store';
import { testKey, YouTubeError } from '../videos/youtube';

const CONSOLE = 'https://console.cloud.google.com/';
const LIBRARY = 'https://console.cloud.google.com/apis/library/youtube.googleapis.com';
const CREDENTIALS = 'https://console.cloud.google.com/apis/credentials';

function Copy({ text }: { text: string }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      toast('Copied');
    } catch {
      toast('Press and hold the text to copy it');
    }
  }
  return (
    <div className="copy-field">
      <code>{text}</code>
      <button type="button" className="btn btn--small btn--secondary" onClick={copy}>
        Copy
      </button>
    </div>
  );
}

const mask = (k: string) => (k.length > 10 ? `${k.slice(0, 4)}…${k.slice(-4)}` : '••••');

export function YouTubeSetup() {
  const saved = useLiveQuery(() => getApiKey(), [], 'loading' as const);
  const used = useLiveQuery(() => searchesToday(), [], 0);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<YouTubeError | null>(null);
  const [editing, setEditing] = useState(false);

  // The key is sent from this site, so it must be allowed for this address.
  // Browsers only send the site's origin to Google, so the rule is origin + /*.
  const here = `${window.location.origin}/*`;
  const isLocal = /localhost|127\.0\.0\.1/.test(window.location.hostname);

  async function check(key: string, save: boolean) {
    setBusy(true);
    setProblem(null);
    try {
      await testKey(key);
      if (save) {
        await setApiKey(key);
        setDraft('');
        setEditing(false);
      }
      toast(save ? 'Key works and is saved on this phone.' : 'Key works.');
    } catch (err) {
      setProblem(err instanceof YouTubeError ? err : new YouTubeError('other', String(err)));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm('Remove the YouTube key from this phone? Saved videos stay.')) return;
    await setApiKey(null);
    toast('Key removed.');
  }

  const trimmed = draft.trim();
  const looksOk = /^[A-Za-z0-9_-]{30,}$/.test(trimmed);
  const showForm = saved === null || editing;

  return (
    <>
      <BackLink href="/settings" label="Settings" />
      <h1 className="page-title">YouTube videos</h1>
      <p className="page-lede">
        YouTube asks apps to use a key. Yours is free, needs no card, and gives 100 searches a day, far more than you'll
        use. It stays on this phone: it isn't on the website, in the code, or in backups.
      </p>

      <div className="stack">
        {saved && saved !== 'loading' && !editing && (
          <section className="card">
            <div className="card__head">
              <h2 className="card__title">Connected</h2>
              <span className="status status--ok">Key saved</span>
            </div>
            <p className="card__body">
              Key {mask(saved)} · {used} of {SEARCH_SAFE_LIMIT} searches used today (resets at {quotaResetsAt()}).
            </p>
            <div className="row" style={{ marginTop: 14 }}>
              <button className="btn btn--secondary btn--small" disabled={busy} onClick={() => check(saved, false)}>
                {busy ? 'Testing…' : 'Test it'}
              </button>
              <button className="btn btn--ghost btn--small" onClick={() => setEditing(true)}>
                Replace
              </button>
              <button className="btn btn--danger-text btn--small" onClick={remove}>
                Remove
              </button>
            </div>
            {problem && (
              <p className="card__body" role="alert" style={{ marginTop: 12, color: 'var(--danger)' }}>
                {problem.message}
              </p>
            )}
            <Link href="/videos" className="btn btn--primary btn--block" style={{ marginTop: 16 }}>
              Go to videos
            </Link>
          </section>
        )}

        {showForm && (
          <>
            <section className="card">
              <p className="card__eyebrow">Step 1 · Open Google Cloud</p>
              <p className="prose">
                Open{' '}
                <a href={CONSOLE} target="_blank" rel="noreferrer">
                  Google Cloud Console
                </a>{' '}
                and sign in with your Google account. A laptop is easier than a phone for steps 1–5. If it asks you to
                accept terms or start a free trial, you can skip the trial: this doesn't need billing.
              </p>
            </section>

            <section className="card">
              <p className="card__eyebrow">Step 2 · Make a project</p>
              <p className="prose">
                Click the project picker at the top → <strong>New project</strong>. Name it <strong>Touchline</strong>{' '}
                → <strong>Create</strong>. Then make sure Touchline is the selected project at the top.
              </p>
            </section>

            <section className="card">
              <p className="card__eyebrow">Step 3 · Turn on YouTube</p>
              <p className="prose">
                Open the{' '}
                <a href={LIBRARY} target="_blank" rel="noreferrer">
                  YouTube Data API v3 page
                </a>{' '}
                (or ☰ → APIs &amp; Services → Library → search "YouTube Data API v3") and press <strong>Enable</strong>.
              </p>
            </section>

            <section className="card">
              <p className="card__eyebrow">Step 4 · Create the key</p>
              <p className="prose">
                Go to{' '}
                <a href={CREDENTIALS} target="_blank" rel="noreferrer">
                  Credentials
                </a>{' '}
                → <strong>+ Create credentials</strong> → <strong>API key</strong>. If it offers to tie the key to a
                service account, leave that off. Name it "Touchline" if it asks.
              </p>
            </section>

            <section className="card">
              <p className="card__eyebrow">Step 5 · Lock it to this app</p>
              <p className="prose">
                Open the key you just made (its name in the list, or <strong>Edit API key</strong>). This stops anyone
                else using it.
              </p>
              <ol className="steps" style={{ marginTop: 10 }}>
                <li>
                  Under <strong>Application restrictions</strong>, choose <strong>Websites</strong> and add this
                  address:
                  <Copy text={here} />
                  {!isLocal && (
                    <>
                      <span className="field__hint">Only if you run the app on your laptop too:</span>
                      <Copy text="http://localhost:5173/*" />
                    </>
                  )}
                </li>
                <li>
                  Under <strong>API restrictions</strong>, choose <strong>Restrict key</strong> and tick only{' '}
                  <strong>YouTube Data API v3</strong>.
                </li>
                <li>
                  <strong>Save</strong>, then <strong>Show key</strong> and copy it. Changes can take up to 5 minutes to
                  start working.
                </li>
              </ol>
            </section>

            <section className="card">
              <p className="card__eyebrow">Step 6 · Paste it here</p>
              <label className="field">
                <span className="field__label">Your API key</span>
                <input
                  className="input"
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    setProblem(null);
                  }}
                  placeholder="Starts with AIza…"
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  inputMode="text"
                />
                {trimmed && !looksOk && (
                  <span className="field__hint">That looks too short. Copy the whole key (about 39 characters).</span>
                )}
              </label>
              {problem && (
                <p className="card__body" role="alert" style={{ marginTop: 12, color: 'var(--danger)' }}>
                  {problem.message}
                  {problem.kind === 'referrer' && ` The address to add is ${here}`}
                </p>
              )}
              <div className="stack" style={{ marginTop: 14, gap: 8 }}>
                <button className="btn btn--primary btn--block" disabled={!looksOk || busy} onClick={() => check(trimmed, true)}>
                  {busy ? 'Testing…' : 'Test and save'}
                </button>
                {problem?.kind === 'network' && (
                  <button className="btn btn--secondary btn--block" onClick={() => setApiKey(trimmed).then(() => setEditing(false))}>
                    Save without testing
                  </button>
                )}
                {editing && (
                  <button className="btn btn--ghost btn--block" onClick={() => setEditing(false)}>
                    Cancel
                  </button>
                )}
              </div>
              <p className="field__hint" style={{ marginTop: 10 }}>
                The test uses 1 of your 10,000 free daily units, not a search.
              </p>
            </section>
          </>
        )}
      </div>
    </>
  );
}
