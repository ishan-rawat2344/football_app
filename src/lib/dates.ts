/**
 * Calendar-date helpers. Dates are stored as local "YYYY-MM-DD" strings so an
 * early-morning game always lands on the right day, whatever the timezone offset.
 */

export type ISODate = string; // "YYYY-MM-DD"

const pad = (n: number) => String(n).padStart(2, '0');

export function toISODate(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromISODate(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) throw new Error(`Invalid date: ${iso}`);
  return new Date(y, m - 1, d);
}

export function todayISO(now: Date = new Date()): ISODate {
  return toISODate(now);
}

export function addDays(iso: ISODate, days: number): ISODate {
  const d = fromISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Whole calendar days from a to b (positive when b is later). */
export function daysBetween(a: ISODate, b: ISODate): number {
  const ms = fromISODate(b).getTime() - fromISODate(a).getTime();
  return Math.round(ms / 86_400_000);
}

/** e.g. "Mon 17 Nov" */
export function formatShort(iso: ISODate): string {
  return fromISODate(iso).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}
