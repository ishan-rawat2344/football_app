/**
 * "Ask Claude" (option A): build a plain-text summary of your data to paste
 * into claude.ai as the first message. Nothing is sent anywhere by the app;
 * you copy it and paste it yourself, so there's no API key and no cost.
 *
 * Pure, so it's tested. Personal details only come from your on-phone data.
 */
import type { FilmTag, MatchLog, PainReport, Profile, RatingSnapshot, SessionLog, TestResult } from '../db/types';
import { patterns } from '../film/analysis';
import { clock, matchMinute } from '../film/link';
import { findReason, getTag } from '../film/tags';
import { getDrill } from '../drills/library';
import type { FocusResult } from '../focus/focus';
import { addDays, formatShort, type ISODate } from '../lib/dates';
import { lowerFirst } from '../lib/format';
import type { AreaRestriction } from '../plan/adapt';
import { TITLE } from '../plan/engine';
import type { DayPlan } from '../plan/types';
import { ALL_SKILLS, BODY_AREA_LABEL, EQUIPMENT, FOOT_LABELS, TRAINING_WINDOWS } from '../profile/meta';
import { formatValue, TESTS } from '../tests/defs';
import { forTest, personalBest, type WeekLoad } from '../tests/results';

export type Topic = 'week' | 'game' | 'weakFoot' | 'mind' | 'body' | 'other';
export type Section = 'about' | 'ratings' | 'plan' | 'training' | 'games' | 'tests' | 'health' | 'mind';

export const TOPICS: { key: Topic; label: string; ask: string }[] = [
  {
    key: 'week',
    label: 'My week',
    ask: 'Look at my plan for the next 7 days and my recent training. Is it right for me right now? What would you change, and why?',
  },
  {
    key: 'game',
    label: 'My last game',
    ask: 'Look at my last game and how it compares with the ones before. What should I take from it, and what should I work on before the next one?',
  },
  {
    key: 'weakFoot',
    label: 'Weak foot',
    ask: 'Help me improve my weak foot. Give me a progression for the next 4 weeks that fits into the sessions I already do.',
  },
  {
    key: 'mind',
    label: 'Mental side',
    ask: 'Help me with the mental side of my game. My own notes about it are below. What should I try in the next game?',
  },
  {
    key: 'body',
    label: 'Pain or injury',
    ask: "I've logged some pain (details below). Help me train around it safely and work out what to tell a physio. I know you can't diagnose or examine me.",
  },
  { key: 'other', label: 'Something else', ask: '' },
];

export const SECTIONS: { key: Section; label: string }[] = [
  { key: 'about', label: 'About me, goals and schedule' },
  { key: 'ratings', label: 'Skill ratings' },
  { key: 'plan', label: 'Weekly focus and next 7 days' },
  { key: 'training', label: 'Last 2 weeks of training' },
  { key: 'games', label: 'Recent games' },
  { key: 'tests', label: 'Tests and personal bests' },
  { key: 'health', label: 'Health and pain' },
  { key: 'mind', label: 'Mental notes and cue words' },
];

export interface PackData {
  today: ISODate;
  profile: Profile;
  /** Oldest first. */
  ratings: RatingSnapshot[];
  logs: SessionLog[];
  pain: PainReport[];
  matches: MatchLog[];
  tests: TestResult[];
  focus?: FocusResult;
  /** Today and the next days, from the plan. */
  days?: DayPlan[];
  restrictions?: AreaRestriction[];
  loads?: WeekLoad[];
  /** Film room tags for these matches. */
  film?: FilmTag[];
}

const INTRO =
  "You're my football coach. Think like a UEFA B licensed coach, a strength and conditioning coach and a sport " +
  "psychologist. I'm an amateur, so be practical and specific: drills, sets, coaching cues and what to do this " +
  'week, fitted to my schedule and space. Use my data below and ask me if something important is missing. ' +
  "Don't diagnose injuries. If anything sounds like it needs a physio or doctor, say so plainly.";

