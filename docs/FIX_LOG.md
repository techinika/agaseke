# Fix log

Running record of remediation work. Newest first.

## 2026-11-16 - Payout route metadata for processor-dependent currencies

### Changed

- **Route resolver.** Added `lib/payouts/rails.ts` with a small provider registry
  (`manual` today), rail resolution and `PayoutRouteError`. RWF defaults to mobile money,
  USD always resolves to bank transfer, and a creator bank preference or per-currency
  `payoutRail`/`payoutProvider` config can override the default. The provider registry is
  the extension point for future processors; payout currency support stays separate from
  the checkout catalog.
- **Withdrawal requests.** `/api/payouts/withdraw` resolves the route server-side and
  stores `provider` and `rail` on `withdrawRequests` alongside the existing currency,
  method and account fields. Invalid provider/rail combinations fail with a 400.
- **Admin settlement.** The admin withdrawal route re-resolves and validates the route,
  then copies `provider` and `rail` onto the completed/rejected request and the `payouts`
  document. Legacy requests without route fields resolve to the RWF/USD defaults.
- **Admin UI.** Pending withdrawal rows show the rail when present so reviewers can see
  whether a request is mobile-money or bank.

### Verification

- `npx tsc --noEmit` - passed.
- `npm test` - 20 files, 122 passed (4 new payout-route tests).
- `npm run lint:ci`, `npm run format:check`, `npm run money:registry:check`,
  `git diff --check` - passed.
- `ENCRYPTION_KEY=build-verification-key npm run build` - passed with expected
  Firebase-admin sitemap warnings.

### Remaining

- Only the `manual` provider exists; Paypack/Pesapal or another payout rail can be added
  to the registry without changing withdrawal balance semantics.
- USD is recorded as a bank-transfer route, but the request destination still comes from
  `creator.payoutNumber` (phone) until approved verification bank details are persisted
  onto the creator document.
- Provider execution, provider refs, webhook settlement and reconciliation remain Phase 5
  work.

## 2026-11-16 - Payout currency capability and overview correctness

### Changed

- **Separate payout capability.** Added `PAYOUT_CURRENCIES`/`normalizePayoutCurrency` in
  `lib/payouts/currency.ts`. Payout support remains intentionally RWF/USD even though the
  checkout catalog recognises 53 currencies; this list is the seam for future
  processor-dependent payout expansion.
- **Configured thresholds only.** Added `buildPayoutOverview` with tests. The payout
  overview now derives balances and thresholds only from configured RWF/USD policies and
  no longer invents a `10000` threshold for USD or other currencies. Missing thresholds
  return `null` and disable withdrawal until configured.
- **Per-currency payout UI.** `PayoutsPage` can switch between the RWF/USD balances that
  are available, disables withdrawal when a threshold is missing, and shows each payout
  or request with its recorded currency and method instead of the creator's main
  currency and hard-coded MoMo text.
- **Payout policy.** The public policy page filters thresholds to the supported payout
  currencies and no longer lists checkout-only currencies as payout options.

### Verification

- `npx tsc --noEmit` - passed.
- `npm test` - 19 files, 118 passed (4 new payout-overview tests, 1 new payout-currency
  test).
- `npm run lint:ci`, `npm run format:check`, `npm run money:registry:check`,
  `git diff --check` - passed.

### Remaining

- Payout providers/rails are still manual. The next layer should map each payout
  currency to processor capability without changing balances or request semantics; RWF
  currently uses mobile-money/manual processing and USD needs manual/bank settlement.
- Checkout `enabled` and payout availability are deliberately separate; do not use the
  checkout catalog as the payout allow-list.
- Withdrawal API/UI still need Firestore-emulator and browser exercise.

## 2026-11-16 - Admin currency validation + checkout currency enablement

### Changed

- **Admin validation.** Added `lib/money/currencyConfig.ts` with
  `validateCurrencyConfig`: codes must exist in the static registry, names/symbols fall
  back to registry values, thresholds and minimum support must be positive amounts with
  no more decimals than the currency's `minorUnit`, and new currencies default to
  enabled.
