# Fix log

Running record of remediation work. Newest first.

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
