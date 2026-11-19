# Agaseke Full-App Redesign — Log

## 2026-11-17 — Phase 0 audit and proposal

**Branch:** `design/full-app-redesign` (created from `feat/multi-currency-money` HEAD `844f320`)
**Status:** Phase 0 documentation complete; awaiting founder approval. No UI code changed.

### Done

- Inventoried the app: 82 pages, 6 layouts, 2 error boundaries, 1 global error, 1 not-found, 2 loading states, 20 named modals, 311 TSX files.
- Corrected stale prompt assumptions:
  - Orange drift is 1,383 occurrences across 151 files, not ~740.
  - `components/ui/` has 29 files; the problem is adoption, not absence.
  - Storybook is not installed; only stale `storybook-static/` exists.
  - Actual `AdminPage` is 1,729 lines; `SupporterSpace` is 2,017.
- Quantified design debt:
  - 316 tiny-text usages in 82 files.
  - 624 raw buttons in 132 files; only 17 files import shared `Button`.
  - 209 raw inputs in 67 files; only 3 files import shared `Input`.
  - 35 selects / 34 textareas with no shared primitive.
  - 68 fixed-position usages in 50 files; only 2 files use dialog semantics.
  - 50 raw hex colors; 87 raw image tags.
- Verified contrast for brand red variants and success colors.
- Mapped every route, layout, state file, modal, and non-modal overlay into `docs/REDESIGN_COVERAGE.md`.
- Wrote `docs/REDESIGN_AUDIT.md`, `docs/REDESIGN_PROPOSAL.md`, and this log.
- Ran current public 360 baseline:
  - `npx playwright test e2e/mobile-routes.spec.ts --project=mobile-360`
  - **14/14 passed**, including no serious/critical axe violations.
  - Refreshed `docs/ui-evidence/phase-7/mobile-360/` screenshots and `playwright-report.json`.

### Findings that shape the plan

- The token layer and primitives already exist; migration should be incremental and route-based.
- Public/supporter shell coupling is real: supporter routes import public `Navigation`/`Footer`.
- Creator/admin/public already use different shell models; no typed navigation config exists.
- Authenticated screenshots and real creator/profile verification remain blocked by missing Firebase emulator/seed/test accounts/provider sandbox.
- The existing `scripts/mobile-audit.mjs` pass hit “Execution context was destroyed, most likely because of a navigation”; the script needs a navigation-safe wait before it can be trusted for all-route 360 metrics.

### Verification

- Current public route run: 14/14 passed at 360×640.
- No root typecheck/lint/test run was needed because this phase changed documentation and generated evidence only.
- Existing multi-currency work remains complete in `844f320`; this branch is based on it.

### Next

1. Founder reviews `docs/REDESIGN_AUDIT.md`, `docs/REDESIGN_COVERAGE.md`, and `docs/REDESIGN_PROPOSAL.md`.
2. Decide emulator/seed/credentials approach for authenticated screenshots.
3. Approve or adjust navigation, brand-red usage, and phase order.
4. Only after approval: begin Phase 1 foundation (tokens, missing primitives, dialog/sheet, nav config, app shells, gallery, lint ratchet).

## 2026-11-17 — Phase 1 foundation

**Branch:** `design/full-app-redesign`
**Status:** Phase 1 foundation implemented and verified. Existing pages are not yet migrated onto the new shells.

### Done

- Extended `styles/tokens.css` with `surface-sunken`, `overlay`, `chart-1..6`, `text-hero`, sidebar width, and content max-width; mapped them in `app/globals.css`.
- Refactored `Button` to export `buttonBaseClasses`, `buttonVariantClasses`, and `buttonSizeClasses` while preserving `buttonClasses`.
- Added form/action primitives: `FormField`, `IconButton`, `Textarea`, `Select`, `Checkbox`, `RadioGroup`, `Switch`, and `SearchInput`.
- Added one overlay system: `Dialog` with responsive/center/bottom/right placements, focus trap, Escape handling, scroll lock, and safe-area footer; refactored `Sheet` onto it, added `Drawer` and `ConfirmDialog`, and migrated `ConfirmModal` plus `NotificationDrawer`.
- Added typed navigation in `config/navigation.ts`: surfaces, roles, slots, feature gates, typed labels, active matching, and action items.
- Added shell primitives: `AppShell`, `Sidebar`, `PageHeader`, and `PageSection`, including a skip link and shared sidebar active states.
- Expanded `app/dev/components/ComponentGallery.tsx` with form fields, icon buttons, dialog, drawer, and new token swatches.
- Added `scripts/design-lint.mjs` plus a zero-debt baseline to ratchet raw palette classes, raw hex colors, tiny text, and arbitrary radii across `components/ui`, `components/shell`, `config`, and `app/dev/components`.
- Cleaned foundation token drift in `NotificationDrawer`, `LinkifyText`, `TabErrorState`, and `QRCode`.
- Added `tests/unit/foundation.test.tsx` for Dialog, ConfirmDialog, SearchInput, and navigation filtering/active state.

### Verification

- `npm run typecheck` — passed.
- `npm run lint:ci` — passed, including `npm run lint:design`.
- `npm test` — **26 files, 157 tests passed**.
- `npm run lint:design` — zero foundation violations; baseline respected.
- `npm run format:check` still reports pre-existing formatting debt in unrelated money/feature/test files; all files changed in this phase were formatted with Prettier.

### Next