const list = (xs: string[]) => xs.filter(Boolean).join(', ');
const line = (label: string, value: string | number | null | undefined) =>
  value === null || value === undefined || value === '' ? '' : `- ${label}: ${value}`;
const block = (title: string, lines: string[]) => {
  const body = lines.filter(Boolean);
  return body.length ? `## ${title}\n${body.join('\n')}` : '';
};
const yesNo = (b: boolean | null) => (b === null ? 'not checked' : b ? 'yes' : 'no');
/** "1 goal", "2 goals" */
const n = (count: number | undefined, word: string) => `${count ?? 0} ${word}${(count ?? 0) === 1 ? '' : 's'}`;
/** Ends a piece of free text with a full stop. */
const sentence = (t: string) => (t ? (/[.!?]$/.test(t.trim()) ? t.trim() : `${t.trim()}.`) : '');
const STATUS: Record<string, string> = { active: 'hurting now', monitor: 'cleared, still watching it', resolved: 'healed' };

function about(p: Profile): string {
  const g = p.game;
  const s = p.schedule;
  const who = [
    p.age ? `${p.age} years old` : '',
    `${FOOT_LABELS[p.dominantFoot].toLowerCase()}-footed`,
    p.positions.length ? `plays ${p.positions.join('/')}` : '',
    p.heightCm ? `${p.heightCm} cm` : '',
    p.weightKg ? `${p.weightKg} kg` : '',
    p.country ? `in ${p.country}` : '',
  ];
  const lines = [
    `- ${list(who)}`,
    line('Level', g.level),
    line('Games', list([g.format, g.surface, g.matchMinutes ? `${g.matchMinutes} min games` : '', g.minutesPlayed ? `I usually play ${g.minutesPlayed} min` : ''])),
    line('Team shape', g.teamShape),
    line('My weapons', list(p.style.weapons)),
    line('Where my goals come from', list(p.style.goalSources)),
    line('Go-to 1v1 move', p.style.goTo1v1),
    line('A good game for me', p.style.goodGame),
    line('A bad game for me', p.style.badGame),
    line('Players I learn from', list(p.style.roleModels.map((r) => (r.what ? `${r.name} (${r.what})` : r.name)))),
    line('Goals, next 4 weeks', list(p.goals.weeks4)),
    line('Goals, 3 months', list(p.goals.months3)),
    line('Goals, 1 year', list(p.goals.year1)),
    line(
      'Schedule',
      list([
        `${s.gamesPerWeekMin}–${s.gamesPerWeekMax} games a week${s.gameStartTime ? ` at ${s.gameStartTime}` : ''}`,
        s.gameNoticeDays ? `I find out about games ${s.gameNoticeDays} day${s.gameNoticeDays === 1 ? '' : 's'} ahead` : '',
        `${s.groundSessionsPerWeek} ground sessions (max ${s.groundSessionsMax})`,
        `${s.homeSessionsPerWeek} home sessions a week`,
      ]),
    ),
    line('I can train', list(s.trainingWindows.map((w) => TRAINING_WINDOWS.find((t) => t.key === w)?.label.toLowerCase() ?? w))),
    line(
      'Places',
      list([
        p.places.groundTravelMin ? `a ground ${p.places.groundTravelMin} min away (goals: ${yesNo(p.places.groundHasGoals)}, lights: ${yesNo(p.places.groundHasLights)})` : '',
        p.places.hasWall ? 'a wall to pass against' : '',
        p.places.homeSpace ? `at home: ${p.places.homeSpace}` : '',
      ]),
    ),
    line('Equipment', list(p.equipment.map((e) => EQUIPMENT.find((x) => x.key === e)?.label ?? e))),
    line('Training partner', p.partner.available === 'never' ? 'none' : list([p.partner.available, p.partner.notes])),
    line(
      'Fitness baseline',
      list([
        p.fitness.pushUps !== null ? `${p.fitness.pushUps} push-ups` : '',
        p.fitness.squats !== null ? `${p.fitness.squats} squats` : '',
        p.fitness.plankSec !== null ? `${p.fitness.plankSec} s plank` : '',
        p.fitness.singleLegBalanceSec !== null ? `${p.fitness.singleLegBalanceSec} s single-leg balance` : '',
      ]),
    ),
    line('Other training', p.fitness.otherTraining),
    line('Warm-up habit', p.fitness.warmUpHabit),
    line(
      'Sleep',
      list([
        p.lifestyle.sleepNormalH ? `${p.lifestyle.sleepNormalH} h normally` : '',
        p.lifestyle.sleepBeforeGamesH ? `${p.lifestyle.sleepBeforeGamesH} h before games` : '',
      ]),
    ),
    line('Before games I eat', p.lifestyle.preGameFood),
    line('Diet', p.lifestyle.dietNotes),
  ];
  return block('About me', lines);
}

