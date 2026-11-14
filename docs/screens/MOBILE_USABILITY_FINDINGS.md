# Top 10 mobile usability problems (Phase 0)

Evidence is cited as `file:line` plus the existing audit artifact. Screenshots
for these states are blocked pending emulator/staging (see
`before/README.md`); the audit artifacts are the current visual/measurement
evidence.

## 1. The support action is not the primary, thumb-reachable action — P0

**What is wrong.** The public page renders the support CTA in the middle of the
hero (`components/parts/public/SendGiftSection.tsx:139`), then a **fixed bottom
bar** that is a tab bar, not an action bar
(`components/parts/public/TabManager.tsx:42`). Scrolling a long post or store
list moves the support CTA off-screen. The fixed bottom bar is labelled with
9–10 px text (`TabManager.tsx:57`). A logged-in visitor can also get a second
fixed bottom bar (`components/parts/MobileBottomBar.tsx:60`) plus a fixed
"Create an Agaseke" nudge (`components/parts/public/LoginNotice.tsx:13`), so
three fixed elements compete for the bottom of the screen.

**Impact.** The highest-value action (pay) is not in the thumb zone and is not
persistent. This is the single largest conversion leak on mobile.

**Target.** Sticky bottom action bar with one primary **Support** button; tabs
above it; remove/merge the duplicate bars; `LoginNotice` must not overlap.

## 2. Card checkout is a popup opened after an await — P0

**What is wrong.** `SupportModal.tsx:247` calls
`window.open(data.redirect_url, "_blank")` after the `await
initiateCardPayment(...)`. In WhatsApp/Instagram/Facebook in-app browsers this is
blocked. The only fallback is a link on the error screen
(`SupportModal.tsx:467`). The audit measured **69% of card transactions stuck
pending** (`audit/report/AUDIT_REPORT.md` §5.1).

**Impact.** Card payments — the highest-friction method — fail silently on the
exact browser most Rwandan supporters use.

**Target.** Same-tab navigation on the click; never a popup; visible fallback
always; return to a status screen by reference.

## 3. The payment status screen is a generic spinner with a hard timeout — P0

**What is wrong.** After initiating, the modal shows a spinner and waits on a
Firestore `onSnapshot` (`SupportModal.tsx:160`). At **120 s** it replaces the
screen with "Payment timed out. Please check your phone."
(`SupportModal.tsx:178-184`). There is no waiting/success/failed full-screen
model, no receipt reference, no "you will not be charged twice", and "Try Again"
(`SupportModal.tsx:485`) clears the flow back to input. The success screen shows
only the amount (`SupportModal.tsx:392`).

**Impact.** A slow-but-successful MoMo prompt turns into a scary error, and users
retry or abandon. This matches the audit's "pending → failed" payment failure
class.

**Target.** Three explicit states, keep polling, show receipt ref, preserve
entered details on retry, explain double-charge safety.

## 4. Tap targets below 44×44 px — P1

**What is wrong.** At 360 px the audit counts **36 visible controls under
44 px** (`audit/artifacts/usability/tap-targets-360.json`). Examples: theme
toggle 34×34, share button 28×28 (`SendGiftSection.tsx:113-119`), header
actions 36–40 px, social pills 34 px high. axe flags `target-size` on the
creator page (`audit/artifacts/axe/chromium-mid-android-creator.json`).

**Impact.** Mis-taps, especially for the share action and icon-only controls.

**Target.** 48×48 minimum for primary flows (44 px absolute floor), 8 px gaps.

## 5. Text as small as 7–10 px — P1

**What is wrong.** **284** uses of `text-[10px]`, 21 × `text-[11px]`, 6 ×
`text-[9px]`, 2 × `text-[8px]`, 1 × `text-[7px]`. Examples:
`TabManager.tsx:57` (9 px tab labels), `MobileBottomBar.tsx:67` (10 px),
`SendGiftSection.tsx` social/status labels, `LoginNotice.tsx:25`.

**Impact.** Below the 12 px floor; unreadable on a mid-range Android at arm's
length and fails WCAG text sizing expectations.

**Target.** Body ≥ 16 px, secondary ≥ 12 px, no essential text below 12 px.

## 6. Contrast failures and inconsistent brand colour — P1

