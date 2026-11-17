import type {
  DrillCategory,
  DrillLocation,
  DrillMode,
  EquipmentNeed,
  Intensity,
  LoadTag,
  SessionBlock,
} from './types';

export const CATEGORIES: { key: DrillCategory; label: string; short: string }[] = [
  { key: 'oneVOne', label: '1v1', short: '1v1' },
  { key: 'weakFoot', label: 'Weak foot', short: 'Weak foot' },
  { key: 'receiving', label: 'Receiving and first touch', short: 'Receiving' },
  { key: 'finishing', label: 'Finishing', short: 'Finishing' },
  { key: 'crossing', label: 'Crossing and cutbacks', short: 'Crossing' },
  { key: 'movement', label: 'Movement off the ball', short: 'Movement' },
  { key: 'ballMastery', label: 'Ball mastery', short: 'Ball mastery' },
  { key: 'defending', label: 'Defending as a left mid', short: 'Defending' },
  { key: 'speed', label: 'Speed, agility and endurance', short: 'Speed' },
  { key: 'injuryPrevention', label: 'Injury prevention', short: 'Prevention' },
  { key: 'warmup', label: 'Warm-up', short: 'Warm-up' },
  { key: 'cooldown', label: 'Cool-down and recovery', short: 'Cool-down' },
];

export const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.key, c.label])) as Record<
  DrillCategory,
  string
>;

export const LOCATIONS: { key: DrillLocation; label: string }[] = [
  { key: 'ground', label: 'Ground' },
  { key: 'terrace', label: 'Terrace' },
  { key: 'room', label: 'Room' },
];

export const MODE_LABEL: Record<DrillMode, string> = {
  solo: 'Solo',
  partner: 'Partner',
  either: 'Solo or partner',
};

export const INTENSITY_LABEL: Record<Intensity, string> = {
  low: 'Low intensity',
  medium: 'Medium intensity',
  high: 'High intensity',
};

export const BLOCK_LABEL: Record<SessionBlock, string> = {
  warmup: 'Warm-up',
  technical: 'Technical',
  position: 'Winger-specific',
  physical: 'Physical',
  cooldown: 'Cool-down',
};

export const EQUIPMENT_LABEL: Record<EquipmentNeed, string> = {
  ball: 'Ball',
  markers: 'Markers (cones, stones or bottles)',
  wall: 'Wall',
  goal: 'Goal, or a wall with a marked target',
  band: 'Resistance band',
  tapeMeasure: 'Tape measure (to set distances once)',
  phone: 'Phone (timer or cue caller)',
  anchor: 'Something to hook your feet under, or a partner',
  bench: 'Sofa, bed edge or step',
};

export const LOAD_TAG_LABEL: Record<LoadTag, string> = {
  sprint: 'sprinting',
  cutting: 'sharp cuts',
  kicking: 'hard strikes',
  adductor: 'inner-thigh loading',
  ankle: 'ankle loading',
  hamstring: 'hamstring loading',
  plyometric: 'hops and jumps',
};