function ratings(history: RatingSnapshot[]): string {
  const last = history.at(-1);
  if (!last) return '';
  const prev = history.at(-2);
  const rows = ALL_SKILLS.filter((s) => last.ratings[s.key] !== undefined).map((s) => {
    const r = last.ratings[s.key]!;
    const before = prev?.ratings[s.key];
    const change = before !== undefined && before !== r ? ` (${r > before ? '+' : ''}${r - before} since ${formatShort(prev!.date)})` : '';
    return `- ${s.label}: ${r}${change}`;
  });
  return block(`My skill ratings, 1–10 (self-rated ${formatShort(last.date)})`, rows);
}

function drillNames(day: DayPlan): string {
  return list(day.blocks.flatMap((b) => b.items.map((i) => getDrill(i.drillId)?.name ?? i.drillId)));
}

function plan(d: PackData): string {
  const parts: string[] = [];
  if (d.focus?.areas.length) {
    parts.push(
      block(
        `This week's focus (from ${d.focus.basedOn === 'matches' ? 'my recent games' : 'my ratings'})`,
        d.focus.areas.map((a) => `- ${a.title}: ${a.why}`),
      ),
    );
  }
  if (d.days?.length) {
    parts.push(
      block(
        'My plan for the next 7 days (from my app)',
        d.days.map((day) => {
          const what = day.kind === 'game' || day.kind === 'rest' ? TITLE[day.kind] : `${TITLE[day.kind]}, ${day.minutes} min`;
          const drills = day.blocks.length ? `. Drills: ${drillNames(day)}` : '';
          const why = day.reasons[0] ? ` (${day.reasons[0].replace(/\.$/, '')})` : '';
          return `- ${formatShort(day.date)}: ${what}${why}${drills}`;
        }),
      ),
    );
  }
  if (d.loads?.length) {
    const recent = d.loads.slice(-4);
    parts.push(
      block(
        'Training load (session RPE × minutes, games included)',
        recent.map((w) => {
          const what = w.sessions ? `including ${n(w.sessions, 'logged training session')}` : 'games only, no training logged';
          return `- Week of ${formatShort(w.week)}: ${w.load}${w.load ? ` (${what})` : ''}`;
        }),
      ),
    );
  }
  return parts.filter(Boolean).join('\n\n');
}

const RATED: Record<string, string> = { easy: 'too easy', hard: 'too hard' };

function training(d: PackData): string {
  const from = addDays(d.today, -14);
  const logs = d.logs.filter((l) => l.date >= from && l.date <= d.today).sort((a, b) => a.date.localeCompare(b.date));
  if (!logs.length) return block('Last 2 weeks of training', ['- Nothing logged yet']);
  return block(
    'Last 2 weeks of training',
    logs.map((l) => {
      const kind = l.sessionType ? TITLE[l.sessionType] : 'Session';
      const bits = [
        l.status,
        l.minutes ? `${l.minutes} min` : '',
        l.rpe ? `effort ${l.rpe}/10` : '',
        (l.light as boolean | undefined) ? 'light version' : '',
      ];
      const ready = l.readiness as { sleep: string; legs: string; soreness: string } | undefined;
      if (ready) bits.push(`sleep ${ready.sleep}, legs ${ready.legs}, soreness ${ready.soreness}`);
      const rated = Object.entries((l.drillRatings as Record<string, string> | undefined) ?? {})
        .filter(([, r]) => RATED[r])
        .map(([id, r]) => `${getDrill(id)?.name ?? id} ${RATED[r]}`);
      if (rated.length) bits.push(list(rated));
      const notes = l.notes ? `. Notes: "${l.notes}"` : '';
      return `- ${formatShort(l.date)}: ${kind} (${list(bits)})${notes}`;
    }),
  );
}

