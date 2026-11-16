# Multi-currency money audit (Phase 0)

Status: **Phase 0 complete; Phase 1 foundations implemented.** Branch
`feat/multi-currency-money`, created from `c7b1188`. Phase 0 added this audit; Phase 1
added the generated currency registry, the `Money` library, property tests and a
display-only FX rate adapter. No production money path was changed.

Scope: verify the "Agaseke for Creators: Multi-Currency Architecture Prompt" against the
repository, inventory every money-bearing collection/field, confirm provider capabilities
from public docs, and propose a data model and migration plan. Production data, Firestore
rules and live providers were **not** touched.

Authoritative constraints for the later phases:

- Store money as integer minor units; never floats.
- A missing currency is an error; never default to `RWF`.
- Configure currencies; never hard-code if/else branches per currency.
- Balances are derived from an append-only ledger; no lost updates.
- No client-side balance or payout writes.
- Missing FX rate means the operation is rejected.
- No production data or real money in tests.

---

## 1. Executive summary

The prompt's core diagnosis is correct. The app is a two-currency (`RWF`/`USD`) system
implemented with string codes, major-unit numbers, duplicated `isUSD` branches, and
single-currency payout fields. There is **no ledger**; there are per-document counters.
Some of those counters are already written atomically, but the ledger, reconciliation,
persisted FX and multi-currency payout layers do not exist. Phase 1 added a display-only
rate adapter; it is not used for charging, crediting or payouts.

Two findings are worse than the prompt states and should block any multi-currency
rollout until fixed:

1. **A client can charge a product/tier/ticket in the wrong currency at the other
   currency's numeric price.** `resolvePayment` accepts `body.currency` and does
   `priceUSD ?? price`; if `priceUSD` is missing, a `10,000 RWF` product is charged as
   `10,000 USD` (roughly a 1,000x overcharge). The inverse undercharges.
2. **Approving a USD withdrawal decrements the RWF balance.** Admin approval always
   runs `pendingPayout: increment(-amount)`, regardless of the request currency, and the
   payout document does not even record a currency.

A third correctness issue is systemic: USD revenue splits are rounded to whole dollars
before crediting and before writing income records, and ledger increments are coerced to
integers. Cents are lost or misallocated on every USD payment.

Provider reality (public docs, not sandbox-confirmed):

- **Paypack** is a Rwanda-only mobile-money rail. Its cashin/cashout API has no currency
  parameter; amounts are implicitly RWF. The current "MoMo is RWF-only" rule is correct.
- **Pesapal** accepts ISO currency codes for card collection, settles in the merchant
  country's local currency and (per older API docs) may silently convert to the local
  currency when the selected payment option does not support the requested currency.
  RWF card collection/settlement, fees, conversion rate source and API 3 behaviour are
  **not confirmed** and must be tested in sandbox with the real merchant account.

Recommended sequence remains: RWF + USD first, finish the ledger and payout correctness,
then add KES/UGX/TZS with an FX layer. Do not enable a third currency before Phase 3
(payout correctness) is complete.

---

## 2. Prompt claims verified against the codebase

| # | Claim | Verdict | Evidence |
|---|---|---|---|
| 1 | Money is stored as major units / floats | **True** | `transactions.amount`, `storeProducts.price`, `creators.totalEarnings`, `withdrawRequests.amount`, etc. are plain numbers. Revenue is computed with `totalAmount * percentage` (`workers/payments/src/revenue.ts:20-24`, `:40-52`). No minor-unit type exists. |
| 2 | Only `RWF` and `USD` are supported, via `isUSD` branches | **True, with one partial escape hatch** | `normalizeCurrency` accepts only RWF/USD (`workers/payments/src/services/pricing.ts:128-135`). `isUSD` appears in support/store/bookings callbacks (`:26-29` each), payments webhooks (`:262-264`) and community (`:343-346`). `payoutsService`/`creatorDashboardService` read dynamic `pendingPayout${code}`, but only `pendingPayoutUSD` is ever written. |
| 3 | Currency is a string everywhere and defaults to `RWF` | **True** | `types/currency.ts:34`; `lib/format/money.ts:1`; `payoutsService.ts:45`; `creatorDashboardService.ts:44`; `SupportModal.tsx:35-40,50`; `pricing.ts:128`; callbacks (`txData.currency) || "RWF"`); see the full list in §4. |
| 4 | There is no transactional ledger; balances are updated with increments | **Partial** | Support/store/bookings now use one commit per payment with field transforms plus a `paymentApplications/{ref}` `exists:false` marker (`workers/{support,store,bookings}/src/firestore.ts:147-204`; `docs/FIX_LOG.md:23-32`). This is still a counter update, not an append-only ledger. Community and gathering credits still use `firestoreIncrement` (`workers/community/src/services/subscriptions.ts:367-383`; `workers/payments/src/services/webhooks.ts:304-305,320-321`). No ledger/reconciliation collection exists. |
| 5 | Revenue splits use floats with no defined rounding | **True** | `revenue.ts:20-24` and `:40-52` return raw floats. `pricing.ts:341-355` rounds each share independently. Webhooks round to whole units before callbacks (`webhooks.ts:213-215`). |
| 6 | Payouts are single-currency and default to RWF | **True** | One `creatorCurrency` and one `pendingAmount` in `PayoutsPage.tsx:38,46,124`; `fetchPayoutOverview` displays extra balances but withdrawal uses only the creator currency (`payoutsService.ts:68-83`); request stores a single amount/currency (`payoutsService.ts:150-160`). |
| 7 | Currency is client-chosen and USD prices are stored as a second field | **True, and dangerous** | `pricing.ts:390,452,575,632,681` pass `body.currency` into `normalizeCurrency`; prices use `priceUSD ?? price`. `SupportModal.tsx:92,264` forces card for USD. See §5. |
| 8 | There is no FX layer | **True for money movement** | No persisted rates, quotes or settlement conversion; the only "conversion" is Admin analytics multiplying USD earnings by `1000` (`AdminPage.tsx:508`). A display-only adapter now exists (`lib/money/rateSources.ts`, `lib/money/display.ts`) and is not wired into any charge or payout. |
| 9 | Types hard-code the RWF/USD union | **True** | `types/store.ts:13-14`, `types/booking.ts:37-38`, `types/community.ts:6-7`, `features/store/types.ts:13`, `features/community/types.ts:6-7`, `workers/community/src/types.ts:17-18`. |
| 10 | Money tests are formatting-only, no property tests | **True** | `tests/unit/money.test.ts` (34 lines) only checks `lib/format/money.ts`, which itself hard-codes zero decimals (`lib/format/money.ts:12-15`). No `fast-check`/property suite; only 5 worker payment test files exist. |
| 11 | Provider capability is assumed | **True** | Paypack is called with an amount only (no currency), and momo rejects non-RWF (`momo.ts:35-38`). Pesapal receives `resolved.currency` and `amount` (`card.ts:140-145`) with no capability check, conversion policy or settlement mapping. |

