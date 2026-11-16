import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * Clears the offline copy of the app (service worker + its caches) so the
 * next load fetches the latest version from the network. IndexedDB, where
 * all your data lives, is not touched.
 */
export async function repairApp(): Promise<void> {
  try {
    const regs = (await navigator.serviceWorker?.getRegistrations()) ?? [];
    await Promise.all(regs.map((r) => r.unregister()));
    const keys = (await window.caches?.keys()) ?? [];
    await Promise.all(keys.map((k) => caches.delete(k)));
  } finally {
    location.reload();
  }
}

type State = { error: Error | null };

/**
 * Last line of defence: if a screen crashes, show a way out instead of a
 * blank page. This matters for an offline app, where a broken cached version
 * would otherwise also hide the "new version" banner.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Touchline crashed:', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="app" style={{ padding: '24px 16px', paddingTop: 'calc(24px + env(safe-area-inset-top))' }}>
        <h1 className="page-title">Something went wrong</h1>
        <p className="page-lede">
          Your data is safe: it's stored separately from the app and isn't affected.
        </p>
        <div className="stack">
          <button className="btn btn--primary btn--block" onClick={() => location.reload()}>
            Reload
          </button>
          <button className="btn btn--secondary btn--block" onClick={() => void repairApp()}>
            Repair app (re-download latest version)
          </button>
          <p className="card__body" style={{ marginTop: 8 }}>
            Error: {error.message}
          </p>
        </div>
      </div>
    );
  }
}
