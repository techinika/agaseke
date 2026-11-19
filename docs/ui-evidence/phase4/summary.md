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
| `04-route-*-*` | 26 | 360×640 light, 1280×800 dark | Real `/aline/...` route patterns plus payment routes; loading/error states without seed data |

Full files: `docs/ui-evidence/phase4/before/` and `docs/ui-evidence/phase4/after/`. The `before` run used the original `/demo/*` placeholders; route mapping was corrected before the final `after` run. Treat `after` as authoritative for route coverage.

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

Build command: `ENCRYPTION_KEY=local-build-placeholder NEXT_PUBLIC_DEV_CREATOR_PAGE=1 NEXT_PUBLIC_DEV_ACTIONS=1 NEXT_PUBLIC_DEV_COMPONENTS=1 npm run build -- --webpack`.
Serve command: `ENCRYPTION_KEY=local-build-placeholder npm run start -- -p 3200`.
Scores are performance / accessibility / best-practices / SEO.

| Route | Score | LCP | TBT | CLS |
| --- | --- | --- | --- | --- |
| `/dev/creator-page` | 100/100/96/66 | 0.9 s | 0 ms | 0 |
| `/dev/actions?open=support` | 100/100/96/66 | 0.9 s | 0 ms | 0 |
| `/payment` | 100/100/96/66 | 0.9 s | 0 ms | 0 |
| `/aline/store` (error state) | 100/95/96/66 | 1.1 s | 0 ms | 0 |
| `/` | 100/100/92/100 | 1.1 s | 0 ms | 0 |

Raw JSON: `docs/ui-evidence/phase4/lighthouse-prod-v2/`.
Earlier runs in `docs/ui-evidence/phase4/lighthouse/` and `docs/ui-evidence/phase4/lighthouse-prod/` are superseded: they used `/demo/*` routes that do not exist and omitted the production preview flags, so `/dev/creator-page` was measured as a 404.

- SEO is 66 on internal preview and error-state routes because they are intentionally `noindex`; the public home route scores 100.
- Remaining unused-JavaScript savings are estimated at 111–254 KiB, but TBT is 0 ms and LCP is at or below 1.1 s on all valid routes.
- No application-code performance change was needed after correcting the preview build and route mapping.

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
