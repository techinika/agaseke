# Phase 6A evidence summary

**Branch:** `design/full-app-redesign`
**Captured:** 2026-11-19
**Dev server used for screenshots:** `npm run dev -- -p 3100`
**Evidence command:** `CHROMIUM_PATH=/usr/bin/chromium OUT_DIR=docs/ui-evidence/phase6a/after node scripts/phase6a-evidence.mjs`

## Screenshot index

| Group | Route | Files | Modes |
| --- | --- | --- | --- |
| `01-home-*` | `/dev/creator-core?surface=home` | 4 | 360×640 light/dark, 1280×800 light/dark |
| `02-payouts-*` | `/dev/creator-core?surface=payouts` | 4 | 360×640 light/dark, 1280×800 light/dark |
| `03-settings-*` | `/dev/creator-core?surface=settings` | 4 | 360×640 light/dark, 1280×800 light/dark |
| `04-sales-*` | `/dev/creator-core?surface=sales` | 4 | 360×640 light/dark, 1280×800 light/dark |
| `05-supporters-*` | `/dev/creator-core?surface=supporters` | 4 | 360×640 light/dark, 1280×800 light/dark |
| `06-broadcast-dialog-*` | `/dev/creator-core?surface=supporters&dialog=broadcast` | 4 | 360×640 light/dark, 1280×800 light/dark |

Full files: `docs/ui-evidence/phase6a/after/`. The gated preview uses mock data only; no Firebase reads, writes, secrets, or provider sandboxes were used.

## Metrics

| Metric | Result |
| --- | --- |
| Screenshots | 24 |
| Axe serious/critical violation entries | 0 |
| Console errors | 0 |
| Horizontal overflow | 0 modes |
| Small target findings | 0 |
| Design-lint Phase 6A roots | enforced, 0 violations |

Raw report: `docs/ui-evidence/phase6a/after/report.json`.

## Baseline and after changes

No like-for-like before screenshots were captured: the creator dashboard core files were already being changed when the gated preview harness was added. The baseline is therefore the static debt audit recorded before migration:

| Surface | Pre-change static debt |
| --- | --- |
| Creator home | Raw share button, duplicate share logic, hand-styled link buttons, generic empty state |
| Payouts | 31 palette shades, 13 tiny-text uses, 11 raw buttons, 1 raw input, hand-built tabs/success screen |
| Settings | 1,080 lines, 80 palette shades, 7 tiny-text uses, 16 raw buttons, 5 raw inputs, 2 selects, 1 textarea, 9 hand-rolled switches |
| Sales | 583 lines, 23 palette shades, 1 tiny-text use, raw spinner/empty state/image, inline money formatting |
| Supporters | 12 palette shades, 8 tiny-text uses, 2 raw buttons, raw input/select/spinner/empty state/image, bespoke broadcast overlay |

After migration all 7 implementation files have 0 matches for palette shades, raw hex, `text-[9|10|11]px`, and arbitrary radius values. Business logic, Firestore subscriptions, payout calculations, settings writes/uploads, comms delivery, and money/fees were left unchanged.

## Lighthouse (production build)

Build command: `ENCRYPTION_KEY=local-build-placeholder NEXT_PUBLIC_DEV_CREATOR_CORE=1 npm run build -- --webpack`.
Serve command: `ENCRYPTION_KEY=local-build-placeholder NEXT_PUBLIC_DEV_CREATOR_CORE=1 npm run start -- -p 3200`.
Scores are performance / accessibility / best-practices / SEO from Lighthouse 13.6.0, mobile preset.

| Route | Score | LCP | TBT | CLS |
| --- | --- | --- | --- | --- |
| `/dev/creator-core?surface=home` | 97/100/96/66 | 0.9 s | 200 ms | 0 |
| `/dev/creator-core?surface=payouts` | 96/100/96/66 | 0.9 s | 250 ms | 0 |
| `/dev/creator-core?surface=settings` | 98/100/96/66 | 0.9 s | 160 ms | 0 |
| `/dev/creator-core?surface=sales` | 96/100/96/66 | 0.9 s | 210 ms | 0 |
| `/dev/creator-core?surface=supporters` | 100/100/96/66 | 0.9 s | 90 ms | 0 |

Raw JSON: `docs/ui-evidence/phase6a/lighthouse-prod/`. SEO is 66 on these intentionally `noindex` routes. All touched preview surfaces exceed the ≥85 mobile performance target.

## Bundle size

Report: `docs/ui-evidence/phase6a/bundle-report.json`.

| Measurement | Files | Raw | Gzip |
| --- | --- | --- | --- |
| Phase 6A after | 204 | 4,530 KB | 1,424 KB |
| Phase 5 after reference | 201 | 4,500 KB | 1,410 KB |

Delta is +3 files, +30 KB raw, +14 KB gzip. This is reference-only: the working tree contains earlier uncommitted phase work, so no isolated Phase 6A before build was captured.

## Limitations

- Gated preview data is intentionally local and does not prove real Firebase auth, payout, upload, sales, supporter, or broadcast states.
- No before screenshots were captured for this phase because the code changes were already in progress; the baseline is static audit counts only.
- Automated axe/overflow/target checks passed in all four modes, but human visual sign-off from the captured screenshots is still pending.
- Remaining creator dashboard routes outside Phase 6A remain unchecked in `docs/REDESIGN_COVERAGE.md`.
