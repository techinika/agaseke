# Agaseke Comms Worker

Cloudflare Worker that handles all transactional email sending via Amazon SES (AWS Signature V4 via Web Crypto — no AWS SDK). Authenticates via Firebase (jose JWKS first, Firebase REST fallback).

## Architecture

```
Client (browser + Firebase token)
  │  POST { purpose, data }
  ▼
Cloudflare Worker (agaseke-comms)
  │  1. Verify Firebase token (jose JWKS → Firebase REST fallback)
  │  2. Lookup service by purpose (service registry)
  │  3. Resolve recipients (fetch from Firestore if needed)
  │  4. Build template data (service-specific)
  │  5. Render unified HTML template
  │  6. Send via SES v2 SendEmail (individual emails, 8 concurrent)
  ▼
Response: { success, messageId, purpose, recipientCount }
```

## Email Purposes (23 services + `booking_reminder` cron)

| purpose               | Trigger                    | Recipient     | Subject                                        |
|-----------------------|----------------------------|---------------|------------------------------------------------|
| `welcome_user`        | User signs up              | User          | Welcome to Agaseke - Supporting African Creativity! |
| `welcome_creator`     | Creator signs up           | Creator       | Welcome to Agaseke - Start Earning...          |
| `profile_live`       | Profile published          | Creator       | Your creator profile is now live!              |
| `booking_request`    | Fan requests booking       | Creator       | New booking request from {name}                |
| `booking_response`   | Creator accepts/declines   | Booker        | Your booking with {name} is confirmed/Update...|
| `booking_cancelled`  | Creator cancels meeting     | Booker        | Your booking with {name} has been cancelled    |
| `gathering_created`  | Creator creates event      | All supporters| New gathering: {title} by {name}               |
| `gathering_rsvp`     | Supporter RSVPs            | Creator       | New RSVP: {name} for "{title}"                 |
| `gathering_checkin`  | Creator checks in attendee | Supporter     | Checked In: {title}                            |
| `gathering_declined` | Creator declines check-in  | Supporter     | Check-in Update for {title}                    |
| `gathering_undo`     | Creator reverts check-in   | Supporter     | Check-in Status Updated: {title}               |
| `message_new`        | Supporter sends message    | Creator       | New message from {name} on Agaseke             |
| `message_digest`     | Hourly digest throttle     | Creator       | Reminder: {n} unread message(s) from {name}    |
| `store_order`        | Store purchase             | Buyer         | Order Confirmed - {creator} via Agaseke        |
| `store_status`       | Order status changes       | Buyer         | Your Order is Being Processed/Shipped/...      |
| `support_received`   | Supporter sends money      | Creator       | You just received {amount} on Agaseke!         |
| `payout_processed`   | Payout approved            | Creator       | Your Payout Has Been Processed! - Agaseke      |
| `content_new`        | Creator posts content      | All supporters| New content from {name} on Agaseke!            |
| `verification_request`| KYC submitted             | Admin         | New KYC Verification Request: {name}           |
| `verification_feedback`| Verification reviewed     | Creator       | Agaseke Verification Successful/Action Required|
| `withdrawal_request`  | Creator requests payout    | Admin         | Withdrawal Request (creator, amount, method, account) |
| `broadcast`          | Admin broadcast            | Bulk list     | Admin-provided subject                         |
| `booking_reminder`   | Daily cron (9 AM Kigali)   | Booker+Creator| Reminder: meeting tomorrow                     |
| `subscription_renewal_reminder` | Community cron (auto-renew) | Subscriber | Your {tierName} subscription is due for renewal |

> **`booking_reminder`:** runs as a Cloudflare Cron Trigger at 07:00 UTC daily. For each `accepted` `bookingRequests` doc whose `preferredDate` is tomorrow (Africa/Kigali) and where `reminderSent` is not yet `true`, the worker emails the booker (from `bookerEmail`) and the creator (resolved from `profiles/{creatorUid}`), creates a `booking_reminder` in-app notification for both, and patches the doc with `reminderSent: true`. Emails are rendered directly (not through the service registry).

