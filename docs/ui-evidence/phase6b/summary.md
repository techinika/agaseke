# Phase 6B evidence summary

**Branch:** `design/full-app-redesign`
**Captured:** 2026-11-19
**Dev server used for screenshots:** `npm run dev -- -p 3100`
**Evidence command:** `CHROMIUM_PATH=/usr/bin/chromium OUT_DIR=docs/ui-evidence/phase6b/after node scripts/phase6b-evidence.mjs`

## Screenshot index

| Group | Route | Files | Modes |
| --- | --- | --- | --- |
| `01-community-*` | `/dev/creator-community?surface=community` | 4 | 360×640 light/dark, 1280×800 light/dark |
| `02-chat-*` | `/dev/creator-community?surface=chat` | 4 | 360×640 light/dark, 1280×800 light/dark |
| `03-messages-*` | `/dev/creator-community?surface=messages` | 4 | 360×640 light/dark, 1280×800 light/dark |
| `04-notices-*` | `/dev/creator-community?surface=notices` | 4 | 360×640 light/dark, 1280×800 light/dark |
| `05-notice-dialog-*` | `/dev/creator-community?surface=notices&dialog=notice` | 4 | 360×640 light/dark, 1280×800 light/dark |

Full files: `docs/ui-evidence/phase6b/after/`. The gated preview uses mock data only; no Firebase reads, writes, secrets, or provider sandboxes were used.

## Metrics

| Metric | Result |
| --- | --- |
| Screenshots | 20 |
| Axe serious/critical violation entries | 0 |
| Console errors | 0 |
| Horizontal overflow | 0 modes |
| Small target findings | 0 |
| Design-lint Phase 6B roots | enforced, 0 violations |

Raw report: `docs/ui-evidence/phase6b/after/report.json`.

## Baseline and after changes

No like-for-like before screenshots were captured: the communication-page files were already being changed when the gated preview harness was added. The baseline is therefore the static debt audit recorded before migration:

| Surface | Pre-change static debt |
| --- | --- |
| Community | 27 raw palette shades, hand-styled header/tier/member controls, bespoke tabs and badges |
| Chat | 8 raw buttons, 2 raw inputs, hand-styled role chip and composer |
| Messages | 20 raw palette shades, 4 tiny-text uses, raw buttons/inputs/search/avatar/empty-state |
| Notices | Mostly tokenized; 1 raw notice-row button and a hand-styled dialog body |

After migration all four implementation files have 0 matches for palette shades, raw hex, `text-[9|10|11]px`, and arbitrary radius values. `Tabs` also gained a shared 48 px minimum width so narrow filters remain 44×44 compliant. Firestore subscriptions, tier access, messaging sends, read receipts, notification delivery, and routing were left unchanged.

## Lighthouse (production build)

Build command: `ENCRYPTION_KEY=local-build-placeholder NEXT_PUBLIC_DEV_CREATOR_CORE=1 NEXT_PUBLIC_DEV_CREATOR_COMMUNITY=1 npm run build -- --webpack`.
Serve command: `ENCRYPTION_KEY=local-build-placeholder NEXT_PUBLIC_DEV_CREATOR_CORE=1 NEXT_PUBLIC_DEV_CREATOR_COMMUNITY=1 npm run start -- -p 3200`.
Scores are performance / accessibility / best-practices / SEO from Lighthouse 13.6.0, mobile preset.

| Route | Score | LCP | TBT | CLS |
| --- | --- | --- | --- | --- |
| `/dev/creator-community?surface=community` | 96/100/96/66 | 0.9 s | 240 ms | 0 |
| `/dev/creator-community?surface=chat` | 95/100/96/66 | 0.9 s | 260 ms | 0 |
| `/dev/creator-community?surface=messages` | 99/100/96/66 | 0.9 s | 150 ms | 0 |
| `/dev/creator-community?surface=notices` | 99/100/96/66 | 0.9 s | 110 ms | 0 |
| `/dev/creator-community?surface=notices&dialog=notice` | 98/100/96/66 | 0.9 s | 150 ms | 0 |

Raw JSON: `docs/ui-evidence/phase6b/lighthouse-prod/`. SEO is 66 on these intentionally `noindex` routes. All touched preview surfaces exceed the ≥85 mobile performance target.

## Bundle size

Report: `docs/ui-evidence/phase6b/bundle-report.json`.

| Measurement | Files | Raw | Gzip |
| --- | --- | --- | --- |
| Phase 6B after | 205 | 4,594 KB | 1,442 KB |
| Phase 6A after reference | 204 | 4,530 KB | 1,424 KB |

Delta is +1 file, +64 KB raw, +18 KB gzip. This is reference-only: the working tree contains uncommitted Phase 6B preview and test files, so no isolated Phase 6B before build was captured.

## Limitations

- Gated preview data is intentionally local and does not prove real Firebase auth, tier access, live chat, message delivery, upload, or notification states.
- No before screenshots were captured for this phase because the code changes were already in progress; the baseline is static audit counts only.
- Automated axe/overflow/target checks passed in all four modes, but human visual sign-off from the captured screenshots is still pending.
- Remaining creator dashboard routes outside Phase 6B remain unchecked in `docs/REDESIGN_COVERAGE.md`.
