# Touchline: the plan

This is the plan approved on 16 Nov 2026. Personal details (profile, ratings, health) are deliberately
**not** in this repo. They live in `private/PLAYER_PROFILE.md`, which is git-ignored.

## How the training plan works

Game days are only known one day ahead, so the plan is **rolling**. It isn't a fixed weekly calendar:
it combines **weekly targets** with **daily rules**, and it re-plans when you tap "Game tomorrow".

### Daily rules

| Situation | Session |
|---|---|
| Game today | The game. Pre-match routine in the morning, match log afterwards. |
| Game tomorrow (MD-1) | **Sharp**: a short home session, 15 min, nothing tiring. Pre-match routine starts that evening. |
| Game yesterday (MD+1) | **Recovery**, 15 min: mobility and light touches. Or a **technical ground session** with no sprints, if you feel fresh. |
| 2+ days since the last game, no game tomorrow, ground target not yet met | **Hard ground session**: 1v1 at speed, acceleration, injury prevention. |
| Anything else | **Home technical session**: weak foot, first touch, ball mastery, injury prevention. |

### Rules that never bend

- Games count as high-intensity days, so there are never two high-intensity days back to back.
- No hard sprinting or cutting on the day before a game.
- Before a hard ground session the app asks "Signed up for tomorrow?". If yes, it becomes a sharp session.
- At least one full rest day per week.
- Weekly load (session RPE × minutes, games included) rises by no more than 10% a week, and every 4th week is lighter.

### Session structure

| Session | Warm-up (FIFA 11+ based) | Technical | Position-specific | Physical | Cool-down |
|---|---|---|---|---|---|
| Ground | 12–15 min | 15–20 min | 15–20 min | 10–15 min | 5 min |
| Home | 3 min | 8–10 min | none | 5 min | 2 min |

### Adaptation

- **Difficulty:** rated "too easy" twice → harder version; "too hard" → easier version.
- **Missed sessions:** don't cram to catch up. The most important block moves to the next session.
- **Readiness check** before each session (sleep, fatigue, soreness). Low readiness → the light version.
- **Pain traffic light**, per body area:
  - 🟢 0–2 and gone by the next morning → continue.
  - 🟡 3–4, or still there the next morning → drills that load that area are removed for 72 hours. If it repeats, the app suggests a physio.
  - 🔴 5+, pain at rest, swelling, or getting worse → all related work stops and the app says to see a physio or doctor. **The app never diagnoses.**
  - Per-area thresholds can be stricter for known issues. These are set in the private profile.
- Every change shows a one-line reason.

### Weekly focus from match logs

Up to two focus areas a week. Examples: few 1v1 attempts → 1v1 work and the reset routine; few left-foot
touches → extra weak-foot work; few shots → finishing from the left; low confidence → a mentality lesson
and visualisation.

## Version 1 features

1. Profile and ratings (imported from a private file, editable, re-rated monthly with history)
2. Rolling training plan
3. Drill library (~45 drills written in full coach format; filters by location, equipment, solo or partner)
4. Session mode (big buttons, work/rest timers, auto-advance, screen stays awake, beeps and colour flashes, spoken **cue caller** for solo decision training)
5. Logging and progress (session log, 8 solo tests every 4 weeks, charts, personal bests, streak)
6. Match log and weekly focus
7. Mentality coach (pre-match routine, reset routine, short lessons, cue words, if → then plans)
8. YouTube tutorials (per drill and focus area; ranking, save/like/hide, trusted channels, caching)
9. Ask Claude, option A (copies a context pack and opens claude.ai; no API cost)
10. Backup and restore (JSON file through the iPhone Files app)

**Later:** paid AI chat (option B), summer and monsoon modes, pitch diagrams, gym programme, heading,
match-video timestamp tagging, a partner drill pack, notifications, device sync.

## Tech stack

| Piece | Choice | Why |
|---|---|---|
| App type | PWA | Installs from Safari, works offline, no App Store fee; native free builds expire every 7 days |
| Language | TypeScript | Types catch data-model bugs in the plan logic |
| Build | Vite | Fast, almost no configuration |
| UI | React | Mainstream, easy to maintain |
| Routing | wouter (hash routes) | Tiny; hash routes need no server rewrites on GitHub Pages |
| Styling | Plain CSS with variables | Light/dark tokens, no framework |
| Storage | IndexedDB via Dexie | Structured local data, migrations, live queries |
| Offline | vite-plugin-pwa (Workbox) | Service worker and manifest |
| Charts | Hand-written SVG | Only simple charts are needed |
| Tests | Vitest | Plan engine and pain rules must be correct |
| Hosting | GitHub Pages + Actions | Free HTTPS, deploys on push |

**Keys and privacy:** the YouTube key is entered in the app's Settings on the phone and stored only on the
device. `.env` is for local development only. Personal data never goes in the repo.

## YouTube (checked against the docs, 16 Nov 2026)

- Since June 2026, `search.list` has its own bucket: **100 calls per day**. `videos.list` costs 1 unit from
  the shared 10,000 units per day. Quotas reset at midnight Pacific time.
- Policy: stored API data must be refreshed or deleted within **30 days**.
- About 45 curated queries, English, embeddable, 4–20 minute videos. Highlights and compilations are
  filtered out. Ranking uses relevance, views, recency, like rate, trusted channels and your feedback.
  Results are cached for 14 days and deleted at 30. Videos play in the `youtube-nocookie` embed.

## Milestones

| # | Milestone |
|---|---|
| M0 | Setup: PWA shell, theme, tabs, Dexie, git, README, GitHub Pages deploy |
| M1 | Profile import and editing, ratings and history, backup and restore |
| M2 | Drill library |
| M3 | Plan engine (with tests), Today and Plan screens |
| M4 | Session mode, logging, adaptation, streak |
| M5 | Match log and weekly focus |
| M6 | Tests, charts, personal bests |
| M7 | Mentality coach |
| M8 | YouTube |
| M9 | Ask Claude, polish, final README |
