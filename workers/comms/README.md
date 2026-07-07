# Agaseke Comms Worker

Cloudflare Worker that handles all transactional email sending. Uses Cloudflare's native Email binding (`env.EMAIL`) — zero SMTP config, no API keys, automatic SPF/DKIM/DMARC management via Cloudflare DNS.

## Architecture

```
Client (browser + Firebase token)
  │  POST { purpose, to, data }
  ▼
Cloudflare Worker (agaseke-comms)
  │  1. Verify Firebase token (Firebase REST API + API key)
  │  2. Lookup service by purpose (service registry)
  │  3. Resolve recipients (fetch from Firestore if needed)
  │  4. Build template data (service-specific)
  │  5. Render unified HTML template
  │  6. Send via env.EMAIL.send()
  ▼
Response: { success, messageId, purpose, recipientCount }
```

## Email Purposes (18 services)

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

## Setup

### Prerequisites

- Cloudflare account with a domain (e.g. `agaseke.me`) added
- Email Sending enabled for your domain:
  ```bash
  npx wrangler email sending enable agaseke.me
  ```

### Environment Variables

All vars are managed in the **Cloudflare Dashboard** → Workers & Pages → `agaseke-comms` → Settings → Variables.

| Variable | Secret | Description |
|---|---|---|
| `FIREBASE_API_KEY` | yes | Firebase Web API key |
| `FIREBASE_PROJECT_ID` | no | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | no | Firebase service account email |
| `FIREBASE_PRIVATE_KEY` | yes | Firebase service account private key |
| `FROM_EMAIL` | no | Sender address (e.g. `no-reply@agaseke.me`) |
| `FROM_NAME` | no | Sender name (e.g. `Agaseke`) |
| `APP_URL` | no | Base app URL (e.g. `https://agaseke.me`) |
| `ASSETS_URL` | no | Base URL for email assets |

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
  "to": "creator@example.com",
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
  "messageId": "<message-id@yourdomain.com>",
  "purpose": "booking_request",
  "recipientCount": 1
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

Use `--remote` so email sends are proxied to the real Cloudflare Email Service (local `wrangler dev` can't send emails without it).