Additional documentation drift:

- `docs/RULES_FOLLOWUP.md` lists `paymentCredits/{paymentRef}` as the server-only marker,
  but the code writes `paymentApplications/{paymentRef}`. Whatever rules exist for the
  former will not protect the latter.
- `docs/PAYMENTS.md:125` says atomic ledger aggregates are still Phase 3, while
  `docs/FIX_LOG.md:23-32` describes the support/store/bookings atomic counter work. Both
  are true: counters became atomic; the ledger did not.
- `docs/PLAN_MOBILE_UI.md:214` records the UI's 90% creator share. The server fallback is
  80% (`revenue.ts:17`, `webhooks.ts:188`), while `wrangler.jsonc:25-28` sets 90%. If an
  env var is missing, the UI and server disagree.
- The deployed fee config (`0.09` platform with referral + `0.90` creator + `0.01`
  referral = 100%) differs from the code fallbacks (`0.15` + `0.80` + `0.01` = 96%).
  Fallback defaults must not be able to under-allocate money.

---

## 3. Money-bearing collections and fields

No schema file, `firebase.json`, emulator config or sanitized export exists in the repo.
A client-facing `rules.txt` exists, but it does not cover the new money collections (see
§11). This inventory is derived from writes/reads. Field types are the *stored* types;
none use minor units.

| Collection | Money/currency fields | Written by | Notes |
|---|---|---|---|
| `currencies/{code}` | `code`, `symbol`, `payoutThreshold`, `minSupportAmount` | Admin config | No `minorUnit`, `enabled`, `maxSupportAmount` or country mapping. Defaults come from `lib/adminConfigService.ts:161-166`. |
| `countryCurrencies/{id}` | `countryCode`, `currencyCode`, `isDefault` | Admin config | Display/mapping only; payments never consult it. |
| `creators/{handle}` | `currency`, `totalEarnings`, `totalEarningsUSD`, `pendingPayout`, `pendingPayoutUSD`, `totalSupporters`; dynamic `pendingPayout${code}`/`totalEarnings${code}` read | Workers + Admin | Master balance document. Only RWF/USD fields are written. Creator can own the doc, so rules must protect these fields. |
| `profiles/{uid}` | `currency`, `totalSupport`, `totalSupportedCreators`, `totalSpent`, `totalPurchases` | App + workers | Buyer totals are single-currency aggregates with no currency dimension. |
| `storeProducts/{id}` | `price`, `priceUSD`, `currency`, `platformFeePayer` | Creator UI | `priceUSD` optional; `getProductCurrency` defaults to RWF (`types/store.ts:77-78`). |
| `storeOrders/{id}` | `productPrice`, `platformFee`, `totalAmount`, `currency` | Store callback | Auto-ID, written outside the credit commit. |
| `sales/{id}` | `productPrice`, `totalAmount`, `platformFee`, `creatorEarnings`, `referralEarnings`, `currency` | Store callback | Auto-ID, written outside the credit commit. |
| `transactions/{ref}` | `amount`, `currency`, `platformFee`, `creatorEarnings`, `referralEarnings`, `processorCost`, `discount` | Payments worker | Server-derived at initiation. Major units. |
| `paymentAttempts/{key}` | `amount`, `currency`, `requestHash` | Payments worker | Idempotency reservation. |
| `paymentApplications/{ref}` | `creatorShare`, `totalAmount`, `currency`, `status` | Support/store/bookings callbacks | Credit marker; not a ledger. Listed as `paymentCredits` in `RULES_FOLLOWUP.md`. |
| `paymentDispatches/{ref}` | no money fields (payload may contain amounts) | Payments worker | Durable callback outbox. |
| `platformIncome/{id}` | `amount`, `txRef`, `reason` | All credit paths | **No currency field.** Deterministic IDs for support/store/bookings, auto-ID for gathering/community. |
| `creatorIncome/{id}` | `creatorUid`, `amount`, `txRef`, `reason` | All credit paths | **No currency field.** Same ID inconsistency. |
| `supportedCreators/{id}` | `amount`, `currency`, `txRef` | Support callback | Deterministic `{supporterId}_{creatorId}` for signed-in users; anonymous uses auto-ID. The deterministic doc's `amount` is overwritten, not summed. |
| `withdrawRequests/{id}` | `amount`, `amountMinor`, `currency`, `provider`, `rail`, `status`, `method`, `accountNumber` | Server withdrawal route | Provider/rail resolved from payout config; no FX quote or provider execution yet. |
| `payouts/{id}` | `amount`, `amountMinor`, `currency`, `provider`, `rail`, `status`, `method` | Admin settlement route | Created on approval; not yet linked to an executed provider disbursement. |
| `bookingRequests/{id}` | `amount`, `currency`, `paymentStatus` | Booking flow + callback | Also patched by the callback. |
| `creatorGatherings/{id}` | `ticketPrice`, `priceUSD`, `currency`, `attendeesCount` | Creator UI | Same two-price pattern. |
| `gatheringsAttendance/{id}` | no currency; attendance only | Payments webhooks | Amount lives on `ticketSales`. |
| `ticketSales/{id}` | `ticketAmount` (no currency) | Payments webhooks | Currency is only on the parent transaction. |
| `communityTiers` (embedded + `workers/community`) | `price`, `priceUSD`, `currency` | Creator UI | `workers/community/src/services/tiers.ts:23,54`; `workers/bookings/src/services/create.ts:82`. |
| `communitySubscriptions/{id}` | tier reference; amounts on transactions | Community worker | Credit path is non-atomic and has no marker. |
| `giveaways/{id}` | `minSupportAmount` | Creator UI | No currency field; UI renders `RWF` (`GiveawayDetail.tsx:82`). |
| `verificationRequests/{id}` | `payoutPreference`, payout account | Creator UI | Determines MoMo vs bank, but not currency. |

