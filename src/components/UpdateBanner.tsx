import { useRegisterSW } from 'virtual:pwa-register/react';

const HOUR = 60 * 60 * 1000;

/**
 * Shows a banner when a new version has been downloaded. The app never
 * reloads by itself, so an update can't interrupt a session at the pitch.
 */
export function UpdateBanner() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Look for a new version every hour while the app is open.
      if (registration) setInterval(() => void registration.update(), HOUR);
    },
  });

  if (needRefresh) {
    return (
      <div className="banner" role="status">
        <span>A new version is ready.</span>
        <span style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn--secondary" onClick={() => setNeedRefresh(false)}>
            Later
          </button>
          <button className="btn btn--primary" onClick={() => void updateServiceWorker(true)}>
            Update
          </button>
        </span>
      </div>
    );
  }

  if (offlineReady) {
    return (
      <div className="banner" role="status">
        <span>Ready to work offline.</span>
        <button className="btn btn--secondary" onClick={() => setOfflineReady(false)}>
          OK
        </button>
      </div>
    );
  }

  return null;
}