function games(d: PackData, topic: Topic): string {
  const ms = [...d.matches].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  if (!ms.length) return block('Recent games', ['- None logged yet']);
  const t = d.profile.matchTargets;
  const rows = ms.map((m, i) => {
    const stats = [
      m.minutes ? `${m.minutes} min` : '',
      `${n(m.goals, 'goal')}, ${n(m.assists, 'assist')}`,
      `1v1s ${m.dribblesWon ?? 0}/${m.dribblesAttempted ?? 0} won`,
      `shots ${m.shotsOnTarget ?? 0}/${m.shots ?? 0} on target`,
      n(m.leftFootTouches, 'weak-foot action'),
      m.confidence ? `confidence ${m.confidence}/10` : '',
      m.involvement ? `on the ball: ${m.involvement}` : '',
      m.keptAsking ? `kept asking for it after losing it: ${m.keptAsking}` : '',
      m.rpe ? `effort ${m.rpe}/10` : '',
    ];
    // full reflections for the latest game (or all of them when the question is about games)
    const detail = i === 0 || topic === 'game'
      ? [
          m.wentWell ? `  - Went well: ${m.wentWell}` : '',
          m.wentBadly ? `  - Went badly: ${m.wentBadly}` : '',
          m.keyMoments ? `  - Key moments: ${m.keyMoments}` : '',
          m.mental ? `  - Mentally: ${m.mental}` : '',
        ].filter(Boolean)
      : [];
    const film = i === 0 || topic === 'game' ? filmLines(m, d.film ?? []) : [];
    return [`- ${formatShort(m.date)}: ${list(stats)}`, ...detail, ...film].join('\n');
  });
  rows.push(
    `- My per-game targets: at least ${t.dribbleAttemptsMin} 1v1 attempts (aiming for ${t.dribbleAttemptsTarget}), at least ${t.leftFootPassesMin} weak-foot actions`,
  );
  return block('Recent games, newest first (stats I count from the recording)', rows);
}

/** The moments you tagged in the Film room, in match order. */
function filmLines(m: MatchLog, all: FilmTag[]): string[] {
  const tags = all.filter((t) => t.matchId === m.id).sort((a, b) => a.t - b.t);
  if (!tags.length) return [];
  const MAX = 40;
  const lines = tags.slice(0, MAX).map((t) => {
    const def = getTag(t.kind);
    const outcome = def.outcomes?.find((o) => o.key === t.outcome)?.label.toLowerCase();
    const why = (t.reasons ?? []).map((k) => findReason(t.kind, k)?.label.toLowerCase()).filter(Boolean);
    const when = m.filmKickoff !== undefined ? `${matchMinute(t.t, m.filmKickoff)} (video ${clock(t.t)})` : `video ${clock(t.t)}`;
    const what = [def.label + (outcome ? `: ${outcome}` : ''), why.length ? `because: ${why.join(', ')}` : ''].filter(Boolean).join(', ');
    return `    - ${when}: ${what}${t.note ? `. My note: "${t.note}"` : ''}`;
  });
  if (tags.length > MAX) lines.push(`    - …and ${tags.length - MAX} more`);
  const pats = patterns(tags).slice(0, 3).map((p) => `    - Pattern: ${p.text}`);
  return [
    `  - Film room: ${tags.length} moments I tagged while re-watching${m.recordingUrl ? ` (video: ${m.recordingUrl})` : ''}`,
    ...lines,
    ...pats,
  ];
}

