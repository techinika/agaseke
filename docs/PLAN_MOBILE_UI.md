# Agaseke mobile-first UI — Phase 0 plan

Status: **ready for founder review. No product code has been changed.**
Branch: `feat/mobile-ui-refactor` (cut from `fix/audit-phase1-payments`).
Read with `docs/ARCHITECTURE_CURRENT.md`, `docs/screens/INVENTORY.md`,
`docs/screens/MOBILE_USABILITY_FINDINGS.md`.

## 0. What Phase 0 found (summary)

- The stack is sound (Next 16 App Router, React 19, Tailwind v4, 8 workers).
  The problem is **presentation and structure**, not the platform.
- **112 of 326** app files are client components; **90** import Firebase
  directly; **47** raw `fetch` calls live in screens; **492** `any`.
- **1,399** `orange-*` utilities and **284** `text-[10px]` uses with no token
  file. The brand in code is orange; the brief says red.
- The money flow is a single modal with a popup for cards and a 120 s timeout.
- The creator area is a desktop sidebar; public pages have a tab bar, not an
  action bar.
- **Blocker:** no Firebase credentials or emulator in the workspace, so the
  before-screenshots and authenticated flows could not be captured. See
  `docs/screens/before/README.md`. This must be resolved before Phase 1
  verification.

## 1. Target architecture (adjusted to this repo)

Keep the existing workers and payments logic. Move **presentation and data
access** only.

```
src/                                  (existing root is the src root; do not add src/)
  app/                                routes only: thin pages + layouts
    (public)/[username]/              server page reads creator + public posts
    (public)/explore/
    (auth)/login/
    (creator)/dashboard/              bottom-tab layout
    (supporter)/library/
  features/                           one folder per business feature
    support/      SupportSheet, AmountStep, PayStep, StatusScreen, useSupport
    content/      Feed, PostCard, LockedPost, Composer, MediaPlayer
    store/        gatherings/  bookings/  giveaways/  community/
    earnings/     payouts/     onboarding/  profile/
  components/
    ui/           Button, Input, AmountInput, PhoneInput, Sheet, Tabs, Card,
                  Avatar, Badge, Skeleton, Toast, EmptyState, ErrorState,
                  StatusScreen, BottomNav, TopBar, ShareButton, QRCode,
                  MediaImage, MediaPlayer
    layout/       PublicShell, CreatorShell, SupporterShell
  lib/
    api/          typed worker client + one error envelope
    firebase/     lazy SDK init + typed converters
    format/       money (RWF, 0 decimals), dates, phone (Rwanda)
    i18n/         en strings in one module; rw added later
  hooks/          shared hooks only
  styles/tokens.css   the ONE token file (imported by app/globals.css)
  types/          shared domain types
tests/ e2e/ unit/
docs/
```

Rules to enforce with lint:

- `features/*` may import `components/ui`, `lib/*`, `types/*`; features import
  other features **only** through their `index.ts`.
- `components/ui/*` has no Firebase, no business logic.
- `app/*` pages only compose features; no data fetching beyond server-page
  loaders.
- Worker/Firebase calls only through `lib/api/*` or `lib/firebase/*`.
- One money formatter (`formatMoney` → `1,000 RWF`) and one Rwanda phone
  validator/formatter (`07XX XXX XXX`, MTN/Airtel prefixes).
- `"use client"` only on interactive leaves. Server components by default.

Migration is **incremental, route by route**, not a big-bang. Old and new
components coexist behind route-level switches during the transition.

## 2. Navigation proposal

**Fan / guest** (public + logged in):

- Top bar: AGASEKE wordmark, search, account.
- Creator page: content, then a **sticky bottom action bar** with one primary
  **Support** button. Tabs (Posts, Store, Events, Bookings, Giveaways) sit above
  the action bar and remember the last tab.
- Logged-in fan bottom tabs: **Explore · Library · Account**.
- Remove the duplicate `MobileBottomBar` on creator pages; merge
  `LoginNotice` into the support sheet as a one-line guest prompt.

**Creator** bottom tabs (recommended set):

`Home · Content · Earnings · Community · Settings`

- Persistent top-bar action: **Share my link**.
- Content opens a list + a floating **＋** to the composer.
- Community holds supporters, messages, bookings, events, giveaways.
- Earnings holds balance, payout history, request early payout.
- Settings holds profile, verification, payout destination, store/community
  toggles.
- Every target task ≤ 2 taps: share (1), add post (2), earnings (1), request
  payout (2), support a creator (1).

