# UI refactor log

Running record: what changed, why, how verified. Newest first.

## 2026-11-11 — Phase 2C (part 1): giveaway entry and free RSVP sheets

**Branch:** `feat/mobile-ui-refactor`.

**Changed:**

- New `features/actions/` module: `SupporterActionSheet` (shared bottom sheet
  with idle/submitting/success/failed states and retry), `CreatorTrustRow`, and
  `formatActionDate`/`toActionDate` helpers. This is the non-payment sibling of
  the support sheet: same `Sheet` primitive, `StatusScreen`, tokens and
  accessible footer actions.
- New `features/giveaways/` module: `GiveawayEntrySheet` shows the creator,
  closing date, prize count and entry rules, then an explicit success or a
  retryable failure state.
- New `features/gatherings/` module: `FreeRsvpSheet` shows the creator, event
  date/time/location and a single confirm action, then success/failure.
- `components/parts/public/GiveawayTab.tsx` now opens the sheet instead of
  writing to Firestore immediately; the existing entry write still happens only
  after the supporter confirms.
- `components/parts/public/GatheringsTab.tsx` now opens the sheet for free
  RSVPs; the existing attendance/email/logging side effects run on confirm.
  Paid tickets still use the old flow until the ticket sheet lands.
- `CreatorPage.tsx` passes the creator name/photo/verification into both tabs.
- `lib/i18n/en.ts` — `actions.giveaway` and `actions.rsvp` strings.
- `tests/unit/action-sheets.test.tsx` — success, retryable failure and date
  helpers.

**Why:** Phase 2C starts moving non-payment supporter actions onto the same
mobile sheet/status/trust pattern as support, so entry and RSVP are deliberate
actions with visible confirmation instead of toast-only writes.

**Verified:**

- `npm run typecheck` — passes.
- `npm run lint:ci` — passes with `--max-warnings=0`.
- `npm test` — 7 files / 29 tests pass.
- `npm run format:check` — passes.
- `ENCRYPTION_KEY=… npm run build` — compiles and generates the app.

**Deferred (remaining 2C):** store checkout, paid event tickets, booking and
community join on the shared sheet; in-app-browser and screenshot evidence still
blocked.

**Not touched:** Firestore rules, workers, payment/fee logic, production.

## 2026-11-11 — Phase 2B: supporter payment sheet

**Branch:** `feat/mobile-ui-refactor`.

**Changed:**

- New `features/support/` module: `types.ts`, `constants.ts`, `utils.ts`,
  `api.ts`, `signIn.ts`, `hooks/useSupportFlow.ts`, and components
  (`SupportSheet`, `AmountStep`, `PayStep`, `StatusStep`, `StepProgress`,
  `SupportTrustCard`, `GuestPrompt`, `PerksList`).
- The sheet is a three-step flow (amount → pay → status) with:
  - preset and custom amounts, inline fee breakdown, creator currency;
  - MoMo (MTN/Airtel with prefix detection) and card methods;
  - idempotency key per attempt, pending-payment resume, and draft persistence
    across sign-in;
  - Firestore status listener with polling fallback, 90 s "still waiting" hint,
    check-now, retry, and card redirect resume;
  - Google sign-in for signed-out supporters with popup and redirect fallback;
    the in-progress form is saved to `sessionStorage`.
- `CreatorPage.tsx` now opens `SupportSheet` behind
  `NEXT_PUBLIC_SUPPORT_SHEET_V2 !== "0"` (default on). Set the flag to `0` to
  fall back to the old `SupportModal`, which is unchanged. A fresh pending
  payment or saved draft auto-opens the sheet after hydration.
- `app/dev/creator-page` opens the sheet from the Support CTA so the flow can be
  reviewed without Firebase credentials.
- `lib/i18n/en.ts` — supporter flow strings; `features/creator-page/types.ts`
  gains optional `currency`.
- `tests/unit/support.test.ts` — fee split/rounding, amount validation, status
  normalisation, network detection, perks, last choice/pending/draft storage.

**Why:** Phase 2B replaces the long support modal with a mobile-first sheet
while leaving server-side payment, fee and idempotency logic authoritative. The
sheet keeps the existing `initiateMomoPayment`/`initiateCardPayment` contract.

**Guest checkout decision:** the payments worker still requires auth
(`requireAuth`) and there is no server-side claim endpoint. Guest checkout is
therefore gated by `NEXT_PUBLIC_SUPPORT_GUEST_CHECKOUT=1` (default off) and the
UI asks signed-out supporters to sign in. This matches the existing
`docs/RULES_FOLLOWUP.md` decision: do not promise anonymous payment claiming
before the claim endpoint exists.

**Verified:**

