# Agaseke Comms Worker

Cloudflare Worker that handles all transactional email sending via Resend. Authenticates via Firebase (jose JWKS first, Firebase REST fallback).

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
  │  6. Send via Resend API (BCC for multi-recipient)
  ▼
Response: { success, messageId, purpose, recipientCount }
```

## Email Purposes (19 services)

| purpose              | Trigger                    | Recipient     | Subject                                        |
|----------------------|----------------------------|---------------|------------------------------------------------|
| `welcome_creator`    | Creator signs up           | Creator       | Welcome to Agaseke - Start Earning...          |
| `profile_live`       | Profile published          | Creator       | Your creator profile is now live!              |
| `booking_request`    | Fan requests booking       | Creator       | New booking request from {name}                |
| `booking_response`   | Creator accepts/declines   | Booker        | Your booking with {name} is confirmed/Update...|
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
| `broadcast`          | Admin broadcast            | Bulk list     | Admin-provided subject                         |

## Webhook

The worker exposes `POST /webhook` for receiving Resend events (bounces, deliveries, opens, clicks, etc.).
- Verifies payload signature using `RESEND_WEBHOOK_SECRET` via Resend SDK
- Persists every event to Firestore `emailEvents` collection
- Endpoint URL to configure in Resend dashboard: `https://comms.api.agaseke.me/webhook`

Configure with:
```bash
npx wrangler secret put RESEND_WEBHOOK_SECRET
```

## Recipient Privacy

When an email has multiple recipients (e.g. `gathering_created`, `content_new`, `broadcast`), all recipients are sent via BCC to prevent them from seeing each other's email addresses. Any CC fields from services or requests are also converted to BCC.

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
| `RESEND_API_KEY` | yes | Resend API key for sending emails |
| `RESEND_WEBHOOK_SECRET` | yes | Resend webhook signing secret |

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
  "messageId": "<resend-email-id>",
  "purpose": "booking_request",
  "recipientCount": 1
}
```

### POST /webhook

Resend event receiver. Configure in Resend dashboard to point to `https://comms.api.agaseke.me/webhook`.

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

Use `--remote` so the Resend API can be reached from the worker.
