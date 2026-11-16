export type ThemeChoice = 'system' | 'light' | 'dark';

const KEY = 'touchline-theme';

/**
 * The theme lives in localStorage instead of IndexedDB because index.html
 * has to read it synchronously before first paint. It's a per-device
 * preference, so losing it only means falling back to the phone's setting.
 */
export function getTheme(): ThemeChoice {
  try {
    const t = localStorage.getItem(KEY);
    return t === 'light' || t === 'dark' ? t : 'system';
  } catch {
    return 'system';
  }
}

export function setTheme(choice: ThemeChoice): void {
  const root = document.documentElement;
  if (choice === 'system') delete root.dataset.theme;
  else root.dataset.theme = choice;
  try {
    if (choice === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, choice);
  } catch {
    // Storage unavailable (e.g. private mode): the theme still applies for this visit.
  }
}
