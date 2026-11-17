/**
 * Builds the contents of one session: which drills go in which block.
 *
 * Picks are deterministic for a given day (same inputs, same session), rotate
 * between days so you don't do the same drills every time, favour your
 * weakest skills, and respect your health notes.
 */
import type { HealthFlag, Profile, Ratings, SessionType } from '../db/types';
import { DRILLS, getDrill } from '../drills/library';
import { describeAreas, healthWarnings, priorityScore } from '../drills/personal';
import { LOAD_TAG_AREAS, type Drill, type DrillCategory } from '../drills/types';
import type { PlannedBlock, PlannedItem } from './types';

export interface SessionContext {
  /** Day number used to rotate drill choices between days. */
  ordinal: number;
  ratings: Ratings;
  profile: Profile;
  lightWeek: boolean;
  gameTomorrow: boolean;
  /** Drills used in the previous session of this kind: picked only if nothing else fits. */
  avoid?: Set<string>;
}

type Place = 'ground' | 'home';

const WARMUP = { ground: 'warmup-winger', home: 'warmup-home', game: 'warmup-pregame' };
const COOLDOWN = 'cooldown-standard';
const RECOVERY = 'cooldown-recovery-flow';

/** Can this drill be done here, alone (or with the partner you have), with your kit? */
export function fitsPlace(d: Drill, place: Place, p: Profile): boolean {
  if (place === 'ground' && !d.locations.includes('ground')) return false;
  if (place === 'home') {
    const terraceOk = p.places.hasWall && d.locations.includes('terrace');
    if (!d.locations.includes('room') && !terraceOk) return false;
  }
  if (d.mode === 'partner' && p.partner.available !== 'regular') return false;
  for (const need of d.equipment) {
    if (need === 'ball' && !p.equipment.includes('ball')) return false;
    if (need === 'band' && !p.equipment.includes('resistanceBand')) return false;
    if (need === 'wall' && place === 'home' && !p.places.hasWall) return false;
  }
  return true;
}

export interface HealthGate {
  ok: boolean;
  level: -1 | 0;
  note?: string;
}

/**
 * Your health notes decide whether a drill is in, in at the easier level, or out.
 * Out: an active note plus a high-intensity drill loading that area, or any
 * inner-thigh strengthening beyond the gentle squeeze.
 */
export function healthGate(d: Drill, flags: HealthFlag[]): HealthGate {
  const warnings = healthWarnings(d, flags);
  const stop = warnings.filter((w) => w.level === 'stop');
  if (stop.length) {
    if (d.intensity === 'high' || d.loadTags.includes('adductor')) return { ok: false, level: 0 };
    return { ok: true, level: -1, note: `Easier version: your "${stop[0]!.flag.title}" note is active.` };
  }
  if (warnings.length) {
    const watch = warnings.map((w) => `${describeAreas(w.flag.areas)} at ${w.flag.amberAt}/10`).join(', ');
    return { ok: true, level: 0, note: `Stop if pain reaches: ${watch}.` };
  }
  return { ok: true, level: 0 };
}

/** Prevention drills that work on an area you have a note about get priority. */
function protectsFlaggedArea(d: Drill, flags: HealthFlag[]): boolean {
  if (d.category !== 'injuryPrevention') return false;
  const areas = new Set(flags.filter((f) => f.status !== 'resolved').flatMap((f) => f.areas));
  return d.loadTags.some((t) => LOAD_TAG_AREAS[t].some((a) => areas.has(a)));
}

interface PickRule {
  categories?: DrillCategory[];
  block?: Drill['blocks'][number];
  place: Place;
  /** Leave out drills with any of these properties. */
  noSprint?: boolean;
  noCutting?: boolean;
  maxIntensity?: Drill['intensity'];
  exclude?: (d: Drill) => boolean;
}

const INTENSITY_RANK = { low: 0, medium: 1, high: 2 } as const;

function candidates(rule: PickRule, ctx: SessionContext): Drill[] {
  const flags = ctx.profile.health;
  return DRILLS.filter((d) => {
    if (d.category === 'warmup' || d.category === 'cooldown') return false;
    if (rule.categories && !rule.categories.includes(d.category)) return false;
    if (rule.block && !d.blocks.includes(rule.block)) return false;
    if (!fitsPlace(d, rule.place, ctx.profile)) return false;
    if (rule.noSprint && d.loadTags.includes('sprint')) return false;
    if (rule.noCutting && d.loadTags.includes('cutting')) return false;
    if (rule.maxIntensity && INTENSITY_RANK[d.intensity] > INTENSITY_RANK[rule.maxIntensity]) return false;
    if (rule.exclude?.(d)) return false;
    return healthGate(d, flags).ok;
  });
}

/**
 * Pick one drill: rank by how much it helps your weakest skills (plus a bonus
 * for protecting a flagged area), then rotate through the top 3 by day.
 */
function pick(rule: PickRule, ctx: SessionContext, slot: number, used: Set<string>): Drill | undefined {
  const flags = ctx.profile.health;
  const ranked = candidates(rule, ctx)
    .filter((d) => !used.has(d.id))
    .map((d, i) => {
      const gate = healthGate(d, flags);
      const score =
        priorityScore(d, ctx.ratings) +
        (protectsFlaggedArea(d, flags) ? 8 : 0) -
        (gate.level === -1 ? 4 : 0);
      return { d, i, score };
    })
    .sort((a, b) => b.score - a.score || a.i - b.i);
  if (!ranked.length) return undefined;
  const top = Math.min(3, ranked.length);
  const start = (ctx.ordinal + slot) % top;
  // Walk the top picks from the rotation point; skip last session's drills if we can.
  let chosen = ranked[start]!.d;
  for (let k = 0; k < top; k++) {
    const d = ranked[(start + k) % top]!.d;
    if (!ctx.avoid?.has(d.id)) {
      chosen = d;
      break;
    }
  }
  used.add(chosen.id);
  return chosen;
}

