# Live Midterm Prediction Board

## Run locally

Requires Node.js 20 or newer.

```bash
npm start
```

Then open `http://localhost:3000`.

The server-side source endpoint is `/api/race-data?state=Georgia&office=Senate`. It reads the latest verified snapshot from `data/source-data.json`; it does not scrape source pages in the browser or label a blocked page as live data. Each value includes a status, timestamp, and source URL.

The board also includes `Print / Save PDF`, which creates a clean final-decision report through the browser's print dialog, and `Share report`, which uses the device share sheet when available or copies a plain-text report to the clipboard.

## GitHub Pages (recommended for daily snapshots)

The browser now reads `./data/source-data.json` directly. No server, API key,
or proxy is needed to display verified snapshots. Paths work at the project
URL as well as at a domain root. External source failures remain stale or
unavailable; moving hosts does not bypass source restrictions.

One-time publishing setup (repository owner):

1. Open https://github.com/orobbyb/electionprediction/settings/pages.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Open **Actions → Publish prediction board → Run workflow**, select `main`,
   and run it. The workflow also runs automatically on every push to `main`,
   including source-data updates. If GitHub asks for deployment approval,
   review and approve it there.
4. Wait for the Publish step to succeed. Use the URL in the deployment or
   Pages settings; expected: https://orobbyb.github.io/electionprediction/.
   This URL is not live merely because the code was committed.

The workflow tests the backup code, builds `_site` from `public/` and `data/`,
and publishes that artifact. Only source data and public app assets are
published, never browser predictions. `npm run build:pages` builds the same
artifact locally. `npm test` runs the dependency-free regression tests.
Optional browser checks: install Playwright/Chromium in your development
environment and run `node tests/browser.cjs` after building.

### Move your predictions safely

1. Keep Render running. In the same browser/profile where your predictions
   are saved, open the existing Render URL and click **Export board** (or
   **Export history** on the older version). Save the JSON file locally.
2. Open the verified GitHub Pages URL and click **Import board**. Choose the
   JSON backup and confirm the prediction/history counts.
3. Compare your choices and history, reload the page, and check they remain.
   Both legacy and versioned backups are supported. Invalid backups leave
   the current board unchanged. A pre-import copy is stored in the browser;
   use **Undo last import** to restore it. Export again before restoring if
   you want to preserve changes made after import.
4. Test map/list picking, source cards and Print / Save PDF. Only after you
   are satisfied should you suspend/delete the Render service yourself.

Storage is browser- and origin-specific, with no automatic cross-device
sync. Browser data cannot be copied from Render by the new site. Do not
commit personal backup JSON files to this public repository. Clearing site
data or using another browser/profile requires importing your backup again.

## Render / local compatibility

This is a small Node-compatible app and can be deployed to Render, Railway, Fly.io, or another Node host. Set the service start command to `npm start`. Use the host-provided `PORT` value; the app reads it automatically.

The repository is configured for a daily 5:00 AM Eastern source-data refresh. That refresh updates only `data/source-data.json`; it does not modify your saved predictions, history, or candidate selections. If a source is unavailable, the last verified value is retained and marked stale/unavailable rather than replaced with an invented value.

The snapshot is maintained separately from personal selections. Races without
a verified record display an unavailable message, not a fabricated value.

Candidate lists in `public/index.html` were updated on October 7, 2026 from The Ballot Brief's 2026 candidate index, which states that its fields follow certified candidate lists: https://theballotbrief.com/candidates. The app retains a source URL and access date in `candidateSource`. Because some state pages report additional minor-party candidates beyond the names shown in their statewide race card, review the linked state page before treating the list as exhaustive.

## Map interface

The map/list interaction is modeled on the familiar workflow used by election forecast sites: a map-first forecast board, a fast candidate list, summary totals, and print/share controls. The application does not copy 270toWin source code or branding. State geometry is vendored from the public-domain `robflaherty/us-map-raphael` asset, whose original SVG source is credited in `public/state-paths.js`.
