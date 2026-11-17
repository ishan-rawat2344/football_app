import { daysBetween, formatShort, todayISO, toISODate } from './dates';

/** "today", "yesterday", "3 days ago", or a date for anything older than a month. */
export function timeAgo(isoTimestamp: string | null | undefined, now = new Date()): string {
  if (!isoTimestamp) return 'never';
  const d = new Date(isoTimestamp);
  if (Number.isNaN(d.getTime())) return 'never';
  const days = daysBetween(toISODate(d), todayISO(now));
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 31) return `${days} days ago`;
  return formatShort(toISODate(d));
}

export function daysSince(isoTimestamp: string | null | undefined, now = new Date()): number | null {
  if (!isoTimestamp) return null;
  const d = new Date(isoTimestamp);
  if (Number.isNaN(d.getTime())) return null;
  return daysBetween(toISODate(d), todayISO(now));
}

/**
 * Lower-case the first letter so a phrase reads mid-sentence ("If the
 * defender…"), but leave "I", "I'm" and acronyms like "1v1" alone.
 */
export function lowerFirst(t: string): string {
  if (/^(I\b|I'|[A-Z]{2,})/.test(t)) return t;
  return t.charAt(0).toLowerCase() + t.slice(1);
}
