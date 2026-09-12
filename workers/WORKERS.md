# Workers — Environment Variables Reference

All env vars are managed in the Cloudflare Dashboard per-worker (not in `wrangler.jsonc`).
Set them at: **Cloudflare Dashboard → Workers & Pages → [worker] → Settings → Variables**.

## Auth Pattern (all workers)

All workers use dual-path authentication: **jose JWKS first** (correct `service_accounts/v1/jwk/` endpoint), **Firebase REST API fallback**. Token headers (`kid`, `alg`) are logged for debugging. CORS is handled via a shared `cors.ts` with `X-Firebase-AppCheck` header support.

## Audit Logging (all workers)

Every Firestore read/write (GET/POST/PATCH/DELETE — Firestore REST; no PUT) performed by a worker is audited through the shared `src/audit.ts` module:

- `auditedFetch(env, method, path, url, init?)` wraps the raw Firestore REST call via `fetch` and, on completion (success **or** failure), records an entry to the Firestore `activityLogs` collection with category `"db"`, type `"db_operation"`, and level `info`/`error` (including latency in ms and the HTTP status or error message). Network failures are rethrown so the original caller still sees them.
- Audit writes are **fire-and-forget**: `deferAudit(promise)` queues entries in memory and `drainPending(ctx)` flushes them via `ctx.waitUntil()` inside each worker's fetch handler (`try/finally`), so DB activity recording never blocks the HTTP response and never surfaces errors to end users. Queue/scheduled handlers end with `await flushPending()` so entries are flushed before the invocation completes.
- Auth token-minting calls (`oauth2.googleapis.com/token`) and external-service requests are **not** audited — only Firestore operations.

`activityLogs` entries written by workers use `category: "db"`, `level: "error"` on failure, and include `type`, `method`, `path`, `status` (on success), `error` (on failure), `userId`/`creatorHandle` where available, `durationMs`, and `createdAt`. The admin `activityLogs` UI in the Next.js app renders these under the **Database** category filter.

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
| `AWS_ACCESS_KEY_ID`     | string | yes    | AWS access key with `ses:SendEmail` permission           |
| `AWS_SECRET_ACCESS_KEY` | string | yes    | AWS secret access key                                     |
| `AWS_REGION`            | string | no     | AWS region for SES (default `us-east-1`)                 |

**Webhook:** `POST /webhook` — Amazon SES/SNS event receiver (deliveries, bounces, complaints, subscriptions). Events persisted to Firestore `emailEvents` collection.

**Sent archive:** Every attempted email (sent **and** failed) is logged to Firestore `sentEmails` collection with recipient, subject, purpose, SES `messageId`, `from`, `status` (`sent`/`failed`), and the `error` on failure. Email sending runs through SES; see `workers/comms/README.md` for setup.

**Queue:** `agaseke-email-queue` — bulk sends (`broadcast`, `message_digest`, `content_new`) are enqueued and delivered by the worker's queue consumer instead of holding the HTTP request open. Non-bulk purposes still send inline. Queue must be created in the dashboard before deploy.

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

**Callback payload:** Payments worker forwards `platformShare`, `creatorShare`, and `referralShare` to the callback endpoint. On successful payment, the worker writes income records (`platformIncome`, `creatorIncome`) and increments earnings on the creator doc.

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

General-purpose utility worker handling encryption, decryption, error logging, notifications, and other server-side operations. Serves at `api.agaseke.me`.

| Variable | Type | Secret | Description |
|---|---|---|---|
| `FIREBASE_API_KEY` | string | yes | Firebase Web API key |
| `FIREBASE_PROJECT_ID` | string | no | Firebase project ID (`agaseke4creators`) |
| `FIREBASE_CLIENT_EMAIL` | string | no | Firebase service account email |
| `FIREBASE_PRIVATE_KEY` | string | yes | Firebase service account private key |
| `ENCRYPTION_KEY` | string | yes | AES-256-GCM encryption key (SHA-256 derived) |
| `INTERNAL_AUTH_SECRET` | string | yes | Shared secret for internal proxied requests |

**Queue:** `agaseke-log-queue` — `/api/general/log-error` and `/api/general/notification` enqueue jobs and return immediately. The same worker consumes the queue and writes `activityLogs` / `notifications` in batches with retries (max 3, 5s delay). Queue must be created in the dashboard before deploy.

**Endpoints:**
- `POST /api/general/encrypt` — Encrypt text with AES-256-GCM
- `POST /api/general/decrypt` — Decrypt text with AES-256-GCM
- `POST /api/general/is-encrypted` — Check if string is encrypted
- `POST /api/general/log-error` — Enqueue error log to Firestore `activityLogs` (no auth, rate-limited)
- `POST /api/general/notification` — Enqueue in-app notification (Firebase auth, rate-limited)
- `GET /health` — Health check

**Auth:** Firebase Bearer token (jose JWKS first, Firebase REST fallback), or `X-Internal-Auth` header for internal proxied requests.

**Rate limiting:** All endpoints (except /health) are rate-limited per client IP via in-memory sliding window. /api/general/log-error allows 10 req/min; authenticated endpoints allow 20-30 req/min.

## Shared vars (across all workers)

| Variable                  | Secret | Notes                                     |
| ------------------------- | ------ | ----------------------------------------- |
| `FIREBASE_API_KEY`      | yes    | Same value used everywhere                |
| `FIREBASE_PROJECT_ID`   | no     | `agaseke4creators` same everywhere      |
| `FIREBASE_CLIENT_EMAIL` | no     | Same service account email everywhere     |
| `FIREBASE_PRIVATE_KEY`  | yes    | Same private key everywhere               |
| `INTERNAL_AUTH_SECRET`  | yes    | Must match across all workers that use it |
