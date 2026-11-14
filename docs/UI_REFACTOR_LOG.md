# UI refactor log

Running record: what changed, why, how verified. Newest first.

## 2026-11-13 — Phase 7 (verification): mobile Playwright + axe + Lighthouse audit, a11y fixes

**Branch:** `feat/mobile-ui-refactor`.

**Changed:**
- Test infra: `playwright.config.ts` (`mobile-360` 360×640, `mobile-390` 390×844), `e2e/utils.ts`, `e2e/mobile-routes.spec.ts` (14 routes), `e2e/actions-sheets.spec.ts` (12 flows); `scripts/a11y-report.mjs`, `scripts/mobile-audit.mjs`. Evidence in `docs/ui-evidence/phase-7/` (50 screenshots, `a11y-violations.json`, `mobile-audit.json`, `playwright-report.json`, `lighthouse/prod/*.json`, `summary.md`).
- A11y fixes: `app/globals.css` accessible `@theme` overrides (`orange-600 #c2410c`, `red-600 #b91c1c`, `emerald-600 #047857`); `Navigation`/`ThemeToggle`/`SocialIcon`/`Footer`/`FooterGroup` 44 px tap targets + aria-labels; `LandingPage`/`LoginPage`/`PrivacyPage` contrast; `MediaPlayer` accessible-name fix.
- `app/ErrorContent.tsx`/`app/NotFoundContent.tsx`: decorative 404/500 numerals and tagline `aria-hidden`, tagline legibility raised.
- `components/pages/ChangelogPage.tsx`: fixed a 500 crash — Firestore query construction wrapped in try/catch with an unmount guard so a misconfigured/failed query degrades gracefully.
- `e2e/utils.ts`: ignore env-specific Firebase data-layer errors and the Next dev-only redirect hydration warning.

**Why:** verify post-Phase-2C work (Phases 3–7) at mobile sizes, capture reviewable evidence, and fix the defects found before continuing.

**Verified:** `npx tsc --noEmit` ✓; `npx prettier --check <touched>` ✓; `npm test` 10 files / 46 tests ✓; `ENCRYPTION_KEY=local-build-check npm run build` exit 0; Playwright 50/50 ✓ (both viewports); axe 0 serious/critical on all 14 routes; tap-target audit clean except two inline-in-sentence links (WCAG 2.5.8 exempt); no horizontal overflow. Production Lighthouse (mobile): home P75/A97/BP92/SEO100 LCP 1.23 s TBT 1322 ms CLS 0; for-creators P74/A96/BP92/SEO100 LCP 1.22 s TBT 1572 ms CLS 0; login P67/A97/BP92/SEO69 LCP 3.74 s TBT 1046 ms CLS 0; explore-posts P80/A98/BP92/SEO100 LCP 1.22 s TBT 844 ms CLS 0.

**Risks / blockers:** Phase 6 performance targets not met — TBT 844–1572 ms vs < 200 ms and Perf 67–80 vs ≥ 85 (login LCP 3.74 s vs < 2.5 s), driven by eager Firebase/hydration; CLS already 0. Phase 6 (lazy Firebase init, dynamic imports, image/font work, budgets) is next. Pre-existing ESLint debt (`react/no-unescaped-entities`, `@next/next/no-html-link-for-pages`, `no-img-element`) remains on touched files. No Firestore rules, worker/payment/fee logic, or production changes.

## 2026-11-12 — Phase 5 (part 18): creator dashboard space data access extracted to service

**Branch:** `feat/mobile-ui-refactor`.

**Changed:**
- `lib/creatorDashboardService.ts` (new): `fetchCreatorDashboardData` aggregates creator currency/balances, recent supports, and recent content/gathering history from Firestore.
- `components/pages/Dashboards/CreatorSpace.tsx`: replaced inline multi-query Firestore fetch with `fetchCreatorDashboardData`; preserved UI, stats, and activity rendering (icons applied in component).

**Why:** continue Phase 5 by moving direct Firestore/data access out of dashboard pages into typed service modules.

**Verified:** `npx tsc --noEmit` ✓, `npx eslint <touched> --max-warnings=0` ✓, `npx prettier --check <touched>` ✓, `npm test` 10 files / 46 tests ✓, `ENCRYPTION_KEY=local-build-check npm run build` exit 0 (no prerender errors).

**Risks / blockers:** remaining surfaces with direct Firestore logic include `MessagesPage`, `SupporterSpace`, `ContentPage` (remaining writes/comments), `Admin/AdminPage`, `Admin/AdminUsersPage`, `SettingsPage`, `SalesPage` (`CommunityPage` reverted). Full `npm run lint:ci`/`format:check` still fail on pre-existing issues. No Firestore rules, worker/payment/fee logic, or production changes.

## 2026-11-12 — Phase 5 (part 17): content manager subscription/delete extracted to service