> **`subscription_renewal_reminder`:** sent by the Community Worker's daily `processRenewals` cron when a subscription is about to expire (or has expired) and can't be charged automatically. The community worker calls `POST /api/emails/send` with the `X-Internal-Auth` header set to `INTERNAL_AUTH_SECRET` — when that header matches, the Firebase auth check is bypassed (no user token is available in a cron). Recipient comes from `data.userEmail`, and the CTA links to `{appUrl}/community/manage/{subscriptionId}`. `data.status` is `"renewal"` (due soon) or `"expired"` (already ended).

> **`content_new` recipients:** the worker reads every `supportedCreators` doc for the creator, resolves each supporter's `supporterId` (UID) against its `profiles/{uid}` document (`email`/`displayName`), and sends to those emails. Anonymous supporters (no UID) can't be reached. The email button links to the creator's **public community page** (`/{handle}/community`). Resolution is instrumented: `fetchSupporters` logs `[comms] fetchSupporters query` (creator + `docCount`) and `[comms] fetchSupporters resolved` (`emailCount`/`uidCount`), and the endpoint logs the full request context when zero recipients would throw `No recipients resolved` — traceable via `wrangler tail`. The Post/Article forms show that error to the creator as a toast.

## Webhook

The worker exposes `POST /webhook` for receiving Amazon SES delivery events (bounces, complaints, deliveries) via an SNS topic.
- Handles SNS `SubscriptionConfirmation`, `Notification`, and `UnsubscribeConfirmation` message types
- Persists every event to Firestore `emailEvents` collection
- Endpoint URL to configure as the SNS subscription: `https://comms.api.agaseke.me/webhook`

To enable events:
1. Create an SNS topic in the SES region.
2. Add an HTTPS/SMS/Email subscription pointing at the webhook URL above and confirm it (subscription confirmations are logged, not auto-confirmed).
3. In SES → Configuration sets → Event destinations, route `Send`, `Delivery`, `Bounce`, `Complaint`, and `Reject` events to the SNS topic.

## Template Variables

The following placeholders are automatically replaced per-recipient in email subject, body, and HTML:

| Variable     | Replaced with                                  |
|-------------|------------------------------------------------|
| `[NAME]`    | Recipient's name (from profile, or email prefix) |
| `[HANDLE]`  | Creator's handle/username                      |

These work in all emails, including broadcasts. The replacement happens at send time so each recipient gets personalized content.

## Batch Sending

All emails are sent via SES v2 `SendEmail`, one call per recipient with 8 concurrent in-flight requests (purposeful, not per-call BCC — each recipient gets an individual email, so no recipient list exposure). Recipients are processed in chunks of 100 for progress logging. This works seamlessly for 1 or 1000+ recipients.

## Sent Email Archive

Every send attempt — **success and failure** — is persisted to the `sentEmails` Firestore collection, so all email activity is fully recorded. Writes are fire-and-forget (deferred via `ctx.waitUntil`) and never delay the response; failures are silent.

| Field | Description |
|---|---|
| `email` | Recipient email address |
| `from` | Sender address used for the send |
| `messageId` | SES message ID from the send response |
| `purpose` | Email purpose identifier |
| `subject` | Rendered subject line (with personalization applied) |
| `recipientName` | Recipient's name (if available) |
| `status` | `sent` or `failed` |
| `error` | Failure reason (only set when `status` is `failed`) |
| `sentAt` | ISO timestamp of the send attempt |

## Firestore Audit Logging

Every Firestore operation in this worker is audited to the `activityLogs` collection with `category: "db"` via `src/audit.ts` (`auditedFetch`) — deferred in memory and flushed with `ctx.waitUntil()` inside the fetch handler, always flushed at the end of the queue handler. Recording is non-blocking: it never delays the response and failures are invisible to callers. See `workers/WORKERS.md`.

## Setup

### Environment Variables

All vars are managed in the **Cloudflare Dashboard** → Workers & Pages → `agaseke-comms` → Settings → Variables.