1. Adopt `AppShell`/`Sidebar`/`PageHeader` in the dashboard and public layouts.
2. Migrate the highest-drift routes onto the new primitives, starting with the public landing/explore flow and creator shell.
3. Add navigation badges/feature-flag wiring from creator settings and auth state.
4. Capture the gallery and migrated routes at 360/1280 in light/dark; rerun axe and tap-target checks.

## 2026-11-17 — Phase 2 public shell and marketing routes

**Branch:** `design/full-app-redesign`
**Status:** Public shell and first marketing/auth/legal migration pass complete and verified. Dashboard shells are still pending.

### Done

- Added `components/shell/PublicHeader.tsx`: auth-aware desktop/mobile navigation, Sheet menu, notification drawer, theme toggle, login/demo CTAs, and creator/admin/supporter actions.
- Added `components/shell/PublicFooter.tsx`: Platform/Legal/Community groups, social links, and accessible tap targets.
- Applied the new shell through `components/parts/Navigation.tsx` and `components/parts/Footer.tsx` wrappers, and switched `app/(main)/layout.tsx` to `PublicHeader`/`PublicFooter`.
- Added public marketing links and header labels to `config/navigation.ts` and `lib/i18n/en.ts`.
- Rewrote `components/pages/LandingPage.tsx` around the public product story while preserving username checks and claim redirects.
- Migrated `/for-creators`, `/for-supporters`, `/for-brands`, help center, changelog, login, onboarding, and all legal pages onto semantic tokens and shared primitives.
- Removed stale local loading state/skeleton from the landing creator list; creators now render from server-provided data or the fallback list.
- Darkened `--ag-muted-fg` from `#64748b` to `#5f6f84` so muted text passes AA on `surface-sunken` (footer/legal/gallery), and removed low-contrast `on-brand/80` text.

### Verification

- `npm run typecheck` — passed.
- `npm run lint:ci` — passed, including `npm run lint:design` (zero foundation violations).
- `npm test` — **26 files, 157 tests passed**.
- Targeted ESLint on migrated landing/marketing/help/changelog/login/legal files — passed.
- `npx playwright test e2e/mobile-routes.spec.ts --project=mobile-360` — **14/14 passed**, including serious/critical axe checks.
- Onboarding still has pre-existing `no-explicit-any` lint findings in its Firestore mapping code; not introduced by this pass.
- `npm run format:check` still reports pre-existing formatting debt outside this phase.

### Next

1. Adopt `AppShell`/`Sidebar`/`PageHeader` in creator, supporter, and admin layouts.
2. Migrate explore/creator profile and remaining public flows.
3. Expand `lint:ci`/`design-lint` coverage to `app/(main)` and `components/pages`, then clear the resulting backlog.
4. Capture migrated routes at 360/1280 in light/dark and rerun authenticated checks once Firebase/emulator credentials exist.

## 2026-11-17 — Phase 3 explore and reading routes

**Branch:** `design/full-app-redesign`
**Status:** Explore list, public post list, post detail, and article reader migrated and verified. Detail/reader data states remain dependent on Firebase seed data.

### Done

- Rewrote `components/pages/ExplorePage.tsx` around semantic tokens, `SearchInput`, `Card`, `Badge`, `Button`, `EmptyState`, and skeleton loading while preserving Firestore pagination and creator filtering.
- Rewrote `components/pages/ExplorePostsPage.tsx` with a responsive public content feed, typed filter controls, creator attribution, YouTube previews, document paging, and `Dialog`-based image/document viewers.
- Rewrote `components/pages/ExplorePostDetailPage.tsx` with public post layout, signed media handling, document viewer, comments, share, image lightbox, and support modal; replaced the ad-hoc delete prompt with `ConfirmDialog`.
- Rewrote `components/pages/public/ArticleReaderPage.tsx` with the public article shell, supporter paywall preview, comments, related content, share, and support flows.
- Removed legacy `MobileBottomBar`/schema duplicates from the explore pages so they use the shared public layout.
- Preserved all Firebase reads/writes, pagination cursors, access checks, comment mutations, media signing, view increments, and support/referral behavior.

### Verification

- `npm run typecheck` — passed.
- Targeted ESLint on all four migrated files — passed with zero warnings.
- `npm run lint:ci` — passed, including design-lint.
- `npm test` — **26 files, 157 tests passed**.
- `npx playwright test e2e/mobile-routes.spec.ts --project=mobile-360` — **14/14 passed**, including serious/critical axe checks; refreshed explore/list evidence screenshots.
- Detail and article-reader states are not exercised by the public 360 suite without seeded Firebase content and authenticated supporter accounts.

### Next

1. Adopt `AppShell`/`Sidebar`/`PageHeader` in creator, supporter, and admin layouts.
2. Migrate creator profile and remaining public flows.
3. Expand `lint:ci`/`design-lint` coverage to `app/(main)` and `components/pages`, then clear the backlog.
4. Add seeded data fixtures for post-detail/article-reader visual and interaction coverage.

## 2026-11-17 — Role shell adoption

**Branch:** `design/full-app-redesign`
**Status:** Creator, supporter, and admin layouts now use the shared authenticated shell. Individual dashboard pages are not fully migrated yet.

### Done

