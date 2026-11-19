# Phase 2 — Shells and Navigation Evidence

**Branch:** `design/full-app-redesign`
**Date:** 2026-11-17
**Scope:** Public, auth, creator, supporter, and admin shells; typed navigation; mobile/desktop light/dark verification.

## Summary

Phase 2 replaced duplicated shell/navigation wiring with one typed config and shared shell primitives. `DashboardMobileNav` now serves creator, supporter, and admin routes; `Sidebar` is collapsible; auth routes use `AuthShell`; public routes have real `#main-content` landmarks; and dark-mode brand tokens pass contrast. All automated checks pass for the unauthenticated surfaces. Authenticated dashboard screenshots remain blocked by missing emulator/seed/test accounts.

## Coverage matrix

| Surface | Mobile 360 | Desktop 1280 | Light | Dark | Skip link | axe serious/critical | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Public `/` | ✅ | ✅ | ✅ | ✅ | ✅ | 0 | `mobile-360-light/public-shell.png`, `desktop-1280-dark/public-shell.png` |
| Auth `/login` | ✅ | ✅ | ✅ | ✅ | ✅ | 0 | `mobile-360-light/auth-shell.png`, `desktop-1280-dark/auth-shell.png` |
| Creator shell | ✅ unit | ✅ unit | ✅ unit | TBD visual | ✅ via `AppShell` | TBD visual | `tests/unit/shell-navigation.test.tsx` |
| Supporter shell | ✅ unit | ✅ unit | ✅ unit | TBD visual | ✅ via `AppShell` | TBD visual | `tests/unit/shell-navigation.test.tsx` |
| Admin shell | ✅ unit | ✅ unit | ✅ unit | TBD visual | ✅ via `AppShell` | TBD visual | `tests/unit/shell-navigation.test.tsx` |

## Screenshot index

| View / theme | Before | After |
| --- | --- | --- |
| Landing, 360 light | `before/360-light/home.png` | `mobile-360-light/public-shell.png` |
| Landing, 360 dark | TBD | `mobile-360-dark/public-shell.png` |
| Landing, 1280 light | TBD | `desktop-1280-light/public-shell.png` |
| Landing, 1280 dark | TBD | `desktop-1280-dark/public-shell.png` |
| Login, 360 light | `before/360-light/login.png` | `mobile-360-light/auth-shell.png` |
| Login, 360 dark | TBD | `mobile-360-dark/auth-shell.png` |
| Login, 1280 light | TBD | `desktop-1280-light/auth-shell.png` |
| Login, 1280 dark | TBD | `desktop-1280-dark/auth-shell.png` |

Before images are extracted from committed `HEAD` (`1d304b1`) so they are true pre-change baselines. Desktop and dark baseline captures were not available before this phase; later phases should capture equivalent authenticated states once seed accounts exist.

## Lighthouse

Local production build, Lighthouse 13.6.0. Scores are performance / accessibility / best practices / SEO.

| Route | Before | After | Notes |
| --- | --- | --- | --- |
| `/` mobile | 75 / 97 / 92 / 100 | 86 / 100 / 92 / 100 | Main landmark fixed; performance above the ≥85 gate. |
| `/login` mobile | 67 / 97 / 92 / 69 | 93 / 100 / 96 / 66 | Heading order fixed; SEO drop is from intentional `robots: noindex`. |
| `/` desktop | TBD | 100 / 100 / 92 / 100 | No prior desktop baseline in evidence. |

JSON: `lighthouse/home-mobile.json`, `lighthouse/home-desktop.json`, `lighthouse/login-mobile.json`.

## Axe

| Run | Result |
| --- | --- |
| `e2e/phase2-shells.spec.ts` | 16/16 passed; 0 serious/critical violations across public and auth shells in both themes at 360 and 1280. |
| `e2e/mobile-routes.spec.ts` | 28/28 passed; 0 serious/critical violations across 14 public routes at 360 and 390. |
| Fixed issue | Dark brand text `#c40000` on `#111c30` was 2.71:1; now `#ff6b6b` at 6.14:1 with `#160808` on-brand foreground. |
| Lighthouse a11y | 100 on `/` and `/login`; no failing accessibility audits. |

## Bundle report

Metric: total bytes under `.next/static/chunks/**/*.js` from clean production builds. Next 16 Turbopack no longer prints per-route First Load JS, so this is the whole client-chunk total.

| Build | Files | Raw | Gzip |
| --- | --- | --- | --- |
| Before (`1d304b1`) | 146 | 5,176 KB | 1,583 KB |
| After (working tree) | 142 | 5,208 KB | 1,596 KB |
| Delta | -4 | +32 KB | +13 KB |

Raw JSON and build logs: `bundle-report.json`, `before-build.log`, `after-build.log`. Builds used local placeholder encryption values; no secrets were written to the repo.

## Rollout plan

1. Merge the shell/navigation consolidation only after the dark token pair and login `noindex` SEO change are acknowledged.
2. Add Firebase emulator/seed/test accounts; capture creator, supporter, and admin shells at 360/1280 in both themes.
3. Remove unused `components/parts/dashboard/CreatorBottomNav.tsx` once import safety is confirmed.
4. Expand lint roots to page bodies and continue route-level migration in later phases.
5. Add CI budgets: mobile Lighthouse performance ≥85, accessibility 100, and zero serious/critical axe violations.

## Questions for the founder

1. Can we get seeded Firebase test accounts/emulator data for authenticated dashboard screenshots?
2. Approve the darker-on-light / lighter-on-dark brand token pair (`#c40000` light, `#ff6b6b` dark)?
3. Should `/login` keep `robots: noindex`, accepting the lower SEO score, or be made indexable?
4. Should the legacy `CreatorBottomNav.tsx` file be deleted now?
5. Should Lighthouse and axe budgets become blocking CI checks for the redesign branch?