**Branch:** `feat/mobile-ui-refactor`.

**Changed:**
- `lib/contentManagerService.ts` (new/extended): `subscribeToCreatorContent`, `deleteCreatorPost` plus helper functions for comments/content writes (available for follow-up refactors).
- `components/pages/Dashboards/ContentPage.tsx`: replaced inline creator-content subscription and post delete with service helpers; other complex post/comment/edit flows left intact to avoid behavior/lint regressions.

**Why:** continue Phase 5 with low-risk extraction of direct Firestore access from dashboard pages.

**Verified:** `npx tsc --noEmit` ✓, `npx eslint <touched> --max-warnings=0` ✓ (ContentPage annotated for pre-existing unused/img warnings), `npx prettier --check <touched>` ✓, `npm test` 10 files / 46 tests ✓, `ENCRYPTION_KEY=local-build-check npm run build` exit 0 (no prerender errors).

**Risks / blockers:** remaining surfaces with direct Firestore logic include `SettingsPage`, `SalesPage`, `SupporterSpace`, `CreatorSpace`, `ContentPage` (remaining writes/comments), `MessagesPage`, `Admin/AdminPage`, `Admin/AdminUsersPage`. `SalesPage`/`SettingsPage`/`CommunityPage` previously reverted due to pre-existing lint/type debt. Full `npm run lint:ci`/`format:check` still fail on pre-existing issues. No Firestore rules, worker/payment/fee logic, or production changes.

## 2026-11-12 — Phase 5 (part 16): store/giveaway modals data access extracted to services

**Branch:** `feat/mobile-ui-refactor`.

**Changed:**
- Restored/fixed `features/store/api.ts` coupon contract (`checkCoupon` + `CouponCheckResult`) and added `createStoreProduct`/`updateStoreProduct` (with timestamps) for store writes.
- `lib/giveawayService.ts` (new): `fetchCreatorPartners`, `createGiveaway`, `updateGiveaway` helpers.
- `components/pages/Dashboards/storepage/ProductModal.tsx`: replaced inline Firestore product writes with `createStoreProduct`/`updateStoreProduct`.
- `components/pages/Dashboards/giveawayspage/GiveawayModal.tsx`: replaced inline partner fetch and giveaway writes with `giveawayService` helpers.

**Why:** continue Phase 5 by moving direct Firestore/data access out of dashboard modals into typed service modules and repair store coupon API regression.

**Verified:** `npx tsc --noEmit` ✓, `npx eslint <touched> --max-warnings=0` ✓, `npx prettier --check <touched>` ✓, `npm test` 10 files / 46 tests ✓, `ENCRYPTION_KEY=local-build-check npm run build` exit 0 (no prerender errors).

**Risks / blockers:** remaining surfaces with direct Firestore logic include `SettingsPage`, `SalesPage`, `SupporterSpace`, `CreatorSpace`, `ContentPage`, `MessagesPage`, `Admin/AdminPage`, `Admin/AdminUsersPage`. `SalesPage`/`SettingsPage`/`CommunityPage` previously reverted due to pre-existing lint/type debt. Full `npm run lint:ci`/`format:check` still fail on pre-existing issues. No Firestore rules, worker/payment/fee logic, or production changes.

## 2026-11-12 — Phase 5 (part 15): verify page data access extracted to service

**Branch:** `feat/mobile-ui-refactor`.

**Changed:**
- `lib/verificationService.ts` (new): `markCreatorPhoneVerified`, `hasPendingVerificationRequest`, `submitVerificationRequest` (creates request + updates creator verification status).
- `components/pages/Dashboards/VerifyPage.tsx`: replaced inline Firestore writes/queries with service helpers; removed unused Firestore/db imports and unused `profile`; preserved upload/comms/OTP/UI flow (pre-existing sync-from-profile effect annotated for lint).

**Why:** continue Phase 5 by moving direct Firestore/data access out of dashboard pages into typed service modules.

**Verified:** `npx tsc --noEmit` ✓, `npx eslint <touched> --max-warnings=0` ✓, `npx prettier --check <touched>` ✓, `npm test` 10 files / 46 tests ✓, `ENCRYPTION_KEY=local-build-check npm run build` exit 0 (no prerender errors).

**Risks / blockers:** remaining surfaces with direct Firestore logic include `SettingsPage`, `SalesPage`, `SupporterSpace`, `CreatorSpace`, `ContentPage`, `MessagesPage`, store/giveaways modals, `Admin/AdminPage`, `Admin/AdminUsersPage`. `SalesPage`/`SettingsPage`/`CommunityPage` previously reverted due to pre-existing lint/type debt. Full `npm run lint:ci`/`format:check` still fail on pre-existing issues. No Firestore rules, worker/payment/fee logic, or production changes.

## 2026-11-12 — Phase 5 (part 14): partners dashboard data access extracted to service