Money-bearing but not yet verified in runtime data: `creatorContent` prices (paid posts),
`communityMessages`/gift metadata, referral records, and any admin-generated reports.
They do not appear to be sources of truth for balances.

---

## 4. Currency defaults and duplication

These are the places that silently turn an unknown/missing currency into RWF:

- Types/formatting: `types/currency.ts:34,60-70`; `lib/format/money.ts:1,12-15,41-44`;
  `types/store.ts:77-78`; `features/store/types.ts:88-89`.
- Payments: `pricing.ts:128` (`|| "RWF"`), `pricing.ts:70-74` and `:241-253`
  (hard-coded RWF/USD min/max), `revenue.ts:15-18,37-38` (hard-coded percentages).
- Callbacks: `workers/support/src/services/callback.ts:26-29`; store `:26-29`;
  bookings `:26-29`; payments `webhooks.ts:261-264,376`; community
  `subscriptions.ts:343-346`.
- App services: `payoutsService.ts:45` (and `:52-66` dynamic-field probing);
  `creatorDashboardService.ts:44` and `:68-75`.
- Support UI: `SupportModal.tsx:35-40,50,56,92,109-110` (RWF/USD map and forced card).
- Payout UI: `PayoutsPage.tsx:38,46,103,124`.
- Admin analytics: `AdminPage.tsx:422,508,850` (USD ordering, `*1000`, `|| "RWF"`).
- Public pages: `StartPage.tsx:199-201`, `SettingsPage.tsx:90-93`,
  `PayoutPolicyPage.tsx:32`.
- Duplicate type definitions: `types/store.ts` and `features/store/types.ts` both
  define `getProductCurrency`/`getProductPrice` with a RWF fallback.

Any migration that adds a currency must remove these fallbacks first. Otherwise an
unknown code is credited to RWF.

---

## 5. Pricing and crediting: defects found

### P0 — wrong-currency price selection (overcharge/undercharge)

`resolvePayment` lets the client choose `body.currency` for store, booking, gathering and
community payments. It then reads `priceUSD ?? price` (or `tier.priceUSD ?? tier.price`)
for USD and `price` for RWF (`pricing.ts:452-455,575-578,632-635,681-683`).

Consequences:

- If `priceUSD` is missing, a creation that costs `10,000 RWF` can be charged
  `10,000 USD`.
- If the product is priced in USD and the client sends `RWF`, the USD number is charged
  as RWF (undercharge).
- A client can select USD even when the registry has not enabled USD, because
  `normalizeCurrency` only checks the hard-coded pair.

This must be fixed before any new currency is introduced. The correct model is a
per-currency price map with no client-selected conversion at charge time.

### P0 — USD cents are rounded away

- Webhooks round `platformShare`, `creatorShare` and `referralShare` to whole units
  before sending callbacks (`webhooks.ts:213-215`).
- Support/bookings income writes use `integerValue: String(platformShare/creatorShare)`
  (`support/callback.ts:45-60`; `bookings/callback.ts:48-72`). A `$1.00` support with
  10/90/1 splits becomes `$0` platform, `$1` creator, `$0` referral.
- `firestoreIncrement` coerces every increment to
  `integerValue: String(Math.round(val))` (`workers/payments/src/firestore.ts:349-381`,
  line 366). Community and gathering credits use it (`subscriptions.ts:367-383`;
  `webhooks.ts:304-305,320-321`).
