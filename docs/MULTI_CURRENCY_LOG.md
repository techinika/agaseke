# Multi-currency implementation log

## 2026-11-17 (session, proceeding from Phase 4 with owner-delegated defaults)

### Decisions/defaults applied (pending founder confirmation)
- **FX:** primary `fawazahmed0/currency-api`, fallback `open.er-api`; base USD; cached snapshots only on request paths; refresh worker/cron; stale/missing/expired => reject conversions/quotes (no last-known fallback). Spread configurable (`FX_SPREAD_BPS`, default 150 bps) applied only to withdrawal conversions and cross-currency item pricing/quotes.
- **Launch order:** RWF + USD production paths first; KES/UGX/TZS added as config (registry+rails+thresholds+rates) and enabled only after sandbox/rail verification. Config-only proof required (Phase 8).
- **Withdrawals:** convert received balances to creator payout currency at withdrawal (no as-is non-payout withdrawal by default); per-payout-currency thresholds; locked quotes (TTL 10 min default); atomic fx_out/fx_in/hold/release/paid with full rate metadata; idempotent by request id.
- **Fees/rounding:** integer minor-units, largest-remainder allocation, fee half-up, residual to creator (to be finalized/documented).
- **Display:** supporter last-used/country else creator pricing currency; always show original charged currency/amount; indicative equivalents labeled with rate timestamp.
- **History/migration:** legacy fields dual-write then read-only until cutover; historical rounded USD handled via opening-balance adjustment in migration (never rewrite txs). No production/rules changes.

### Changes made (this session, partial)
- **Currency safety (in progress):** removed/started removing silent `|| "RWF"` defaults and missing-currency fallbacks in worker credit/callback paths; callbacks now throw on missing currency (support/store/bookings/community/payment webhooks). Kept legacy RWF field names (`pendingPayout`/`totalEarnings`) for compatibility during dual-write while also supporting per-currency fields.
- **Payments verification/retry:** `webhookVerify`/`retry` no longer assume RWF for missing stored currency; retry/verification fail closed when currency is absent/mismatched instead of defaulting.
- **Compatibility:** restored `lib/payouts/currency.ts` field helpers to legacy-compatible RWF behavior.

### Still pending / not completed
- Full removal of `|| "RWF"` and hardcoded RWF/USD assumptions across UI, comms, bookings/community create paths, tiers/members formatting, and tests; lint/guardrails to forbid pattern.
- Complete per-currency `creatorBalances` projection + reconciliation-as-truth and cutover from legacy `pendingPayout*` fields; ledger enabled & verified (`MONEY_LEDGER_ENABLED`).
- Phase 4 hardening: end-to-end server rail/method enforcement everywhere, FX quote consumption/staleness in all money-moving paths, canonical `prices` map across store/bookings/community/gatherings, idempotency on all credits.
- Phase 5: multi-currency withdrawal conversion plan (fx_out/fx_in) to payout currency with locked quotes/spread and itemized breakdown.
- Phase 6: mobile-first UI (support currency/method selector from server, per-currency balances, original amounts, indicative withdraw total, admin FX health/reconciliation, remove `*1000` hack).
- Phase 7/8: idempotent migration dry-run+comparison, feature-flag cutover, config-only KES/UGX/TZS proof, rules updates in `docs/RULES_FOLLOWUP.md`, monitoring.
- Tests (property/unit/integration/Playwright) and provider sandbox verification; no production/emulator-destructive runs performed.

### Verification
- Edits applied to worker/server/lib files as noted; no full test suite or emulator run executed in this session. Type/lint/test status not fully established for all packages.

## Session (Phase 4 completion pass)
- `lib/priceMap.ts`: canonical `prices` map only; legacy primary `price`/`ticketPrice` applies only to declared currency (or RWF when currency missing), with no cross-currency legacy synthesis.
- `workers/payments/src/services/pricing.ts`: `resolveStoredPrice` treats explicit `prices` as authoritative; removed cross-field legacy fallbacks; booking path now rejects requested-currency mismatch without a locked quote (consistent with other item payments); cross-currency item charges require locked checkout quotes and are reallocated/applied server-side.
- `workers/payments/src/services/{momo,card}.ts`: FX checkout quotes consumed only after transaction persistence/attempt finalization succeeds.
- `workers/community/src/services/{tiers,subscriptions}.ts`, `workers/community/src/types.ts`, `workers/bookings/src/services/create.ts`, `workers/bookings/src/types.ts`: tier/renewal/booking pricing uses sanitized canonical prices and declared currency validation; no RWF-only payout-field assumption in callback credit path.
- Dashboard/editor/type cleanup: removed remaining legacy per-currency price fields from source models/forms/payloads (`BookingsPage`, `CommunityPage`, `GatheringsForm`, `ProductForm`, `storepage/ProductModal`, shared/feature/types) and aligned to canonical `prices` + currency.
- Payment/FX runtime already enforced in worker: `/api/payments/quote` built from cached `fxRates/latest` (no request-path provider calls), staleness/TTL checks, persisted quote with request binding/owner, quote load validates match/expiry/ownership, cross-currency item pricing requires locked quote, idempotent initiation attempts, and idempotent credit/dispatch handling in webhook/event processing.