- Added a `padded` prop to `AppShell` so authenticated layouts can own their page spacing without double padding.
- Rewrote the creator layout (`components/parts/dashboard/Layout.tsx`) with `AppShell`/`Sidebar`, typed navigation, creator feature flags, responsive drawer navigation, a tokenized topbar/user menu, feedback dialog, share/copy actions, notifications, and the existing creator bottom nav.
- Replaced the admin layout with `AuthGuard` + `AppShell` + `Sidebar`, typed admin navigation, a mobile drawer, theme toggle, creator-space links, and explicit logout.
- Added a dedicated supporter layout with `AuthGuard` + `AppShell` + `Sidebar` + `BottomNav`, typed supporter navigation, theme toggle, workspace/profile actions, and logout.
- Removed duplicated public `Navbar`, `Footer`, and `MobileBottomBar` usage from supporter routes and components now owned by the supporter layout.
- Preserved the notices feedback action and offset the FAB above the mobile bottom navigation instead of letting it overlap.
- Converted dashboard page-level `<main>` containers to `<div>` so `AppShell` remains the single main landmark instead of nesting `<main>` elements.
- Added `creatorLayout`, `supporterLayout`, and `adminLayout` strings to `lib/i18n/en.ts`.

### Verification

- `npm run typecheck` — passed.
- Targeted ESLint on all new/changed shell files — passed with zero warnings.
- `npm run lint:ci` — passed, including design-lint.
- `npm test` — **26 files, 157 tests passed**.
- `npx playwright test e2e/mobile-routes.spec.ts --project=mobile-360` — **14/14 passed**, including serious/critical axe checks.
- Authenticated dashboard screenshots and 1280/dark visual checks remain blocked by missing Firebase emulator/seed/test accounts and provider sandbox keys.
- Legacy supporter page bodies still carry pre-existing raw tokens and image lint warnings; shell ownership is fixed, page-level token migration is still due.

### Next

1. Capture authenticated creator/supporter/admin shells at 360/1280 once emulator/seed/test accounts exist.
2. Migrate `SupporterSpace` and supporter post/notice bodies onto semantic tokens and shared primitives.
3. Consolidate `CreatorBottomNav` into `config/navigation.ts`.
4. Continue with the public creator profile route family, then creator dashboard pages.

## 2026-11-17 — Supporter page migration

**Branch:** `design/full-app-redesign`
**Status:** Supporter feed, post detail, and notices now use semantic tokens and shared primitives. Live Firebase data states remain unverified without seed/authentication setup.

### Done

- Added the missing `canvas` and `brand-soft` theme aliases so existing `bg-canvas` and `bg-brand-soft` utilities resolve to semantic tokens in light and dark mode.
- Migrated `SupporterSpace` to semantic surfaces, status colors, brand tokens, control/card radii, and `text-caption` minimum type; preserved feed filters, uploads, comments, likes, follows, purchases, and support flows.
- Reused `Button`, `EmptyState`, and `Avatar` in `SupporterSpace`, and added accessible names for search, uploads, replies, comments, document paging, and media viewer controls.
- Migrated `SupporterPostDetail` to semantic tokens and reused `Button`, `Input`, and `Avatar` for support, like, comment, reply, and document paging controls.
- Rebuilt `NoticesPage` around `PageHeader`, `Button`, `Badge`, `EmptyState`, and `Dialog`; notice filtering, personalization, and subscription behavior are unchanged.
- Removed stale raw palette, undefined `primary`, tiny text, and duplicated avatar markup from the supporter route family.

### Verification

- `npm run typecheck` — passed.
- Targeted ESLint on all changed supporter files and layouts — passed with zero warnings.
- `npm run lint:ci` — passed, including design-lint.
- `npm test` — **26 files, 157 tests passed**.
- `npx playwright test e2e/mobile-routes.spec.ts --project=mobile-360` — **14/14 passed**, including serious/critical axe checks.
- Authenticated supporter data, uploads, comments, and support modals are not exercised by the public 360 suite without Firebase emulator/seed/test accounts.

### Next

1. Capture authenticated supporter feed/detail/notices states at 360/1280 in light and dark.
2. Begin the public creator profile route family (`/[username]`), starting with the profile shell and store/community entry points.
3. Continue creator dashboard page migration after the profile routes.

## 2026-11-17 — Phase 2 shell and navigation consolidation

**Branch:** `design/full-app-redesign`
**Status:** Shell/navigation work complete and verified for unauthenticated surfaces. Authenticated dashboard visuals remain blocked by missing Firebase emulator/seed/test accounts.

### Done

- Consolidated creator, supporter, and admin mobile navigation into `components/shell/DashboardMobileNav.tsx`, driven by `config/navigation.ts`; admin now has a shared bottom bar, and grouped `More` destinations open through the shared `Dialog` bottom sheet.
- Made the desktop `Sidebar` collapsible with accessible expanded/collapsed labels, and kept the creator share action visible with `t("creator.shareMyLink")`.
- Added the shared `AuthShell` plus `app/(authentication)/layout.tsx` so login/onboarding routes get a skip link, `#main-content`, and theme toggle.
- Updated `PublicHeader` and `PublicFooter` to derive account/footer links from typed config and i18n keys; converted both public layout skip targets to `<main id="main-content">` landmarks.
- Replaced login perk `h3` elements with paragraphs so the auth page has a valid sequential heading structure.
- Rewrote the admin and supporter layouts to use `AppShell`, config `Sidebar`, and `DashboardMobileNav`; removed the duplicated admin drawer/hamburger nav.
- Added `NavItemBase.group`, public notice/transaction/booking links, grouped creator/admin nav items, and `BottomNav` action-item support.
- Fixed dark-mode brand contrast: `--ag-brand-strong` is now `#ff6b6b`, `--ag-brand-hover` is `#ff8080`, and `--ag-on-brand` is `#160808` in `.dark`. The previous `#c40000` on `#111c30` failed axe at 2.71:1.
- Extended `lint:ci`/`format`/`format:check` and `scripts/design-lint.mjs` to cover the new shell layouts and `components/parts/dashboard/Layout.tsx`.
- Added `tests/unit/shell-navigation.test.tsx` and `e2e/phase2-shells.spec.ts`.
- Captured 360×640 and 1280×800 light/dark screenshots for `/` and `/login` in `docs/ui-evidence/phase2-shells/`.