- `supportedCreators` writes `amount` as a rounded integer even for USD
  (`support/callback.ts:72,83`).

### P1 — revenue split allocation is not conservation-safe

`pricing.ts:341-355` rounds each share independently after multiplying by a percentage.
For RWF, independent rounding can fail to allocate the total. For USD, the webhook's
pre-rounding loses cents. There is no "largest remainder" or explicit residual rule.
The code fallback shares (`0.15 + 0.80 + 0.01 = 0.96`) also disagree with deployed
config (`0.09 + 0.90 + 0.01 = 1.00`). Both must be made explicit and tested.

### P1 — community and gathering credits are non-atomic and not idempotent

Community subscriptions write the subscription, income docs, balance increments and
chat membership as separate operations (`subscriptions.ts:330-383`). Gathering tickets do
the same (`webhooks.ts:273-320`) and write `ticketSales`/`gatheringsAttendance` with
auto-IDs. A retry after a partial failure can double-credit or leave a paid subscription
without a balance. There is no `paymentApplications` marker in these paths.

Even the "atomic" paths are only partly atomic: `platformIncome`, `creatorIncome`,
`storeOrders`, `sales`, `supportedCreators` and `bookingRequests` are written **before**
the marker commit (`support/callback.ts:45-135`; `store/callback.ts:52-165`;
`bookings/callback.ts:48-105`). Income docs use deterministic IDs and overwrite safely,
but `storeOrders`/`sales` use auto-IDs and can duplicate on retry. Anonymous
`supportedCreators` can duplicate too.

### P1 — withdrawal approval corrupts balances

`AdminPage.tsx:804-827` always decrements `pendingPayout` (RWF), even when the request
is in USD. It also:

- creates `payouts` without a `currency`;
- does not read the request status inside the transaction, so a repeated approval can
  decrement twice;
- keys `payouts.creatorId` by `handle` while `withdrawRequests.creatorId` is the uid.

The creator side is also single-currency: `PayoutsPage.tsx:46` uses
`creator.pendingPayout` for the withdrawable amount, `:103` uses `parseInt` (loses USD
cents), and `:124` submits only `creatorCurrency`. A creator whose main currency is RWF
cannot withdraw a USD balance.

### P2 — thresholds and display are currency-blind

- `payoutsService.ts:60-66` falls back to `10000` for every currency. A USD threshold
  becomes `$10,000` unless explicitly configured.
- `formatCurrency`/`formatMoney` force zero decimals (`types/currency.ts:60-63`;
  `lib/format/money.ts:12-15`), so `$1.50` displays as `$2`. `parseMoneyInput` rounds
  (`lib/format/money.ts:41-44`).
- Admin analytics orders by `totalEarningsUSD` and uses `*1000` to rank creators
  (`AdminPage.tsx:422,508`), which is not an FX rate.
- `creatorDashboardService.ts:68-75` and `payoutsService.ts:68-77` only ever display the
  creator's main currency plus USD, even if other balances exist.

### P2 — duplicate sources of truth

- `DEFAULT_CURRENCY` is defined in both `types/currency.ts:34` and
  `lib/format/money.ts:1`.
- Two `getProductCurrency`/`getProductPrice` implementations
  (`types/store.ts:77-83`, `features/store/types.ts:88-98`).
- Currency symbol maps are hard-coded in `types/currency.ts:36-54` while `currencies`
  documents also store a symbol.
- The community worker has its own tier type and price logic
  (`workers/community/src/types.ts:17-18`, `services/tiers.ts:23,54`).

---

## 6. Provider capabilities

Confirmed from public documentation on 2026-11-15. **Not** confirmed against the Agaseke
merchant accounts or sandboxes.

### Paypack (mobile money)

- Rwanda-only; MTN Mobile Money, Airtel Money, Tigo Cash.
- Cashin and cashout endpoints take `amount` and phone number; there is **no currency
  parameter**. Amounts are implicitly RWF.
- Cashout is available, so RWF payouts can use the same provider subject to account
  limits and fees.
- Idempotency-Key is supported and recommended (max 32 chars). Webhook signature
  verification must be confirmed.
- Sources: `https://docs.paypack.rw/quickstart/api-reference`,
  `https://docs.paypack.rw/`.

Implication: keep MoMo RWF-only. Do not attempt KES/UGX/TZS mobile money through Paypack.

### Pesapal (cards)