- `npm run typecheck` — passes.
- `npm run lint:ci` — passes with `--max-warnings=0`.
- `npm test` — 6 files / 25 tests pass.
- `npm run format:check` — passes.
- `ENCRYPTION_KEY=… npm run build` — compiles and generates the app. Without
  `ENCRYPTION_KEY`, the pre-existing `/api/decrypt` build error remains.
- Dev preview compiles at `/dev/creator-page`; no screenshots or browser
  automation were captured because credentials/emulator and browser tooling
  are unavailable here (see `docs/screens/before/README.md`).

**Deferred:** guest anonymous checkout and post-payment claim until the worker
and claim endpoint exist; real-device popup/in-app-browser verification; mobile
screenshots, axe and Lighthouse evidence; founder decisions on presets, copy and
fee display.

**Not touched:** Firestore rules, workers, payment/fee logic, production.

## 2026-11-11 — Phase 2A: creator public page shell

**Branch:** `feat/mobile-ui-refactor`.

**Changed:**

- New `features/creator-page/` module: `api.ts` (Firestore boundary),
  `utils.ts` (timestamp/post helpers), `types.ts`, data and persisted-tab hooks,
  and shell components (`CreatorHeader`, `CreatorPageView`,
  `CreatorSupportBar`, `CreatorShareSheet`, `PartnerSection`).
- `CreatorPage.tsx` wrapper keeps all public tabs (Community, Store, Giveaways,
  Events, Message) and opens the existing `SupportModal` for now. Payment logic
  is untouched; the new support flow is Phase 2B.
- `app/(public_profile)/[username]/page.tsx` now renders the v2 shell by default
  when server data exists, keeps `CreatorSchema` server-rendered, preserves
  metadata/revalidate, and updates the theme colour to `#FF0000`.
  Rollback: set `NEXT_PUBLIC_CREATOR_PAGE_V2=0` to use the old `PublicProfile`.
- `app/dev/creator-page/*` — gated mock preview so the shell can be checked
  without Firebase credentials.
- `lib/i18n/en.ts` — creator-page strings.
- Removed the public-profile duplicate fixed UI: old `SendGiftSection` hero,
  fixed `TabManager`, and floating `LoginNotice` are replaced by one header,
  one tabs row, and one mobile sticky Support bar. Logged-out login and
  create-your-own CTAs are inline, not overlays.
- Last-tab memory uses `useSyncExternalStore` (no post-mount setState) and
  stores `creator:<handle>:tab`; it ignores tabs the creator no longer enables.
- The public-profile footer gets mobile bottom clearance while the creator shell
  is mounted, so the sticky bar cannot cover footer links.
- `tests/unit/persisted-tab.test.ts` covers fallback, persistence and invalid
  stored tabs.

**Why:** Phase 2A fixes the highest-impact creator-page mobile problems without
touching payments or private-media rules: the support CTA is always reachable,
there is only one fixed bottom element, tabs remember context, share/QR is
first-class, and the header/media reserve space to avoid layout shift.

**Verified:**

- `npm run typecheck` — passes.
- `npm run lint:ci` — passes with `--max-warnings=0` (now includes
  `features/**`).
- `npm test` — 5 files / 15 tests pass.
- `npm run format:check` — passes for new code.
- `ENCRYPTION_KEY=local-build-check npm run build` — exits 0, compiles, and
  generates 72/72 static pages. The existing caught Firebase-admin sitemap/home
  errors still appear because credentials are empty.
- Mock preview at 360×640 and 390×844: 200, no horizontal overflow, 0 targets
  under 48 px, exactly 1 fixed bottom bar, sticky support bar visible, share
  sheet opens with QR canvas, stored Store tab survives reload, 0 axe WCAG 2
  A/AA violations (page and share sheet).
- `/aline` without credentials returns 200 and the expected retryable error
  state; it does not crash.
- Only console noise is the pre-existing report-only CSP warning.

**Evidence:** `docs/screens/phase2a/` (mock preview + share sheet at 360/390).
Screenshots captured; human visual review is still pending. Real creator/fan
screens remain blocked on seed data/credentials (`docs/screens/before/README.md`).

**Next:** Phase 2B support flow (single sheet, presets 500/1,000/2,000/5,000
RWF, mobile-money and card, review, waiting/confirmed/failed states), preserving
all existing payment logic and anonymous-claim rules.

**Not touched:** Firestore rules, workers, payment/fee logic, production.

## 2026-11-11 — Phase 1: foundation (tokens, primitives, tooling)

**Branch:** `feat/mobile-ui-refactor`.

**Changed:**

- `styles/tokens.css` — single token file: accessible red/black/white palette,
  spacing, radius, type scale, shadows, motion, z-index and 48 px tap minimum.
  Brand `#FF0000` is reserved for large accents; `#C40000` carries small text
  and buttons (6.27:1 with white). Dark theme included.