Menu mapping from today (so nothing disappears):
Overview→Home; Content/Notices/Articles→Content; Commerce/Store/Sales/Orders→
Content or Earnings; Community/Gatherings/Bookings/Giveaways/Messages/
Supporters/Tiers→Community; Partners→Settings; Verify/Payouts/Settings→Settings.

## 3. Component list (build once, use everywhere)

`Button` (primary/secondary/ghost/danger, loading, full-width), `Input`,
`AmountInput` (chips + custom), `PhoneInput` (`inputmode=tel`, auto-format),
`Sheet` (bottom sheet, keyboard-safe, focus trap), `Tabs`/`Segmented`, `Card`,
`Avatar`, `Badge` (Verified, Public, Supporters-only), `Skeleton`,
`Toast`, `EmptyState`, `ErrorState` (retry), `StatusScreen`
(waiting/success/failed), `BottomNav`, `TopBar`, `ShareButton`, `QRCode`,
`MediaImage` (aspect-ratio reserved, `next/image`), `MediaPlayer` (poster,
tap-to-load, size/duration), `LockedPostCard`, `Money` (RWF), `ProgressSteps`.

A `/dev/components` page (gated by env, not in the production nav) shows all of
them at 360/390/768 widths. Storybook is optional; the existing
`storybook-static` folder is stale (Nunito assets, not Rubik) and should not be
treated as the source.

## 4. Phase-by-phase plan

Estimates assume one senior front-end engineer; risk is delivery risk, not
security risk.

| Phase | Scope | Key work | Effort | Risk |
|---|---|---|---:|---|
| **0** | Discovery | This document, architecture, inventory, findings, blocker report | 2 d | Low — **screenshots blocked** |
| **1** | Foundation | `tokens.css`, `components/ui/*`, `lib/format/*`, `lib/i18n/en.ts`, `/dev/components`, lint/format/typecheck CI, path rules, test harness (Playwright mobile + Vitest) | 4–5 d | Medium: 112 client files cannot be migrated at once; do it per route |
| **2A** | Creator public page | New `/[handle]` shell (server-first), header, sticky Support bar, tabs with last-tab memory, share/QR, skeleton + reserved media | 4–5 d | Medium: SSR/client split; must keep SEO + schema |
| **2B** | Support sheet | 3-step bottom sheet, amount chips, fee display, MoMo/Airtel/card, guest/anonymous prompt + mid-flow sign-up, same-tab card, status screen + receipt, retry preserving details, double-tap guard | 6–8 d | **High**: touches money UI. No payment-logic changes. Feature-flagged |
| **2C** | Other supporter actions | Store buy, event RSVP, booking, giveaway entry, community join on the same sheet + status + trust block | 4–5 d | Medium |
| **3** | Content consumption | Feed with Public/Supporters-only distinction, locked teaser + in-place unlock, post view typography, lazy media with data saver, **My Library**, explore polish | 6–8 d | Medium: private-media proxy must stay |
| **4** | Creator mobile | Bottom-tab shell, Home dashboard cards, Earnings/payouts UI (masked number, request flow), step composer with autosave + retry, onboarding checklist, store/events/bookings/giveaways list-and-add, notifications | 8–10 d | High volume; split into 4A shell/home, 4B composer, 4C commerce, 4D payouts |
| **5** | Code structure | Extract hooks/services per route as it is touched; typed API layer; dead-code removal; strict `any` burn-down | continuous, 3–4 d dedicated | Medium: regressions; tests gate each route |
| **6** | Performance | Deterministic SSR, `next/image`, dynamic imports, Firebase lazy init, ISR/tag revalidation, list pagination, font subset, budgets in CI | 5–7 d | High: CLS/hydration + caching changes |
| **7** | A11y + release | axe zero critical/serious, Playwright mobile E2E, in-app-browser test, visual regression, `UI_GUIDE.md` | 4–5 d | Medium |

**Total:** roughly **7–9 weeks** of focused work, shipped in flags.

### Phase 1 detail (the gate)

- Create `styles/tokens.css`: colour (accessible red/black/white + semantic
  success/warning/danger), spacing scale (4/8/12/16/24/32), radius
  (8/12/16/24), type scale (12/14/16/18/20/24/32/40), shadow, focus ring.
- Add `lib/format/money.ts` (RWF, no decimals, thousands separator),
  `lib/format/phone.ts` (Rwanda prefixes 072/073/078/079 and 082/083),
  `lib/i18n/en.ts`.
