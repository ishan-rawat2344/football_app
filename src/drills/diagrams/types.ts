/**
 * Drill diagrams: a top-down picture of the set-up, then one frame per step.
 *
 * Coordinates are in metres from the top-left corner. y grows downwards, and
 * on a pitch you attack upwards (the goal is at the top). Keep every point
 * inside `size`.
 */

export type Pt = [number, number];

/** Background: grass, the terrace (concrete, with a wall) or a small room. */
export type Surface = 'pitch' | 'terrace' | 'room';

/** Where a label sits next to the thing it names. */
export type LabelPos = 'right' | 'left' | 'above' | 'below';

export type Item =
  /** A marker (cone, stone or bottle). */
  | { kind: 'cone'; at: Pt; label?: string; labelPos?: LabelPos }
  /** A marker standing in for a defender: drawn bigger. */
  | { kind: 'defender'; at: Pt; label?: string; labelPos?: LabelPos }
  /** Two markers `width` apart, across (h) or along (v) the pitch. */
  | { kind: 'gate'; at: Pt; width: number; dir?: 'h' | 'v'; label?: string; labelPos?: LabelPos }
  /** A goal on the line through `at`, `width` wide. */
  | { kind: 'goal'; at: Pt; width: number; facing?: 'down' | 'up'; label?: string; labelPos?: LabelPos }
  /** A wall, optionally with a marked target on it. */
  | { kind: 'wall'; from: Pt; to: Pt; label?: string; labelPos?: LabelPos; target?: { at: Pt; width: number } }
  /** A painted or imagined line: touchline, offside line, half-space. */
  | { kind: 'line'; from: Pt; to: Pt; label?: string; labelPos?: LabelPos; dashed?: boolean }
  /** A target area (top-left corner + size). */
  | { kind: 'zone'; at: Pt; size: Pt; label?: string; labelPos?: LabelPos }
  /** A free label. */
  | { kind: 'text'; at: Pt; text: string };

/**
 * dribble = you carry the ball (wavy line)
 * run     = running without the ball (dashed)
 * pass / shot = the ball travels (solid)
 * feint   = a fake or body shape (short, highlighted)
 * look    = a scan over the shoulder (dotted)
 */
export type MoveType = 'dribble' | 'run' | 'pass' | 'shot' | 'feint' | 'look';

export interface Move {
  type: MoveType;
  path: Pt[];
  /** Who does it. Default: you. */
  by?: 'me' | 'partner';
  /** Smooth the path through its points (a curved run). */
  curve?: boolean;
}

/** Where the ball is: a spot, at someone's feet, or not in this drill. */
export type BallAt = Pt | 'me' | 'partner' | null;

export interface Frame {
  /** Which drill step (0-based) this frame shows. */
  step: number;
  moves?: Move[];
  /**
   * Positions after this frame. Usually worked out from the moves
   * (a dribble or run moves the player, a pass or shot moves the ball);
   * set them to override.
   */
  me?: Pt;
  partner?: Pt;
  ball?: BallAt;
  /** A call or cue for this moment, e.g. '"Now!"'. */
  cue?: string;
  /** A new rep: clear the arrows from earlier frames. */
  reset?: boolean;
}

export interface DrillDiagram {
  surface: Surface;
  /** Width and height of the area in metres. */
  size: Pt;
  items: Item[];
  start: { me: Pt; partner?: Pt; ball?: BallAt };
  frames: Frame[];
}
