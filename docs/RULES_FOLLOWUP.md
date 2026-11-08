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
