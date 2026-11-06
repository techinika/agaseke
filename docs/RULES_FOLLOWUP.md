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
