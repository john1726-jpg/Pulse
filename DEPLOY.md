# Pulse — Deploying with auto-sync

The folder you're looking at (`pulse-deploy/`) is now a real Netlify project,
not just a static HTML file. It contains:

- `index.html` — the app
- `netlify.toml` — Netlify config (functions + redirects)
- `package.json` — declares the `@netlify/blobs` dependency
- `netlify/functions/snapshot.mjs` — the serverless function that stores and
  serves friend snapshots, backed by Netlify Blobs (free, included in your site).

After deploying, every time you log a workout or meal, the app pushes your
snapshot to the cloud. When friends open Pulse, it pulls everyone's latest
data automatically — no re-share needed.

---

## Easiest deploy: connect Netlify to GitHub (one-time setup, ~10 min)

This is the most reliable path because Netlify will auto-build the function
and install dependencies for you on every push.

1. **Create a GitHub account** if you don't have one: https://github.com/signup
2. **Create a new empty repository** on GitHub (call it `pulse` or whatever
   you like). Make it private if you want — Netlify can read private repos.
3. **Upload these files** to the repo:
   - The simplest way: on the GitHub repo page, click **Add file → Upload
     files**, then drag the entire contents of this `pulse-deploy/` folder
     into the upload area. Commit.
   - Make sure the structure on GitHub matches:
     ```
     pulse/
     ├── index.html
     ├── netlify.toml
     ├── package.json
     └── netlify/
         └── functions/
             └── snapshot.mjs
     ```
4. **Connect Netlify to the repo:**
   - Go to https://app.netlify.com/sites — find your existing Pulse site (the
     one you deployed via Drop earlier).
   - Click **Site configuration → Build & deploy → Continuous deployment →
     Link repository** (or **Site settings → Build & deploy → Link to Git**).
   - Pick GitHub, authorize Netlify, choose the repo you just made.
   - Build settings: leave them at the defaults Netlify suggests
     (Netlify auto-detects from `netlify.toml`). Click **Deploy site**.
5. Wait ~1 minute for the first build to finish. The site URL stays the
   same. The function is now live at `<your-site>/api/snapshot`.

From here on, any change you push to the GitHub repo auto-deploys.

## Verify it's working

1. Open your site in a browser.
2. Look at the top-right header — you should see a small `☁️ Synced` pill.
   If it shows `☁️ Sync error`, hover/tap to see the message.
3. Open the URL in a second browser or device, set a different name, log a
   workout. Within ~60 seconds (or when you reopen the app), the first
   browser should see the new friend's data appear automatically.

## Troubleshooting

- **`☁️ Sync error` shown**: Open the browser dev console (Safari: Develop →
  Show JavaScript Console) — the network tab will show what failed. Most
  common cause: the function failed to deploy. Check the Netlify dashboard
  → Functions tab to confirm `snapshot` is listed.
- **Friends still don't update**: They need to open the new version of Pulse
  at least once for their data to reach the cloud. Until they do, you'll see
  whatever's already in your local copy.
- **"Token mismatch" errors after wiping data**: Your `writeToken` is stored
  only in your browser's localStorage. If you clear site data or use a fresh
  device, the cloud will refuse your writes because they signed with a
  different token. To recover: tap the gear icon → reset profile, which
  generates a new ID + token. Friends will need a new share link from you.

## What gets synced (and what doesn't)

- **Synced:** profile name/emoji/color/goals, all daily logs, all workouts,
  achievements.
- **NOT synced:** your friends list, your `writeToken`, app settings.
  These stay only on your device.
- **Privacy:** snapshots are public-readable by anyone with your random user
  ID, but writes are protected by the `writeToken`. Anyone you don't share
  your link with effectively can't find your data — IDs are 16 random hex
  chars, not enumerable.