### Verification

- `npm run typecheck` — passed.
- `npm run lint:ci` — passed, including `npm run lint:design` (zero foundation violations).
- `npm test` — **27 files, 161 tests passed**.
- `npx playwright test e2e/phase2-shells.spec.ts` — **16/16 passed** across both Playwright projects; skip link, `#main-content`, no horizontal overflow, console errors, and serious/critical axe checks all passed.
- `npx playwright test e2e/mobile-routes.spec.ts` — **28/28 passed**.
- Production build with local placeholder encryption values — passed; sitemap/Firebase warnings remain pre-existing because no Firebase admin credentials are configured.
- Lighthouse 13.6.0 against the local production build:
  - `/` mobile: **75/97/92/100 → 86/100/92/100** (perf/a11y/best/SEO).
  - `/login` mobile: **67/97/92/69 → 93/100/96/66**; SEO is slightly lower because the login route intentionally keeps `robots: noindex`.
  - `/` desktop current: **100/100/92/100**.
- Bundle delta (`docs/ui-evidence/phase2-shells/bundle-report.json`, all `.next/static/chunks/**/*.js`): **5,176 → 5,208 KB raw (+32 KB)** and **1,583 → 1,596 KB gzip (+13 KB)**.
- `npm run format:check` still reports the same pre-existing Prettier backlog in unrelated money/feature/test files; all Phase 2 files were formatted individually.
- A stale `.next` dev cache briefly made `/login` compilation hang; clearing `.next` restored normal compilation and the full suite passed afterward.

### Evidence

- Full phase summary: `docs/ui-evidence/phase2-shells/summary.md`.
- Screenshots: `docs/ui-evidence/phase2-shells/<mode>/<shell>.png`.
- Lighthouse JSON: `docs/ui-evidence/phase2-shells/lighthouse/`.
- Bundle report and raw build logs: `docs/ui-evidence/phase2-shells/bundle-report.json`, `before-build.log`, `after-build.log`.
- Shell usage guide: `docs/UI_GUIDE.md`.

### Next

1. Provide Firebase emulator/seed/test accounts so creator/supporter/admin shells can be captured at 360/1280 in light and dark.
2. Delete `components/parts/dashboard/CreatorBottomNav.tsx` once the founder confirms no external import.
3. Migrate creator profile and remaining dashboard route bodies onto semantic tokens and shared primitives.
4. Add CI budgets for Lighthouse mobile performance ≥85 and zero serious/critical axe violations.

## 2026-11-18 — Phase 4 public creator pages

**Branch:** `design/full-app-redesign`
**Status:** Creator profile sub-pages, detail routes, payment/result routes, and action overlays migrated to semantic tokens and shared money formatting; evidence captured. Seeded-data states and full primitive adoption remain partial.

### Done

- Added `scripts/phase4-evidence.mjs` and captured 62 baseline screenshots across four modes: 360×640 light/dark and 1280×800 light/dark.
- Added `components/shell/CreatorSubpage.tsx`, `components/shell/index.ts`, and `features/creator-page/hooks/useCreatorSubpageData.ts`; migrated store, community, gatherings, giveaways, and messaging list routes to the shared shell with skeleton/empty/error states.
- Preserved the V2 creator page and support-sheet flags and the legacy fallbacks; no route, feature, payment, pricing, fee, or Firestore rule changed.
- Replaced community `SubscribeModal` usage with `CommunityJoinSheet` while preserving worker error logging and subscription callbacks.
- Tokenized product/gathering/giveaway/post detail pages, booking, payment callback, store pay, booking pay, store widgets, community/chat widgets, messaging widgets, support/action overlays, and the fallback public profile.
- Replaced every Phase 4 `formatCurrency` call site with the shared `formatMoney` formatter via an aliased import; no inline money formatting remains in Phase 4 routes.
- Tokenized Sonner toasts, removed the booking header contrast regression, and cleared all Phase 4 raw palette/hex findings.
- Extended `scripts/design-lint.mjs` to cover public creator routes, pay routes, public/creator features, and shared action overlays; added `lib/theme.ts` for the metadata theme color and confetti colors now read CSS tokens at runtime.

### Verification

- `npm run typecheck` — passed.
- `npm run lint:ci` — passed, including `npm run lint:design` with zero violations.
- `npm test -- --reporter=dot` — **27 files, 161 tests passed**.
- Targeted ESLint on Phase 4 paths reports pre-existing `no-explicit-any`, `no-img-element`, and unused-import debt in legacy modal/pay files; these paths are not yet in `lint:ci`.
- `CHROMIUM_PATH=/usr/bin/chromium OUT_DIR=docs/ui-evidence/phase4/before node scripts/phase4-evidence.mjs` — 62 screenshots, **13 serious/critical axe findings**.
- `CHROMIUM_PATH=/usr/bin/chromium OUT_DIR=docs/ui-evidence/phase4/after node scripts/phase4-evidence.mjs` — 62 screenshots, **0 serious/critical axe findings**, 0 console errors, 0 overflow on `/dev/creator-page`.
- Production build: `ENCRYPTION_KEY=local-build-placeholder npm run build -- --webpack` — compiled with a placeholder key; sitemap/featured-creator Firebase-admin errors are pre-existing because no credentials are configured.
- Production Lighthouse 13.6.0 against `npm run start -- -p 3200`:
  - `/dev/creator-page`: 77/98/96/66
  - `/demo/store`: 95/100/96/66
  - `/demo/community`: 94/100/96/66
  - `/demo/store/product-1`: 75/100/96/66
  - `/demo/booking`: 98/100/96/66
  - `/payment`: 85/100/96/66
  - SEO is 66 on these internal preview/demo routes because they are intentionally `noindex`.
  - These numbers were superseded by the corrected production run in the Phase 4 performance validation entry below: `/demo/*` does not exist and the preview flags were omitted.