### Verification
- `cd workers/payments && npx vitest run` → 9 files, 88 passed.
- `npx vitest run tests/unit/price-map.test.ts tests/unit/store-prices.test.ts tests/unit/money-core.test.ts tests/unit/money.test.ts tests/unit/ledger.test.ts tests/unit/payment-rails.test.ts tests/unit/withdrawal-validation.test.ts` → 7 files, 64 passed.
- `npx tsc -p tsconfig.json --noEmit` and `npx tsc -p workers/payments/tsconfig.json --noEmit` → clean.

### Residual notes
- Remaining source `|| "RWF"` occurrences are editor/UI default-currency fallbacks when creator currency is unset (not payment/credit server paths).
- Full app build/lint/emulator/integration/Playwright coverage and Phases 5-8 remain.


## 2026-11-17 (session, Phase 5 complete + Phase 6 progress)
- **Committed/pushed:** `74f22e1` `feat(payouts): implement phase 5 multi-currency withdrawal conversion` on `origin/feat/multi-currency-money` (10 files).
- **Phase 5 implemented (server-only, atomic/idempotent):** `fx_clearing` + `createFxDebit`/`createFxCredit` and exports in `lib/money/{ledger,index}.ts`; locked per-source withdrawal conversion planner/quotes from cached `fxRates/latest` with staleness/TTL/spread and per-source FX metadata in `lib/payouts/withdrawalConversion.ts`; plan-aware hold/settle/release incl. cross-currency `fx_out`→`fx_in` in `lib/payouts/withdrawalLedger.ts`; `POST /api/payouts/withdraw/quote` persists locked `withdrawalQuotes`; withdrawal request consumes/revalidates quotes and records per-source holds/`conversionPlan`/`sourceDebits` (`app/api/payouts/withdraw/route.ts`, legacy single-currency path preserved); admin settlement/release applies plan-aware per-source ledger/fx updates (`app/api/admin/payouts/withdrawals/route.ts`).
- **Creator payouts UI/service:** `lib/payoutsService.ts` quote request + quote-aware submit; `components/pages/Dashboards/PayoutsPage.tsx` supports cross-currency balances, locking conversion quote, and showing conversion/rate/expiry breakdown.
- **Phase 6 progress:** removed `*1000` admin earnings ranking hack and surfaced payout currency + source debit/FX breakdown for withdrawal requests in `components/pages/Dashboards/Admin/AdminPage.tsx`; added indicative cross-currency withdrawal note in creator payouts; added `GET /api/admin/fx/health` for cached snapshot freshness/status.
- **Tests/verification:** added `tests/unit/withdrawal-conversion.test.ts`; `npx tsc -p tsconfig.json --noEmit` clean; `npx vitest run tests/unit/withdrawal-conversion.test.ts tests/unit/withdrawal-validation.test.ts tests/unit/ledger.test.ts` (21 passed); `npx vitest run tests/unit` (23 files, 144 passed). Repo-wide lint has pre-existing issues.
- **Residual/next:** full Phase 6/7/8 (mobile-first server-driven selectors/end-to-end original-amount display everywhere, admin FX reconciliation/health UI, legacy `AdminPayoutsPage` multi-currency refactor, migration/cutover proof, config-only KES/UGX/TZS enablement, rules follow-up, provider sandbox/build/emulator/Playwright coverage). No production or rules changes.

