# Agaseke Remediation Plan

Source: `audit/report/findings.json` (1 Nov 2026 audit, score 31/100).
Working branch: `fix/audit-phase1-payments`.
Rules: Firestore rules are **out of scope**. Any rule dependency is recorded in
`docs/RULES_FOLLOWUP.md`.

## Phase map

| Phase | Scope | Status |
|---|---|---|
| 1 | 5.A Payments correctness and forgery (AGA-PAY-001, AGA-PAY-002, AGA-PAY-003) | **Complete - 53 tests passing; awaiting founder review** |
| 2 | 5.B Security hardening outside rules (SEC-005/006/009/010/011, app-side SEC-001/004/007) | Planned |
| 3 | 5.C Payment reliability (PAY-004/005, FUNC-002/003/004, PAY-006) | Planned |
| 4 | 5.D Performance (PERF-001..006) | Planned |
| 5 | 5.E/5.F Accessibility, SEO, resilience (A11Y-001..003, SEO-001/002, RES-001) | Planned |
| 6 | 5.G/5.H Functional, operations, CI (FUNC-001/005, OPS-001) | Planned |

## Finding -> work item map

| Finding | Phase | Work item | Primary files | Effort | Risk | Scope |
|---|---|---|---|---|---|---|
| AGA-PAY-001 | 1 | A2 Pesapal IPN verification | `workers/payments/src/services/webhooks.ts`, new `webhookVerify.ts` | 2d | High | In scope |
| AGA-PAY-002 | 1 | A1 server-authoritative initiation | `workers/payments/src/services/{momo,card,initiate,pricing}.ts`, client call sites | 3d | High | In scope |
| AGA-PAY-003 | 1 | A3/A4/A5/A6 webhook state, idempotency | `webhooks.ts`, new `stateMachine.ts`, `eventProcessor.ts` | 3d | High | In scope |
| AGA-SEC-001 | 2 | B6 admin custom claims + server guard | `auth/*`, admin routes, worker endpoints | 2d | High | App side in scope; rules deferred |
| AGA-SEC-002 | rules | Firestore least-privilege rules | `docs/RULES_FOLLOWUP.md` | 1d | Critical | **Deferred (rules)** |
| AGA-SEC-003 | 2 | B9 signed private media | upload worker, post storage, migration script | 4d | High | App side in scope; rules deferred |
| AGA-SEC-004 | 2 | B5 payout destination server flow | creator settings, payouts, workers | 3d | High | App side in scope; rules deferred |
| AGA-SEC-005 | 2 | B2 redirect allowlist | `LoginPage.tsx`, `GoogleLogin.ts` | 2h | Low | In scope |
| AGA-SEC-006 | 2 | B1 security headers | `next.config.ts`, `vercel.json` | 2d | Medium | In scope |
| AGA-SEC-007 | 2 | B5 re-auth/OTP, notification, cooling period | auth + payout settings | 5d | High | In scope (business defaults pending) |
| AGA-SEC-008 | 2 | App Check enforcement | Firebase init, worker auth | 3d | Medium | In scope |
| AGA-SEC-009 | 2 | CORS allowlist + durable rate limit | `workers/payments/src/{cors,rateLimit}.ts` | 2d | Medium | In scope |
| AGA-SEC-010 | 2 | B3 remove/lock `/api/decrypt` | `app/api/decrypt`, general worker, bookings page | 2d | Medium | In scope |
| AGA-SEC-011 | 2 | B7 secret scanning + env hygiene | CI, `.env.example`, hooks | 2d | Low | In scope |
| AGA-PAY-004 | 3 | C2 credit outbox | payments worker, domain callbacks | 4d | High | In scope |
| AGA-PAY-005 | 3 | C3 atomic ledger | support/store/bookings/community callbacks | 2d | High | In scope |
| AGA-PAY-006 | 3/6 | staging + indexes + CI | `.github/workflows`, `firestore.indexes.json`, docs | 5d | Medium | In scope |
| AGA-FUNC-001 | 6 | composite indexes | `firestore.indexes.json` | 1d | Medium | In scope |
| AGA-FUNC-002 | 3 | C4/C5 card checkout + status UX | `SupportModal.tsx`, status endpoint | 3d | Medium | In scope |
| AGA-FUNC-003 | 3 | amount/phone validation + fee transparency | `SupportModal.tsx`, pricing module | 2d | Low | In scope |
| AGA-FUNC-004 | 3 | C8 stock reservation | store initiation/callback | 3d | Medium | In scope |
| AGA-FUNC-005 | 2 | admin make-admin flow | admin users page + server endpoint | 1d | Medium | In scope |
| AGA-PERF-001 | 4 | D2/D3 images + JS diet | creator page, components | 8d | High | In scope |
| AGA-PERF-002 | 4 | D3 JS diet | layout, providers, Firebase init | 5d | High | In scope |
| AGA-PERF-003 | 4 | D6 low-bandwidth | creator page | 2d | Medium | In scope |
| AGA-PERF-004 | 4 | D4 caching/ISR | `[username]/page.tsx`, revalidation | 3d | Medium | In scope |
| AGA-PERF-005 | 4 | D1 hydration + CLS | creator page, image components | 3d | Medium | In scope |
| AGA-PERF-006 | 5 | 403/console cleanup | Firebase/App Check, third-party storage | 1d | Low | In scope |
| AGA-A11Y-001 | 5 | contrast tokens | `globals.css`, design tokens | 2d | Low | In scope |
| AGA-A11Y-002 | 5 | accessible names | public components | 4h | Low | In scope |
| AGA-A11Y-003 | 5 | tap targets/text size | public components | 1d | Low | In scope |
| AGA-SEO-001 | 5 | SSR public/login + noscript | app routes, layout | 3d | Medium | In scope |
| AGA-SEO-002 | 5 | OG image + title suffix | `[username]/page.tsx`, metadata | 1d | Low | In scope |
| AGA-RES-001 | 5 | offline shell | `public/sw.js`, offline route | 2d | Low | In scope (decision pending) |
| AGA-OPS-001 | 6 | brands deployment decision | docs only | N/A | N/A | Deferred (business decision) |