- **Admin currency controls.** `AdminCurrenciesPage` now validates adds/edits through the
  helper and exposes an `enabled` toggle for each currency. `lib/adminConfigService.ts`
  and `types/currency.ts` carry the optional flag. Existing records without the flag
  remain enabled.
- **Checkout enforcement.** `workers/payments` resolves the configured currency before
  pricing and rejects `CURRENCY_DISABLED` when `currencies/{code}.enabled === false`.
  The check applies to support, store, booking, gathering and community payments.
- **Store metadata.** Removed the remaining manual cross-currency fallback from the
  public product metadata/detail page by using `getProductPrice`.

### Verification

- `npx tsc --noEmit`; payments/bookings/community worker `tsc` - passed.
- `npm test` - 18 files, 113 passed (5 new currency-config tests).
- `cd workers/payments && npm test` - 7 files, 76 passed (1 new disabled-currency
  test).
- `npm run lint:ci`, `npm run format:check`, `npm run money:registry:check`,
  `git diff --check` - passed.
- `ENCRYPTION_KEY=build-verification-key npm run build` - passed with expected
  Firebase-admin sitemap warnings.

### Remaining

- `workers/payments` still normalizes monetary flows to RWF/USD even though the registry
  recognizes 53 codes. Enabling additional checkout currencies still requires provider
  capability/settlement decisions, per-currency limits and client currency selection.
- Withdrawals remain RWF/USD-only; the `enabled` flag does not yet drive payout rails or
  country defaults.

## 2026-11-16 - Phase 4 price maps for bookings, gatherings and community

### Changed

- **Shared price-map helper.** Added `lib/priceMap.ts` with one strict resolver for
  `RWF`/`USD` fields, including the legacy gathering `ticketPrice` field. Store pricing
  now delegates to it. Explicit `prices` maps are authoritative; missing currencies
  resolve to zero and are rejected by server checkout.
- **Booking tiers.** Added `prices` to `BookingTier` and the bookings worker type.
  `BookingsPage.saveTiers` rebuilds the map from editable fields and rejects a tier with
  no price in its active currency. Public/dashboard displays and the bookings worker
  resolve from the map without falling back across currencies.
- **Gathering tickets.** Added `prices` to public gathering records. `GatheringsForm`
  now preserves both legacy fields for RWF and USD ticketed events, writes a map and
  validates the active-currency ticket price. Card/detail/dashboard/supporter displays
  use active-currency prices; payments-worker gathering checkout reads the map.
- **Community tiers.** Added `prices` to service, view and worker tier types. The
  community worker returns/saves maps, and the dashboard rebuilds maps from edited
  fields while validating the active currency. Join/subscribe displays and
  payments-worker tier checkout use the strict resolver.
- **Server pricing.** `workers/payments/src/services/pricing.ts` now uses one stored
  price resolver for products, gathering tickets and community tiers; a map omitting the
  requested currency is rejected rather than falling back to another field.

### Verification

- `npx tsc --noEmit`; bookings/payments/community worker `tsc` - passed.
- `npm test` - 17 files, 108 passed (4 new generic price-map tests).
- `cd workers/payments && npm test` - 7 files, 75 passed (2 new gathering/community
  map tests).
- `npm run lint:ci`, `npm run format:check`, `npm run money:registry:check` - passed.
- `ENCRYPTION_KEY=build-verification-key npm run build` - passed with expected
  Firebase-admin sitemap warnings.

### Remaining

- Creator/admin validation across the full currency catalog and checkout currency
  enablement remain Phase 4/5 work.
- Booking worker has no automated map regression test yet; its behavior is covered by
  typecheck and the shared resolver tests.

## 2026-11-16 - Strict store price maps + cross-currency fallback removal

### Changed

- **Strict store price resolver.** Added `lib/storePrices.ts` with
  `getProductCurrency`, `getProductPrices`, `getProductPrice` and
  `buildProductPriceMap`. Explicit `prices.{RWF,USD}` maps are authoritative; legacy
  products fall back only to their own currency's field. A missing USD price no longer
  resolves to the RWF amount.