- Bundle after: 196 files, 4,459 KB raw / 1,396 KB gzip; no like-for-like Phase 4 before build was available.

### Evidence

- Summary and screenshot index: `docs/ui-evidence/phase4/summary.md`.
- Before/after screenshots and axe: `docs/ui-evidence/phase4/before/`, `docs/ui-evidence/phase4/after/`.
- Production Lighthouse JSON: `docs/ui-evidence/phase4/lighthouse-prod/`.
- Dev Lighthouse JSON: `docs/ui-evidence/phase4/lighthouse/`.
- Bundle report: `docs/ui-evidence/phase4/bundle-report.json`.
- Coverage matrix: `docs/REDESIGN_COVERAGE.md`.

### Follow-ups / rollout

1. Add Firebase emulator/seed/test accounts so real creator data, tier access, chat, checkout, and payment callback states can be captured at all four modes.
2. Add a CI budget for serious/critical axe findings and a Lighthouse performance floor for real creator routes once seeded production routes exist.
3. Expand targeted ESLint to `app/(public_profile)`, `app/*/pay`, and `components/parts/public/**` only after clearing the existing `any`/image/unused-import backlog.
4. Convert remaining high-risk modal bodies to `Dialog`/`Sheet` primitives; Phase 4 tokenized them but did not replace all raw buttons/inputs.
5. Unrelated uncommitted dashboard/shell files from earlier phases were intentionally left in the working tree; commit them separately with explicit paths.

### Founder questions

1. Can we get seeded creator, product, tier, booking, giveaway, and payment fixtures (or emulator accounts) for real-route visual verification?
2. Should the remaining public modals be converted to `Dialog`/`Sheet` in the same phase or split into a dedicated overlay-hardening phase?
3. Should the corrected Lighthouse baseline (100 performance, LCP ≤ 1.1 s, TBT 0 ms) become a CI floor once seeded production routes exist?

## 2026-11-18 — Phase 4 performance validation

**Branch:** `design/full-app-redesign`
**Status:** Performance target verified on valid production routes; no application-code performance change was required.

### Done

- Corrected `scripts/phase4-evidence.mjs` route mapping: removed non-existent `/demo/*` targets and pointed `04-route-*` captures at real `/aline/...` route patterns plus payment routes.
- Rebuilt the production bundle with `NEXT_PUBLIC_DEV_CREATOR_PAGE=1`, `NEXT_PUBLIC_DEV_ACTIONS=1`, and `NEXT_PUBLIC_DEV_COMPONENTS=1` so preview routes render instead of `notFound()`.
- Re-captured `docs/ui-evidence/phase4/after/` with the corrected route map: 62 screenshots, 0 serious/critical axe findings, 0 console errors, 0 overflow on `/dev/creator-page`.

### Verification

- Production Lighthouse 13.6.0 from `docs/ui-evidence/phase4/lighthouse-prod-v2/`:
  - `/dev/creator-page`: 100/100/96/66, LCP 0.9 s, TBT 0 ms, CLS 0.
  - `/dev/actions?open=support`: 100/100/96/66, LCP 0.9 s, TBT 0 ms, CLS 0.
  - `/payment`: 100/100/96/66, LCP 0.9 s, TBT 0 ms, CLS 0.
  - `/aline/store` error state: 100/95/96/66, LCP 1.1 s, TBT 0 ms, CLS 0.
  - `/`: 100/100/92/100, LCP 1.1 s, TBT 0 ms, CLS 0.
- Earlier Lighthouse runs in `docs/ui-evidence/phase4/lighthouse/` and `docs/ui-evidence/phase4/lighthouse-prod/` are superseded: `/demo/*` routes do not exist, and `/dev/creator-page` was measured as a 404 without the production preview flags.
- `node --check scripts/phase4-evidence.mjs` — passed.
- `npm run typecheck`, `npm run lint:ci`, and `npm test -- --reporter=dot` remain passing.

### Evidence

- Corrected summary: `docs/ui-evidence/phase4/summary.md`.
- Corrected Lighthouse JSON: `docs/ui-evidence/phase4/lighthouse-prod-v2/`.
- Corrected after evidence: `docs/ui-evidence/phase4/after/report.json`.

### Follow-ups / rollout

1. Re-run Lighthouse against seeded real creator routes once Firebase emulator/seed data exists; current real-route captures are error states.
2. Consider a CI performance floor using the valid route set and Lighthouse mobile performance ≥ 95 once fixtures are available.

## 2026-11-19 — Phase 5 auth login, onboarding, and verification

**Branch:** `design/full-app-redesign`
**Status:** Login, onboarding, and verification rebuilt with shared primitives and centralized copy. Before/after evidence, axe, Lighthouse, unit tests, and e2e checks pass. Real Firebase auth/upload states still need seed/test accounts; human visual sign-off from screenshots is pending.

