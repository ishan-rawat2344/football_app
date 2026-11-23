# Touchline ⚽

A personal football coach for a left winger. It plans training around your games, runs sessions at the
pitch, tracks progress, and coaches the mental side. It's a **PWA (Progressive Web App)**: a website that
installs on your iPhone's home screen, works offline, and keeps all its data **on your phone**.

> **Status: version 1.2.** All ten planned milestones are done, plus step-by-step drill diagrams and the Film room. [docs/PLAN.md](docs/PLAN.md) has the
> original plan, and **Ideas for later** at the end of this file lists what could come next.

### What it does

| Tab or screen | What you get |
|---|---|
| **Today** | Today's session, built from your games, targets, pain and readiness; game-day and night-before routines; weekly focus; reminders to re-rate and back up |
| **Plan** | The next 7 days, with a one-line reason for each day. Change any day ("can't get to the ground") and the rest re-plans |
| **Drills** | 54 drills written like a coach's session plan, sorted by your weakest skills, with step-by-step diagrams and tutorial videos |
| **Session mode** | Big buttons and timers for the pitch, a spoken cue caller, a readiness check, pain logging, and effort and difficulty ratings |
| **Progress** | Match log, solo tests, personal bests, charts against your targets, and training load |
| **Film room** | Watch a match video in the app, tag your moments, review them with a coach's checklist, and find your patterns |
| **Mind** | Pre-match routine, the reset after a mistake, visualisation, 10 short lessons, your cue words |
| **Videos** | YouTube tutorials for this week's focus, ranked by what you find helpful |
| **Ask Claude** | Copies a summary of your data to paste into Claude for a free second opinion |

### A normal week

1. **Each morning** open Today. Tap **Game tomorrow** when you sign up for a game; the plan switches to a
   sharp session.
2. **At the session**, tap **Start session**. Session mode runs the drills, then asks how hard it was and whether
   anything hurt.
3. **After a game**, tap **Log a match** (about 30 seconds). Your last 3 games set next week's focus.
4. **Every 4 weeks**, the app asks you to re-rate your skills and redo the solo tests.
5. **Once a week**, back up (**Settings → Back up, restore or import**). Today reminds you.
6. **If something hurts**, log it. The plan keeps load off that area and tells you when to see a physio.

---

## Privacy: what goes where

| What | Where it lives | In git? |
|---|---|---|
| App code and drill content | This repo | ✅ Yes |
| Your profile, ratings, health notes | `private/` on your Mac, then the app on your phone | ❌ No (git-ignored) |
| Your logs, matches, tests | IndexedDB on your phone | ❌ No |
| YouTube API key | The app on your phone (`.env` on your Mac for local development only) | ❌ No (git-ignored, never in backups) |
| Ask Claude summary | Only copied when you tap the button; you paste it into Claude yourself | ❌ No |

---

## 1. Requirements