function tests(d: PackData): string {
  const rows = TESTS.flatMap((t) => {
    const rs = forTest(d.tests, t.id);
    const last = rs.at(-1);
    if (!last) return [];
    const pb = personalBest(t, rs);
    const first = rs[0]!;
    const since = rs.length > 1 ? `, first ${formatValue(t, first.value)} on ${formatShort(first.date)}` : '';
    return [`- ${t.name}: ${formatValue(t, last.value)} on ${formatShort(last.date)} (best ${pb ? formatValue(t, pb.value) : '–'}${since}; ${t.better} is better)`];
  });
  return rows.length ? block('Solo tests', rows) : '';
}

const PAIN_WHEN: Record<PainReport['when'], string> = {
  during: 'during training',
  after: 'after training',
  nextMorning: 'next morning',
  atRest: 'at rest',
};

function health(d: PackData): string {
  const flags = d.profile.health.map((f) => {
    const status = STATUS[f.status] ?? f.status;
    const tag = list([...f.areas.map((a) => BODY_AREA_LABEL[a].toLowerCase()), f.title.toLowerCase().includes(status) ? '' : status]);
    const extra = [f.since ? sentence(`Since: ${f.since}`) : '', sentence(f.notes), f.rules ? sentence(`What I do about it: ${lowerFirst(f.rules)}`) : '']
      .filter(Boolean)
      .join(' ');
    return `- ${f.title} (${tag})${extra ? `. ${extra}` : ''}`;
  });
  const from = addDays(d.today, -28);
  const pain = d.pain
    .filter((p) => p.date >= from)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((p) => `- ${formatShort(p.date)}: ${BODY_AREA_LABEL[p.area]} ${p.score}/10 ${PAIN_WHEN[p.when]}${p.note ? ` ("${p.note}")` : ''}`);
  const rest = (d.restrictions ?? []).map(
    (r) => `- The app is keeping load off my ${BODY_AREA_LABEL[r.area].toLowerCase()} until ${formatShort(r.until)}`,
  );
  return [
    block('Injuries and health notes', flags.length ? flags : ['- None']),
    block('Pain I logged in the last 4 weeks (0–10)', pain.length ? [...pain, ...rest] : ['- None']),
  ]
    .filter(Boolean)
    .join('\n\n');
}

function mind(p: Profile): string {
  const m = p.mind;
  return block('The mental side, in my words', [
    line('Strengths', list(m.strengths)),
    line('Where it goes wrong', m.problemMoment),
    line('After a mistake I', m.afterMistake),
    line('What drives me', m.drivers),
    line('My cue words', list(m.cueWords)),
    ...m.ifThen.map((x) => `- If ${lowerFirst(x.when)}, then ${lowerFirst(x.then)}`),
  ]);
}

export function buildPack(d: PackData, opts: { topic: Topic; question?: string; include: Set<Section> }): string {
  const topic = TOPICS.find((t) => t.key === opts.topic)!;
  const q = opts.question?.trim();
  const ask = [topic.ask, q].filter(Boolean).join('\n\n') || 'I have a question about my training. Start by asking me what it is.';
  const inc = (s: Section) => opts.include.has(s);

  const sections = [
    INTRO,
    `## My question\n${ask}`,
    inc('about') ? about(d.profile) : '',
    inc('ratings') ? ratings(d.ratings) : '',
    inc('plan') ? plan(d) : '',
    inc('training') ? training(d) : '',
    inc('games') ? games(d, opts.topic) : '',
    inc('tests') ? tests(d) : '',
    inc('health') ? health(d) : '',
    inc('mind') ? mind(d.profile) : '',
    `(Summary made by my training app on ${formatShort(d.today)}. Dates are this year.)`,
  ];
  return sections.filter(Boolean).join('\n\n');
}

export const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length;