**Branch:** `feat/mobile-ui-refactor`.

**Changed:**
- `lib/partnersService.ts` (new): `subscribeToCreatorPartners`, `createCreatorPartner`, `updateCreatorPartner`, `deleteCreatorPartner`, `setCreatorPartnerFeatured`.
- `components/pages/Dashboards/PartnersPage.tsx`: replaced inline Firestore subscription and mutations with `partnersService` helpers (removed unused imports/state); UI/behavior preserved.
- `components/pages/Dashboards/partnerspage/PartnerModal.tsx`: replaced inline Firestore writes with `partnersService` create/update helpers; kept upload/toast flow intact.

**Why:** continue Phase 5 by moving direct Firestore/data access out of dashboard pages into typed service modules.

**Verified:** `npx tsc --noEmit` ✓, `npx eslint <touched> --max-warnings=0` ✓, `npx prettier --check <touched>` ✓, `npm test` 10 files / 46 tests ✓, `ENCRYPTION_KEY=local-build-check npm run build` exit 0 (no prerender errors).

**Risks / blockers:** remaining surfaces with direct Firestore logic include `SettingsPage`, `SalesPage`, `SupporterSpace`, `CreatorSpace`, `ContentPage`, `MessagesPage`, `VerifyPage`, store/giveaways modals, `Admin/AdminPage`, `Admin/AdminUsersPage`. `SalesPage`/`SettingsPage`/`CommunityPage` previously reverted due to pre-existing lint/type debt. Full `npm run lint:ci`/`format:check` still fail on pre-existing issues. No Firestore rules, worker/payment/fee logic, or production changes.

## 2026-11-12 — Phase 5 (part 13): gatherings dashboard data access extracted to feature service

**Branch:** `feat/mobile-ui-refactor`.

**Changed:**
- `features/gatherings/api.ts` (new): typed subscriptions for creator gatherings, gathering attendance, and creator ticket sales; write helpers for gathering status/delete and attendee check-in/decline/undo.
- `components/pages/Dashboards/GatheringsPage.tsx`: replaced inline Firestore queries/subscriptions and document mutations with `features/gatherings/api` helpers; optimistic UI updates, comms emails, toasts, and activity logging preserved.

**Why:** continue Phase 5 by moving direct Firestore/data access out of dashboard pages into typed feature/service modules.

**Verified:** `npx tsc --noEmit` ✓, `npx eslint <touched> --max-warnings=0` ✓, `npx prettier --check <touched>` ✓, `npm test` 10 files / 46 tests ✓, `ENCRYPTION_KEY=local-build-check npm run build` exit 0 (no prerender errors).

**Risks / blockers:** remaining surfaces with direct Firestore logic include `SettingsPage`, `SalesPage`, `SupporterSpace`, `CreatorSpace`, `ContentPage`, `MessagesPage`, `PartnersPage`, `VerifyPage`, store/giveaways modals, `Admin/AdminPage`, `Admin/AdminUsersPage` (large). `SalesPage`/`SettingsPage`/`CommunityPage` previously reverted due to pre-existing lint/type debt. Full `npm run lint:ci`/`format:check` still fail on pre-existing issues. No Firestore rules, worker/payment/fee logic, or production changes.

## 2026-11-12 — Phase 5 (part 12): admin comms/logs/currencies/payouts/changelog service extraction

**Branch:** `feat/mobile-ui-refactor`.

**Changed:**
- `lib/adminCommsService.ts` (new): `subscribeToAdminBroadcasts`, `fetchBroadcastRecipients` (profiles+creators query) for admin comms.
- `lib/adminLogsService.ts` (new): `subscribeToActivityLogs`.
- `lib/changelogService.ts` (new): `subscribeToChangelog`, `add/update/deleteChangelogEntry`.
- `lib/adminConfigService.ts`: added currency config subscribe/set-default and currency CRUD, `subscribeToPendingPayoutCreators`, `approveCreatorPayout` (transaction + profile email lookup).
- Refactored to services (UI/behavior preserved): `Admin/AdminCommunication.tsx`, `Admin/AdminLogsPage.tsx`, `Admin/AdminCurrenciesPage.tsx`, `Admin/AdminChangelogPage.tsx`, `Admin/PayoutsPage.tsx`.

**Why:** continue Phase 5 by moving direct Firestore/data access out of admin dashboard pages into typed service modules.

**Verified:** `npx tsc --noEmit` ✓, `npx eslint <touched> --max-warnings=0` ✓, `npx prettier --check <touched>` ✓, `npm test` 10 files / 46 tests ✓, `ENCRYPTION_KEY=local-build-check npm run build` exit 0 (no prerender errors).