**What is wrong.** axe finds `color-contrast` violations on creator (×10),
home (×9), help (×5), privacy (×2), login (×1)
(`audit/artifacts/axe/chromium-mid-android-*.json`). White on orange is
≈3.59:1; orange text on `#fbfbfc` ≈3.47:1 (audit §7). The code uses **1,399**
`orange-*` utilities and hard-coded `#ea580c` / `#f97316`, but the brief names
brand red `#FF0000`. There is no token file, so contrast cannot be fixed in one
place.

**Impact.** Fails WCAG AA and makes the brand look different from the specified
identity.

**Target.** One token file with accessible red/black/white pairs; all components
consume tokens; confirm red vs orange with the founder before changing.

## 7. Icon-only controls without accessible names — P1

**What is wrong.** axe finds `button-name` **critical ×3** and `link-name`
**serious ×7** on the creator page
(`audit/artifacts/axe/chromium-mid-android-creator.json`). Examples: the share
button (`SendGiftSection.tsx:113`), social pills, post action icons, the
notifications bell (`Navigation.tsx:133`), theme toggle.

**Impact.** Screen-reader users hear "button" with no purpose; voice control
cannot target them.

**Target.** `aria-label` on every icon button, visible focus, accessible
names in the shared primitives.

## 8. Navigation is duplicated and creator tasks are too deep — P1

**What is wrong.** Public pages use a fixed tab bar (`TabManager.tsx:42`),
logged-in users get `MobileBottomBar`, and the creator area uses a hamburger
drawer with expandable groups (`components/parts/dashboard/Layout.tsx:124,
159`). There are no creator bottom tabs. Earnings live under
Account → Payouts; content under Content → Posts; the dashboard is a dense
sidebar built for desktop. The audit's target is ≤ 2 taps for share, add post,
earnings, payout.

**Impact.** Creators on phones hunt through a desktop sidebar; the same screen
can show competing navigation bars.

**Target.** One role-based bottom nav (creator: Home, Content, Earnings,
Community, Settings; fan: Explore, Library, Account), with a persistent
"Share my link".

## 9. Creator page layout shift and hydration mismatch — P0

**What is wrong.** The creator page has **CLS 0.906** in Lighthouse and **0.52**
on desktop, and throws **React #418** on every load
(`audit/artifacts/perf/chromium-mid-android.json` `pageErrors`; audit §6.2).
The page server-renders a skeleton/initial state, then a large client component
(`PublicProfile.tsx`) re-fetches posts/support state and re-renders tabs; images
and embeds do not all reserve space.

**Impact.** The page visibly jumps while the user tries to tap Support; on slow
networks it never finishes before the user leaves.

**Target.** Deterministic first render, reserved aspect ratios, no client
re-fetch of data already server-rendered, skeletons sized to final content.

## 10. Locked/private content has no clear unlock moment — P0

**What is wrong.** Private posts are only fetched **after** a client-side
`supportedCreators` query resolves (`PublicProfile.tsx:234-264`). There is no
locked teaser state: a non-supporter simply sees fewer posts. The badge
"Supporters Only" only appears on posts a supporter can already see
(`CommunityTab.tsx:291`). Purchase/unlock happens through the generic support
modal, not an in-place unlock, and there is no "My library". Private media is
correctly routed through the signed proxy (`lib/usePostMediaSrc.ts`), which
must be preserved.

**Impact.** Fans cannot see what they would get, so they do not pay; supporters
cannot find what they unlocked.

**Target.** Locked card with teaser + one "Support to unlock" action (price/tier
if any), unlock in place after payment, and a supporter Library.

## Additional issues to fold into the same work

- Guest support is not a first-class path: the page nudges "Log in" and the
  support modal uses `currentUser` for name/email, but there is no explicit
  "Anonymous" identity, no mid-flow sign-up that preserves the amount, and no
  server-side claim flow (`SendGiftSection.tsx:181`, `SupportModal.tsx:236`).
- Loading is a full-page spinner on the creator dashboard
  (`CreatorSpace.tsx:155`) instead of a skeleton.
- Store/booking/gathering flows reuse modal + popup patterns
  (`store/CheckoutModal.tsx`, `BookingModal.tsx`) rather than the same bottom
  sheet and status screen.
- No i18n structure: strings are inline English; `app/layout.tsx` advertises
  only `en`. Kinyarwanda would be a string-by-string rewrite today.
- Money formatting and phone validation are not centralised; each flow formats
  inline (e.g. `SupportModal.tsx`, `types/currency.ts`).
