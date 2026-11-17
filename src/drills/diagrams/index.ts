/**
 * Step-by-step diagrams for the drills where the layout matters. Body
 * exercises (Nordics, planks, stretches, juggling...) have none: their
 * videos show body position better than a drawing.
 */
import { ATTACKING } from './content/attacking';
import { ONE_V_ONE } from './content/oneVOne';
import { PHYSICAL } from './content/physical';
import { WALL_AND_TOUCH } from './content/wallAndTouch';
import type { DrillDiagram } from './types';

export const DIAGRAMS: Record<string, DrillDiagram> = {
  ...ONE_V_ONE,
  ...WALL_AND_TOUCH,
  ...ATTACKING,
  ...PHYSICAL,
};

/** Drills that deliberately have no diagram. */
export const NO_DIAGRAM = new Set([
  'ip-nordic',
  'ip-adductor-squeeze',
  'ip-copenhagen',
  'ip-balance',
  'ip-ankle-strength',
  'ip-hop-stick',
  'ip-core',
  'cooldown-standard',
  'cooldown-recovery-flow',
  'warmup-home',
  'bm-sole-rolls',
  'bm-inside-outside',
  'bm-juggling',
]);

export const getDiagram = (drillId: string): DrillDiagram | undefined => DIAGRAMS[drillId];