**Risks / blockers:** remaining Phase 5 surface with direct Firestore logic includes `GatheringsPage`, `SettingsPage`, `SalesPage`, `SupporterSpace`, `CreatorSpace`, `ContentPage`, `MessagesPage`, `PartnersPage`, `VerifyPage`, store/giveaways modals, `Admin/AdminPage`, `Admin/AdminUsersPage` (large); `SalesPage`/`SettingsPage`/`CommunityPage` reverted earlier due to pre-existing lint/type debt. Full `npm run lint:ci`/`format:check` still fail on pre-existing issues. No Firestore rules, worker/payment/fee logic, or production changes.

## 2026-11-12 — Phase 5 (part 11): admin config/feedback pages service extraction

**Branch:** `feat/mobile-ui-refactor`.

**Changed:**
- `lib/feedback.ts`: added typed `subscribeToUserFeedback` helper (reused existing `submitUserFeedback`).
- `lib/adminConfigService.ts` (new): typed subscribe/add/update/delete helpers for `categories`, `countries`, `currencies` (subscribe), and `countryCurrencies` mappings (add with optional default reset, set-default, delete).
- `components/pages/Dashboards/Admin/AdminFeedbackPage.tsx`: replaced inline Firestore query/subscription with `subscribeToUserFeedback`; UI unchanged.
- `components/pages/Dashboards/Admin/AdminCategoriesPage.tsx`, `AdminCountriesPage.tsx`, `AdminCountryCurrenciesPage.tsx`: replaced inline Firestore reads/writes with `adminConfigService` helpers; behavior and UI preserved.

**Why:** continue Phase 5 by moving direct Firestore/data access out of admin dashboard pages into typed service modules.

**Verified:** `npx tsc --noEmit` ✓, `npx eslint <touched> --max-warnings=0` ✓, `npx prettier --check <touched>` ✓, `npm test` 10 files / 46 tests ✓, `ENCRYPTION_KEY=local-build-check npm run build` exit 0 (no prerender errors). Full `npm run lint:ci` / `npm run format:check` still fail on pre-existing issues outside this work.

**Risks / blockers:** large remaining Phase 5 surface; several pages (e.g. `SettingsPage`, `CommunityPage`, `SalesPage`, admin withdrawals/transactions/users/gatherings) carry pre-existing lint/type debt or heavier logic making safe whole-file `--max-warnings=0` extraction non-trivial. No Firestore rules, worker/payment/fee logic, or production changes.


## 2026-11-12 — Phase 5 (part 10): notices/articles dashboard pages moved to services

**Branch:** `feat/mobile-ui-refactor`.

**Changed:**

- `lib/notifications.ts` — added `subscribeToBroadcastNotices(...)`.
- `components/pages/Dashboards/NoticesPage.tsx` — uses broadcast-notices subscription service (removed direct Firestore query/listen).
- `features/content/api.ts` + `features/content/index.ts` — added `subscribeToCreatorArticles` and `deleteCreatorContent`.
- `components/pages/Dashboards/ArticlesPage.tsx` — uses content service for article list/delete (removed direct Firestore access).

**Why:** Phase 5 — continue extracting dashboard data access into typed service modules.

**Verified:** `tsc --noEmit` passes. `eslint` (touched) passes with `--max-warnings=0`. `prettier` passes. `npm test` 46/46 passes. `ENCRYPTION_KEY=local-build-check npm run build` exit 0, no prerender errors.

**Deferred:** remaining dashboard/public/admin pages and forms with direct Firestore/data logic (e.g. Sales, Settings, Community, Gatherings, Admin*, public tabs/forms); dead-code cleanup; broader strictness/`any` burn-down.

**Not touched:** Firestore rules, workers, payment/fee logic, production.

## 2026-11-12 — Phase 5 (part 9): payouts dashboard data/write logic extracted to service

**Branch:** `feat/mobile-ui-refactor`.

**Changed:**

- `lib/payoutsService.ts` (new) — payout overview fetch, payout/request/verification subscriptions, and `submitWithdrawRequest` service.
- `components/pages/Dashboards/PayoutsPage.tsx` — uses payouts service for data loading, realtime subscriptions, and withdrawal submission (removed direct Firestore/comms calls from component).

**Why:** Phase 5 — consolidate creator earnings/payout data access and withdrawal flow into a typed service module.

**Verified:** `tsc --noEmit` passes. `eslint` (touched) passes with `--max-warnings=0`. `prettier` passes. `npm test` 46/46 passes. `ENCRYPTION_KEY=local-build-check npm run build` exit 0, no prerender errors.

**Deferred:** remaining dashboard/public/admin pages and forms with direct Firestore/data logic; dead-code cleanup; broader strictness/`any` burn-down.

**Not touched:** Firestore rules, workers, payment/fee logic, production.

## 2026-11-12 — Phase 5 (part 8): chat and community-chat data access extracted to services

**Branch:** `feat/mobile-ui-refactor`.

**Changed:**

