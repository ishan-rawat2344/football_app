import { Placeholder } from '../components/Placeholder';

export function Plan() {
  return (
    <Placeholder
      title="Plan"
      lede="A rolling plan built around your games. Tap “Game tomorrow” and the week reshuffles."
      items={[
        { label: 'Next 7 days at a glance', milestone: 'M3' },
        { label: 'Weekly targets: ground, home, weak foot', milestone: 'M3' },
        { label: 'Game-day logic: sharp before, recovery after', milestone: 'M3' },
        { label: 'Swap a day: “can’t get to the ground”', milestone: 'M3' },
        { label: 'Adjusts for pain, fatigue and missed sessions', milestone: 'M4' },
      ]}
    />
  );
}