- **Product writers.** `ProductForm` and store `ProductModal` now write
  `prices: { RWF, USD }`, preserve both legacy fields, validate the active currency
  amount, and show fee previews in the active currency.
- **Public store.** Product metadata/detail pages and all store helper callers use the
  strict resolver. `app/(public_profile)/[username]/store/[productId]/page.tsx` no
  longer falls back from `priceUSD` to `price`.
- **Server checkout.** `workers/payments` reads `storeProducts.prices[currency]` when a
  map is present and rejects the charge if that currency is missing; legacy products
  still use `price`/`priceUSD`.
- **Other fallbacks.** Removed cross-currency fallbacks from booking tiers, gathering
  tickets, and community tiers in public/dashboard displays, client submission and the
  bookings worker.

### Verification

- `npx tsc --noEmit`; bookings/payments worker `tsc` - passed.
- `npm test` - 16 files, 104 passed (5 new store-price tests).
- `cd workers/payments && npm test` - 7 files, 73 passed (2 new price-map tests).
- `npm run lint:ci`, `npm run format:check`, `npm run money:registry:check`,
  `git diff --check` - passed.
- `ENCRYPTION_KEY=build-verification-key npm run build` - passed with expected
  Firebase-admin sitemap warnings.

### Remaining

- Per-currency maps for booking tiers, gathering tickets and community tiers are still
  represented by `currency` + `price`/`priceUSD` rather than a map.
- Creator/admin validation and checkout currency enablement remain Phase 4/5 work.

## 2026-11-16 - Currency catalog expansion

### Changed

- **53-currency registry.** Expanded `shared/money/currencies.json` from 5 to 53
  currencies, adding NGN, GHS, ZAR, EGP, MAD, DZD, TND, XOF, XAF, ETB, CDF, AOA, MZN,
  ZMW, MWK, BWP, NAD, LSL, SZL, MUR, SCR, MGA, KMF, BIF, DJF, SOS, SSP, SDG, LYD, MRU,
  GMD, GNF, LRD, SLE, CVE, STN, ERN, GBP, EUR, CAD, CNY, JPY, AUD, CHF, INR, AED, SAR
  and BRL. TND/LYD use three decimals; XOF/XAF/JPY/KMF/BIF/DJF/GNF use zero.
- **Generator and generated files.** Extended the ISO-map validation in
  `scripts/money/generate-registry.mjs`, allowed `minorUnit` 0/2/3, and regenerated all
  seven registry copies. `types/currency.ts` now exposes symbols for all 53 codes.
- **Catalog only.** `isCurrencyCode` and `fromMajor` accept the expanded catalog, but
  `normalizeCurrency` and `parsePayoutCurrency` still restrict payments/payouts to
  RWF/USD. New codes need Phase 4/5 enablement, thresholds and provider support.
- **Tests.** Updated `tests/unit/money-core.test.ts` for 53 codes, EUR recognition,
  ZZZ rejection and TND/LYD three-decimal cases; updated ledger/worker invalid-currency
  cases to ZZZ.

### Verification

- `npm run money:registry:check` - 7 generated files up to date.
- `npm test` - 15 files, 99 passed.
- `cd workers/payments && npm test` - 7 files, 71 passed.
- `npx tsc --noEmit`, worker typechecks, `npm run lint:ci`, `npm run format:check` -
  passed.
- `ENCRYPTION_KEY=build-verification-key npm run build` - passed; expected Firebase-admin
  env warnings during sitemap generation.

### Remaining

- Only RWF/USD are enabled for payments, withdrawals and payout rail routing.
- Per-currency thresholds, provider coverage, FX and UI enablement remain Phase 4/5.

## 2026-11-16 - Withdrawal holds + ledger settlement (Phase 3, partial)

Findings: money audit §9 Phase 2-3 and §10 item 5 (withdrawal correctness).

### Changed

- **Server-side withdrawal requests.** Added `POST /api/payouts/withdraw`
  (`app/api/payouts/withdraw/route.ts`) behind `requireAuth`. The route resolves the
  creator by UID, requires verification and a payout destination, reads the
  per-currency threshold from `currencies`, and creates `withdrawRequests` in a
  transaction.