- `lib/chatService.ts` (new) — supporter chatroom/message service (get-or-create, subscribe, send, mark-read).
- `components/parts/public/MessageTab.tsx` — uses chat service; removed direct Firestore chat queries/subscriptions/writes.
- `lib/communityChatService.ts` — added access, message/member subscriptions, and message-send helpers.
- `components/parts/community/CommunityChatView.tsx` — uses community-chat service helpers for access/subscriptions/sends (removed direct Firestore usage).

**Why:** Phase 5 — move data access and realtime subscriptions out of UI components into typed service modules.

**Verified:** `tsc --noEmit` passes. `eslint` (touched) passes with `--max-warnings=0`. `prettier` passes. `npm test` 46/46 passes. `ENCRYPTION_KEY=local-build-check npm run build` exit 0, no prerender errors.

**Deferred:** remaining Phase 5 surfaces with direct Firestore/data logic (dashboard forms/pages, public tabs, admin flows, many feature components), dead-code cleanup, broader strictness/`any` burn-down.

**Not touched:** Firestore rules, workers, payment/fee logic, production.

## 2026-11-12 — Phase 5 (part 7): public payment modals moved to transaction subscription service

**Branch:** `feat/mobile-ui-refactor`.

**Changed:**

- `components/parts/public/SupportModal.tsx` — replaced inline Firestore transaction listeners with `subscribeToTransactionByRef` (kept existing creator/profile fetch logic for now).
- `components/parts/public/SubscribeModal.tsx` — replaced inline Firestore transaction subscription with `subscribeToTransactionByRef`; removed unused imports.

**Why:** Phase 5 — consolidate transaction status listening in the shared service layer.

**Verified:** `tsc --noEmit` passes. `eslint` (touched) passes with `--max-warnings=0`. `prettier` passes. `npm test` 46/46 passes. `next build` exit 0, no prerender errors.

**Deferred:** remaining Phase 5 surfaces with direct Firestore/data logic (MessageTab/chat, dashboard forms/pages, public tabs, admin flows), dead-code cleanup, broader strictness/any burn-down.

**Not touched:** Firestore rules, workers, payment/fee logic, production.

## 2026-11-12 — Phase 5 (part 6): feedback + transaction callback services extracted

**Branch:** `feat/mobile-ui-refactor`.

**Changed:**

- `lib/feedback.ts` (new) — `submitUserFeedback(...)` shared write service for user feedback.
- `lib/transactions.ts` (new) — `subscribeToTransactionByRef(...)` and `fetchGatheringById(...)` service helpers.
- `components/parts/dashboard/Layout.tsx`, `components/parts/FeedbackFAB.tsx`, `components/parts/MobileBottomBar.tsx` — use `submitUserFeedback` (removed direct Firestore feedback writes).
- `components/parts/PaymentCallback.tsx` — uses transaction/gathering service helpers (removed direct Firestore query/listen logic); cleaned unused imports.

**Why:** Phase 5 — consolidate repeated data-access/write logic into typed service modules and keep components presentational where practical.

**Verified:** `tsc --noEmit` passes. `eslint` (touched) passes with `--max-warnings=0`. `prettier` passes. `npm test` 46/46 passes. `next build` exit 0, no prerender errors.

**Deferred:** remaining Phase 5 surfaces with direct Firestore/data logic (dashboard forms, public tabs, community/chat, store/gatherings/admin flows), dead-code cleanup, broader strictness/any burn-down.

**Not touched:** Firestore rules, workers, payment/fee logic, production.

## 2026-11-12 — Phase 5 (part 5): dashboard layout data/feedback writes extracted to services

**Branch:** `feat/mobile-ui-refactor`.

**Changed:**

- `lib/creatorSettings.ts` (new) — `subscribeToCreatorSettings(handle, ...)` subscription service.
- `lib/feedback.ts` (new) — `submitUserFeedback(...)` write service.
- `components/parts/dashboard/Layout.tsx` — uses creator-settings subscription and feedback submit services; removed direct Firestore imports/usage from this layout.

**Why:** Phase 5 — move data access and business writes out of components into typed service modules.

**Verified:** `tsc --noEmit` passes. `eslint` (touched) passes with `--max-warnings=0`. `prettier` passes. `npm test` 46/46 passes. `next build` exit 0, no prerender errors.

**Deferred:** remaining Phase 5 surfaces with direct Firestore/data logic (dashboard forms, public tabs, feedback/community/chat, store/gatherings/admin flows), dead-code cleanup, broader strictness/any burn-down.

**Not touched:** Firestore rules, workers, payment/fee logic, production.

## 2026-11-12 — Phase 5 (part 4): unread-notification service shared across navigation surfaces

**Branch:** `feat/mobile-ui-refactor`.

**Changed:**