## Phase 1 implementation notes

- The payments worker accepts identifiers only. Legacy `creatorId` is accepted as a
  **handle alias** for backwards compatibility, but the creator UID is always loaded
  from the creator document. `creatorUid`, `productPrice`, referral fields,
  `platformFeePayer`, `supporterId`, `buyerId`, and `amount` on derived-price types
  are rejected with HTTP 400 and a machine-readable `code`.
- Prices, currency, platform fee, creator share, referral share and referral
  relationship are derived from `creators`, `profiles`, `storeProducts`,
  `bookingRequests`, `creatorGatherings` and `communitySubscriptions`.
- Every initiation reserves an idempotency key (`Idempotency-Key` header or
  `idempotencyKey` body field) before calling the provider.
- Webhooks verify the provider status against the stored attempt (ref, tracking ID,
  amount, currency) before any state change. `pending`/`processing` never map to
  `failed`; terminal states are immutable.
- Crediting is gated by a `paymentCredits/{paymentRef}` marker written in the same
  Firestore commit as the `successful` state change.
- Pesapal IPN v3 does not provide a payload signature; authenticity is proven by
  calling `GetTransactionStatus` and matching merchant reference, tracking ID,
  amount and currency. This is documented in `docs/PAYMENTS.md`.

## Questions deferred to the founder

1. **Support limits**: default min RWF 100 / USD 1 (existing), max RWF 10,000,000 /
   USD 10,000 (proposed). Confirm.
2. **Processor cost**: Paypack/Pesapal fee percentages are not in code. Added
   `PROCESSOR_FEE_PERCENT` (default 0) and persisted as `processorCost`. Supply rates.
3. **Referral scope**: should the stored referral relationship apply to bookings,
   gatherings and community as well as support/store? Phase 1 applies it uniformly
   because the audit requires the server to derive referral from stored data.
4. **Payment expiry window**: used by the reconciliation job (Phase 3). Proposed 15 min
   for MoMo prompts and 30 min for card sessions.
5. **Payout cooling period**: proposed 48 hours (Phase 2).
6. **Offline shell vs remove service worker**: proposed minimal offline shell (Phase 5).
