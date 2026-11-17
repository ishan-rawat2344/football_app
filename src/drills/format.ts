import type { DrillDose } from './types';

const secs = (s: number) => (s >= 60 && s % 60 === 0 ? `${s / 60} min` : `${s} s`);

/** e.g. "4 sets × 10 receptions · rest 45 s" or "4 × 40 s on, 20 s rest". */
export function formatDose(d: DrillDose): string {
  const sets = d.sets > 1 ? `${d.sets} sets × ` : '';
  const rest = d.restSec > 0 ? ` · rest ${secs(d.restSec)}` : '';
  return `${sets}${d.reps}${rest}`;
}