### Done

- Rewrote `components/pages/LoginPage.tsx` with tokenized surfaces, centralized auth copy, inline `role="alert"` submit errors, and 44 px legal links; all buttons/links stay in the shared system.
- Added `features/onboarding/` with `useOnboarding`, six guided steps, step progress, validation, review summary, and `sessionStorage` draft persistence under `agaseke_onboarding_draft`; `components/pages/StartPage.tsx` is now a thin wrapper.
- Added `features/verification/` with `useVerification`, a status banner, progress steps, payout/phone cards, skeleton, and local OTP/upload error states; `components/pages/Dashboards/VerifyPage.tsx` is now a thin wrapper with an auth-loading skeleton.
- Added `auth.login`, `onboarding`, `onboarding.title`, and `verification` copy to `lib/i18n/en.ts`; no user-facing strings remain hard-coded in the new flows.
- Added gated `app/dev/auth-onboarding/` and `app/dev/auth-verify/` previews wrapped in `AuthShell`; both are `noindex` and excluded from production navigation.
- Added `scripts/phase5-evidence.mjs`, `tests/unit/phase5-auth.test.tsx`, and `e2e/phase5-auth.spec.ts`; extended `scripts/design-lint.mjs` and `package.json` lint/format globs for Phase 5 paths.
- No Firestore rules, data model, route behavior, payment logic, pricing, fee, or payout behavior changed.

### Verification

- `npm run typecheck` — passed.
- `npm run lint:ci` — passed, including `npm run lint:design` with zero violations.
- `npm test -- --reporter=dot` — **28 files, 168 tests passed**.
- `npx playwright test e2e/phase5-auth.spec.ts e2e/phase2-shells.spec.ts e2e/mobile-routes.spec.ts` — **54/54 passed**.
- `CHROMIUM_PATH=/usr/bin/chromium OUT_DIR=docs/ui-evidence/phase5/before node scripts/phase5-evidence.mjs` — 12 screenshots, **16 serious/critical axe violation entries** (48 affected nodes), 4 preview console errors, 3 small-target findings per login mode.
- `CHROMIUM_PATH=/usr/bin/chromium OUT_DIR=docs/ui-evidence/phase5/after node scripts/phase5-evidence.mjs` — 12 screenshots, **0 serious/critical axe findings**, 0 console errors, 0 overflow, 0 small targets.
- Production Lighthouse 13.6.0 from `docs/ui-evidence/phase5/lighthouse-prod/`:
  - `/login`: 99/100/96/66, LCP 0.9 s, TBT 100 ms, CLS 0.
  - `/dev/auth-onboarding`: 97/100/96/66, LCP 0.9 s, TBT 190 ms, CLS 0.
  - `/dev/auth-verify`: 99/100/96/66, LCP 0.9 s, TBT 110 ms, CLS 0.
  - SEO is 66 on these intentionally `noindex` routes; `/login` improved from Phase 2's 93/100/96/66.
- Bundle after: 201 files, 4,500 KB raw / 1,410 KB gzip in `docs/ui-evidence/phase5/bundle-report.json`; reference-only delta from Phase 4 is +5 files, +41 KB raw, +14 KB gzip.
- All Phase 5 files were formatted individually with Prettier; no commits were made, and unrelated uncommitted dashboard/shell files were left untouched.

### Evidence

- Summary and screenshot index: `docs/ui-evidence/phase5/summary.md`.
- Before/after screenshots and axe: `docs/ui-evidence/phase5/before/`, `docs/ui-evidence/phase5/after/`.
- Production Lighthouse JSON: `docs/ui-evidence/phase5/lighthouse-prod/`.
- Bundle report: `docs/ui-evidence/phase5/bundle-report.json`.
- Coverage matrix update: `docs/REDESIGN_COVERAGE.md`.

### Follow-ups / rollout

1. Capture real `/onboarding` and `/creator/verify` states once Firebase emulator/seed/test accounts and provider sandboxes exist.
2. Complete human visual sign-off from the captured 360×640 and 1280×800 light/dark screenshots.
3. Connect the reserved-handle check and final profile write to the existing server-side claim path before production use.
4. Keep preview routes gated; delete or rotate them only after the founder confirms no external links depend on them.
5. Add CI budgets for zero serious/critical axe findings and Lighthouse mobile performance ≥ 85 on touched auth routes.

### Founder questions

1. Should onboarding resume across devices after sign-in, or is `sessionStorage` draft persistence sufficient for launch?
2. Should verification require document upload in this phase, or ship with the current phone/payout/OTP readiness states only?
3. Can we get seeded auth/creator accounts so the real onboarding and verification routes can replace the gated previews in final evidence?

## 2026-11-19 — Phase 6A creator dashboard core

**Branch:** `design/full-app-redesign`
**Status:** Creator home, payouts, settings, sales, and supporters now use shared primitives and semantic tokens through a gated mock-data preview. Gated axe/Lighthouse/e2e checks pass; real Firebase/auth/money/upload states still need seed/test accounts. Human visual sign-off from screenshots is pending.

### Done