- **Holds.** New requests increment `creators.pendingWithdrawals.{currency}` in the
  same transaction. When `MONEY_LEDGER_ENABLED=true`, the same transaction also writes
  balanced `withdrawal_hold` entries and moves `creatorBalances.available` to
  `pendingWithdrawals` in minor units. The client can no longer create withdrawal
  documents directly; `submitWithdrawRequest` now sends a Firebase ID token, amount and
  idempotency key (`lib/payoutsService.ts`).
- **Idempotency.** The request document ID is the client idempotency key. A retry with
  the same key returns the original request instead of creating a second hold; a key
  owned by another creator is rejected. A client-generated key is kept stable across
  retries until the request succeeds (`PayoutsPage.tsx`).
- **Pure validation.** Added `lib/payouts/withdrawals.ts` with minor-unit validation for
  RWF/USD, zero/negative amounts, fractional RWF, configured thresholds, available
  balance (pending minus holds) and held-exceeds-pending drift. Added
  `tests/unit/withdrawal-validation.test.ts` (5 tests).
- **Available balance.** `fetchPayoutOverview` now subtracts `pendingWithdrawals` from
  `pendingPayout`/`pendingPayoutUSD` instead of reading the stale RWF creator field.
  `PayoutsPage` uses the per-currency available balance and decimal-safe
  `fromMajor`/`toMajor` parsing; USD accepts cents.
- **Admin settlement.** Approval and rejection now call
  `POST /api/admin/payouts/withdrawals` behind `requireAdmin`. The server revalidates
  `pending` status, currency and amount, writes the payout or release, updates legacy
  `pendingPayout*`/`pendingWithdrawals` fields, and (when enabled) settles/releases the
  ledger transactionally. `AdminPage` only submits the action and sends notifications.
- **Ledger helpers and reconciliation.** Added `lib/payouts/withdrawalLedger.ts` and
  tests for balanced hold/settlement/release documents. `reconcile-ledger.mjs` now
  compares `pendingWithdrawals` and `lifetimeWithdrawn` in addition to available and
  lifetime-earned balances.

### Verification

- `npx tsc --noEmit` and all worker `tsc` - passed.
- `npm test` - 15 files, 99 passed.
- `cd workers/payments && npm test` - 7 files, 71 passed.
- `npm run lint:ci`, `npm run format:check`, `npm run money:registry:check`,
  `git diff --check` - passed.
- `ENCRYPTION_KEY=build-verification-key npm run build` - passed with expected
  Firebase-admin sitemap warnings.
- New routes/UI flows have not yet been exercised against the Firestore emulator or a
  browser session.

### Remaining

- `MONEY_LEDGER_ENABLED` remains false in `.env.example` and all worker configs. The
  Next server must use the same value; when enabled, approvals of legacy `held: false`
  requests fail closed until they are migrated/reviewed.
- No Firestore rules changes: client writes to `withdrawRequests`, `ledgerEntries` and
  `creatorBalances` should be denied once deployed (`docs/RULES_FOLLOWUP.md`).
- Admin/withdrawal flows still need emulator or browser exercise, including partial
  failure and duplicate-action paths.
- Production/sanitized-data backfill and reconciliation remain blocked on the data
  review described in the Phase 2 entry.

## 2026-11-15 - Ledger dual-write (Phase 2, behind flag)

Findings: money audit §9 Phase 2 and §10 item 5.

### Changed

- **Dual-write flag.** Added `MONEY_LEDGER_ENABLED` (default `"false"` in every worker).
  Ledger writes happen only when it is exactly `"true"`; legacy counters and income
  documents are still written in the same commit (`workers/*/wrangler.jsonc`,
  `workers/*/src/types.ts`, `workers/*/src/money/ledger.ts`).