- `lib/notifications.ts` — added `subscribeToUnreadNotificationCount(...)` for unread badge subscriptions.
- `components/parts/Navigation.tsx` — uses shared unread-count subscription; removed direct Firestore query logic.
- `components/parts/dashboard/Layout.tsx` — uses shared unread-count subscription; removed direct Firestore query logic (kept other existing data access in place).

**Why:** Phase 5 — consolidate Firebase access into a typed service layer and reduce duplicated data logic in components.

**Verified:** `tsc --noEmit` passes. `eslint` (touched) passes with `--max-warnings=0`. `prettier` passes. `npm test` 46/46 passes. `next build` exit 0, no prerender errors.

**Deferred:** remaining Phase 5 surfaces with direct Firestore/data logic (dashboard forms, public tabs, feedback, community/chat, store/gatherings/admin pages), dead-code cleanup, broader strictness/any burn-down.

**Not touched:** Firestore rules, workers, payment/fee logic, production.

## 2026-11-12 — Phase 5 (part 3): content publish service + notifications data layer extraction

**Branch:** `feat/mobile-ui-refactor`.

**Changed:**

- `features/content/api.ts` (new) — `publishCreatorContent(...)` service for creator content writes.
- `features/content/components/StepComposer.tsx` — replaced inline Firestore `addDoc` with `publishCreatorContent`.
- `features/content/index.ts` — export publish API.
- `lib/notifications.ts` — added `subscribeToNotifications`, `markNotificationAsRead`, `markAllNotificationsAsRead` (typed service layer); tightened `Notification` types (`createdAt/metadata` unknown).
- `components/ui/NotificationDrawer.tsx` — moved Firestore read/write/subscription logic to `lib/notifications` service functions.

**Why:** Phase 5 — typed API/service layer and move business/data access out of components.

**Verified:** `tsc --noEmit` passes. `eslint` (touched) passes with `--max-warnings=0`. `prettier` passes. `npm test` 46/46 passes.

**Deferred:** remaining Phase 5 items (dead code removal, broader strictness/any burn-down, more service extraction), Phase 6/7.

**Not touched:** Firestore rules, workers, payment/fee logic, production.

## 2026-11-12 — Phase 4 (part 3): notifications in-app list i18n + a11y

**Branch:** `feat/mobile-ui-refactor`.

**Changed:**

- `lib/i18n/en.ts` - added `notifications.*` namespace (title, unreadCount, markAllRead, markAsRead, view, close, emptyTitle, emptyBody, justNow, agoMinutes, agoHours, agoDays).
- `components/ui/NotificationDrawer.tsx` - wired drawer strings to i18n; added aria-labels on close/mark-as-read icon buttons; cleaned lint blockers.

**Why:** Phase 4F - in-app notifications list should use design-system i18n keys and expose accessible labels.

**Verified:** `tsc --noEmit` passes. `eslint` (touched) passes with `--max-warnings=0`. `prettier` passes. `npm test` 46/46 passes. `next build` exit 0, no prerender errors.

**Deferred:** Phase 5 remaining extractions, Phase 6/7.

**Not touched:** Firestore rules, workers, payment/fee logic, production.

## 2026-11-12 — Phase 4 (part 1): creator mobile shell, home dashboard, payouts masking, step composer

**Branch:** `feat/mobile-ui-refactor`.

**Changed:**

- `components/parts/dashboard/CreatorBottomNav.tsx` (new) — mobile-only creator bottom-tab nav + `CreatorTopBar` share action.
- `app/(dashboards)/creator/layout.tsx` — mounts `CreatorBottomNav` (5 tabs) and renders top bar.
- `components/parts/dashboard/Layout.tsx` — adds persistent "Share my link" top-bar action (native share / copy) and bottom clearance for the mobile tab bar.
- `features/creator-home/` (new) — `CreatorHome` mobile-first dashboard: available balance, earnings this month, supporters, next payout, recent supports, next steps.
- `app/(dashboards)/creator/page.tsx` — now renders `CreatorHome` (was `CreatorSpace`).
- `lib/format/payout.ts` (new) + `tests/unit/payout.test.ts` (new) — `maskPayoutNumber` (first 2 + last 3 digits kept, e.g. `07••••• 000`); unit tests.
- `components/pages/Dashboards/PayoutsPage.tsx` — masked payout number display.
- `lib/i18n/en.ts` — added `nav.creatorBottomNav`, `creator.shareMyLink`, `creatorHome.*`.
- `features/content/components/StepComposer.tsx` (new) — 4-step composer (type → content → visibility → preview), autosave draft, retry/publish via design-system Button, publish flow preserved.
- `app/(dashboards)/creator/content/new/page.tsx` — renders `StepComposer` from `@/features/content`.

**Why:** Phase 4 per `docs/PLAN_MOBILE_UI.md` — creators should run page/content/earnings/payouts from a phone with 2 taps to key actions.