| Variable | Secret | Description |
|---|---|---|
| `FIREBASE_API_KEY` | yes | Firebase Web API key |
| `FIREBASE_PROJECT_ID` | no | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | no | Firebase service account email |
| `FIREBASE_PRIVATE_KEY` | yes | Firebase service account private key |
| `FROM_EMAIL` | no | Sender address (e.g. `no-reply@comms.agaseke.me`) |
| `FROM_NAME` | no | Sender name (e.g. `Agaseke`) |
| `APP_URL` | no | Base app URL (e.g. `https://agaseke.me`) |
| `ASSETS_URL` | no | Base URL for email assets |
| `AWS_ACCESS_KEY_ID` | yes | AWS access key with SES SendEmail permission |
| `AWS_SECRET_ACCESS_KEY` | yes | AWS secret access key |
| `AWS_REGION` | no | AWS region for SES (default `us-east-1`) |
| `INTERNAL_AUTH_SECRET` | yes | Shared secret for inter-worker auth (allows `X-Internal-Auth` bypass of Firebase auth) |

### AWS prerequisites

Before sending, the sender domain must be verified in SES and the account taken out of sandbox mode:

1. **Verify the domain** — SES → Identities → Create identity → Domain: `comms.agaseke.me`, add the SPF/DKIM records SES provides (see [email-best-practices skill](../../.agents/skills/email-best-practices/SKILL.md)).
2. **Create a configuration set** for event tracking (optional but recommended) and attach an SNS topic via Event destinations — see [Webhook](#webhook).
3. **Create an IAM user** with `ses:SendEmail` (and `ses:SendRawEmail`) scoped to the verified identity, then store its access keys as the AWS secrets above. As an inline policy:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": ["ses:SendEmail", "ses:SendRawEmail"],
         "Resource": "arn:aws:ses:us-east-1:YOUR_ACCOUNT_ID:identity/comms.agaseke.me"
       }
     ]
   }
   ```

   > **Gotcha:** `ses:SendEmail` without the matching IAM permission fails with HTTP `403` `AccessDenied` — the worker logs it as `SES api error: status=403, body=... User 'arn:aws:iam::...:user/<name>' is not authorized to perform 'ses:SendEmail' on resource '...identity/comms.agaseke.me'`. Granting the policy above fixes it; no code redeploy is needed.

4. **Leave sandbox** — SES → Account dashboard → Request production access (needed to send to non-verified recipients).

### Deploy

```bash
npx wrangler deploy
```

### Frontend

Update `.env.local`:

```
NEXT_PUBLIC_COMMS_WORKER_URL=https://comms.api.agaseke.me
```

## API

### POST /

**Headers:**
- `Authorization: Bearer <firebase-id-token>`
- `Content-Type: application/json`

**Body:**
```json
{
  "purpose": "booking_request",
  "data": {
    "creatorName": "John",
    "bookerName": "Jane",
    "bookerEmail": "jane@example.com",
    "preferredDate": "2026-07-15",
    "preferredTime": "14:00",
    "preferredType": "online",
    "reason": "Would love to chat about collaboration"
  }
}
```

**Response:**
```json
{
  "success": true,
  "messageId": "<ses-message-id>",
  "purpose": "booking_request",
  "recipientCount": 1
}
```

### POST /webhook

SES/SNS event receiver. Configure an SES event destination → SNS topic subscription pointing to `https://comms.api.agaseke.me/webhook`.

**Response:**
```json
{
  "received": true
}
```

## Template

All emails use a single HTML template (`src/template.ts`) with:
- Colored header bar (per-purpose)
- Title + body content
- Optional CTA button
- Optional extra content section
- Footer with year and app URL

Each service provides `headerColor`, `headerTitle`, `title`, `body`, optional `ctaText`/`ctaUrl`, and optional `footerNote`.

## Local Development

```bash
cd workers/comms
npx wrangler dev --remote
```

Use `--remote` so the SES API can be reached from the worker. Local sends still require verified SES credentials in SSEP (sandbox rules apply).
