# Live Midterm Prediction Board

## Run locally

Requires Node.js 20 or newer.

```bash
npm start
```

Then open `http://localhost:3000`.

The server-side refresh endpoint is `/api/race-data?state=Georgia&office=Senate`. It fetches fresh source pages when a race picker opens, avoiding browser cross-origin restrictions. The source pages remain the authoritative location for the underlying odds, polls, and ratings; the app displays the fetch time and source status.

The board also includes `Print / Save PDF`, which creates a clean final-decision report through the browser's print dialog, and `Share report`, which uses the device share sheet when available or copies a plain-text report to the clipboard.

## Deploy

This is a small Node-compatible app and can be deployed to Render, Railway, Fly.io, or another Node host. Set the service start command to `npm start`. Use the host-provided `PORT` value; the app reads it automatically.

Candidate lists in `public/index.html` were updated on October 7, 2026 from The Ballot Brief's 2026 candidate index, which states that its fields follow certified candidate lists: https://theballotbrief.com/candidates. The app retains a source URL and access date in `candidateSource`. Because some state pages report additional minor-party candidates beyond the names shown in their statewide race card, review the linked state page before treating the list as exhaustive.
