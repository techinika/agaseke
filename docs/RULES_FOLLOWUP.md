# Firestore rules follow-up

Firestore rules were explicitly out of scope for this remediation. This file
records the rule changes the payments work depends on so a rules owner can
apply them safely.

## New server-only collections

Deny all client reads and writes for:

- `paymentAttempts/{idempotencyKey}`
- `webhookEvents/{eventId}`
- `paymentCredits/{paymentRef}`

These documents contain idempotency hashes, provider event IDs and credit
markers. Only the payments worker (Admin SDK / service account) should access
them.

## Transactions

- Clients may read only their own transactions (`supporterId`/`initiatedBy` ==
  `request.auth.uid`), plus creators reading transactions for their own handle.
- Clients must never be able to create or update transactions. All writes are
  server-side.
- `orderTrackingId` and `pesapal_tracking_id` are currently readable wherever the
  transaction is readable. Consider hiding them behind a server endpoint; they
  are not needed by the normal supporter UI.
- `retryPayload` may contain contact details. It should not be exposed to
  creators or other supporters.

## Private creator content

`creatorContent` is read in two places the rules must distinguish:

- Public feed queries filter `isPrivate == false`; these can stay open to any
  caller (or to authenticated users only, which is the safer default).
- Private posts (`isPrivate == true`) must require a supporter relationship:
  `exists(/databases/$(database)/documents/supportedCreators/$(...) )` for the
  requesting uid and the post's creator, or the creator/admin themselves.

The app now proxies private media, but the document still carries the asset key,
so a readable document is equivalent to a readable URL. Rules and the media proxy
must both hold.

## Media bucket

Private media now lives in the unexposed `agaseke-private` bucket and is read
through the upload worker's signature-gated `/private/{key}` route. The remaining
operational steps are to deploy the bucket binding and worker, run
`scripts/migrate-private-media.js --apply`, then remove the public
`assets.agaseke.me` custom domain so old public copies are no longer reachable.
Any post that still stores a public URL must be migrated before that domain is
disabled.

## Legacy status values

The app now normalises `success`, `completed`, `paid`, `cancelled`, `canceled`
and `reversed`. Rules that compare status strings should use the normalised
values where possible, or allow both legacy and new values during migration.

## Payment-related fields

If rules allow creators to update creator documents, ensure they cannot update:

- `totalEarnings`, `totalEarningsUSD`
- `pendingPayout`, `pendingPayoutUSD`
- any fee, referral or processor fields

Those are written by workers only.

## Mobile UI refactor dependencies (added 2026-11-11)

These are UI/product flows that will need a rules or server-endpoint decision.
They are recorded here only; no rules were edited.

### Anonymous support and later claim

- A guest can pay without an account and is shown to the creator as
  "Anonymous". The supporter UI must never send a client-chosen uid to attribute
  a payment.
- Claiming a guest payment after sign-up must be a **server-side** operation
  that proves control of the payment reference (receipt/reference + signed-in
  uid). Clients must not be able to update `transactions.supporterId` /
  `buyerId` themselves.
- Recommended: a worker endpoint `POST /api/payments/claim` that checks the
  receipt reference, claim window and current owner before writing. Rules
  should continue to deny client writes to `transactions`.
- Until the claim endpoint exists, the UI must not promise that a guest payment
  can be claimed. Ship the "Sign up and be remembered" prompt only when the
  claim path is available.
- **Phase 2B status:** the new support sheet requires Google sign-in before
  payment (`GUEST_CHECKOUT_ENABLED` is off by default) because the payments
  worker's `requireAuth` rejects unauthenticated initiation. Do not turn on
  `NEXT_PUBLIC_SUPPORT_GUEST_CHECKOUT` until the worker accepts anonymous
  attempts and the claim endpoint above is deployed; otherwise supporters would
  reach a dead end.

### Creator-facing anonymity

- The creator supporters list must distinguish **Registered** (name/avatar,
  messageable) from **Anonymous** (count + total only).
- Firestore rules cannot hide individual fields. If anonymous records stay in
  `supportedCreators`/`transactions` with the same shape, a creator can read any
  fields that are present. Either:
  - write anonymous records without personal identifiers (server-side), or
  - keep a creator-facing projection/aggregate collection
    (`creatorSupportStats/{creatorId}`) and deny creators direct reads of the
    raw anonymous documents.
