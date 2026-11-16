import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, fromISODate, toISODate } from './dates';

describe('dates', () => {
  it('round-trips a local date', () => {
    expect(toISODate(fromISODate('2026-11-17'))).toBe('2026-11-17');
  });

  it('adds days across month and year ends', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('counts whole days between dates', () => {
    expect(daysBetween('2026-11-17', '2026-11-19')).toBe(2);
    expect(daysBetween('2026-11-19', '2026-11-17')).toBe(-2);
    expect(daysBetween('2026-11-17', '2026-11-17')).toBe(0);
  });

  it('rejects malformed input', () => {
    expect(() => fromISODate('not-a-date')).toThrow();
  });
});
