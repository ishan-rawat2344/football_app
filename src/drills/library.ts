import { BALL_MASTERY } from './content/ballMastery';
import { CROSSING, FINISHING } from './content/crossingFinishing';
import { DEFENDING } from './content/defending';
import { INJURY_PREVENTION } from './content/injuryPrevention';
import { ONE_V_ONE } from './content/oneVOne';
import { SPEED } from './content/physical';
import { RECEIVING } from './content/receiving';
import { WARMUP_COOLDOWN } from './content/warmupCooldown';
import { MOVEMENT, WEAK_FOOT } from './content/weakFootMovement';
import type { Drill } from './types';

/** Every drill in the app. Content ships with the code, so it works offline. */
export const DRILLS: Drill[] = [
  ...ONE_V_ONE,
  ...WEAK_FOOT,
  ...RECEIVING,
  ...FINISHING,
  ...CROSSING,
  ...MOVEMENT,
  ...BALL_MASTERY,
  ...DEFENDING,
  ...SPEED,
  ...INJURY_PREVENTION,
  ...WARMUP_COOLDOWN,
];

const BY_ID = new Map(DRILLS.map((d) => [d.id, d]));

export function getDrill(id: string): Drill | undefined {
  return BY_ID.get(id);
}
