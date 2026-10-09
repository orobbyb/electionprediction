# Live Midterm Prediction Board

## Run locally

Requires Node.js 20 or newer.

```bash
npm start
```

Then open `http://localhost:3000`.

The server-side source endpoint is `/api/race-data?state=Georgia&office=Senate`. It reads the latest verified snapshot from `data/source-data.json`; it does not scrape source pages in the browser or label a blocked page as live data. Each value includes a status, timestamp, and source URL.

The board also includes `Print / Save PDF`, which creates a clean final-decision report through the browser's print dialog, and `Share report`, which uses the device share sheet when available or copies a plain-text report to the clipboard.

## Deploy

This is a small Node-compatible app and can be deployed to Render, Railway, Fly.io, or another Node host. Set the service start command to `npm start`. Use the host-provided `PORT` value; the app reads it automatically.

The repository is configured for a daily 5:00 AM Eastern source-data refresh. That refresh updates only `data/source-data.json`; it does not modify your saved predictions, history, or candidate selections. If a source is unavailable, the last verified value is retained and marked stale/unavailable rather than replaced with an invented value.

The initial snapshot is intentionally empty until the first verified refresh. This prevents the board from displaying unsupported or stale values as current data.

Candidate lists in `public/index.html` were updated on October 7, 2026 from The Ballot Brief's 2026 candidate index, which states that its fields follow certified candidate lists: https://theballotbrief.com/candidates. The app retains a source URL and access date in `candidateSource`. Because some state pages report additional minor-party candidates beyond the names shown in their statewide race card, review the linked state page before treating the list as exhaustive.
