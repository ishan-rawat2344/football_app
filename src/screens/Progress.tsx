import { Placeholder } from '../components/Placeholder';

export function Progress() {
  return (
    <Placeholder
      title="Progress"
      lede="Your tests, personal bests, match numbers and ratings over time."
      items={[
        { label: 'Session log, effort and streak', milestone: 'M4' },
        { label: 'Match log: goals, 1v1s, left-foot touches', milestone: 'M5' },
        { label: 'Solo tests every 4 weeks', milestone: 'M6' },
        { label: 'Charts and personal bests', milestone: 'M6' },
      ]}
    />
  );
}