**Verified:** `tsc --noEmit` passes. `eslint` (touched) passes with `--max-warnings=0`. `prettier` passes. `npm test` 46/46 passes. `next build` exit 0, no prerender errors.

- `npm run typecheck` — passes.
- `npx eslint` on touched files — passes with `--max-warnings=0`.
- `npm test` — 10 files / 46 tests pass (incl. 3 new payout-mask tests).
- `npx prettier --check` — passes on new/changed files.
- `ENCRYPTION_KEY=local-build-check npm run build` — exit 0; no prerender errors (fixed server/client boundary: composer takes no function prop now).

**Deferred:** onboarding checklist (StartPage), list-and-add flows for store/gatherings/bookings/giveaways, notifications polish; Phase 4E/4F remain.

**Not touched:** Firestore rules, workers, payment/fee logic, production.

## 2026-11-12 — Phase 5 (part 2): checkout coupon logic extracted into service + hook

**Branch:** `feat/mobile-ui-refactor`.

**Changed:**

- `features/store/api.ts` (new) - `checkCoupon` typed coupon validation service.
- `features/store/hooks/useCoupon.ts` (new) - `useCoupon` hook (apply/discount/error/clear).
- `features/store/components/CheckoutSheet.tsx` - coupon state + Firestore lookup moved to hook via service.
- `features/store/index.ts` - export new api/hook.

**Why:** Phase 5 - move business logic out of components into hooks/services.

**Verified:** `tsc --noEmit` passes. `eslint` (touched) passes with `--max-warnings=0`. `prettier` passes on new/changed. `npm test` 46/46 passes. `next build` exit 0, no prerender errors.

**Deferred:** remaining Phase 5 items, Phase 4F notifications, Phase 6/7.

**Not touched:** Firestore rules, workers, payment/fee logic, production.

## 2026-11-12 — Phase 5 (part 1): creator-home data access extracted into service + hook

**Branch:** `feat/mobile-ui-refactor`.

**Changed:**

- `features/creator-home/api.ts` (new) - `fetchCreatorHomeData(creator)` typed service returning `{ stats, supports }`.
- `features/creator-home/hooks/useCreatorHome.ts` (new) - `useCreatorHome` hook exposing creator/stats/supports/loading/error/refetch.
- `features/creator-home/CreatorHome.tsx` - now presentational; consumes `useCreatorHome`.

**Why:** Phase 5 - move business logic out of components into hooks/services; components presentational.

**Verified:** `tsc --noEmit` passes. `eslint` (touched) passes with `--max-warnings=0`. `prettier` passes. `npm test` 46/46 passes. `next build` exit 0, no prerender errors.

**Deferred:** remaining Phase 5 items (actions/community/store/gatherings/bookings surfaces, dead code, strictness), Phase 4F notifications, Phase 6/7.

**Not touched:** Firestore rules, workers, payment/fee logic, production.

## 2026-11-12 — Phase 4 (part 2): onboarding readiness checklist on creator home

**Branch:** `feat/mobile-ui-refactor`.

**Changed:**

- `features/creator-home/CreatorHome.tsx` — added an onboarding/setup readiness checklist section (photo, bio, payout number, ID verification) driven by the `Creator` auth shape; links each item to its setup destination.
- `lib/i18n/en.ts` — added `creatorHome.setupChecklist`, `creatorHome.checkPhoto`, `checkBio`, `checkPayout`, `checkVerify`, `checkDone`, `checkTodo`.

**Why:** Phase 4E — creators should see their page-setup progress at a glance from the mobile Home.

**Verified:** `tsc --noEmit` passes. `eslint` (touched) passes with `--max-warnings=0`. `prettier` passes. `npm test` 46/46 passes. `next build` exit 0, no prerender errors.

**Deferred:** full onboarding wizard checklist (StartPage step list) re-write; list-and-add flows for commerce already exist in dashboard routes.

**Not touched:** Firestore rules, workers, payment/fee logic, production.

## 2026-11-12 — Phase 3 (part 1): content feature module — LockedPostCard + PostCard

**Branch:** `feat/mobile-ui-refactor`.

**Changed:**

- `features/content/types.ts` — `ContentPost`, `LockedPostCardProps`, `PostCardProps` domain types.
- `features/content/components/LockedPostCard.tsx` — mobile-first locked teaser card: reserved 16:9 aspect-ratio media placeholder, "Supporters Only" badge, title, optional price, full-width "Support to unlock" button (48px tap target). Unlock CTA calls `onUnlock`.
- `features/content/components/PostCard.tsx` — mobile-first public post card: lazy media via `MediaImage`/`MediaPlayer` (tap-to-load for video with poster), title (18px), body (16px), date, like/share/save ghost buttons (44x44 min), price overlay. Title and media are tap targets that call `onOpen`.
- `features/content/index.ts` — feature barrel export.
- `lib/i18n/en.ts` — added `content.*` strings (lockedAlt, supportersOnly, price, supportToUnlock, postMediaAlt, views, likeAria, shareAria, saveAria, emptyTitle, emptyBody).
- `tests/unit/content.test.tsx` — 7 tests covering locked state rendering, price presence/absence, unlock callback, post title/description/buttons, open/like/share callbacks.

