import { Placeholder } from '../components/Placeholder';

export function Drills() {
  return (
    <Placeholder
      title="Drills"
      lede="Every drill written like a coach would: setup, steps, coaching points, mistakes, and easier and harder versions."
      items={[
        { label: '1v1: outside on the left, cut in on the right', milestone: 'M2' },
        { label: 'Receiving on the half-turn, first touch forward', milestone: 'M2' },
        { label: 'Crossing and cutbacks', milestone: 'M2' },
        { label: 'Finishing from the left, back-post runs', milestone: 'M2' },
        { label: 'Weak foot, ball mastery, movement', milestone: 'M2' },
        { label: 'Defending as a left mid', milestone: 'M2' },
        { label: 'Speed, agility and injury prevention', milestone: 'M2' },
        { label: 'Tutorial videos for each drill', milestone: 'M8' },
      ]}
    />
  );
}
