# Agaseke Community Worker

Cloudflare Worker that handles community subscription management. Authenticates via Firebase, manages membership tiers and subscriptions, and handles recurring payments.

## Architecture

```
Client (browser + Firebase token)
  │  POST /api/community/subscribe/initiate
  ▼
Cloudflare Worker (agaseke-community)
  │  1. Verify Firebase token (Firebase REST API + API key)
  │  2. Create subscription document in Firestore
  │  3. Forward payment request to Payments Worker
  ▼
Payments Worker processes Momo/Card payment
  │
  ▼  callback with X-Internal-Auth
Cloudflare Worker (agaseke-community)
  │  4. Activate subscription on successful payment
  ▼
Response: { subscriptionId, paymentRef, paymentUrl }
```

## API

### GET /api/community/tiers?creatorHandle={handle}

Returns community tiers and whether community is enabled for a creator.

### POST /api/community/tiers/save

Save community tiers and enabled status. Requires Firebase auth (creator must own the handle).

### POST /api/community/subscribe/initiate

Initiate a subscription. Creates a subscription document and forwards payment to the Payments Worker.

**Headers:**
- `Authorization: Bearer <firebase-id-token>`

**Body:**
```json
{
  "tierId": "string",
  "tierName": "string",
  "creatorId": "string",
  "creatorHandle": "string",
  "amount": 5000,
  "interval": "monthly",
  "paymentMethod": "momo",
  "phone": "07XX XXXXXX"
}
```

### POST /api/community/callback

Internal callback from Payments Worker. Requires `X-Internal-Auth` header matching `INTERNAL_AUTH_SECRET`.

### GET /api/community/members?creatorHandle={handle}

List all members for a creator's community. Requires Firebase auth (creator only).

### GET /api/community/my-subscriptions

Get current user's active subscriptions.

### POST /api/community/cancel

Cancel a subscription.

## Scheduled Tasks

The worker runs a scheduled handler (`processRenewals`) that checks for subscriptions expiring within 3 days and initiates auto-renewal payments.

## Setup

### Environment Variables

All vars are managed in the **Cloudflare Dashboard** → Workers & Pages → `agaseke-community` → Settings → Variables.

| Variable | Secret | Description |
|---|---|---|
| `FIREBASE_API_KEY` | yes | Firebase Web API key |
| `FIREBASE_PROJECT_ID` | no | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | no | Firebase service account email |
| `FIREBASE_PRIVATE_KEY` | yes | Firebase service account private key |
| `INTERNAL_AUTH_SECRET` | yes | Shared secret for inter-worker auth |
| `PAYMENTS_WORKER_URL` | no | Payments worker URL (e.g. `https://payments.api.agaseke.me`) |
| `COMMUNITY_WORKER_URL` | no | Self URL for callbacks (e.g. `https://community.api.agaseke.me`) |

### Deploy

```bash
npx wrangler deploy
```

### Frontend

Update `.env.local`:

```
NEXT_PUBLIC_COMMUNITY_WORKER_URL=https://community.api.agaseke.me
```

## Local Development

```bash
cd workers/community
npx wrangler dev
```

Worker runs at `http://localhost:8794` by default.