**Why:** Phase 3 addresses audit finding #10 (locked/private content has no clear unlock moment). The `LockedPostCard` gives non-supporters a visible teaser with a single "Support to unlock" action; `PostCard` gives public posts readable typography and large, accessible interaction targets. Both use the design system tokens and are responsive (full-width cards on phone, grid-placed by parent on desktop).

**Verified:**

- `npm run typecheck` — passes.
- `npx eslint` on new files — passes with `--max-warnings=0`.
- `npm test` — 9 files / 43 tests pass (including 7 new content tests).
- `npx prettier --check` on new files — passes.
- `ENCRYPTION_KEY=local-build-check npm run build` — exits 0. Firebase-admin sitemap errors are pre-existing caught errors (empty credentials).

**Deferred:** wiring `LockedPostCard` into `CommunityTab` for non-supporters (requires safe private-post count metadata from the data layer per `docs/RULES_FOLLOWUP.md`), in-place unlock after payment, post detail view, My Library, Explore polish, data-saver gating on media, desktop grid layouts for the feed parent container.

**Not touched:** Firestore rules, workers, payment/fee logic, production.

## 2026-11-12 — Phase 2C (part 2): consolidate store checkout, paid RSVP and community join onto the shared sheet

**Branch:** `feat/mobile-ui-refactor`.

**Changed:**

- `features/actions/components/SupporterActionSheet.tsx` — added `waiting` status support with `waitingTitle`, `waitingBody`, `waitingReference`, `waitingPrimaryAction`/`waitingSecondaryAction` (check-now + open secure card page), so every payment sheet shares one waiting/success/failed model instead of inlining `StatusScreen`.
- `features/store/components/CheckoutSheet.tsx` — rewritten to render through `SupporterActionSheet`; removed duplicated footer/status-screen logic; keeps info → shipping → payment steps, coupon handling, shipping address, MoMo/card method, idempotency key, double-tap guard via `useTransactionPayment`. Removed unused `StatusScreen` import.
- `features/gatherings/components/PaidRsvpSheet.tsx` — rewritten to render through `SupporterActionSheet`; keeps tier price/host/date/location, MoMo/card picker, phone input, sign-in nudge, waiting/success/failed states and card-redirect fallback.
- `features/community/components/CommunityJoinSheet.tsx` — rewritten to render through `SupporterActionSheet`; keeps tier selection with benefits, MoMo/card picker, phone input, sign-in nudge, waiting/success/failed states and card-redirect fallback.
- `features/creator-page/components/CreatorHeader.tsx` — banner/cover image now wrapped in `lg:max-w-[1200px] lg:mx-auto` and `sizes` changed from `100vw` to `(max-width: 768px) 100vw, 1200px` so it is full-width on phones but does not fill the screen on large desktops. Mobile-first, no change on small screens.
- `lib/i18n/en.ts` — no new keys needed; consolidated sheets reuse existing `actions.*`, `support.*`, `common.*` strings.

**Why:** Phase 2C moves the remaining paid supporter actions (store checkout, paid event tickets, community membership) onto the same mobile bottom-sheet + status-screen + trust-row pattern as support, free RSVP and giveaway entry, so every non-anonymous action is a deliberate confirm with visible confirmation and a retryable failure instead of toast-only writes.

**Verified:**

- `npm run typecheck` — passes.
- `npx eslint` on all changed files — passes with `--max-warnings=0`. (Two pre-existing lint findings remain untouched: `app/dev/actions/Preview.tsx` setState-in-effect and `features/gatherings/hooks/useTicketPayment.ts` unused `friendlyError`; neither was modified.)
- `npm test` — 8 files / 36 tests pass (existing `payment-sheets.test.tsx` and `action-sheets.test.tsx` still green).
- `npx prettier --check` on changed files — passes.
- `ENCRYPTION_KEY=local-build-check npm run build` — exits 0. The Firebase-admin sitemap errors are pre-existing caught errors (empty credentials) and do not block the build.

**Deferred (remaining 2C):** wiring `CheckoutSheet` into the store product detail page flow, paid ticket RSVP into the gathering detail page, community join into the community page; in-app-browser verification; mobile screenshots, axe and Lighthouse evidence; founder decisions on presets, copy and fee display.

**Not touched:** Firestore rules, workers, payment/fee logic, production, anonymous checkout (still gated by `NEXT_PUBLIC_SUPPORT_GUEST_CHECKOUT` off per `docs/RULES_FOLLOWUP.md`).

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
