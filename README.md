# Touchline ⚽

A personal football coach for a left winger. It plans training around your games, runs sessions at the
pitch, tracks progress, and coaches the mental side. It's a **PWA (Progressive Web App)**: a website that
installs on your iPhone's home screen, works offline, and keeps all its data **on your phone**.

> **Status:** Milestone 0 is done: the app shell, offline support and an on-device database.
> See [docs/PLAN.md](docs/PLAN.md) for the full plan and milestones.

---

## Privacy: what goes where

| What | Where it lives | In git? |
|---|---|---|
| App code and drill content | This repo | ✅ Yes |
| Your profile, ratings, health notes | `private/` on your Mac, then the app on your phone | ❌ No (git-ignored) |
| Your logs, matches, tests | IndexedDB on your phone | ❌ No |
| API keys | `.env` on your Mac (dev only) / app Settings on your phone | ❌ No (git-ignored) |

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

### Updates

When a new version is pushed, the app shows **"A new version is ready"** with **Later** or **Update**. It
never reloads by itself, so an update can't interrupt a session.

### If something breaks

If a screen crashes, you'll see **Something went wrong** with two buttons:
- **Reload**
- **Repair app**, which deletes the cached copy of the app and downloads the latest version.

Your data is stored separately and isn't touched by either.

---

## Project structure

```
src/
  main.tsx            entry point: theme, error boundary, persistent storage
  App.tsx             header, routes (hash-based: #/plan), tab bar
  screens/            one file per screen (Today, Plan, Drills, Progress, Mind, Settings)
  components/         shared UI: TabBar, Icons, UpdateBanner, SystemCheck, ErrorBoundary
  db/                 Dexie (IndexedDB) database: schema in db.ts, record shapes in types.ts
  lib/                small helpers: dates, theme, storage
  styles/             tokens.css (colours, sizes, light/dark) and app.css
public/               favicon and app icons (copied as-is into the build)
scripts/make_icons.py redraws the PNG icons (needs Python + Pillow)
docs/PLAN.md          the approved plan
private/              your personal profile (git-ignored)
.github/workflows/    GitHub Pages deploy
```

## API keys

None are needed yet. The YouTube key arrives in Milestone 8, with step-by-step setup instructions.

- **On your phone:** paste the key into the app's Settings. It's stored only on the device.
- **For local development:** run `cp .env.example .env` and put the key in `.env`. That file is git-ignored.
  **Never commit `.env`.**

## Troubleshooting

| Problem | Fix |
|---|---|
| `npm install` fails | Check `node -v` is 22.12 or newer |
| Blank page on GitHub Pages | Check **Settings → Pages → Source** is "GitHub Actions" and the Actions run passed |
| The phone shows an old version | Open the app and wait for "A new version is ready", or use **Repair app** |
| "Works offline: Not yet" | Open the app once while online and wait a few seconds, then check again |
