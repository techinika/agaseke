# Phase 4 evidence summary

**Branch:** `design/full-app-redesign`
**Captured:** 2026-11-18
**Dev server:** `npm run dev -- -p 3100`
**Evidence command:** `CHROMIUM_PATH=/usr/bin/chromium OUT_DIR=docs/ui-evidence/phase4/<before|after> node scripts/phase4-evidence.mjs`

## Screenshot index

| Group | Files | Modes | Scope |
| --- | --- | --- | --- |
| `01-profile-*` | 4 | 360×640 light/dark, 1280×800 light/dark | `/dev/creator-page` profile |
| `02-profile-*-*` | 20 | all four modes | Store, community, gatherings, giveaways, message tabs |
| `03-sheet-*-*` | 12 | 360×640 light/dark | Support, community, giveaway, RSVP, ticket, checkout overlays |
| `04-route-*-*` | 26 | 360×640 light, 1280×800 dark | Store, community, gatherings, giveaways, messaging, booking, detail pages, payment, store pay, booking pay |

Full files: `docs/ui-evidence/phase4/before/` and `docs/ui-evidence/phase4/after/`.

## Before / after metrics

| Metric | Before | After |
| --- | --- | --- |
| Screenshots | 62 | 62 |
| Axe serious/critical findings | 13 | 0 |
| Console errors | 0 | 0 |
| Horizontal overflow on `/dev/creator-page` | 0 modes | 0 modes |
| Design-lint Phase 4 roots | not enforced | enforced, 0 violations |

Before/after JSON: `docs/ui-evidence/phase4/before/report.json`, `docs/ui-evidence/phase4/after/report.json`.

### Before findings

- `color-contrast` on legacy route error/toast states in `04-route-store`, `04-route-community`, `04-route-gatherings`, `04-route-giveaways`, `04-route-messaging`, `04-route-booking`, `04-route-product-detail`, `04-route-giveaway-detail`, `04-route-community-post`.
- Fixed by tokenizing toast styles, booking header text, and detail/pay route palettes.

## Lighthouse (production build)

Command: `ENCRYPTION_KEY=local-build-placeholder npm run build -- --webpack`, then `npm run start -- -p 3200`.
Scores are performance / accessibility / best-practices / SEO.

| Route | Score |
| --- | --- |
| `/dev/creator-page` | 77/98/96/66 |
| `/demo/store` | 95/100/96/66 |
| `/demo/community` | 94/100/96/66 |
| `/demo/store/product-1` | 75/100/96/66 |
| `/demo/booking` | 98/100/96/66 |
| `/payment` | 85/100/96/66 |

Raw JSON: `docs/ui-evidence/phase4/lighthouse-prod/`.
Dev-server runs are also saved in `docs/ui-evidence/phase4/lighthouse/`.

- SEO is 66 on every captured route because the internal preview/demo routes are intentionally `noindex`; this is not a production SEO regression.
- `/demo/store/product-1` is the slowest captured route at 75; the preview route loads a large client bundle and has no seeded product data.

## Bundle size

Report: `docs/ui-evidence/phase4/bundle-report.json`.

| Measurement | Files | Raw | Gzip |
| --- | --- | --- | --- |
| Phase 4 after | 196 | 4,459 KB | 1,396 KB |
| Phase 2 prior reference | 142 | 5,208 KB | 1,596 KB |

No like-for-like Phase 4 before build was captured because the working tree already contained earlier uncommitted phase work. The Phase 2 figure is reference-only.

## Limitations

- Real Firebase-backed creator routes render error/loading states without emulator, seed, or test accounts.
- Payment/provider states are mocked or error states; no live payments were attempted.
- 44×44 tap-target verification is partial: design-lint enforces readable text/tokens, and axe checks names/contrast, but a full automated tap-target audit still needs a seeded data pass.