- Add `components/ui/*` primitives with tests (tap target ≥ 48, aria labels,
  focus visible, reduced motion).
- Add CI: `npm run lint`, `tsc --noEmit`, unit tests, Playwright mobile smoke,
  bundle-size check. (No CI workflow for the app exists today.)
- Add `/dev/components` behind `NEXT_PUBLIC_DEV_COMPONENTS=1`.
- Add Playwright config (Pixel 7, Galaxy S8, iPhone SE, 360×640) and axe.

## 5. Verification per phase (as requested)

For every phase: before/after screenshots at 360×640 and 390×844; unit +
Playwright mobile + axe pass/fail counts; Lighthouse mobile table vs the
targets; per-route gzip bundle before/after; a tap-target count (target: zero
under 48 px in primary flows); deferred list. Evidence goes in
`docs/UI_REFACTOR_LOG.md` and `docs/screens/`.

Performance targets (mobile, Slow 4G, mid-range Android):

| Page | Perf | LCP | TBT | CLS | JS gzip | First-load |
|---|---:|---:|---:|---:|---:|---:|
| Creator | ≥ 80 | < 2.5 s | < 200 ms | < 0.1 | < 250 KB | < 1.5 MB |
| Home | ≥ 85 | < 2.5 s | < 200 ms | < 0.1 | < 250 KB | < 1.5 MB |
| Login | ≥ 85 | < 2.5 s | < 200 ms | < 0.1 | < 200 KB | < 1 MB |

The audit baseline is creator 19 / LCP 6.0 s / TBT 4.73 s / CLS 0.906 / 10.2 MB.
The 400 kbps profile (400 ms latency, 4–6× CPU) will be reported honestly even
if it misses.

## 6. Rollout

1. Ship tokens + primitives + `/dev/components` (no user-visible change).
2. Ship the creator public page behind a per-creator flag; verify SEO, OG,
   schema, and that the support flow still uses the existing payment service.
3. Ship the support sheet behind `support_sheet_v2` (env + allowlist); test with
   a handful of creators; monitor payment success rate, pending age, and
   guest→registered conversion (event only, no PII).
4. Ship creator bottom tabs behind `creator_nav_v2`; monitor task completion.
5. Ship content/library and remaining actions.
6. Performance/caching changes last (ISR + on-demand revalidation), with rollback
   by disabling the revalidate tag.

Rollback: each flag falls back to the current component; no data migration is
required. Do not change worker behaviour or Firestore rules in this work.

## 7. Questions for the founder (with recommended defaults)

1. **Brand colour.** Code uses orange `#ea580c`; the brief says red `#FF0000`.
   Pure `#FF0000` fails AA for normal text (4.0:1). Recommendation: keep
   `#FF0000` as the brand mark for large text/accents, use a darker accessible
   red (e.g. `#C40000`) for small text and button backgrounds. Confirm.
2. **Preset support amounts.** Recommend **500 / 1,000 / 2,000 / 5,000 RWF**
   plus custom, minimum from `currencies.minSupportAmount`. Confirm.
3. **Creator tab set.** Recommend **Home · Content · Earnings · Community ·
   Settings**. Confirm or swap Community/Settings.
4. **Kinyarwanda.** No i18n exists. Recommendation: put all strings in
   `lib/i18n/en.ts` now, ship English, add `rw.ts` after the flows stabilise
   (not in the same release). Confirm timing.
5. **Anonymous claim window.** Recommendation: claim within **24 h** using the
   receipt reference, verified server-side; same-session sign-up keeps the
   in-progress sheet. Confirm window/method.
6. **Data saver.** Recommendation: media never autoloads; tap-to-load with
   poster, size and duration; auto-on for `navigator.connection.saveData` or
   2G/3G. Confirm.
7. **Supporter Library scope.** Recommendation: unlocked posts + purchases +
   tickets + bookings in one list. Confirm.
8. **Fees shown at payment.** Recommendation: show exact RWF "creator receives"
   and "platform fee" (from `NEXT_PUBLIC_CREATOR_SHARE`, currently 0.9). Confirm
   wording and whether the fee is shown to supporters or only to creators.
9. **Environment for evidence.** Which of A/B/C in
   `docs/screens/before/README.md` should I use to unblock screenshots and
   tests? Recommendation: **A (emulator + seed)**.
10. **Feature-flag mechanism.** Recommendation: env flags plus a Firestore
    `featureFlags` doc per creator; simplest to roll back without a deploy.
