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