- **Payment callbacks.** Support, store, bookings, community and gathering payments now
  build one atomic commit containing the payment marker, domain documents, balance
  transforms and (when enabled) balanced `ledgerEntries` plus `creatorBalances`
  projections. Community and gathering paths gained `paymentApplications` markers and
  deterministic income/attendance/ticket documents, so a replay is a no-op
  (`workers/{support,store,bookings}/src/services/callback.ts`,
  `workers/community/src/services/subscriptions.ts`,
  `workers/payments/src/services/webhooks.ts`).
- **Community ordering.** The subscription is marked active only after the credit commit
  succeeds, removing the previous window where a failed credit left an active
  subscription.
- **Precision.** `firestoreIncrement` in the payments worker now writes fractional USD
  as `doubleValue` instead of rounding to an integer
  (`workers/payments/src/firestore.ts`).
- **Backfill.** Added `npm run money:backfill:ledger` (dry-run by default) to create
  `opening_balance` entries and `creatorBalances` from `pendingPayout` and
  `pendingPayoutUSD`; `--apply` is explicit and already-migrated docs are skipped
  (`scripts/money/backfill-ledger.mjs`). The migration scripts accept
  `FIRESTORE_EMULATOR_HOST` without service-account credentials
  (`scripts/money/firebase-admin.mjs`).
- **Referral conservation.** A referral slice is recorded only when a referral
  recipient exists; otherwise it falls into `fee_residual` instead of creating an
  unowned `referral_available` balance. `forwardToDomainWorker` now sends a zero
  referral share when no referral is included.
- **Reconciliation.** Added `npm run money:reconcile:ledger`, a read-only comparison of
  `creatorBalances` against `ledgerEntries` that exits non-zero on drift
  (`scripts/money/reconcile-ledger.mjs`).
- **Coverage.** Added worker ledger tests for minor-unit conversion, balanced entries,
  `fee_residual`, unassigned referrals, deterministic IDs, marker fields and flag
  parsing; added a root test that keeps every worker copy identical
  (`workers/payments/test/ledger.test.ts`, `tests/unit/ledger.test.ts`).

### Verification

- `cd workers/{support,store,bookings,community,payments} && npx tsc -p tsconfig.json` -
  passed.
- `cd workers/payments && npm test` - 7 files, 71 passed.
- `npm run typecheck`, `npm run lint:ci`, `npm run format:check` - passed.
- `npm test` - 13 files, 89 passed.
- `node scripts/money/backfill-ledger.mjs` and
  `node scripts/money/reconcile-ledger.mjs` without credentials - fail closed as
  expected.
- Firestore emulator with synthetic creators (RWF + USD): dry-run planned 3 creators /
  8 entries, `--apply` wrote them, an immediate replay skipped all 3 as already
  migrated, and `money:reconcile:ledger` reported 0 mismatches.
- Added a synthetic in-emulator `payment_credit`; reconciliation still passed. Injecting
  one minor-unit drift made reconciliation exit 1 with the exact creator/currency;
  removing the drift restored exit 0. `--handle=alice` scoped both scripts correctly.
  No production data was used.

### Remaining

- `MONEY_LEDGER_ENABLED` is still `false`; dual-write and backfill have not run against
  any environment.
- Firestore rules for the new collections are not implemented. The scripts are
  emulator-tested but have not run against a sanitized production export. Do not enable
  the flag until rules and a reviewed dry-run are complete.
- P1 conservation (largest-remainder allocation) and the P1 withdrawal UI are unchanged.

## 2026-11-15 - Multi-currency P0 fixes

Findings: money audit §10 items 1-3.

### Changed

- **Server pricing (P0 price/currency).** Store products, gatherings and community
  tiers now derive currency from the stored item, reject a mismatched client
  `currency`, and never use an RWF `price`/`ticketPrice` as the USD amount. A missing
  `priceUSD` fails with `INVALID_PRODUCT_PRICE`/`INVALID_AMOUNT` instead of charging a
  wrong numeric value (`workers/payments/src/services/pricing.ts`).
- **Withdrawal approval (P0 payout).** Admin approval reads the request from Firestore
  inside the transaction, requires `pending`, validates the currency and amount, writes
  `currency` to the payout, rejects double approval, and debits
  `pendingPayoutUSD` for USD requests (`components/pages/Dashboards/Admin/AdminPage.tsx`,
  `lib/payouts/currency.ts`).
