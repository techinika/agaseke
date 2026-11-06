# Payments

Phase 1 remediation for AGA-PAY-001, AGA-PAY-002 and AGA-PAY-003.

## Initiation flow

1. The client sends identifiers and non-authoritative metadata only. It must
   not send `amount` (except support/gift), `productPrice`, `platformFee`,
   `creatorUid`, `supporterId`, `includeReferral`, `referralUid` or
   `referralId`. The worker rejects those fields with `TRUSTED_FIELD_REJECTED`.
2. `requireAuth` resolves the caller. The caller's UID becomes `initiatedBy`,
   `supporterId` and `buyerId`.
3. `resolvePayment` loads the creator from `creators/{creatorHandle}` and derives
   the amount, currency, product price, booking amount, gathering price,
   community tier price, fees, processor cost and referral relationship from
   Firestore.
4. `creatorId` is accepted only as a legacy alias for the creator handle. It is
   never treated as a UID.
5. Referral is derived from `profiles/{creatorUid}.referralCreator` and resolved
   to `creators/{referralHandle}.uid`. A request cannot choose its referrer.
6. `beginIdempotentAttempt` reserves `paymentAttempts/{idempotencyKey}` with a
   SHA-256 hash of the resolved request. A replay returns the same provider ref;
   a different payload with the same key returns 409.
7. The provider is called with the server-derived amount. The transaction is
   written with the derived fee fields and a sanitized `retryPayload`.
8. `finishAttempt` stores the provider ref/redirect URL on the attempt.

Card merchant references are unguessable (`AGS-CARD-<uuid>`). Paypack refs come
from Paypack.

## State machine

```
initiated -> pending -> processing -> successful
     |          |           |
     +----------+-----------+-> failed
     |          |           |
     +----------+-----------+-> expired
```

- Forward-only. Terminal states (`successful`, `failed`, `expired`) are
  immutable.
- Legacy values are normalised: `success`, `completed`, `paid` -> `successful`;
  `cancelled`, `canceled`, `reversed`, `failure` -> `failed`.
- Pesapal status codes: `1` COMPLETED -> `successful`; `0` INVALID, `2` FAILED
  and `3` REVERSED -> `failed`; anything else is `unknown` and ignored.
- Same-state events are no-ops.
- `initiated` is the fallback for rows with a missing or unknown status.

## Webhook verification

### Paypack (MoMo)

- Base64 HMAC-SHA256 over the raw body with `PAYPACK_WEBHOOK_SECRET`, compared
  in constant time against `x-paypack-signature` (per Paypack docs).
- Requests with no signature or no configured secret are rejected with 401.
- The stored transaction is loaded by `ref`.
- The event `ref`, `amount` and `currency` must match the stored transaction.
- Status is mapped through `mapPaypackStatus`; unknown statuses are ignored.

### Pesapal (card)

Pesapal IPN v3 does not sign the callback payload, so the worker treats the IPN
as a trigger only:

1. Call `GetTransactionStatus` with the `OrderTrackingId`.
2. Load the stored transaction by `OrderMerchantReference`.
3. Require the stored `ref` to equal the body merchant reference and the status
   response `merchant_reference`.
4. If a tracking ID is already stored, it must equal the body tracking ID.
5. The status response `amount` and `currency` must match the stored
   transaction.
6. Only then apply the status.

The first verified status binds `orderTrackingId` and `pesapal_tracking_id`.

## Idempotency

| Collection | Purpose |
| --- | --- |
| `paymentAttempts/{idempotencyKey}` | Initiation replay protection and request hash |
| `webhookEvents/{eventId}` | Provider event dedupe |
| `paymentCredits/{paymentRef}` | Credit marker created atomically with `successful` |
| `paymentDispatches/{paymentRef}` | Durable domain-dispatch outbox; retried by the scheduled handler |
| `paymentApplications/{paymentRef}` | Ledger marker claimed in the same commit as the balance increments |

`paymentCredits/{paymentRef}` is written in the same Firestore commit as the
transaction status change. A replayed success event sees the marker and skips
the domain dispatch. Domain workers are still expected to be idempotent.

Event IDs:

- Paypack: `paypack:{ref}:{status}`
- Pesapal: `pesapal:{merchantRef}:{trackingId}:{statusDescription}`

## Environment

New optional values:

| Variable | Default | Purpose |
| --- | --- | --- |
| `PROCESSOR_FEE_PERCENT` | `0` | Processor cost recorded on the transaction |
| `MAX_SUPPORT_AMOUNT_RWF` | `10,000,000` | Server-side support cap |
| `MAX_SUPPORT_AMOUNT_USD` | `10,000` | Server-side support cap |

Support minimums come from `currencies/{code}.minSupportAmount` and fall back to
100 RWF / 1 USD.

## Tests

```bash
cd workers/payments
npm test
```

The suite covers the state machine, server-authoritative pricing, provider
verification and idempotent event processing.

## Known follow-ups

- The dispatch outbox now retries failed domain callbacks every 5 minutes with
  exponential backoff and a `dead` state after 10 attempts. A worker that crashes
  between the atomic success commit and the outbox status update leaves a
  `pending` record, which is retried after two minutes.
- Atomic ledger aggregates are Phase 3 (AGA-PAY-005).
- Multi-product store carts still use the first product plus total quantity, as
  before Phase 1. The store worker fulfillment model is single-product.
- Firestore rules are out of scope; see `docs/RULES_FOLLOWUP.md`.
