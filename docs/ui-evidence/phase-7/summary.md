# Phase 7 verification — mobile audit (Playwright + axe + Lighthouse)

Date: 2026-11-13
Branch: `feat/mobile-ui-refactor`

## Scope

Verified the post-Phase-2C work on mobile viewports (360×640 and 390×844):

- Playwright renders + console-error checks for 14 routes.
- Action/sheet screenshot sweep (12 flows).
- axe-core (WCAG 2.0 A/AA + 2.1 A/AA) on every route.
- Tap-target + horizontal-overflow audit.
- Lighthouse mobile on a **production** build (fresh `next start`).

The E2E/dev environment has **no Firebase credentials**, so data-dependent pages
render their empty/error states; Firebase "not configured" console errors are
expected and filtered in `e2e/utils.ts`.

## How to reproduce

```bash
# dev server (or use PLAYWRIGHT_SKIP_WEBSERVER=1 if already running on :3100)
npm run dev -- -p 3100
PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test
node scripts/a11y-report.mjs        # -> a11y-violations.json
node scripts/mobile-audit.mjs       # -> mobile-audit.json

# performance against a production build
ENCRYPTION_KEY=local-build-check npm run build
npx next start -p 3110
npx lighthouse "http://localhost:3110/" --output=json \
  --output-path=docs/ui-evidence/phase-7/lighthouse/prod/home.json \
  --only-categories=performance,accessibility,best-practices,seo \
  --chrome-flags="--headless=new --no-sandbox --disable-dev-shm-usage"
```

## Results

### Playwright

- `e2e/mobile-routes.spec.ts` × 2 viewports (14 routes) + `e2e/actions-sheets.spec.ts`
  (12 flows): **50/50 passed**.
- Screenshots: `mobile-360/*.png`, `mobile-390/*.png` (50 total).
- Machine report: `playwright-report.json`.

### Accessibility (axe, serious/critical)

- **0** serious/critical violations on all 14 audited routes
  (home, explore, explore-posts, for-creators, for-supporters, for-brands, login,
  help-center, changelog, articles, terms, privacy, /dev/creator-page, /dev/components).
- Detail: `a11y-violations.json`.

### Tap targets (390×844; flag <44 px)

- All primary controls ≥44 px.
- Remaining flags are two **inline-in-sentence** links (WCAG 2.5.8 exception):
  login "Terms of Service" (131×34) and for-brands "See what we do for creators"
  (157×30).
- No horizontal overflow on any route.
- Detail: `mobile-audit.json`.

### Lighthouse — production build (mobile, default throttling)

| Page | Perf | A11y | BP | SEO | LCP | TBT | CLS |
|------|-----:|-----:|---:|----:|----:|----:|----:|
| home | 75 | 97 | 92 | 100 | 1.23 s | 1322 ms | 0.000 |
| for-creators | 74 | 96 | 92 | 100 | 1.22 s | 1572 ms | 0.000 |
| login | 67 | 97 | 92 | 69 | 3.74 s | 1046 ms | 0.000 |
| explore-posts | 80 | 98 | 92 | 100 | 1.22 s | 844 ms | 0.000 |

Reports: `lighthouse/prod/*.json`. (Dev-server runs are kept in `lighthouse/*.json`.)

## Fixes applied in this pass

- Accessible color overrides in `app/globals.css` (`orange-600 #c2410c`,
  `red-600 #b91c1c`, `emerald-600 #047857`); contrast fixes on landing/login/privacy.
- 44 px tap targets + aria-labels in `Navigation`, `ThemeToggle`, footer
  `SocialIcon`/`FooterGroup`, legal/help-centre/marketing links, filter pills.
- `MediaPlayer` accessible name now derived from its content.
- Decorative 404/500 numerals and brand tagline marked `aria-hidden` + legible.
- **Bug fix:** `components/pages/ChangelogPage.tsx` no longer crashes to a 500 when
  the Firestore query cannot be constructed (wrapped in try/catch + unmount guard).

## Remaining / next (Phase 6 — performance)

Targets vs measured (mobile): TBT **< 200 ms** (measured 844–1572 ms), Perf **≥ 85**
(measured 67–80), login LCP **< 2.5 s** (measured 3.74 s). Root cause is eager
Firebase SDK + hydration JS; CLS is already 0. Phase 6 (lazy Firebase init,
dynamic imports, image/font work, bundle budgets) is the next body of work.

## Accepted / known

- Two inline-in-sentence links remain <44 px (WCAG 2.5.8 exempt).
- `/changelog` renders the error boundary only when Firebase is unconfigured (fixed
  to degrade gracefully); real data requires credentials.
- Pre-existing ESLint debt (`react/no-unescaped-entities`,
  `@next/next/no-html-link-for-pages`, `no-img-element`) is unrelated to these
  changes.