- **Node.js 22.12 or newer.** Check with `node -v`. Install from [nodejs.org](https://nodejs.org) if needed.
- **Git.** Check with `git --version`.
- A **GitHub account**, for free hosting.
- An **iPhone** with Safari.

## 2. Run it on your Mac

```bash
npm install
```

```bash
npm run dev
```

Open <http://localhost:5173>. Edits to files in `src/` show up immediately.

To see the phone layout on your Mac, open Safari or Chrome developer tools and switch to a phone-sized view.

## 3. Try it on your iPhone over Wi-Fi (quick look)

Your Mac and iPhone must be on the same Wi-Fi network.

```bash
npm run dev:phone
```

Vite prints a `Network:` address such as `http://192.168.1.20:5173`. Open that address in Safari on
your iPhone.

> This is good for checking layouts. **Offline mode and "Add to Home Screen" only work properly on the real
> HTTPS site** (step 5), because browsers only allow service workers on HTTPS.
>
> The dev server refuses to serve `private/` and `.env*`, so nobody else on the Wi-Fi can read them.

## 4. Tests and checks

```bash
npm test
```

```bash
npm run typecheck
```

To build the production version and preview it locally, including offline mode:

```bash
npm run build && npm run preview
```

Then open <http://localhost:4173>.

## 5. Put it online (GitHub Pages, free)

You only need to do this once.

1. Go to [github.com/new](https://github.com/new) and create a repository, for example `touchline`.
   - Make it **Public**. On a free account, GitHub Pages requires a public repo. It only contains code,
     because your personal data is git-ignored.
   - Don't add a README, .gitignore or licence, since this project already has them.
2. In this folder, connect the repo and push. Replace `YOUR-USERNAME`:

   ```bash
   git remote add origin https://github.com/YOUR-USERNAME/touchline.git
   ```

   ```bash
   git push -u origin main
   ```

3. On GitHub, open the repo, go to **Settings → Pages**, and under **Build and deployment → Source** choose
   **GitHub Actions**.
4. Open the **Actions** tab. The "Deploy to GitHub Pages" run takes about a minute. If it ran before you
   changed the Pages setting and failed, click **Re-run all jobs**.
5. Your app is live at `https://YOUR-USERNAME.github.io/touchline/`.

From now on, every `git push` to `main` tests, builds and deploys automatically.

## 6. Install it on your iPhone

1. Open your GitHub Pages URL in **Safari**. It must be Safari, not Chrome.
2. Tap **Share** (the square with an arrow), then **Add to Home Screen**, then **Add**.
3. Open **Touchline from the home-screen icon** from now on. That copy has its own storage, which Safari
   won't clear.
4. Check it: tap the settings icon (top right) to see the **System check**. You should see:
   - On-device database: **Ready**
   - Works offline: **Cached**
   - Installed on home screen: **Yes**
5. Test offline: turn on **Airplane Mode**, close the app fully (swipe it away), then open it again. It
   should still load.

## 7. Put your profile on the phone

Your interview profile is in `private/profile.json` on your Mac. It's git-ignored, so it never goes to
GitHub. To get it onto your iPhone:

1. **On the Mac:** in Finder, open the project's `private` folder. Right-click `profile.json` →
   **Share** → **AirDrop** → your iPhone. On the iPhone it lands in **Files → Downloads**.
   (Saving it to iCloud Drive works too.)
2. **On the iPhone:** open Touchline → tap the settings icon → **Back up, restore or import** →
   **Choose file** → **Browse** → **Downloads** → `profile.json`.
3. Check the preview, then tap **Import profile**.
4. Go to Settings → **Profile** → **Basics** → **Edit** and add your name.
5. Optional: delete `profile.json` from Downloads afterwards. The app keeps its own copy.

Importing a profile again replaces the profile but keeps your logs and rating history.

## 8. Backups

Everything lives only on your phone. If the phone is lost or the app is deleted, a backup is the only
copy.

- **Back up:** Settings → **Back up, restore or import** → **Back up now** → **Save to Files**
  (choose iCloud Drive) or AirDrop it to your Mac. Today reminds you if your last backup is over a week old.
- **Restore** (new phone, or after deleting the app): same screen → **Choose file** → pick the backup →
  check what's in it → **Restore**. This replaces everything on the phone.
- Backups never contain API keys, and they leave out cached YouTube data (YouTube's rules say it has to be
  refreshed, so it's re-downloaded instead).

### Updates

When a new version is pushed, the app shows **"A new version is ready"** with **Later** or **Update**. It
never reloads by itself, so an update can't interrupt a session.

### If something breaks

If a screen crashes, you'll see **Something went wrong** with two buttons:
- **Reload**
- **Repair app**, which deletes the cached copy of the app and downloads the latest version.

Your data is stored separately and isn't touched by either.

---

## How the plan decides each day

The full rules are in [docs/PLAN.md](docs/PLAN.md). In short, in order:
1. A game is a game. The day **before** a game is a short, light "sharp" session; the day **after** is recovery.
2. A **hard ground session** happens only when yesterday wasn't hard and you still need one this week.
   Before a hard session the app asks "Signed up for a game tomorrow?".
3. At least one rest day a week; otherwise home sessions until the weekly target is met.
4. Every 4th week is lighter. Your health notes pull out or soften drills that load a sore area.

Tap **Game today / Game tomorrow** on Today (or "Game this day" on Plan) and everything re-plans. Use the
swap chips ("Can't get to the ground", "Rest") to change a day; "Back to the plan" undoes it.

## Session mode (at the pitch)

On **Today**, tap **Start session**.

1. **Three taps on how you feel** (sleep, legs, soreness). If you're low, you get the *light version*:
   no flat-out speed work and fewer sets. You can still choose the full session.
2. **One drill at a time**, full screen, with controls at the bottom for your thumb:
   - **Set done** / **Pause** / **Skip rest**. Timed drills count down by themselves (green = work,
     navy = rest), with beeps at the start and at 3-2-1.
   - **Pain**: pick where and how bad. At your amber score the rest of the session's drills that load
     that area are skipped; at 5/10 or more it tells you to stop.
   - **Skip ›** skips a drill; **✕** ends the session early.
   - **Cue caller** (on drills like *Gates on the call* or *Scan, receive, go*): the phone calls "Left!",
     "Turn!", "Man on!" at random moments and shows the word huge on screen.
3. **Rate each drill**: *too hard* once → easier version next time; *too easy* twice → harder.
4. **Finish**: effort 1–10, any pain now, notes, then **Save**.

Already trained without the app? Tap **Log it** on Today. If the app closes mid-session, Today shows
**Resume session**.

**How the plan adapts afterwards**
- **Pain traffic light** for each body area. *Amber* (your amber score, or 2+/10 the next morning) keeps
  drills that load that area out for 3 days. *Red* (5+/10, or pain at rest) keeps them out for 7 days, allows
  no hard sessions, and tells you to see a physio or doctor. The app never diagnoses.
- **Morning check**: after a session where you logged pain, Today asks how that area feels the next
  morning. A clear answer (0–1) lifts an amber hold early.
- **Training load** (effort × minutes): after 3 weeks of history, if the last 7 days are more than 30% above
  your 4-week average, today's hard session becomes technical.
- **Streak**: completed sessions and games in a row. Planned rest days don't break it; skipped or missed
  sessions do.

**iPhone notes**
- The screen stays awake during a session. If it still dims, update iOS, or raise Settings → Display &
  Brightness → Auto-Lock.
- Beeps and spoken cues are set to play even with the silent switch on, but iPhones can still mute them.
  Everything is also shown on screen in big type and colour, and the 🔊 button turns sound off.

## Match log and weekly focus

After a game, Today shows **Log your match** (Progress → **Log a match** works any time). It's about
30 seconds of numbers:
- **Basics:** minutes, goals and assists.
- **On the ball:** 1v1s tried and won, shots and shots on target, left-foot actions, and how much of the
  ball you got.
- **How it felt:** how hard the game was, your confidence, and whether you kept asking for the ball after
  losing it.
- **Optional:** your own words, and a link to the recording once it's up. Open a match later to fill those in.

**Weekly focus** (on Today and Plan) compares your last 3 games (from the last 3 weeks) with your per-game
targets and picks the two biggest gaps. Examples: *Take defenders on*, *Use your left*, *Get on the ball
more*, *Demand it again*, *Get shots off*, *Make your moves work*. Each one comes with your numbers, a
"next game" instruction and two drills. Your sessions that week lean towards it, with at least one focus
drill per session. With no recent games, the focus comes from your lowest skill ratings. Logged games
also count towards training load, using your minutes and effort.

**Progress** shows your season numbers (✓ when you're meeting a per-game minimum), the last 3 games
against the ones before, and every logged match.

## Tests, charts and personal bests

Nine solo tests, every 4 weeks (Progress → Tests):

| Test | Where | Measure |
|---|---|---|
| 30 m sprint | Ground | seconds (your partner times it) |
| Cone slalom with the ball | Ground | seconds (built-in stopwatch) |
| Left-foot wall passes in 60 s | Terrace | passes (built-in countdown) |
| Right-foot wall passes in 60 s | Terrace | passes (to compare with your left) |
| Juggling record | Terrace | touches |
| Crossing accuracy | Ground | out of 10 |
| Cut-in finishing | Ground | out of 10 |
| Single-leg balance, eyes closed | Room | seconds |
| Front plank hold | Room | seconds |

- **Each test page** has the setup, the steps, how to keep it fair (same distance and conditions each
  time), a timer with beeps, quick result entry, a chart of every result with your PB marked, and the full
  history as a list.
- **Today** shows a **Test day** card when tests are due and today's session is in the right place
  (ground tests on ground days, home tests on home days).
- **Health:** tests that load an area you're protecting are left out of Today's card and blocked on their
  test page, because a result taken while protecting an injury isn't a fair comparison.
- **Progress** shows:
  - every test with a sparkline that points up when you improve (even for times)
  - your weak foot as a percentage of your strong foot
  - personal bests (tests, best games, longest streak)
  - game-by-game charts of 1v1s, left-foot actions and confidence against your targets (each on its own
    chart, with a table view)
  - 8 weeks of training load
- **Chart colours** were checked with a colour validator so they pass in both light and dark mode.

## Mentality coach (Mind tab)

- **Pre-match routine.** The night before a game, Today shows **Tonight** with a checklist: kit, dinner,
  your if → then plans, 3 minutes of visualisation, and a bedtime worked out from your kick-off time
  (7½ hours before a wake-up an hour before kick-off). On game day it switches to **Game morning**: water,
  a small snack 30–60 minutes before, the activation warm-up, three breaths and your cue words, and your
  first action.
- **Reset.** Four steps after a mistake: clap, breathe out, your reset word, then show for the ball within
  5 seconds. **Practise it** runs the steps on a beat.
- **Visualise.** A 3-minute, full-screen script: the first ball, the 1v1 and the moment after losing it. It
  is built from your own cue words and if → then plans, and can read itself aloud.
- **Lessons.** 10 short lessons on real winger moments:
  - losing the ball
  - the blank mind
  - if → then plans
  - the reset
  - "what are they thinking of me?"
  - body language
  - demanding the ball
  - criticism
  - confidence
  - nerves

  Each one covers the situation, what's going on, three things to do, something to try this week, and the
  idea it's based on. When your weekly focus is about confidence or going quiet, the matching lessons
  appear at the top.
- **Your words.** Your cue words and if → then plans, editable any time.

## YouTube tutorials

Every drill has a **Tutorial videos** section, and the **Videos** screen (from Today's focus card, the Drills
page or Settings) shows tutorials for this week's focus, your saved videos and your channel choices.

- **Picked for a winger.** Each drill has its own searches. Results skip Shorts, videos over 20 minutes,
  live streams, highlight reels, compilations, game clips and other languages. They're ranked by YouTube's
  relevance, views, like rate, how recent they are, and a good length for a drill (3–12 minutes).
- **Your feedback.** **Save** keeps a video in Videos. **Helpful** moves that channel up; **Hide** removes the
  video and moves its channel down. The **⋯** button lets you **trust** a channel (always near the top) or
  **never show** it. You can undo any of these in Videos → Your choices.
- **Saving quota.** YouTube gives 100 searches a day. The app stops at 95, shows the time it resets (midnight
  US Pacific, so the afternoon in India), and keeps results on the phone for 2 weeks so the same screen
  doesn't search again. A drill's videos only load when you scroll to them. **Different search** tries the
  drill's next search.
- **YouTube's rules.** Video details are refreshed or deleted within 30 days. This runs when the app opens.
  Saved videos are refreshed, so they stay.
- Videos play inside the app using YouTube's privacy-enhanced player (`youtube-nocookie.com`). They need the
  internet; everything else works offline.

## Ask Claude

A free second opinion, with your whole picture. Open it from Today (**Ask Claude about your week**), the
Progress tab (**Ask Claude about your last game**), Mind (**Talk it through**) or Settings.

1. **Pick a topic:** My week, My last game, Weak foot, Mental side, Pain or injury, or Something else. Add
   your own question if you like.
2. **Choose what to include:** about you and your goals, ratings, focus and the next 7 days, the last 2
   weeks of training, recent games, tests, health and pain, and your mental notes. Your name is never
   included. **See exactly what gets copied** shows the whole text.
3. Tap **Copy and open Claude**. In Claude, start a new chat, press and hold the message box, tap
   **Paste** and send.

How it works and what it costs:

- **It's free.** It uses your normal Claude account (the free plan works), not the paid API. There's no key
  and nothing to set up.
- **The app sends nothing.** It only copies text; you choose whether to paste it.
- The summary asks Claude to answer as a UEFA B coach, a strength and conditioning coach and a sport
  psychologist, to be practical, and never to diagnose injuries.
- If the phone won't copy automatically, a box appears with the text selected so you can copy it by hand.
- On iPhone, the link opens the Claude app if it's installed, otherwise claude.ai in Safari.
- **Paid version (option B), not built:** a chat inside the app would need a Claude API key and is billed
  per message. That's why option A was chosen.

## Film room (match video review)

Open it from **Progress → Film room**, or from any match (**Open in the Film room**). It needs the match's
YouTube link; paste it there if the match doesn't have one yet.

1. **Mark kick-off.** Play the video and tap **Kick-off now** when the game starts, so tags show the match
   minute.
2. **Tag.** Tap a button the moment something happens. It saves the time in the video. On the ball: 1v1,
   Shot, Left-foot action, Cross or cutback, Lost the ball, Played it safe. Off the ball: Run, Showed again,
   Went quiet, Tracking back, Press, Moment. For 1v1s, shots and similar, the result choices (won, lost, on
   target…) show for the last tag; skip them if you're busy. **Undo** removes the last tag.
3. **Review.** Each tag jumps the video to 5 seconds before it. Pick the result and why it happened (for
   example "Didn't scan" or "Slowed down before the move"), read the 3-point "what to look for", and add a
   note. Reasons link to the drill or lesson that fixes them. A dot marks tags that still need a result.
4. **Summary.** Counts, and your match log next to the numbers from your tags. **Use these numbers** copies
   them into the log (only for things you tagged; untagged ones are left alone). It also shows patterns, such as
   "3 of 4 times you lost the ball: didn't scan", for this game and across your last 3 reviewed games.

What it feeds:

- **Weekly focus:** a problem that comes up 3 or more times across your recent reviewed games can become one
  of the week's two focus areas, and your plan leans towards its drills.
- **Ask Claude:** the "My last game" summary includes your tagged moments (minute, result, reasons, notes).
  Claude can't watch the video, so add 2–3 phone screenshots of key moments for comments on positioning.

Good to know:

- It uses YouTube's own embedded player (free, no key, no search allowance used). The app reads the video's
  time, never the picture, and nothing is uploaded. Tags are stored on your phone and included in backups.
- Hold the phone upright (video on top, buttons below) or turn it on its side (video left, buttons right).
- If a video won't play in the app (private, deleted, or the uploader blocks it), watch it in the YouTube app
  and type the video time (e.g. `23:15`) above the buttons; tagging works the same.
- Tag at 1.5× speed and only your own involvements: about 20–30 minutes a game.

## Drill diagrams

41 drills have a top-down diagram on their page, above "Why you're doing this". These are the drills where
the layout matters: 1v1s, finishing, crossing, receiving, movement, defending, speed and the warm-ups. Body
exercises like Nordics, Copenhagen planks and stretches have none; their videos show body position better.

- **Set-up first**, then one frame per step. **›** and **‹** move through it, **Play** steps through on its
  own, and the dots jump to any step. The text under the buttons is that step from the drill.
- **Key:** red circle = you, blue = your partner, white = the ball, orange cones = markers (big ones stand
  in for a defender). Wavy line = dribble, dashed = run without the ball, solid = pass or shot, short
  orange dashes = a fake or body shape, dotted = a look over the shoulder.
- On the pitch you attack **up the screen**, with the touchline on the left. Wall drills have the wall at
  the top.
- **In session mode**, tap **Diagram** (next to **How to do it**) to check the set-up at the pitch.
- Distances are roughly to scale, and every important one is labelled.

To change a diagram, edit `src/drills/diagrams/content/`. Points are in metres from the top-left corner,
and `npm test` checks each diagram stays inside its area and matches the drill's steps. In development,
open `#/__diagrams` to see them all at once.

## Adding or editing a drill

Drills live in `src/drills/content/` as plain TypeScript objects, one file per area. Copy an existing drill,
give it a new `id`, and run `npm test`. The content tests check every drill has the full coach format:
3 coaching points, mistakes, easier and harder versions, a safety note for risky work, and no
kicking or sprinting in the small room.

## Project structure

```
src/
  main.tsx            entry point: theme, error boundary, persistent storage
  App.tsx             header, routes (hash-based: #/plan), tab bar
  screens/            one file per screen (Today, Plan, Drills, Progress, Mind, Settings)
  screens/profile/    profile overview and the section editors
  components/         shared UI: TabBar, Icons, forms, Toast, UpdateBanner, SystemCheck, ErrorBoundary
  db/                 Dexie (IndexedDB) database: schema in db.ts, record shapes in types.ts
  data/               import, backup and restore (importExport.ts is pure and unit-tested)
  profile/            profile labels and defaults (meta.ts), clean-up of imported data (normalize.ts)
  drills/             the drill library: content/ (one file per area), types, labels,
                      personal.ts (priority sort and health warnings), drills.test.ts (content checks)
  plan/               the rolling plan: engine.ts (which kind of day), sessions.ts (which drills),
                      adapt.ts (pain, load, difficulty), usePlan.ts (live data), actions.ts, tests
  session/            session mode logic: run.ts (state machine), device.ts (wake lock, beeps,
                      speech), save.ts; screens in screens/session/
  focus/              weekly focus from match logs (focus.ts, focus.test.ts)
  videos/             YouTube: youtube.ts (API calls), rank.ts (filters and ranking), store.ts (cache,
                      daily search count, save/like/hide), queries.ts (focus-area searches), tests
  ask/                Ask Claude: pack.ts builds the summary you paste into Claude (pack.test.ts)
  film/               Film room: tags.ts (buttons, results, reasons, fixes), analysis.ts (stats,
                      patterns, focus), link.ts (YouTube links, times), player.ts (YouTube player)
  drills/diagrams/    drill diagrams: types.ts, geometry.ts (positions, curves, wavy dribbles),
                      content/ (one file per group); drawn by components/DrillDiagram.tsx
  mind/               lessons.ts, routine.ts (bedtime, checklists, reset word, visualisation script)
  tests/              the 9 solo tests (defs.ts) and PBs, trends, due dates, weekly load (results.ts)
  components/charts   hand-written SVG line, bar and sparkline charts
  hooks/              live data hooks (useProfile, useRatingHistory, useSetting)
  lib/                small helpers: dates, formatting, theme, storage
  styles/             tokens.css (colours, sizes, light/dark) and app.css
public/               favicon and app icons (copied as-is into the build)
scripts/make_icons.py redraws the PNG icons (needs Python + Pillow)
docs/PLAN.md          the approved plan
private/              your personal profile (git-ignored)
.github/workflows/    GitHub Pages deploy
```

## API keys

The only key is a **free YouTube Data API v3 key**. No card or billing is needed. The app walks you through it in
**Settings → YouTube videos → Set up**, with copy buttons for the address to paste. Here are the same steps; a
laptop is easiest:

1. Open [Google Cloud Console](https://console.cloud.google.com/) and sign in with your Google account. You can
   skip any free-trial offer.
2. Project picker at the top → **New project** → name it `Touchline` → **Create**. Make sure it's selected.
3. Open the [YouTube Data API v3 page](https://console.cloud.google.com/apis/library/youtube.googleapis.com) →
   **Enable**.
4. [Credentials](https://console.cloud.google.com/apis/credentials) → **+ Create credentials** → **API key**.
   If it offers a service account, leave that off.
5. Open the key and lock it down:
   - **Application restrictions → Websites**, add `https://<your-github-username>.github.io/*` (the app shows
     the exact address) and, for local development, `http://localhost:5173/*`.
   - **API restrictions → Restrict key**, and tick only **YouTube Data API v3**.
   - **Save**. Changes can take up to 5 minutes to start working.
6. In the app: **Settings → YouTube videos → Set up**, paste the key, then **Test and save**.

Where the key lives:

- **On your phone:** only in the app's database on the device. It is never in the code, never on the
  website, and never in backups. That's why each device needs the key pasted once.
- **For local development (optional):** run `cp .env.example .env` and put the key in `.env`. That file is
  git-ignored, and production builds ignore it. **Never commit `.env`.**
- **If a key leaks**, delete it in Google Cloud → Credentials and make a new one. The website restriction
  already stops other sites from using it.

## Troubleshooting

| Problem | Fix |
|---|---|
| `npm install` fails | Check `node -v` is 22.12 or newer |
| Blank page on GitHub Pages | Check **Settings → Pages → Source** is "GitHub Actions" and the Actions run passed |
| The phone shows an old version | Open the app and wait for "A new version is ready", or use **Repair app** |
| "Works offline: Not yet" | Open the app once while online and wait a few seconds, then check again |
| Videos say "key wasn't accepted" | Copy the whole key again (about 39 characters, starts with `AIza`) |
| Videos say "website restriction doesn't include this app" | In Google Cloud, add the address shown in **Set up** step 5, wait 5 minutes |
| Videos say "not enabled" | Enable **YouTube Data API v3** for the same project as the key (step 3) |

## Ideas for later

These are not built. They were parked in the plan:

- An in-app Claude chat (option B: paid API, needs a key)
- Automatic tracking and a heatmap from a match video file (a laptop tool; needs the video file and large
  downloads)
- Summer and monsoon modes (heat, wet pitches)
- A gym programme
- More heading work
- Tagging match-video timestamps
- A partner drill pack
- Notifications
- Syncing between devices