- **USD cents (P0 precision).** Payment webhooks and the gathering/community/support/
  bookings callbacks round using the generated currency registry instead of
  `Math.round`; support/bookings encode fractional USD as `doubleValue`, not
  `integerValue` (`workers/*/src/money/amount.ts`,
  `workers/payments/src/services/webhooks.ts`, `workers/*/src/services/callback.ts`).
- **Ledger foundation (Phase 2 prep).** Added pure, balanced double-entry primitives
  with deterministic entry IDs: payment credits, withdrawal hold/settlement/release,
  per-account balances, net-balance assertions and reconciliation
  (`lib/money/ledger.ts`, `tests/unit/ledger.test.ts`). The Phase 2 dual-write below
  builds on this foundation.

### Verification

- `cd workers/payments && npx tsc -p tsconfig.json` - passed.
- `cd workers/payments && npm test` - 6 files, 63 passed.
- `cd workers/{support,bookings,community,store} && npx tsc -p tsconfig.json` - passed.
- `npm run typecheck`, `npm run lint:ci`, `npm run format:check` - passed.
- `npm test` - 13 files, 87 passed.

### Remaining

- The P0 fixes are not committed or deployed.
- Booking/profile aggregates (`totalSupport`, `totalSpent`) still have no currency
  dimension; that is ledger/Phase 2-3 work.
- Client fallbacks such as `priceUSD ?? price` still exist for display in several
  components; the server now fails closed, but the UI should be cleaned up in Phase 4.

## 2026-11-06 - Platform hardening and creator-page performance (non-rules)

Findings: AGA-PAY-004 (partial), AGA-PERF-005 (partial), AGA-PERF-001 (partial).

### Changed

- **Durable dispatch outbox (AGA-PAY-004).** A `paymentDispatches/{paymentRef}`
  record is now written in the same Firestore commit as the successful state
  change and credit marker. The domain callback runs immediately; if it fails or
  the worker crashes, a scheduled handler retries it with exponential backoff
  (max 10 attempts) and a `dead` terminal state. Retries never re-credit because
  the credit marker still gates the transition
  (`workers/payments/src/services/eventProcessor.ts`,
  `workers/payments/src/services/webhooks.ts`).
- Added a `scheduled` handler and a 5-minute cron trigger
  (`workers/payments/src/index.ts`, `workers/payments/wrangler.jsonc`).
- Webhook dispatch now reports success/failure instead of swallowing errors, so
  failed domain callbacks are visible in the outbox instead of only in logs.
- **Atomic, idempotent ledger writes (AGA-PAY-005).** The support, store and
  bookings callbacks replaced read-modify-write `incrementField` calls with one
  Firestore commit per payment that applies every counter as a field transform
  and creates `paymentApplications/{paymentRef}` with an `exists: false`
  precondition in the same commit. A replayed callback returns `duplicate`
  instead of crediting twice, and concurrent payments can no longer overwrite
  each other's balances. Stock decrements and buyer totals moved into the same
  commit; income records now use deterministic document IDs
  (`{ref}_platform`, `{ref}_creator`, `{ref}_referral`) so a retry overwrites
  rather than duplicates them (`workers/{support,store,bookings}/src/{firestore,
  services/callback}.ts`).
- **Private media proxy (AGA-SEC-003, app side).** Private post media no longer
  appears in the DOM as a bare asset URL. The authenticated
  `POST /api/media/sign` route checks entitlement (creator, admin, or an existing
  `supportedCreators` relationship) and returns a post-scoped HMAC signature;
  `GET /api/media/stream` verifies the signature and expiry, re-checks that the
  requested key belongs to the post, then streams the bytes with
  `Cache-Control: private`. Media rendering goes through
  `components/parts/public/MediaAsset.tsx`, which skips the element entirely when
  access is unresolved or denied (`lib/mediaAccess.ts`, `lib/mediaSigning.ts`,
  `lib/usePostMediaSrc.ts`, `app/api/media/**`). Hosts the proxy may fetch from
  are allowlisted (`MEDIA_ALLOWED_HOSTS`) to prevent post metadata from turning
  the route into an SSRF pivot.
