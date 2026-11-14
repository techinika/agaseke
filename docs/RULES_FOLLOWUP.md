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
