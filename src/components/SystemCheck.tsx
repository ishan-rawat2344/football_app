import { useEffect, useState } from 'react';
import { db, getSetting, putSetting } from '../db/db';
import {
  isInstalledApp,
  isStoragePersisted,
  requestPersistentStorage,
  storageEstimate,
} from '../lib/storage';

type Check = { state: 'ok' | 'warn' | 'bad' | 'pending'; text: string };

const pending: Check = { state: 'pending', text: 'Checking…' };

function Pill({ check }: { check: Check }) {
  const cls =
    check.state === 'ok' ? 'status--ok' : check.state === 'bad' ? 'status--bad' : 'status--warn';
  return <span className={`status ${cls}`}>{check.text}</span>;
}

function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

/**
 * Diagnostics: confirms the database, persistent storage,
 * offline cache and home-screen install all work on the phone.
 */
export function SystemCheck() {
  const online = useOnline();
  const [database, setDatabase] = useState<Check>(pending);
  const [persisted, setPersisted] = useState<Check>(pending);
  const [offline, setOffline] = useState<Check>(pending);
  const [usage, setUsage] = useState<string>('');
  const installed = isInstalledApp();

  async function refresh() {
    try {
      await db.open();
      const opens = ((await getSetting<number>('appOpens')) ?? 0) + 1;
      await putSetting('appOpens', opens);
      setDatabase({ state: 'ok', text: `Ready · opened ${opens}×` });
    } catch (err) {
      setDatabase({ state: 'bad', text: 'Failed' });
      console.error(err);
    }

    const p = await isStoragePersisted();
    setPersisted(
      p === null
        ? { state: 'warn', text: 'Not supported' }
        : p
          ? { state: 'ok', text: 'Protected' }
          : { state: 'warn', text: 'Not yet' },
    );

    const reg = await navigator.serviceWorker?.getRegistration();
    setOffline(
      reg?.active
        ? { state: 'ok', text: 'Cached' }
        : import.meta.env.DEV
          ? { state: 'warn', text: 'Off in dev mode' }
          : { state: 'warn', text: 'Not yet' },
    );

    const est = await storageEstimate();
    if (est) setUsage(`${est.usedMB.toFixed(1)} MB used`);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function protect() {
    await requestPersistentStorage();
    await refresh();
  }

  return (
    <section className="card">
      <p className="card__eyebrow">System check</p>
      <ul className="list">
        <li>
          <span>On-device database</span>
          <Pill check={database} />
        </li>
        <li>
          <span>Data protected from clean-up</span>
          <Pill check={persisted} />
        </li>
        <li>
          <span>Works offline</span>
          <Pill check={offline} />
        </li>
        <li>
          <span>Installed on home screen</span>
          <Pill check={installed ? { state: 'ok', text: 'Yes' } : { state: 'warn', text: 'No' }} />
        </li>
        <li>
          <span>Connection</span>
          <Pill check={online ? { state: 'ok', text: 'Online' } : { state: 'warn', text: 'Offline' }} />
        </li>
        <li>
          <span>Version</span>
          <span className="muted">
            {__APP_VERSION__}
            {usage && ` · ${usage}`}
          </span>
        </li>
      </ul>
      {persisted.state === 'warn' && persisted.text === 'Not yet' && (
        <button className="btn btn--secondary btn--block" style={{ marginTop: 16 }} onClick={protect}>
          Protect my data
        </button>
      )}
    </section>
  );
}