- **Private bucket and key migration (AGA-SEC-003, storage side).** Private
  uploads now go to the unexposed `agaseke-private` R2 bucket and return an
  object key; the app stores keys instead of public URLs. The upload worker
  serves them at `GET|HEAD /private/{key}` only with a valid
  `media:{key}:{exp}` HMAC, rejects malformed/traversal/oversized keys, reports
  `Accept-Ranges`/`Content-Length`, and marks responses `no-referrer`. The app's
  stream route redirects signed private keys to that worker. Upload and edit
  forms block switching a post's privacy without re-uploading, and creator,
  supporter and public renderers resolve post media through
  `MediaAsset`/`usePostMediaSrc` (`workers/upload/src/{index,mediaSign}.ts`,
  `scripts/migrate-private-media.js`,
  `components/parts/public/MediaAsset.tsx`). The migration script is a dry run
  by default, copies idempotently, and rewrites
  `contentUrl`/`coverUrl`/`thumbnailUrl`/`mediaUrls` to keys while warning about
  external URLs.
- **Creator page hydration/CLS (AGA-PERF-005).** Public post dates render with a
  fixed locale and UTC timezone so server and client HTML match; the support and
  share modals are lazy-loaded and mounted only when opened, reducing initial
  client JS.
- **Creator page media (AGA-PERF-001).** Banner/avatar/partner images now declare
  explicit dimensions, `sizes`, `decoding`, and loading priority; partner logos
  are lazy-loaded below the fold. Added Google avatar and gstatic hosts to
  `next.config.ts` `images.remotePatterns` for future `next/image` use.

### Verification

- Media signatures: valid signature accepted; wrong post id, tampered signature
  and expired signature rejected (ad-hoc Node check against the compiled
  `lib/mediaSigning.ts`).
- `cd workers/upload && npm test` - 2 files, 11 passed (cross-checks the worker
  verifier against the app signer and covers key validation).
- `cd workers/upload && npx tsc --noEmit` - passed.
- `cd workers/payments && npx tsc --noEmit` - passed.
- `cd agaseke && npx tsc --noEmit` - passed.
- `cd workers/payments && npm test` - 55 passed (2 new outbox tests).
- ESLint: 0 errors on the changed files (warnings only).

### Remaining

- Ledger aggregates are now applied atomically per payment, but the support,
  store and bookings workers still have no test harness (only the payments
  worker runs Vitest), so the new commit path is covered by typecheck only.
- Balances are not yet rebuildable from `platformIncome`/`creatorIncome`; the
  ledger remains the source for reporting, not for recomputing counters.
- A live Lighthouse/Web Vitals re-measure is still needed before claiming a
  creator-page performance improvement.
- AGA-SEC-003 still needs its operational migration: deploy the
  `UPLOADS_PRIVATE_BUCKET` binding, run
  `scripts/migrate-private-media.js --apply` for legacy private posts, then
  remove the `assets.agaseke.me` public custom domain. Until that is done,
  legacy objects that were already public remain fetchable by anyone who knows
  the key.
- Private article HTML is still serialized to every visitor and blurred
  client-side (`ArticleReaderPage`). Closing that requires an entitlement-checked
  body endpoint; the media proxy alone does not protect article text.
- Inline images uploaded through `RichTextEditor` still use the public upload
  path, including inside private articles.
- Open Graph metadata for private posts now falls back to a generic
  title/description/image and `noindex`, but the Firestore document and its media
  keys remain readable until the rules in `docs/RULES_FOLLOWUP.md` are deployed.
- `creatorContent` documents are still readable without a supporter check until
  the rules in `docs/RULES_FOLLOWUP.md` are deployed, so private post metadata
  (including keys) is not yet protected at the database layer.


## 2026-11-05 - Phase 1 (payments correctness and forgery)

Finding IDs: AGA-PAY-001, AGA-PAY-002, AGA-PAY-003.

### Changed