- SubmitOrderRequest takes an ISO `currency` and a float `amount`.
- Supports local-currency collection in Kenya (KES), Uganda (UGX), Tanzania (TZS),
  Rwanda (RWF) and USD. Settlement is in the merchant country's local currency, with USD
  available for card collections (per Pesapal's public material).
- Older API docs state that if the selected payment option does not support the
  requested currency, Pesapal converts using the day's exchange rate. API 3 behaviour,
  rate source, spread and whether the merchant sees the conversion are **unconfirmed**.
- Sources: `https://developer.pesapal.com/how-to-integrate/e-commerce/api-30-json/submitorderrequest`,
  `https://www.pesapal.com/blog/ideal-payment-solution-providers-for-your-business-and-customer`,
  `https://support.resrequest.com/interfaces/payment-gateways/pesapal/`.

Implications and unknowns:

- We must not rely on Pesapal to do our FX. If it converts silently, the amount we
  record may not match what the supporter was charged or what settles.
- RWF card collection must be sandbox-tested with the actual merchant account,
  including fees, minimums, refunds and settlement currency.
- USD card settlement must be confirmed (USD settlement account vs local conversion).
- Pesapal is a collection rail, not a payout rail; USD payouts need a bank/manual or
  separate provider process.

### Provider test matrix (Phase 1/5)

| Test | Paypack | Pesapal |
|---|---|---|
| RWF collection | yes (current) | confirm |
| USD collection | not supported | confirm + settlement |
| KES/UGX/TZS collection | not supported | confirm per merchant account |
| RWF payout | confirm cashout limits/fees | n/a |
| USD payout | not supported | n/a (bank/manual) |
| Unsupported-currency conversion | n/a | confirm rate source/spread |
| Webhook authenticity | confirm signature | already IPN-verified in payments worker |
| Idempotency | use Idempotency-Key | merchant reference |

---

## 7. Data-quality audit (not yet run)

The repo has no `firebase.json`, emulator config or sanitized export, so runtime data
could not be inspected. (`rules.txt` exists, but rules do not expose data.) Per the
prompt, these are the queries to run before Phase 2. They should be implemented in
`scripts/money-audit.mjs` (Firebase Admin, against an emulator or sanitized export) and
the output committed as a redacted report.

1. `creators`: count missing/blank `currency`; count `currency` not in the registry.
2. `creators`: count non-integer `totalEarnings`, `pendingPayout`, `totalEarningsUSD`,
   `pendingPayoutUSD`; count negative values; count `pendingPayout > totalEarnings`.
3. `creators`: where `totalEarningsUSD` or `pendingPayoutUSD` is non-zero, how many have
   no USD price/earnings history? (Detect rounding loss by comparing against
   `creatorIncome` + `transactions`.)
4. `transactions`: missing currency; amount with more decimal places than the currency's
   minor unit; `creatorEarnings`/`platformFee`/`referralEarnings` not integers for USD;
   sum of shares vs `amount`.
5. `storeProducts`/`creatorGatherings`/community tiers: `currency = "USD"` with no
   `priceUSD`; `priceUSD === price` (possible copy mistake); `currency` missing.
6. `storeOrders`/`sales`: duplicate `txRef`; currency missing; `totalAmount` not equal to
   product + fee according to `platformFeePayer`.
7. `platformIncome`/`creatorIncome`/`ticketSales`/`gatheringsAttendance`/
   `communitySubscriptions`: missing currency; duplicate `txRef`+`reason`; income sum by
   creator vs `creators.totalEarnings`.
8. `withdrawRequests`/`payouts`: completed USD requests; whether the matching
   `payouts` doc has a currency; whether `pendingPayout` or `pendingPayoutUSD` moved;
   duplicate approvals per request.
9. `supportedCreators`: multiple payments per `(supporterId, creatorId)`; amount equals
   the last payment rather than the sum; anonymous duplicate rows for one `txRef`.
10. `paymentApplications`: any ref with a marker but no corresponding income/ledger;
    any ref with income but no marker.

Expected results (hypotheses to confirm): missing currency on older income/attendance
rows; USD balances rounded to whole dollars; USD withdrawals that reduced RWF; a
non-zero number of `priceUSD`-less USD products/tiers.

---

## 8. Proposed data model

### 8.1 Currency registry (single source)

A generated source of truth, consumed by both the Next app and each worker:

```
shared/money/currencies.json        # source
scripts/money/generate-registry.mjs # generates the TS files below
lib/money/registry.generated.ts
workers/<worker>/src/money/registry.generated.ts
```

A hash test fails CI if a generated file drifts from `shared/money/currencies.json`.
Workers are separate npm packages and do not share a workspace, so generation is safer
than cross-package imports.

```ts
// Generated from shared/money/currencies.json (53 codes at this checkpoint).
type CurrencyCode = "RWF" | "USD" | "KES" | ... | "EUR" | "GBP" | "CNY" | "BRL";

interface CurrencyDef {
  code: CurrencyCode;
  name: string;
  symbol: string;
  minorUnit: 0 | 2 | 3;      // examples: RWF/UGX/JPY/XOF = 0, USD/EUR = 2, TND/LYD = 3
  countries: string[];
  displayOrder: number;
}
```

The registry is a **catalog**. Admin config now validates codes against it and can
disable checkout for a currency, but `workers/payments` still normalizes monetary flows
to RWF/USD. Enabling more checkout currencies requires per-currency prices, thresholds,
FX and provider coverage. Payouts use a separate `PAYOUT_CURRENCIES` allow-list
(RWF/USD) because payout currency support depends on the processor, not the checkout
catalog.

Policy values (`enabled`, `minSupportMinor`, `maxSupportMinor`, `payoutThresholdMinor`,
`countryCurrencies`) live in Firestore `currencies/{code}` and are validated against the
static registry. `minorUnit` is **never** taken from Firestore.

### 8.2 Money value object

```ts
interface Money {
  currency: CurrencyCode;
  amountMinor: number; // safe integer, may be negative only in ledger entries
}
```

Required helpers, all integer-only:

- `money(currency, amountMinor)`, `fromMajor(currency, value)`,
  `toMajor(money)`, `formatMoney(money, locale)`.
- `add`, `subtract`, `compare`, `isZero`, `assertSameCurrency`.
- `allocate(total, weights)` using the largest-remainder method for fee/referral splits.
- `parseUserAmount(input, currency)` that rejects more decimals than `minorUnit`.
- `convert(money, rate)` only in the FX module, with explicit rounding and a recorded
  rate id.

### 8.3 Collections

| Collection | Purpose | Key fields |
|---|---|---|
| `currencies/{code}` | Enablement and policy | `code`, `enabled`, `minorUnit` (mirror only), `minSupportMinor`, `maxSupportMinor`, `payoutThresholdMinor`, `symbol`, `displayOrder` |
| `countryCurrencies/{id}` | Country default/availability | `countryCode`, `currencyCode`, `isDefault`, `enabled` |
| `creatorBalances/{handle}` | Fast balance projection | `uid`, `handle`, `displayCurrency`, `available: { [code]: int }`, `pendingWithdrawals: { [code]: int }`, `lifetimeEarned: { [code]: int }`, `lifetimeWithdrawn: { [code]: int }`, `version`, `updatedAt` |
| `ledgerEntries/{entryId}` | Append-only source of truth | `idempotencyKey`, `creatorUid`, `creatorHandle`, `currency`, `amountMinor` (signed), `type`, `paymentRef`, `transactionId`, `withdrawalId`, `fxRateId`, `metadata`, `createdAt` |
| `paymentApplications/{ref}` | Existing credit marker, kept | `txRef`, `currency`, `creatorShareMinor`, `totalAmountMinor`, `status`, `ledgerEntryIds` |
| `fxRates/{base}_{quote}` | Latest rate | `base`, `quote`, `rate` (decimal string), `source`, `effectiveAt`, `expiresAt`, `status` |
| `fxRateHistory/{id}` | Audit trail | Same plus `fetchedAt`, `providerPayloadHash` |
| `fxQuotes/{id}` | Locked conversion | `uid`, `from`, `to`, `sourceAmountMinor`, `rate`, `targetAmountMinor`, `spreadMinor`, `expiresAt`, `consumedBy`, `status` |
| `withdrawRequests/{id}` | Request + approval | `creatorUid`, `handle`, `amountMinor`, `currency`, `payoutCurrency`, `payoutAmountMinor`, `fxQuoteId`, `fxRate`, `method`, `rail`, `accountNumber`, `status`, `idempotencyKey`, `approvedBy`, `approvedAt`, `providerRef` |
| `payouts/{id}` | Executed disbursement | `withdrawalRequestId`, `creatorUid`, `amountMinor`, `currency`, `provider`, `providerRef`, `status`, `completedAt` |
| `moneyMigrationRuns/{id}` | Migration audit | `mode` (`dry-run`/`apply`), `startedAt`, `finishedAt`, `counts`, `reportPath` |

Ledger entry types:

`payment_credit`, `referral_credit`, `withdrawal_hold`, `withdrawal_settled`,
`withdrawal_released`, `fx_debit`, `fx_credit`, `adjustment`, `opening_balance`,
`migration_reversal`.

Invariants (enforced by tests and a scheduled reconciliation job):

- `creatorBalances.available[c]` equals the sum of that creator's ledger entries in `c`
  minus `pendingWithdrawals[c]`.
- No negative available balance.
- `sum(payment_credit + referral_credit)` for a transaction equals its recorded
  creator/referral earnings, in minor units.
- Every ledger entry has a unique `idempotencyKey`; entries are never updated/deleted.
- The projected balance is rebuilt from the ledger and compared; mismatches alert and
  are reported, never auto-corrected silently.

### 8.4 Atomic credit commit

One Firestore commit per payment:

1. Create `paymentApplications/{safeRef}` with `exists: false`.
2. Create deterministic `ledgerEntries/payment_{ref}_creator` and `_referral` with
   `exists: false` (signed minor units).
3. Apply `creatorBalances/{handle}` field transforms (`available`, `lifetimeEarned`).
4. Update the transaction status with a precondition (pending/processing only).
5. Create the dispatch outbox record.

If the marker already exists, the commit fails with `ALREADY_EXISTS` and the callback
returns `duplicate`. If the commit fails for any other reason, nothing is applied and the
outbox retries. Domain documents (`storeOrders`, `sales`, `platformIncome`, etc.) move
into the same commit where possible; where they cannot, they must use deterministic IDs
derived from the payment ref.

### 8.5 Price model

For listed items (products, tiers, tickets, paid posts, bookings):

```ts
interface PricedItem {
  baseCurrency: CurrencyCode;
  prices: {
    [code in CurrencyCode]?: {
      amountMinor: number;
      active: boolean;
    };
  };
  pricingVersion: number;
}
```

- A supporter can only pay in a currency present in `prices`; there is no `body.currency`
  price lookup and no `priceUSD ?? price` fallback.
- Voluntary support amounts may be entered in any enabled currency.
- FX is **not** used to derive a listed price at checkout.
- Legacy `price`/`priceUSD` remain read-only until the Phase 6 cutover.

### 8.6 Payout and FX flow

1. Creator requests a withdrawal in a specific balance currency.
2. Server creates a hold (ledger `withdrawal_hold` + `pendingWithdrawals`) atomically.
3. If payout currency differs, server creates an `fxQuote` from a non-stale rate,
   records `fx_debit`/`fx_credit` and stores the quote id on the request. Missing/expired
   rate rejects the request.
4. Admin approval is a server endpoint, not a Firestore client write. It is idempotent
   on `withdrawalRequestId` and records a `payouts` doc with amount, currency, provider
   and provider ref.
5. Provider success settles the hold (`withdrawal_settled`); failure/rejection releases
   it (`withdrawal_released`).
6. A daily reconciliation job compares ledger, balances, provider settlements and
   `platformIncome`/`creatorIncome`.

### 8.7 FX policy (Phase 1 display adapter + money-movement proposal)

**Display conversion (implemented in Phase 1).** Display is not money movement. The
original `Money` is always stored, ledgered and shown; the converted value is an optional,
clearly-labelled estimate.

- Source: `fawazahmed0/currency-api` (MIT, daily, 339 currencies including
  RWF/KES/UGX/TZS) as primary; `open.er-api.com` as fallback. Both are fetched server-side
  only and cached later in `fxRates`; the UI must never fetch rates directly.
- Adapter: `lib/money/rateSources.ts` validates payloads, enforces timeouts and rejects
  missing/invalid quote currencies. `lib/money/display.ts` converts minor units exactly,
  supports direct and inverse pairs, and marks derived rates.
- Staleness: display rates carry `effectiveAt`/`expiresAt`; an expired rate is not used.
  No last-known-rate fallback.
- Accuracy: the original amount and currency are rendered alongside the estimate; prices,
  balances, receipts and payouts always use the original amount.

**Money movement (proposal, Phase 5).**

- Source: one rate provider per corridor, stored with `source`, `effectiveAt` and
  `expiresAt`. Never use a rate without an `expiresAt` in the future.
- Quote TTL: 5 minutes (proposal; confirm).
- Spread: explicit `fxSpreadBps`; the ledger records both the source rate and the spread
  as separate entries.
- Rounding: target amount rounds half-up to the target minor unit; the platform absorbs
  the residual. The quote shows the exact target amount before confirmation.
- Failure: stale/missing rate is a hard error. No "last known rate" fallback.
- Cron: hourly fetch in the payments worker (or a dedicated money worker), plus a
  freshness alert.

---

## 9. Migration and implementation plan

Effort is rough engineering time; provider/business decisions are excluded. Each phase
ends with tests, a small commit series, and a review checkpoint.

| Phase | Work | Effort | Risk | Acceptance |
|---|---|---|---|---|
| **0** | This audit + model + plan | done | low | Founder approves |
| **1** | **Implemented:** `shared/money/currencies.json`, generator + 7 registry copies, `lib/money/{money,display,rateSources,index}.ts`, property tests, display-only FX adapter. No behaviour changes. CI registry check wired in `.github/workflows/quality.yml`. | done (foundation) | low | All existing tests pass; property tests cover every currency's minor unit and allocation conservation; `money:registry:check` passes |
| **2** | **Implemented behind `MONEY_LEDGER_ENABLED` (default false):** ledger collections + dual-write in support/store/bookings/community/gatherings, atomic payment markers, deterministic entry/income IDs, legacy counters untouched. Backfill script (`npm run money:backfill:ledger`, dry-run by default) writes `opening_balance` entries from `pendingPayout`/`pendingPayoutUSD`; `npm run money:reconcile:ledger` compares balances to entries and exits non-zero on drift. **Still pending:** rules and a reviewed dry run on a sanitized production export. | 5-7 d | high | Ledger entries balance per transaction; replaying a payment is a no-op; backfill dry-run reviewed before `--apply` |
| **3** | **Implemented (partial):** server-side withdrawal requests/holds, idempotency, per-currency available balances, thresholds and authenticated admin settlement; optional ledger hold/settlement/release behind `MONEY_LEDGER_ENABLED`. **Still pending:** emulator/browser exercise, FX quotes and provider settlement. | 5-7 d | high | USD withdrawal debits only USD; double approval is a no-op; thresholds per currency; uploaded tests for partial failure |
| **4** | **Implemented (partial):** strict `prices` maps for products, booking tiers, gathering tickets and community tiers; creator writers build maps and validate the active currency; public/dashboard displays and server checkout/bookings/community pricing reject missing-currency prices instead of falling back across currencies. **Still pending:** admin validation across the full catalog, checkout currency enablement, and a dedicated bookings-worker map test. | 6-8 d | high | A `10,000 RWF` item cannot be charged as USD; no `priceUSD ?? price`; both currencies round-trip |
| **5** | FX rates/quotes, KES/UGX/TZS enablement, provider routing, settlement mapping, reconciliation/alerts. | 4-6 d | high | Missing/stale rate rejects; ledger records rate id; provider sandbox tests pass |
| **6** | Staged rollout, shadow reconciliation, cutover flags, remove legacy fields after two clean cycles. | 3-5 d | medium | Two clean reconciliation cycles; rollback tested; docs updated |

Sequencing rules:

- Do not enable a third currency before Phase 3.
- Do not delete legacy fields before Phase 6.
- Do not let a client write a balance, ledger entry, payout or withdrawal status at any
  phase.
- Every phase must include the exact queries/reports needed to verify it.

Total: roughly **25-36 engineering days** plus provider/business work, excluding rules
ownership.

---

## 10. Fixes from this audit

The three P0 fixes are implemented in this branch. The remaining items are queued and
still need separate review before merge:

1. **P0 price/currency (implemented):** listed items use their stored currency price;
   a client-selected mismatch is rejected; USD no longer falls back to the RWF price;
   missing `priceUSD` fails closed.
2. **P0 payout (implemented):** Admin approval reads the request in a transaction,
   requires `pending`, validates the currency, debits `pendingPayoutUSD` for USD,
   writes `currency` on `payouts`, and rejects re-approval.
3. **P0 cents (implemented):** webhooks and domain callbacks round by the currency
   registry (USD cents, RWF/UGX whole units); support/bookings no longer encode USD
   cents as `integerValue`.
4. **P1 conservation:** one allocation function with largest remainder; define the
   residual owner; make fallback shares match deployed config.
5. **P1 idempotency (implemented behind flag):** community/gathering paths now create
   `paymentApplications` markers and deterministic domain documents in the same commit
   as the credit; enable only after the ledger migration is reviewed.
6. **P1 withdrawal UI:** read the selected balance currency, accept decimals for
   two-decimal currencies, and do not use `parseInt`.
7. **P2 display:** currency-aware formatters (minor units), per-currency thresholds,
   remove the `*1000` ranking hack.

Any of these can be done as a small, separately reviewed patch. The P0 fixes above are
included; the P1/P2 work is not.

---

## 11. Firestore rules follow-ups (no rules edited)

A real `rules.txt` exists at the repo root, but it does not cover the collections below.
It is not in `firebase.json` (there is none). Rules remain out of scope for Phase 1; add
to `docs/RULES_FOLLOWUP.md` before Phase 2:

- Deny all client reads/writes to `ledgerEntries`, `fxRates`, `fxRateHistory`,
  `fxQuotes`, `moneyMigrationRuns`; server-only.
- `creatorBalances`: clients may read their own balance only; never write. Creators must
  not be able to update `totalEarnings`, `pendingPayout`, or any balance/ledger field.
- `withdrawRequests`: clients may create only through a server endpoint (or, until then,
  only `pending` requests with validated fields); never update status; never approve.
- `payouts`: server/admin only; no client writes.
- `paymentApplications`: correct the docs from `paymentCredits` to
  `paymentApplications`; deny all client access.
- `platformIncome`/`creatorIncome`: server-only; clients must not be able to forge
  income records.
- `currencies`/`countryCurrencies`: admin-only writes; `minorUnit` must match the
  generated registry (server validation, not rules alone).
- Legacy fields stay protected during dual-write; do not relax rules for the migration.
- Anonymous supporter records and private-post rules from the existing follow-up still
  apply; multi-currency must not add personal or payment data to public reads.

---

## 12. Questions for the founder

Recommended defaults are in brackets; these drive Phase 3-5.

1. **Launch set and order?** [RWF + USD first; KES/UGX/TZS after Phase 3.]
2. **Pricing model:** independent price per currency for listed items, or one base price
   plus automatic FX? [Independent prices for listed items; FX only for voluntary support
   and payout conversion.]
3. **FX source, spread and quote TTL?** [Display: `fawazahmed0/currency-api` primary,
   `open.er-api.com` fallback; daily rates, original amounts always shown. Money movement:
   provider rate + explicit spread (e.g. 1.5%), 5-minute quote, hard failure on stale
   rate.]
4. **Fee rounding and residual owner?** [Largest-remainder allocation; platform absorbs
   the ±1 minor-unit residual; document it in `docs/MONEY.md`.]
5. **Are the current fee shares 10/90 and 9/90/1 (referral funded from platform) the
   intended production values?** [Yes, but confirm; remove divergent code fallbacks.]
6. **USD payouts:** bank transfer, manual admin payout, or a provider? [Manual
   admin-approved bank payout initially; no automatic USD rail.]
7. **RWF payouts:** Paypack cashout? [Confirm limits, fees and account/name checks.]
8. **Minimums and payout thresholds per currency?** [Set explicitly for each code; no
   global 10,000 fallback.]
9. **Default display currency:** creator's pricing currency, supporter's country, or
   account preference? [Creator's pricing currency on creator pages; supporter's country
   default elsewhere; always show the actual charge currency.]
10. **Historical rounded USD:** backfill from transactions and adjust opening balances,
    or only correct future credits? [Opening-balance adjustment + reconciliation report;
    never rewrite historical transactions.]
11. **Legacy fields:** keep `price`/`priceUSD` and `totalEarnings*` read-only for how
    long? [Two clean release cycles after Phase 6.]
12. **Rules owner and deployment window?** [Needed before Phase 2 dual-write goes live.]

---

## 13. Checkpoint

Phase 0, Phase 1, the three P0 fixes and Phase 2 dual-write are complete. Phase 2 runs
behind `MONEY_LEDGER_ENABLED=false`, with a dry-run/apply backfill script and worker
tests; the flag has not been enabled and no production data was read. The currency
registry has expanded to 53 catalog entries, but RWF/USD remain the only enabled
payment/payout currencies. The Phase 3 withdrawal slice is in place: authenticated
server creation with idempotency keys, optional ledger-backed `withdrawal_hold` entries
plus `pendingWithdrawals`, per-currency available balances, and an authenticated admin
settlement route that writes payout/settlement/release entries transactionally.
Reconciliation now covers pending withdrawals and lifetime withdrawals. Before enabling
the flag: run reconciliation against a reviewed dataset, confirm the business answers
above, review the data-quality findings from §7, and deploy rules for the ledger and
withdrawal collections. Request flows still need emulator/browser exercise.
