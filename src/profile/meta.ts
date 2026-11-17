/**
 * Labels, descriptions and defaults for the profile. Kept separate from the
 * stored data so wording can change without touching anyone's records.
 */
import type {
  BodyArea,
  EquipmentKey,
  Foot,
  HealthStatus,
  Position,
  Profile,
  SkillKey,
  TrainingWindow,
} from '../db/types';

export type SkillMeta = { key: SkillKey; label: string; hint: string };
export type SkillGroup = { title: string; skills: SkillMeta[] };

export const SKILL_GROUPS: SkillGroup[] = [
  {
    title: 'On the ball',
    skills: [
      { key: 'dribbling1v1', label: '1v1 dribbling', hint: 'Beating a set defender' },
      { key: 'firstTouch', label: 'First touch', hint: 'Touch takes you forward, away from pressure' },
      { key: 'crossing', label: 'Crossing', hint: 'Early, whipped, cutbacks' },
      { key: 'finishing', label: 'Finishing', hint: 'Shots on target, picking a corner' },
      { key: 'weakFoot', label: 'Weak foot', hint: 'Using your left without thinking' },
      { key: 'passing', label: 'Passing', hint: 'Through balls, switches, short combos' },
    ],
  },
  {
    title: 'Athletic',
    skills: [
      { key: 'pace', label: 'Pace / acceleration', hint: 'First 5 metres and top speed' },
      { key: 'stamina', label: 'Stamina', hint: 'Still sprinting in the last 15 minutes' },
      { key: 'strength', label: 'Strength', hint: 'Shielding, duels, holding your line' },
      { key: 'heading', label: 'Heading', hint: 'Low priority in 9/10-a-side' },
    ],
  },
  {
    title: 'Game IQ and mind',
    skills: [
      { key: 'offBallMovement', label: 'Off-ball movement', hint: 'Getting free, runs in behind' },
      { key: 'defending', label: 'Defending / tracking back', hint: 'Recovery runs, pressing' },
      { key: 'decisionMaking', label: 'Decision-making', hint: 'Right choice, fast enough' },
      { key: 'confidence', label: 'Confidence', hint: 'Demanding the ball, taking defenders on' },
    ],
  },
];

export const ALL_SKILLS: SkillMeta[] = SKILL_GROUPS.flatMap((g) => g.skills);
export const SKILL_KEYS: SkillKey[] = ALL_SKILLS.map((s) => s.key);

export const RATING_SCALE_HINT =
  'Rate yourself against the players in your games: 5 = average there, 8 = one of the best there, 10 = nobody can stop you.';

export const FOOT_LABELS: Record<Foot, string> = {
  right: 'Right',
  left: 'Left',
  both: 'Both',
};

export const POSITIONS: { key: Position; label: string }[] = [
  { key: 'LW', label: 'Left wing' },
  { key: 'LM', label: 'Left mid' },
  { key: 'RW', label: 'Right wing' },
  { key: 'RM', label: 'Right mid' },
  { key: 'ST', label: 'Striker' },
  { key: 'CAM', label: 'Attacking mid' },
  { key: 'CM', label: 'Central mid' },
  { key: 'LB', label: 'Left back' },
  { key: 'RB', label: 'Right back' },
];

export const EQUIPMENT: { key: EquipmentKey; label: string }[] = [
  { key: 'ball', label: 'Ball' },
  { key: 'cones', label: 'Cones / markers' },
  { key: 'miniGoal', label: 'Mini or pop-up goal' },
  { key: 'rebounder', label: 'Rebounder' },
  { key: 'agilityLadder', label: 'Agility ladder' },
  { key: 'resistanceBand', label: 'Resistance band' },
  { key: 'miniBands', label: 'Mini loop bands' },
  { key: 'hurdles', label: 'Mini hurdles' },
  { key: 'tapeMeasure', label: 'Tape measure' },
  { key: 'gym', label: 'Gym membership' },
];

export const TRAINING_WINDOWS: { key: TrainingWindow; label: string }[] = [
  { key: 'earlyMorning', label: 'Early morning' },
  { key: 'morning', label: 'Morning' },
  { key: 'afternoon', label: 'Afternoon' },
  { key: 'evening', label: 'Evening' },
];

export const BODY_AREAS: { key: BodyArea; label: string }[] = [
  { key: 'ankleRight', label: 'Right ankle' },
  { key: 'ankleLeft', label: 'Left ankle' },
  { key: 'groinRight', label: 'Right groin' },
  { key: 'groinLeft', label: 'Left groin' },
  { key: 'kneeRight', label: 'Right knee' },
  { key: 'kneeLeft', label: 'Left knee' },
  { key: 'hamstringRight', label: 'Right hamstring' },
  { key: 'hamstringLeft', label: 'Left hamstring' },
  { key: 'calf', label: 'Calf' },
  { key: 'hip', label: 'Hip' },
  { key: 'lowerBack', label: 'Lower back' },
  { key: 'other', label: 'Other' },
];

export const BODY_AREA_LABEL = Object.fromEntries(BODY_AREAS.map((a) => [a.key, a.label])) as Record<
  BodyArea,
  string
>;

export const HEALTH_STATUS: { key: HealthStatus; label: string; hint: string }[] = [
  { key: 'active', label: 'Active', hint: 'Hurting now: training is limited around it' },
  { key: 'monitor', label: 'Monitor', hint: 'Cleared, but the app watches the pain threshold' },
  { key: 'resolved', label: 'Resolved', hint: 'History only' },
];

/** A blank profile. Every imported or restored profile is merged onto this. */
export function defaultProfile(): Profile {
  return {
    id: 'me',
    updatedAt: new Date().toISOString(),
    name: '',
    age: null,
    heightCm: null,
    weightKg: null,
    country: '',
    dominantFoot: 'right',
    positions: ['LW'],
    game: {
      level: '',
      format: '',
      surface: '',
      teamShape: '',
      matchMinutes: null,
      minutesPlayed: null,
    },
    style: {
      weapons: [],
      goalSources: [],
      goTo1v1: '',
      goodGame: '',
      badGame: '',
      roleModels: [],
    },
    goals: { weeks4: [], months3: [], year1: [] },
    matchTargets: { dribbleAttemptsMin: 3, dribbleAttemptsTarget: 8, leftFootPassesMin: 5 },
    schedule: {
      gamesPerWeekMin: 2,
      gamesPerWeekMax: 3,
      gameStartTime: '',
      gameNoticeDays: 1,
      groundSessionsPerWeek: 2,
      groundSessionsMax: 3,
      homeSessionsPerWeek: 4,
      trainingWindows: [],
    },
    places: {
      ground: '',
      groundTravelMin: null,
      groundHasGoals: null,
      groundHasLights: null,
      hasWall: false,
      homeSpace: '',
    },
    equipment: ['ball'],
    partner: { available: 'never', notes: '' },
    fitness: {
      pushUps: null,
      squats: null,
      plankSec: null,
      singleLegBalanceSec: null,
      otherTraining: '',
      warmUpHabit: '',
    },
    lifestyle: { sleepBeforeGamesH: null, sleepNormalH: null, preGameFood: '', dietNotes: '' },
    health: [],
    mind: {
      strengths: [],
      problemMoment: '',
      afterMistake: '',
      drivers: '',
      cueWords: [],
      ifThen: [],
    },
    prefs: { videoLanguage: 'en' },
  };
}
