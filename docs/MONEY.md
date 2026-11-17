# Money architecture (multi-currency, in progress)

Authoritative constraints: integer **minor units** for money movement; **never floats**; a missing/unknown currency is an **error** (never default to RWF); currencies and rails are **configured** (registry/matrix), not hard-coded per currency; missing/stale FX **rejects** the operation; balances derive from an append-only ledger (dual-write behind `MONEY_LEDGER_ENABLED`, not yet enabled).

## Currency registry & rails

- Canonical currency catalog: `shared/money/currencies.json` (generated to `lib/money/registry.generated.ts` and each worker’s `money/registry.generated.ts` via `npm run money:registry` / `money:registry:check`). Includes code, `minorUnit`, symbol/name and enablement metadata.
- Payment rails/method matrix: `shared/money/paymentRails.json` → `rails.generated.ts` + `lib/money/rails.ts` / `workers/payments/src/money/rails.ts`. Methods/currencies must be validated server-side (`assertMethodSupportsCurrency`, `GET /api/payments/methods`); clients must not choose unsupported rails.
- Offline enablement proof: `npm run money:enablement:check` (defaults to KES/UGX/TZS) validates the catalog, rails, unique display order and generated-file sync. Enabling a registered currency is config-only: edit the shared JSON, run `npm run money:registry`, then enable the Firestore currency policy/thresholds. Rail availability and sandbox/reconciliation checks still gate production enablement.

## Canonical item pricing: `prices` map

- **Do not** add a DB or form field per currency. Listed prices are stored as a canonical `prices` map keyed by `CurrencyCode` plus a primary `currency` (e.g. `{ currency: "USD", prices: { USD: 4, RWF: 5000 } }`).
- Money-moving/checkout uses the explicit price for the **charge currency** (or a locked FX quote), never by inferring or falling back across currencies. A missing price/currency is rejected.
- Canonical pricing is the per-currency `prices` map + primary `currency`. Legacy single-price fields may exist only for backward compatibility with historical records and are not the source of truth for money-moving paths.
- Authoring UI: `components/money/PriceEditor.tsx` (dynamic per-currency rows, explicit amounts only). Helpers in `lib/priceMap.ts` (`buildPriceMap`, `getPrice`, `parsePriceCurrency`, precision-aware sanitize).

## FX rates and locked quotes

- Display/money-movement FX is server-owned. `workers/payments/src/services/fxRates.ts` refreshes `fxRates/latest` (+ history) from a configured provider (primary/fallback), gated by `FX_RATES_ENABLED` and freshness/interval settings; request paths **never** call providers.
- Cross-currency checkout uses a **locked quote** (`POST /api/payments/quote` → `fxQuotes/*`): bound to uid + request key, TTL/expiry-enforced, loaded/validated on initiation (`quoteId`), applied in charge-currency minor units with largest-remainder allocation, and marked consumed; FX metadata (rate, spread bps, source, timestamps, source/target minor amounts) is persisted on the transaction.
- Free-amount flows (support/gift) are charged directly in the chosen currency (no item quote). Stale/missing rates or expired/mismatched quotes must fail the operation.

## Rounding, fees, and residuals

- Convert/allocate in minor units (`lib/money/fx.ts`, `workers/payments/src/money/amount.ts`, pricing allocation helpers). Fee/amount splitting must be currency-aware; the owner of any ±1 minor-unit residual and the production fee shares/spread require explicit business confirmation and must be documented when finalized (currently an open decision).

## Operations & safety

- New collections `fxRates`, `fxRateHistory`, `fxQuotes` (and ledger/withdrawal collections) are server-only; rules must deny client reads/writes (see `docs/RULES_FOLLOWUP.md`). Do not enable FX or new currencies without reviewed config, provider sandbox confirmation, reconciliation, and rules deployment.