- Polished `features/creator-home/CreatorHome.tsx` with shared `ErrorState`, `Button`, `buttonClasses`, `Card`, and `Badge`; consolidated duplicate share actions into `shareCreatorLink` while preserving the unrendered checklist hrefs.
- Migrated `components/pages/Dashboards/PayoutsPage.tsx` and its empty state to `Button`, `Input`, `Card`, `Tabs`, `StatusScreen`, `Badge`, and a semantic spinner; withdrawal flows and amounts were not changed. Unsafe `AmountInput` migration was skipped.
- Migrated `components/pages/Dashboards/SettingsPage.tsx` to `Tabs`, button/input/select/textarea/form-field primitives, `Switch`, `Card`, `MediaImage`, `Badge`, and `Skeleton`; profile writes, uploads, reference-data loading, and bulk updates were not changed. Unsafe `EmptyState`/`ErrorState`/`Avatar` migrations were skipped.
- Migrated `components/pages/Dashboards/SalesPage.tsx` to `Card`, `Badge`, `Skeleton`, `EmptyState`, `SearchInput`, `Select`, and avatars; money formatting uses the existing `formatCurrency` behavior. Fixed a missing `creator.handle` effect dependency and removed two unused totals.
- Migrated `components/pages/Dashboards/SupportersPage.tsx` and `BroadcastEmailModal.tsx` to shared `Dialog`, form primitives, `SearchInput`, `Select`, `Avatar`, `EmptyState`, `Card`, `Badge`, and `Skeleton`; Firestore subscriptions, profile enrichment, and comms delivery were not changed.
- Added gated `app/dev/creator-core/` with `noindex`, five mock surfaces, and `?dialog=broadcast`; added `scripts/phase6a-evidence.mjs`, `tests/unit/phase6a-creator-core.test.tsx`, and `e2e/phase6a-creator-core.spec.ts`.
- Extended `scripts/design-lint.mjs` and `package.json` lint/format globs for Phase 6A paths. All 7 implementation files have 0 palette/hex/tiny-text/arbitrary-radius matches.
- No Firestore rules, data model, route behavior, payment logic, pricing, fee, payout behavior, or seeded data changed.

### Verification

- `npm run typecheck` — passed.
- `npm run lint:ci` — passed, including `npm run lint:design` with zero violations.
- `npm test -- --reporter=dot` — **29 files, 173 tests passed**.
- `npx playwright test e2e/phase6a-creator-core.spec.ts` — **16/16 passed** across configured mobile projects.
- `npx playwright test e2e/phase5-auth.spec.ts e2e/phase6a-creator-core.spec.ts e2e/phase2-shells.spec.ts e2e/mobile-routes.spec.ts` — **70/70 passed**; server-side Firebase initialization warnings on `/` are pre-existing and did not fail tests.
- `CHROMIUM_PATH=/usr/bin/chromium OUT_DIR=docs/ui-evidence/phase6a/after node scripts/phase6a-evidence.mjs` — 24 screenshots, **0 serious/critical axe findings**, 0 console errors, 0 overflow, 0 small targets.
- Production Lighthouse 13.6.0 from `docs/ui-evidence/phase6a/lighthouse-prod/`:
  - Home: 97/100/96/66, LCP 0.9 s, TBT 200 ms, CLS 0.
  - Payouts: 96/100/96/66, LCP 0.9 s, TBT 250 ms, CLS 0.
  - Settings: 98/100/96/66, LCP 0.9 s, TBT 160 ms, CLS 0.
  - Sales: 96/100/96/66, LCP 0.9 s, TBT 210 ms, CLS 0.
  - Supporters: 100/100/96/66, LCP 0.9 s, TBT 90 ms, CLS 0.
  - SEO is 66 on these intentionally `noindex` preview routes.
- Bundle after: 204 files, 4,530 KB raw / 1,424 KB gzip in `docs/ui-evidence/phase6a/bundle-report.json`; reference-only delta from Phase 5 is +3 files, +30 KB raw, +14 KB gzip.
- All Phase 6A files were formatted individually with Prettier; Phase 5 and Phase 6A were subsequently committed as `e567dc5` and pushed to `origin/design/full-app-redesign` at the user's request.

### Evidence

- Summary and screenshot index: `docs/ui-evidence/phase6a/summary.md`.
- After screenshots and axe: `docs/ui-evidence/phase6a/after/`.
- Production Lighthouse JSON: `docs/ui-evidence/phase6a/lighthouse-prod/`.
- Bundle report: `docs/ui-evidence/phase6a/bundle-report.json`.
- Coverage matrix update: `docs/REDESIGN_COVERAGE.md`.

### Follow-ups / rollout

1. Capture real authenticated creator home/payouts/settings/sales/supporters states once Firebase emulator/seed/test accounts and provider sandboxes exist.
2. Complete human visual sign-off from the captured 360×640 and 1280×800 light/dark screenshots, including the broadcast dialog.
3. Migrate the remaining creator dashboard routes outside Phase 6A; they remain unchecked in `docs/REDESIGN_COVERAGE.md`.
4. Keep the `/dev/creator-core` preview gated; delete or rotate it only after the founder confirms no external links depend on it.
5. Add CI budgets for zero serious/critical axe findings and Lighthouse mobile performance ≥ 85 on touched creator preview routes.

### Founder questions

1. Should the Phase 6A preview remain available after real seeded creator routes are captured?
2. Should the next tranche prioritize creator commerce routes (store/orders/products/coupons) or content/gatherings/giveaways?
3. Can we get seeded auth/creator accounts with real payout and supporter data so the gated preview can be replaced in final evidence?

## 2026-11-19 — Phase 6B creator community and communications

**Branch:** `design/full-app-redesign`
**Status:** Creator community, chat, messages, and notices now use shared primitives and semantic tokens through a gated mock-data preview. Gated axe/Lighthouse/e2e checks pass; real Firebase/auth/tier/chat/notification states still need seed/test accounts. Human visual sign-off from screenshots is pending.

