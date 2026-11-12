# Before screenshots — blocked on environment

Phase 0 asks for every creator, supporter and fan screen at **360×640** and
**390×844**, captured with Playwright against emulator data. That capture could
not be produced in this workspace, and I did not substitute production data.
This file records exactly why and what is needed to unblock it.

## What was attempted

1. `npm start` against the existing `.next` build.
   Result: `ENOENT .next/prerender-manifest.json` — the committed build folder is
   incomplete.
2. `npm run dev` (Next 16.1.3, Turbopack).
   Result: the app boots but every Firebase-backed page fails:

   ```
   Error: The default Firebase app does not exist.
     at getFirestore (db/firebaseAdmin.ts:25)
   FirebaseError: Firebase: Error (auth/invalid-api-key).
     at db/firebase.ts:17
   ```

3. Checked `agaseke/.env` (not printed). Every Firebase key is present but
   **empty**, e.g. `NEXT_PUBLIC_API_KEY` length 0, `NEXT_PUBLIC_PROJECT_ID`
   length 0, `FIREBASE_PROJECT_ID` length 0. The file is a blank template.

## What is missing

- No `firebase.json` / `.firebaserc` / emulator ports / seed scripts.
- No staging project or test accounts (the audit noted the same:
  email/password signup is disabled and no Google test account existed).
- No provider sandbox keys for Paypack/Pesapal.
- No app-level Playwright config; the only runner is the read-only audit in
  `../audit/`.

## Options to unblock (pick one)

| Option | What I need | Safety |
|---|---|---|
| **A. Firebase emulator + seed (recommended)** | `firebase.json` with Auth/Firestore ports, a seed script or exported emulator data for 2 creators (public + store/events/giveaways/community), 1 supporter, 1 anonymous transaction, 1 locked post | No production contact |
| **B. Staging project** | Staging `.env` with a separate Firebase project, admin credentials, test accounts | No production contact |
| **C. Read-only production capture** | Explicit approval to open public pages on `https://agaseke.me` in Playwright with **all Firestore write requests blocked** so the view counter cannot increment; authenticated dashboards still impossible without test accounts | Read-only, but still production |

Until one of these exists, the "before" evidence is the audit bundle already in
`../audit/artifacts/`:

- Lighthouse mobile: `audit/artifacts/lighthouse/{home,creator,login}.json`
- axe mobile: `audit/artifacts/axe/chromium-mid-android-*.json`
- Tap targets: `audit/artifacts/usability/tap-targets-360.json`
- Web vitals / payloads: `audit/artifacts/perf/chromium-mid-android.json`
- One mobile screenshot: `audit/artifacts/func/login-mobile.png`

## Capture spec (ready to run once unblocked)

Viewports: **360×640** and **390×844**, mobile Chrome device profile, `en-RW`,
`Africa/Kigali`. Save to `docs/screens/before/<viewport>/<role>/<screen>.png`.

Screens to capture (minimum for the plan):

- Fan: `/`, `/explore`, `/[handle]`, `/[handle]` Store / Events / Giveaways /
  Community tabs, `/[handle]/community/[postId]` (locked and unlocked), support
  sheet steps 1–3, `/payment` return, `/login`.
- Supporter: `/supporter`, `/supporter/[postId]`, `/transactions`, `/bookings`.
- Creator: `/creator`, `/creator/content`, composer, `/creator/payouts`,
  `/creator/supporters`, `/creator/settings`, `/creator/verify`.
- Cross-cutting: skeleton, empty, error, offline.

Writes to block in the capture script: any `firestore.googleapis.com` write
(`:commit`, `:write`) and any provider endpoint. Reads are allowed only on the
emulator.