- Added a forward-only payment state machine with legacy status normalisation
  (`workers/payments/src/services/stateMachine.ts`).
- Added server-authoritative pricing for support, gift, store, booking,
  gathering and community payments. Client-supplied monetary and identity fields
  are rejected; creator UID, fees, referral and processor cost are derived from
  Firestore (`workers/payments/src/services/pricing.ts`,
  `workers/payments/src/services/repository.ts`).
- Added initiation idempotency via `paymentAttempts/{idempotencyKey}` with a
  request hash and provider-ref replay (`services/idempotency.ts`,
  `services/initiate.ts`).
- Rewrote MoMo and card initiation to use the derived amount and to store a
  sanitized `retryPayload`. Card merchant references are now unguessable
  (`services/momo.ts`, `services/card.ts`).
- Rewrote Paypack and Pesapal webhook handling:
  - Paypack HMAC (base64 HMAC-SHA256 of the raw body, constant-time compare)
    plus stored `ref`/`amount`/`currency` comparison.
  - Pesapal IPN is verified through `GetTransactionStatus`, matching merchant
    reference, tracking ID, amount and currency. Pesapal `INVALID` and
    status code `0` now map to `failed` (previously they were treated as
    pending), matching Pesapal's documented status codes.
  - Events are deduped in `webhookEvents/{eventId}`. If the compare-and-swap on
    the transaction conflicts, the event marker is released so a provider retry
    can reapply it instead of being swallowed as a duplicate.
  - Success writes `paymentCredits/{paymentRef}` in the same commit as the
    transaction state change.
  - Forward-only transitions replace the old "anything not successful becomes
    failed" behaviour (`services/webhookVerify.ts`,
    `services/eventProcessor.ts`, `services/webhooks.ts`).
- Added typed 4xx responses for `PaymentRequestError` and `WebhookError` and
  `Idempotency-Key` header support (`src/index.ts`, `src/types.ts`).
- Updated retry to rebuild a request from identifiers only and to reject a
  second retry of the same transaction (`services/retry.ts`).
- Updated client call sites to send identifiers plus non-authoritative metadata:
  `lib/paymentsService.ts`, `SupportModal`, `CheckoutModal`,
  `GatheringDetailPage`, `GatheringsTab`, booking/store `PayClient`, and the
  community worker subscription/renewal initiation.
- Added `docs/PAYMENTS.md` and `docs/RULES_FOLLOWUP.md`.
- Added Vitest and 53 Phase 1 tests under `workers/payments/test/` covering the
  full state transition matrix, terminal immutability, pending-never-fails,
  replay/idempotency, conflict recovery, tampered amount/currency/reference
  rejection, forged Pesapal tracking references, Paypack signature validation,
  server-authoritative pricing and forbidden client fields.

### Verification

- `cd workers/payments && npx tsc --noEmit` - passed.
- `cd agaseke && npx tsc --noEmit` - passed.
- `cd workers/payments && npm test`:

```
 Test Files  5 passed (5)
      Tests  55 passed (55)   # 53 Phase 1 + 2 outbox
   Duration  837ms
```

- ESLint on the new payments files passes except for pre-existing
  `firestore.ts:180` (`no-explicit-any`) and two pre-existing `index.ts`
  warnings (`badRequest`, anonymous default export). Client files still have
  pre-existing `no-explicit-any` and React hook warnings unrelated to Phase 1.

### Deferred

- Durable credit outbox (AGA-PAY-004 / C2) and atomic ledger aggregates
  (AGA-PAY-005 / C3) are Phase 3. Phase 1 writes a `paymentCredits/{paymentRef}`
  marker in the same commit as the successful state change so replayed webhooks
  cannot credit twice, but domain-worker retries are still Phase 3.
- A failed domain callback after a verified success is logged but not retried
  automatically; a durable outbox will cover this in Phase 3.
- Multi-product store carts remain single-product for fulfillment, matching the
  existing store worker model. The payments worker still prices the first
  product plus total quantity.
- Firestore rule changes (transaction reads, tracking-ID exposure, private media)
  are out of scope and recorded in `docs/RULES_FOLLOWUP.md`.