- `app/globals.css` — imports tokens, maps them into Tailwind v4 (`bg-brand`,
  `text-fg`, `rounded-card`, `shadow-sheet`, `text-body`…), adds `pb-safe`/
  `pt-safe`, honours `prefers-reduced-motion`, and fixes body to use Rubik.
- `db/firebase.ts` — lazy, guarded initialisation. Missing public config no
  longer crashes boot; exports `firebaseConfigured` and null-safe clients.
- `auth/AuthContext.tsx` — effects short-circuit when auth/db is unavailable, so
  public pages and the gallery render locally without credentials.
- `components/ui/*` — Button, Input, AmountInput, PhoneInput, Sheet, Tabs, Card,
  Avatar, Badge, Skeleton, EmptyState, ErrorState, StatusScreen, BottomNav,
  TopBar, ShareButton, QRCode, MediaImage, MediaPlayer, Toast, Money.
- `lib/format/money.ts`, `lib/format/phone.ts`, `lib/i18n/en.ts` + `index.ts`,
  `lib/cn.ts` — formatting and string helpers with tests.
- `app/dev/components/*` — component gallery gated out of production.
- `app/layout.tsx` — uses `ToastViewport`, brand theme colour, and keeps Google
  Analytics out of development.
- Tooling: `vitest.config.mts`, `tests/`, `.prettierrc`, `.prettierignore`,
  `typecheck`/`lint:ci`/`format`/`test` scripts, `tsconfig` feature/hook/style
  aliases, `features/README.md`, `hooks/README.md`,
  `.github/workflows/quality.yml`.
- Evidence: `docs/screens/phase1/`.

**Why:** Phase 1 removes the "no tokens, no primitives, no tests, no CI" risk
before any screen is rewritten. The graceful Firebase boot makes local UI work
possible without credentials or production access.

**Verified:**

- `npm run typecheck` — passes.
- `npm run lint:ci` — passes with `--max-warnings=0` on all new code.
- `npm test` — 4 files / 13 tests pass.
- `npm run format:check` — passes for new code.
- Dev server boots with empty Firebase env; `/`, `/login`, `/explore` and
  `/dev/components` return 200. The home page still logs the existing
  firebase-admin "default app does not exist" message on the server; it is
  caught and does not block rendering.
- Gallery at 360×640 and 390×844: 0 targets under 44 px, no horizontal overflow,
  0 axe WCAG 2 A/AA violations, no page errors.
- `ENCRYPTION_KEY=local-build-check npm run build` — compiled successfully and
  generated 71/71 static pages (`.next/BUILD_ID` written). The missing Firebase
  admin credentials still log caught sitemap/home errors. Without any
  `ENCRYPTION_KEY` the build correctly stops at `/api/decrypt`; that is the
  existing env requirement, not a UI regression.

**Open founder decisions (defaults used, easy to change):** amount presets
500/1,000/2,000/5,000 RWF; tab names; Kinyarwanda timing; 24 h anonymous claim;
data-saver defaults; library contents; accessible vs pure red; rollout flags.

**Not touched:** Firestore rules, workers, payment/fee logic, production.

## 2026-11-11 — Phase 0: discovery and plan (no product code)

**Branch:** `feat/mobile-ui-refactor` (from `fix/audit-phase1-payments`).

**Changed (docs only):**

- `docs/ARCHITECTURE_CURRENT.md` — current stack, diagram, folder map, data flow,
  Firebase/worker usage, styling, navigation, baseline metrics, constraints.
- `docs/screens/INVENTORY.md` — every fan/supporter/creator route (~79 screens
  plus overlays) with component and priority.
- `docs/screens/MOBILE_USABILITY_FINDINGS.md` — top 10 mobile problems with
  `file:line` and audit-artifact evidence.
- `docs/screens/before/README.md` — screenshot capture spec and the environment
  blocker.
- `docs/PLAN_MOBILE_UI.md` — target architecture, navigation, components,
  phase plan with effort/risk, verification, rollout, founder questions.
- `docs/RULES_FOLLOWUP.md` — UI-side rule dependencies (anonymous claim, locked
  posts, supporters anonymity).

**Why:** the brief asks for Phase 0 discovery and an approval gate before
building. The repo has no design tokens, no shared primitives, no app tests and
a monolithic support modal; the plan sequences those safely without touching
payment logic, Firestore rules or production.

**Verified:**

- `npm run dev` boots but Firebase pages fail: `.env` Firebase values are empty
  (see blocker doc). No production contact was made.
- Source facts measured with `grep`/`wc` (file counts, `any`, client components,
  fetch calls, colour utilities, tiny text).
- Baseline numbers taken from the existing audit bundle
  (`../audit/artifacts/`).

**Deferred:** all code changes; all screenshots (blocked); Storybook cleanup;
CI for the app.

**Not touched:** Firestore rules, workers, payment logic, production.
