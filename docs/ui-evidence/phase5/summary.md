# Phase 5 evidence summary

**Branch:** `design/full-app-redesign`
**Captured:** 2026-11-19
**Dev server used for screenshots:** `npm run dev -- -p 3100`
**Evidence command:** `CHROMIUM_PATH=/usr/bin/chromium OUT_DIR=docs/ui-evidence/phase5/<before|after> node scripts/phase5-evidence.mjs`

## Screenshot index

| Group | Route | Files | Modes |
| --- | --- | --- | --- |
| `01-login-*` | `/login` | 4 | 360×640 light/dark, 1280×800 light/dark |
| `02-onboarding-*` | `/dev/auth-onboarding` | 4 | 360×640 light/dark, 1280×800 light/dark |
| `03-verify-*` | `/dev/auth-verify` | 4 | 360×640 light/dark, 1280×800 light/dark |

Full files: `docs/ui-evidence/phase5/before/` and `docs/ui-evidence/phase5/after/`. Onboarding and verification use gated dev preview routes because the real routes require Firebase auth; no real Firebase data or secrets were used.

## Before / after metrics

| Metric | Before | After |
| --- | --- | --- |
| Screenshots | 12 | 12 |
| Axe serious/critical violation entries | 16 (48 affected nodes) | 0 |
| Console errors | 4 (`currentUser` null in dev previews) | 0 |
| Horizontal overflow | 0 modes | 0 modes |
| Small target findings | 3 per login mode | 0 |
| Design-lint Phase 5 roots | not enforced | enforced, 0 violations |

Before/after JSON: `docs/ui-evidence/phase5/before/report.json`, `docs/ui-evidence/phase5/after/report.json`.

### Before findings

- Onboarding: `label` (critical) in all four modes.
- Verification: `color-contrast` (serious, 7 nodes), `label` (critical, 3 nodes), and `select-name` (critical, 1 node) in all four modes.
- Login: `Terms of Service` and `Privacy Policy` links were under 44 px tall; the visually hidden skip link was also counted as a 1×1 target.
- Dev previews logged `TypeError: Cannot read properties of null (reading 'currentUser')` because they rendered outside the auth shell.

### After changes

- All form controls use shared `Input`/`Select`/`FormField` primitives with visible labels or accessible names.
- Verification status cards use semantic token colors that pass AA in light and dark.
- Login legal links use `min-h-12`; the evidence script now excludes `sr-only` skip links from the tap-target count.
- Dev previews render inside `AuthShell`, removing the null-`currentUser` console errors and adding a working skip link.

## Lighthouse (production build)

Build command: `ENCRYPTION_KEY=local-build-placeholder NEXT_PUBLIC_DEV_AUTH=1 npm run build -- --webpack`.
Serve command: `ENCRYPTION_KEY=local-build-placeholder NEXT_PUBLIC_DEV_AUTH=1 npm run start -- -p 3200`.
Scores are performance / accessibility / best-practices / SEO from Lighthouse 13.6.0, mobile preset.

| Route | Score | LCP | TBT | CLS |
| --- | --- | --- | --- | --- |
| `/login` | 99/100/96/66 | 0.9 s | 100 ms | 0 |
| `/dev/auth-onboarding` | 97/100/96/66 | 0.9 s | 190 ms | 0 |
| `/dev/auth-verify` | 99/100/96/66 | 0.9 s | 110 ms | 0 |

Raw JSON: `docs/ui-evidence/phase5/lighthouse-prod/`.

- SEO is 66 on these routes because they are intentionally `noindex`.
- `/login` improved from the Phase 2 production result of 93/100/96/66.
- All touched routes exceed the ≥85 mobile performance target.

## Bundle size

Report: `docs/ui-evidence/phase5/bundle-report.json`.

| Measurement | Files | Raw | Gzip |
| --- | --- | --- | --- |
| Phase 5 after | 201 | 4,500 KB | 1,410 KB |
| Phase 4 after reference | 196 | 4,459 KB | 1,396 KB |

Delta is +5 files, +41 KB raw, +14 KB gzip. This is reference-only: the working tree contains earlier uncommitted phase work, so no isolated Phase 5 before build was captured.

## Limitations

- Real Firebase-backed `/onboarding` and `/creator/verify` states were not exercised without emulator/seed/test accounts; gated previews cover the redesigned UI and interaction states.
- Provider sandboxes and file uploads were not used; verification payout details and phone-security cards use local flow state only.
- Automated axe/overflow/target checks passed at all four modes, but human visual sign-off from the captured screenshots is still pending.