## 2026-11-17 (session, Phase 6 original-charge/currency display + selector hardening)
- **Transaction history original charge:** worker `UserTransaction` API now exposes `sourceCurrency`, `sourceAmountMinor`, and `fxRate` (`workers/payments/src/services/transactions.ts`) and the client type mirrors them (`lib/paymentsService.ts`). Transactions UI shows the charged amount/currency plus the original priced amount when an FX conversion occurred (`app/(main)/transactions/page.tsx`).
- **Payment callback:** success copy now formats amounts via `formatCurrency` and shows the original amount/currency alongside the charged amount (`components/parts/PaymentCallback.tsx`).
- **Supporter/creator currency labels:** removed hardcoded `RWF` from supporter totals, message/giveaway minimum-support copy, creator pending-payout copy, gathering revenue, and gathering unlock copy; these now use the creator/gathering currency when available and explicitly label mixed/aggregate values (`SupporterSpace`, `MessageTab`, `ActiveGiveawayCard`, `GiveawayTab`, `GatheringsTab`, `ProfilePage`, `GatheringsPage`; wired creator currency through PublicProfile/CreatorPage/GiveawaysPage).
- **Store/cart currency correctness:** cart now rejects adding products from a different currency than the current cart (folder bundles also reject mixed currencies) so subtotal/checkout totals cannot mix currencies (`components/parts/public/StoreTab.tsx`). Purchase history and order tracking resolve each item's currency from its product and label mixed-currency totals explicitly (`MyPurchasesModal`, `OrderTrackingModal`).
- **Admin aggregates:** removed false `RWF` labels from cross-currency admin totals/charts/breakdown and relabeled as “across currencies” (per-currency breakdowns remain a future data-model improvement for `platformIncome`/`payouts`, which do not store currency).
- **Verification:** `npx tsc -p tsconfig.json --noEmit` clean; `cd workers/payments && npx tsc -p tsconfig.json --noEmit` clean; `cd workers/payments && npx vitest run` 9 files/88 passed; `npx vitest run tests/unit` 23 files/144 passed. Targeted ESLint still reports pre-existing `any`/unused warnings in store components.
- **Residual:** admin “Top Earners” legacy `totalEarnings` still assumes creator primary currency; per-currency admin aggregates require storing currency on `platformIncome`/`payouts`; store order documents should eventually persist the charged currency; remaining editor `|| "RWF"` defaults and Phase 7/8 work unchanged.

## 2026-11-17 (session, Phase 6 store/dashboard currency hardening)
- **Store cart/order single-currency enforcement:** storefront cart rejects mixed-currency products and mixed-currency folder bundles (`StoreTab`); manual store orders similarly reject mixed-currency products and now persist `currency` on the order (`OrderForm`).
- **Store dashboard displays:** order lists, coupons, bundle editors, and legacy product/coupon/giveaway forms now use the creator/selected-product currency instead of hardcoded `RWF` (`OrdersList`, `CouponsList`, `CouponModal`, `CouponForm`, `FolderForm`, `FolderModal`, `GiveawayForm`); wired creator currency from `StorePage`.
- **Legacy price field correctness:** product save now writes the legacy `price` field in the declared currency (`primaryAmount`) instead of preferring `prices.RWF`, keeping `price`/`currency` consistent (`ProductForm`, storepage `ProductModal`).
- **Gathering currency correctness:** gathering create/update now stores the selected/creator currency for tiered/supporters events (not forced `RWF`), legacy `ticketPrice` uses the selected currency, and the minimum-support label reflects the currency (`GatheringsForm`).
- **Verification:** `npx tsc -p tsconfig.json --noEmit` clean; `npx vitest run tests/unit` 23 files/144 passed.

## 2026-11-17 (session, per-currency platform income + admin aggregates)
- **Income docs now carry currency:** support/store/bookings/community/payments callbacks write `currency` on `platformIncome` and `creatorIncome` documents (additive; legacy docs without the field are treated as `RWF` when aggregating).
- **Admin dashboard is per-currency:** platform income, payouts processed, pending payouts (`pendingPayout` + `pendingPayout{CODE}`) and successful transactions are grouped by currency. Cards show the single-currency total or “Multi-currency”, with a per-currency breakdown detail instead of summing unlike currencies (`components/pages/Dashboards/Admin/AdminPage.tsx`).
- **Notes:** legacy `platformIncome`/`payouts` docs without `currency` fall back to `RWF`; monthly chart remains cross-currency. `community`/`bookings` worker `tsc` still report pre-existing type errors unrelated to this change.
- **Verification:** root `tsc` clean; payments/support/store worker `tsc` clean; payments worker tests 88 passed; root `tests/unit` 144 passed.
