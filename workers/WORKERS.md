# Workers — Environment Variables Reference

All env vars are managed in the Cloudflare Dashboard per-worker (not in `wrangler.jsonc`).
Set them at: **Cloudflare Dashboard → Workers & Pages → [worker] → Settings → Variables**.

## Auth Pattern (all workers)

All workers use dual-path authentication: **jose JWKS first** (correct `service_accounts/v1/jwk/` endpoint), **Firebase REST API fallback**. Token headers (`kid`, `alg`) are logged for debugging. CORS is handled via a shared `cors.ts` with `X-Firebase-AppCheck` header support.

## agaseke-bookings

| Variable                  | Type   | Secret | Description                                |
| ------------------------- | ------ | ------ | ------------------------------------------ |
| `FIREBASE_API_KEY`      | string | yes    | Firebase Web API key                       |
| `FIREBASE_PROJECT_ID`   | string | no     | Firebase project ID (`agaseke4creators`) |
| `FIREBASE_CLIENT_EMAIL` | string | no     | Firebase service account email             |
| `FIREBASE_PRIVATE_KEY`  | string | yes    | Firebase service account private key       |
| `INTERNAL_AUTH_SECRET`  | string | yes    | Shared secret for inter-worker auth        |

## agaseke-comms

| Variable                  | Type   | Secret | Description                                               |
| ------------------------- | ------ | ------ | --------------------------------------------------------- |
| `FIREBASE_API_KEY`      | string | yes    | Firebase Web API key                                      |
| `FIREBASE_PROJECT_ID`   | string | no     | Firebase project ID                                       |
| `FIREBASE_CLIENT_EMAIL` | string | no     | Firebase service account email                            |
| `FIREBASE_PRIVATE_KEY`  | string | yes    | Firebase service account private key                      |
| `FROM_EMAIL`            | string | no     | Sender email address (e.g.`no-reply@comms.agaseke.me`)  |
| `FROM_NAME`             | string | no     | Sender display name (e.g.`Agaseke`)                     |
| `APP_URL`               | string | no     | Base app URL for email links (e.g.`https://agaseke.me`) |
| `ASSETS_URL`            | string | no     | Base URL for email asset URLs                             |
| `RESEND_API_KEY`        | string | yes    | Resend API key for sending emails                         |
| `RESEND_WEBHOOK_SECRET` | string | yes    | Resend webhook signing secret                             |

**Webhook:** `POST /webhook` — Resend event receiver (bounces, deliveries, opens, clicks). Events persisted to Firestore `emailEvents` collection.

## agaseke-store

| Variable                  | Type   | Secret | Description                          |
| ------------------------- | ------ | ------ | ------------------------------------ |
| `FIREBASE_API_KEY`      | string | yes    | Firebase Web API key                 |
| `FIREBASE_PROJECT_ID`   | string | no     | Firebase project ID                  |
| `FIREBASE_CLIENT_EMAIL` | string | no     | Firebase service account email       |
| `FIREBASE_PRIVATE_KEY`  | string | yes    | Firebase service account private key |
| `INTERNAL_AUTH_SECRET`  | string | yes    | Shared secret for inter-worker auth  |

**Binding:** `UPLOADS_BUCKET` — R2 bucket `agaseke-assets`

## agaseke-support

| Variable                  | Type   | Secret | Description                          |
| ------------------------- | ------ | ------ | ------------------------------------ |
| `FIREBASE_API_KEY`      | string | yes    | Firebase Web API key                 |
| `FIREBASE_PROJECT_ID`   | string | no     | Firebase project ID                  |
| `FIREBASE_CLIENT_EMAIL` | string | no     | Firebase service account email       |
| `FIREBASE_PRIVATE_KEY`  | string | yes    | Firebase service account private key |
| `INTERNAL_AUTH_SECRET`  | string | yes    | Shared secret for inter-worker auth  |

## agaseke-upload

| Variable                  | Type   | Secret | Description                                                      |
| ------------------------- | ------ | ------ | ---------------------------------------------------------------- |
| `FIREBASE_API_KEY`      | string | yes    | Firebase Web API key                                             |
| `FIREBASE_PROJECT_ID`   | string | no     | Firebase project ID                                              |
| `FIREBASE_CLIENT_EMAIL` | string | no     | Firebase service account email                                   |
| `FIREBASE_PRIVATE_KEY`  | string | yes    | Firebase service account private key                             |
| `ASSETS_BASE_URL`       | string | no     | Public URL prefix for assets (e.g.`https://assets.agaseke.me`) |
| `MAX_IMAGE_SIZE_MB`     | number | no     | Max image upload size in MB (e.g.`10`)                         |
| `MAX_VIDEO_SIZE_MB`     | number | no     | Max video upload size in MB (e.g.`100`)                        |

**Binding:** `UPLOADS_BUCKET` — R2 bucket `agaseke-assets`

## agaseke-community