### Done

- Migrated `components/pages/Dashboards/CommunityPage.tsx` to `PageHeader`, `Button`/`IconButton`, `Input`/`Select`/`Textarea`, `Tabs`, `Card`/`EmptyState`, and `Badge`; removed 27 raw palette shades and dead imports.
- Fixed the `defaultCurrency` effect dependency with `defaultCurrencyRef` so Firestore subscriptions are not recreated on the full page's favourites path.
- Migrated `components/parts/community/CommunityChatView.tsx` to `Button`/`IconButton`, `Input`, and `Badge`; skipped the full-bleed image-preview button, hidden file input, in-chat wrapper header, and `Textarea`/`FormField` swaps as unsafe.
- Migrated `components/pages/Dashboards/MessagesPage.tsx` to `Skeleton`, `SearchInput`, `Avatar`, `EmptyState`, `Badge`, `IconButton`/`Button`, and `Input`; removed 20 raw palette shades and 4 tiny-text uses.
- Migrated `components/pages/Dashboards/NoticesPage.tsx` notice rows and dialog body to `Button` and `Card`; existing `PageHeader`/`Badge`/`EmptyState`/`Dialog` usage was preserved.
- Added a shared 48 px minimum width to `components/ui/Tabs.tsx` so narrow filter tabs satisfy 44×44 target sizing.
- Added gated `app/dev/creator-community/` with `noindex`, four mock surfaces, and `?dialog=notice`; added `scripts/phase6b-evidence.mjs`, `tests/unit/phase6b-community.test.tsx`, and `e2e/phase6b-community.spec.ts`.
- Extended `scripts/design-lint.mjs` and `package.json` lint/format globs for Phase 6B implementation and preview paths. All four implementation files have 0 palette/hex/tiny-text/arbitrary-radius matches.
- No Firestore rules, data model, route behavior, payment logic, pricing, fees, payout behavior, messaging/notification delivery, or seeded data changed.

### Verification

- `npm run typecheck` — passed.
- `npm run lint:ci` — passed, including `npm run lint:design` with zero violations.
- `npm test -- --reporter=dot` — **30 files, 179 tests passed**.
- `npx playwright test e2e/phase6b-community.spec.ts` — **14/14 passed** across configured mobile projects.
- `PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test e2e/phase5-auth.spec.ts e2e/phase6a-creator-core.spec.ts e2e/phase6b-community.spec.ts e2e/phase2-shells.spec.ts e2e/mobile-routes.spec.ts --workers=4` — **84/84 passed** after clearing stale `.next` dev artifacts (the first combined run hit a pre-existing Turbopack `/login` compile hang and `net::ERR_ABORTED`; server-side Firebase warnings were unrelated and did not fail tests).
- `CHROMIUM_PATH=/usr/bin/chromium OUT_DIR=docs/ui-evidence/phase6b/after node scripts/phase6b-evidence.mjs` — 20 screenshots, **0 serious/critical axe findings**, 0 console errors, 0 overflow, 0 small targets.
- Production Lighthouse 13.6.0 from `docs/ui-evidence/phase6b/lighthouse-prod/`:
  - Community: 96/100/96/66, LCP 0.9 s, TBT 240 ms, CLS 0.
  - Chat: 95/100/96/66, LCP 0.9 s, TBT 260 ms, CLS 0.
  - Messages: 99/100/96/66, LCP 0.9 s, TBT 150 ms, CLS 0.
  - Notices: 99/100/96/66, LCP 0.9 s, TBT 110 ms, CLS 0.
  - Notice dialog: 98/100/96/66, LCP 0.9 s, TBT 150 ms, CLS 0.
  - SEO is 66 on these intentionally `noindex` preview routes.
- Bundle after: 205 files, 4,594 KB raw / 1,442 KB gzip in `docs/ui-evidence/phase6b/bundle-report.json`; reference-only delta from Phase 6A is +1 file, +64 KB raw, +18 KB gzip.
- Next build emitted the pre-existing protobuf critical-dependency warning plus sitemap/homepage Firebase init warnings because no service account is configured; the production build completed successfully.

### Evidence

- Summary and screenshot index: `docs/ui-evidence/phase6b/summary.md`.
- After screenshots and axe: `docs/ui-evidence/phase6b/after/`.
- Production Lighthouse JSON: `docs/ui-evidence/phase6b/lighthouse-prod/`.
- Bundle report: `docs/ui-evidence/phase6b/bundle-report.json`.
- Coverage matrix update: `docs/REDESIGN_COVERAGE.md`.

### Follow-ups / rollout

1. Capture real authenticated community/chat/messages/notices states once Firebase emulator/seed/test accounts exist.
2. Complete human visual sign-off from the captured 360×640 and 1280×800 light/dark screenshots, including the notice dialog.
3. Keep the `/dev/creator-community` preview gated; delete or rotate it only after the founder confirms no external links depend on it.
4. Re-check the shared `CommunityPage`/`CommunityChatView` usage on public `[username]` routes with seeded tier/message data.
5. Migrate the remaining creator dashboard routes outside Phase 6B; they remain unchecked in `docs/REDESIGN_COVERAGE.md`.

### Founder questions

1. Should the Phase 6B preview remain available after real seeded creator routes are captured?
2. Should the next tranche prioritize creator commerce routes (store/orders/products/coupons) or content/gatherings/giveaways?
3. Can we get seeded creator/community accounts with tier membership, live chat, messages, and notices so the gated preview can be replaced in final evidence?