function item(d: Drill, ctx: SessionContext, factor = 1, extraNote?: string): PlannedItem {
  const gate = healthGate(d, ctx.profile.health);
  const notes = [gate.note, extraNote].filter(Boolean).join(' ');
  return {
    drillId: d.id,
    level: gate.level,
    minutes: Math.max(2, Math.round(d.durationMin * factor)),
    ...(notes ? { note: notes } : {}),
  };
}

function fixed(id: string, ctx: SessionContext, factor = 1, note?: string): PlannedItem {
  const d = getDrill(id);
  if (!d) throw new Error(`Missing drill ${id}`);
  return item(d, ctx, factor, note);
}

const block = (b: PlannedBlock['block'], items: (PlannedItem | undefined)[]): PlannedBlock | null => {
  const real = items.filter((x): x is PlannedItem => Boolean(x));
  return real.length ? { block: b, items: real } : null;
};

const AT_GROUND = 'At the ground or when you get home.';
const joinNotes = (...n: (string | undefined)[]) => n.filter(Boolean).join(' ') || undefined;

const LIGHT = 0.7;
const LIGHT_NOTE = 'Light week: about two-thirds of the sets.';

/** Nordics leave you sore for days, so never the day before a game. */
const noNordicBeforeGame = (ctx: SessionContext) => (d: Drill) => ctx.gameTomorrow && d.id === 'ip-nordic';

export function buildSession(type: SessionType, ctx: SessionContext): PlannedBlock[] {
  const used = new Set<string>();
  const light = ctx.lightWeek ? LIGHT : 1;
  const lightNote = ctx.lightWeek ? LIGHT_NOTE : undefined;
  const take = (rule: PickRule, slot: number, factor = 1, note?: string) => {
    const d = pick(rule, ctx, slot, used);
    return d ? item(d, ctx, factor, note) : undefined;
  };

  const blocks: (PlannedBlock | null)[] = [];
  switch (type) {
    case 'groundHard':
      blocks.push(
        block('warmup', [fixed(WARMUP.ground, ctx)]),
        block('technical', [take({ categories: ['receiving', 'weakFoot', 'ballMastery'], block: 'technical', place: 'ground' }, 0)]),
        block('position', [
          take({ categories: ['oneVOne', 'finishing'], place: 'ground' }, 1),
          take({ categories: ['crossing', 'movement', 'defending'], place: 'ground' }, 2),
        ]),
        block('physical', [
          take({ categories: ['speed'], place: 'ground' }, 3, light, lightNote),
          take({ categories: ['injuryPrevention'], place: 'home', exclude: noNordicBeforeGame(ctx) }, 4, light, joinNotes(AT_GROUND, lightNote)),
        ]),
        block('cooldown', [fixed(COOLDOWN, ctx)]),
      );
      break;

    case 'groundTech':
      blocks.push(
        block('warmup', [fixed(WARMUP.ground, ctx, 1, 'Easier version: no hops, cuts at 60%.')]),
        block('technical', [take({ categories: ['receiving', 'weakFoot', 'ballMastery'], block: 'technical', place: 'ground', noSprint: true }, 0)]),
        block('position', [
          take({ categories: ['finishing', 'crossing', 'movement'], place: 'ground', noSprint: true, maxIntensity: 'medium' }, 1),
        ]),
        block('physical', [
          take({ categories: ['injuryPrevention'], place: 'home', maxIntensity: 'low', exclude: noNordicBeforeGame(ctx) }, 2, 1, AT_GROUND),
        ]),
        block('cooldown', [fixed(COOLDOWN, ctx)]),
      );
      break;

    case 'home':
      blocks.push(
        block('warmup', [fixed(WARMUP.home, ctx)]),
        block('technical', [take({ categories: ['weakFoot', 'receiving', 'ballMastery'], place: 'home' }, 0)]),
        block('physical', [
          take({ categories: ['injuryPrevention'], place: 'home', exclude: noNordicBeforeGame(ctx) }, 1, light, lightNote),
        ]),
      );
      break;

    case 'sharp': {
      // Day before a game: short, light, confident. Half the sets, nothing tiring.
      const rule = { place: 'home' as const, maxIntensity: 'low' as const, noSprint: true, noCutting: true };
      blocks.push(
        block('warmup', [fixed(WARMUP.home, ctx)]),
        block('technical', [
          take({ ...rule, categories: ['ballMastery'] }, 0, 0.5, 'Half the sets: stay fresh.'),
          take({ ...rule, categories: ['weakFoot', 'receiving'] }, 1, 0.5, 'Half the sets: stay fresh.'),
        ]),
      );
      break;
    }

    case 'recovery':
      blocks.push(block('cooldown', [fixed(RECOVERY, ctx)]));
      break;

    case 'game':
      blocks.push(block('warmup', [fixed(WARMUP.game, ctx, 1, 'Before kick-off.')]));
      break;

    case 'rest':
      break;
  }
  return blocks.filter((b): b is PlannedBlock => b !== null);
}

export function sessionMinutes(blocks: PlannedBlock[]): number {
  return blocks.reduce((sum, b) => sum + b.items.reduce((s, i) => s + i.minutes, 0), 0);
}