| Variable | Type | Secret | Description |
|---|---|---|---|
| `FIREBASE_API_KEY` | string | yes | Firebase Web API key |
| `FIREBASE_PROJECT_ID` | string | no | Firebase project ID (`agaseke4creators`) |
| `FIREBASE_CLIENT_EMAIL` | string | no | Firebase service account email |
| `FIREBASE_PRIVATE_KEY` | string | yes | Firebase service account private key |
| `INTERNAL_AUTH_SECRET` | string | yes | Shared secret for inter-worker auth |
| `PAYMENTS_WORKER_URL` | string | no | Payments worker URL (e.g. `https://payments.api.agaseke.me`) |
| `COMMUNITY_WORKER_URL` | string | no | Self URL for callbacks (e.g. `https://community.api.agaseke.me`) |

**Scheduled:** `processRenewals` runs on a cron trigger to auto-renew expiring subscriptions.

## agaseke-payments

| Variable                                     | Type   | Secret | Description                                                      |
| -------------------------------------------- | ------ | ------ | ---------------------------------------------------------------- |
| `FIREBASE_API_KEY`                         | string | yes    | Firebase Web API key                                             |
| `FIREBASE_PROJECT_ID`                      | string | no     | Firebase project ID                                              |
| `FIREBASE_CLIENT_EMAIL`                    | string | no     | Firebase service account email                                   |
| `FIREBASE_PRIVATE_KEY`                     | string | yes    | Firebase service account private key                             |
| `INTERNAL_AUTH_SECRET`                     | string | yes    | Shared secret for inter-worker auth                              |
| `APP_URL`                                  | string | no     | Base app URL (e.g.`https://agaseke.me`)                        |
| `PAYPACK_CLIENT_ID`                        | string | yes    | Paypack API client ID                                            |
| `PAYPACK_CLIENT_SECRET`                    | string | yes    | Paypack API client secret                                        |
| `PAYPACK_WEBHOOK_SECRET`                   | string | yes    | Paypack webhook signing secret                                   |
| `PESAPAL_URL`                              | string | no     | Pesapal API base URL (e.g.`https://pay.pesapal.com/v3`)        |
| `PESAPAL_CONSUMER_KEY`                     | string | yes    | Pesapal consumer key                                             |
| `PESAPAL_CONSUMER_SECRET`                  | string | yes    | Pesapal consumer secret                                          |
| `PESAPAL_IPN_ID`                           | string | no     | Pesapal IPN ID                                                   |
| `NEXT_PUBLIC_PLATFORM_SHARE`               | number | no     | Platform revenue share (e.g.`0.1`)                             |
| `NEXT_PUBLIC_CREATOR_SHARE`                | number | no     | Creator revenue share (e.g.`0.9`)                              |
| `NEXT_PUBLIC_PLATFORM_SHARE_WITH_REFERRAL` | number | no     | Platform share when referral applies (e.g.`0.09`)              |
| `NEXT_PUBLIC_REFERRAL_SHARE`               | number | no     | Referrer share (e.g.`0.01`)                                    |
| `PAYMENTS_WORKER_URL`                      | string | no     | Self URL for callbacks (e.g.`https://payments.api.agaseke.me`) |
| `STORE_WORKER_URL`                         | string | no     | Store worker URL (e.g.`https://store.api.agaseke.me`)          |
| `BOOKINGS_WORKER_URL`                      | string | no     | Bookings worker URL (e.g.`https://bookings.api.agaseke.me`)    |
| `SUPPORT_WORKER_URL`                       | string | no     | Support worker URL (e.g.`https://support.api.agaseke.me`)      |
| `COMMUNITY_WORKER_URL`                     | string | no     | Community worker URL (e.g.`https://community.api.agaseke.me`)  |

## agaseke-general

General-purpose utility worker handling encryption, decryption, and other basic server-side operations. Serves at `api.agaseke.me`.

| Variable | Type | Secret | Description |
|---|---|---|---|
| `FIREBASE_API_KEY` | string | yes | Firebase Web API key |
| `FIREBASE_PROJECT_ID` | string | no | Firebase project ID (`agaseke4creators`) |
| `ENCRYPTION_KEY` | string | yes | AES-256-GCM encryption key (SHA-256 derived) |
| `INTERNAL_AUTH_SECRET` | string | yes | Shared secret for internal proxied requests |

**Endpoints:**
- `POST /api/general/encrypt` — Encrypt text with AES-256-GCM
- `POST /api/general/decrypt` — Decrypt text with AES-256-GCM
- `POST /api/general/is-encrypted` — Check if string is encrypted
- `GET /health` — Health check

**Auth:** Firebase Bearer token (jose JWKS first, Firebase REST fallback), or `X-Internal-Auth` header for legacy Next.js proxy routes.

## Shared vars (across all workers)

| Variable                  | Secret | Notes                                     |
| ------------------------- | ------ | ----------------------------------------- |
| `FIREBASE_API_KEY`      | yes    | Same value used everywhere                |
| `FIREBASE_PROJECT_ID`   | no     | `agaseke4creators` same everywhere      |
| `FIREBASE_CLIENT_EMAIL` | no     | Same service account email everywhere     |
| `FIREBASE_PRIVATE_KEY`  | yes    | Same private key everywhere               |
| `INTERNAL_AUTH_SECRET`  | yes    | Must match across all workers that use it |