- This is a product-privacy decision, not just a UI one. The UI will only render
  "Anonymous" for records without a linked uid; it cannot enforce what is stored.

### Locked posts and the public feed

- The public creator page and explore must query only `isPrivate == false`.
  Private documents must not be returned to the public query; the locked teaser
  should be built from safe metadata (title/type/price) stored separately, not
  from the private document.
- Existing rule requirement stands: private reads require a supporter
  relationship or creator/admin. The signed media proxy
  (`/api/media/sign` → `/api/media/stream`) remains the only media path.

### Feature flags (if used for rollout)

- If creator-scoped flags are stored in Firestore (`featureFlags/{creatorId}`),
  they should be readable by that creator and by server code only, and writable
  by admins via a server endpoint. Do not let creators enable paid-flow changes
  for themselves until the flow is signed off.

### Multi-currency money collections (planned, Phase 2)

`rules.txt` exists but does not cover these collections. Add rules before the
Phase 2 dual-write is deployed; do not enable any new currency before the P0
price and payout fixes in `docs/MONEY_AUDIT.md` are merged.

- `ledgerEntries`, `fxRates`, `fxRateHistory`, `fxQuotes`,
  `moneyMigrationRuns`: server-only; deny all client reads and writes.
- `creatorBalances`: a creator may read their own balance only; never write.
  Balance documents must not be writable by creators.
- `withdrawRequests`: server-only; clients must use
  `POST /api/payouts/withdraw` and must never create, update status or approve.
- `payouts`: server/admin only; no client writes.
- `paymentApplications`: deny all client access; also correct any docs that
  still call this collection `paymentCredits`.
- `platformIncome`/`creatorIncome`: server-only; clients must not forge income
  records.
- `currencies`/`countryCurrencies`: admin-only writes; `minorUnit` must match
  `shared/money/currencies.json` (enforce in server validation too).
- Keep legacy fields protected during dual-write. Do not relax rules for the
  migration, and do not add personal or payment data to public reads.

## Phase 5 auth flows (added 2026-11-19)

The login, onboarding, and verification redesign did not change Firestore rules, data collections, payment logic, or server endpoints.

- Onboarding persists its in-progress form in browser `sessionStorage` only. No new client-write path was introduced.
- The reserved-handle list remains client-side validation. A server-side uniqueness/claim check is still required before a handle is committed.
- Verification reads the existing creator fields and keeps local UI state for code entry, uploads, and error feedback; the real OTP, file upload, and payout-status endpoints were not changed.
- `/dev/auth-onboarding` and `/dev/auth-verify` are `noindex` previews gated outside production; exclude them from production nav and rules review.

## Phase 6A creator dashboard core (added 2026-11-19)

The creator dashboard core redesign did not change Firestore rules, data collections, payment logic, pricing, fees, payouts, or server endpoints.

- Payout withdrawal actions, currency conversion, ledger writes, and payout status remain server-owned; the UI redesign only changed presentation primitives.
- Settings still uses the existing profile writes, media uploads, reference-data reads, and bulk updates. Do not relax rules to accommodate UI-only changes.
- Sales and supporters still rely on the existing Firestore subscriptions and profile enrichment; client-side filtering/mocking in `/dev/creator-core` does not expose new data paths.
- The broadcast modal uses the same comms delivery path as before; no new recipient fields or client-authorised send path was added.
- `/dev/creator-core` is a `noindex` preview with mock data only; exclude it from production nav and rules review.

## Phase 6B creator community and communications (added 2026-11-19)

The creator community/chat/messages/notices redesign did not change Firestore rules, data collections, payment logic, pricing, fees, payouts, server endpoints, or seeded data.

- Community tier/member/earning views still rely on the existing subscriptions and client-side presentation; the UI migration did not expose new fields or new client-write paths.
- Chat still uses the existing tier access checks, message subscription, and send path. The preview's local messages are mock data only and do not create documents.
- Messages and notices still use the existing read-state and notification paths; no new recipient fields, batch writes, or client-authorised delivery path was added.
- `/dev/creator-community` is a `noindex` preview with mock data only; exclude it from production nav and rules review.
