# Agaseke Upload Worker

Cloudflare Worker that handles all file uploads. Authenticates via Firebase, stores files in R2, records every upload in Firestore's `assets` collection. Files are served through the custom domain `https://assets.agaseke.me`.

## Architecture

```
Client (browser + Firebase token)
  │  POST file + assetType + Authorization header
  ▼
Cloudflare Worker (agaseke-upload)
  │  1. Verify Firebase JWT (jose + Google JWKS)
  │  2. Validate assetType & size limits
  │  3. Store file in R2 bucket (agaseke-assets)
  │  4. Write asset document to Firestore (assets collection)
  ▼
Response: { url: "https://assets.agaseke.me/...", publicId, assetType, assetId }

Client uses the URL directly — assets.agaseke.me serves through Cloudflare CDN.
```

## Asset Types

Tell the Worker exactly what you're uploading via `assetType`:

| assetType              | Purpose                  | Storage Path                               |
|------------------------|--------------------------|--------------------------------------------|
| `creator_profile`      | Profile picture          | `creator_profiles/{uuid}.{ext}`            |
| `creator_cover`        | Cover/banner image       | `creator_banners/{uuid}.{ext}`             |
| `post_image`           | Content post image       | `agaseke/posts/{handle}/{uuid}.{ext}`      |
| `post_video`           | Content post video       | `agaseke/videos/{handle}/{uuid}.{ext}`     |
| `post_document`        | Content post document    | `agaseke/documents/{type}/{handle}/..`     |
| **`product_thumbnail`**| Product cover image      | `store/thumbnails/{handle}/{uuid}.{ext}`   |
| **`product_content`**  | Product downloadable file| `store/content/{handle}/{uuid}.{ext}`      |
| **`partner_logo`**     | Partner logo image       | `partners/{handle}/{uuid}.{ext}`           |
| `verification_document`| KYC identity document    | `agaseke/verifications/{country}/..`       |

## Firestore Asset Documents

Every upload creates a document in the `assets` collection:

```json
{
  "url": "https://assets.agaseke.me/agaseke/posts/handle/abc.jpg",
  "publicId": "agaseke/posts/handle/abc.jpg",
  "mimeType": "image/jpeg",
  "fileSize": 123456,
  "assetType": "post_image",
  "creatorId": "firebase-uid",
  "creatorHandle": "creator-name",
  "originalName": "photo.jpg",
  "usage": "Content post image",
  "createdAt": "2026-07-06T...",
  "updatedAt": "2026-07-06T..."
}
```

## Setup

### Prerequisites

- Cloudflare account
- A domain (e.g. `agaseke.me`) added to Cloudflare
- `wrangler` CLI (`npm i -g wrangler` or use `npx wrangler`)

### Step 1: Enable R2

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) → **R2**
2. Click **Enable R2** (one-time activation, all plans)

### Step 2: Create R2 Bucket

```bash
npx wrangler r2 bucket create agaseke-assets --location=weur
```

### Step 3: Connect Custom Domain

1. Cloudflare Dashboard → **R2** → `agaseke-assets` → **Settings**
2. Under **Custom Domains**, add `assets.agaseke.me`
3. Add a CNAME record: `assets.agaseke.me` → CNAME → `agaseke-assets.<account-id>.r2.cloudflarestorage.com`

Or via CLI:

```bash
npx wrangler r2 bucket domain add agaseke-assets --domain=assets.agaseke.me
```

### Step 4: Set Worker Environment Variables

These are secrets — never commit them to git.

```bash
cd workers/upload

# Firebase project (needed for JWT verification + Firestore writes)
npx wrangler secret put FIREBASE_PROJECT_ID
# → ndafana-one

npx wrangler secret put FIREBASE_CLIENT_EMAIL
# → firebase-adminsdk-...@ndafana-one.iam.gserviceaccount.com

npx wrangler secret put FIREBASE_PRIVATE_KEY
# → entire private key (-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----)
#   paste the value exactly as it appears in your .env file

# Assets base URL (your R2 custom domain)
npx wrangler secret put ASSETS_BASE_URL
# → https://assets.agaseke.me

# Optional size limits
npx wrangler secret put MAX_IMAGE_SIZE_MB
# → 20

npx wrangler secret put MAX_VIDEO_SIZE_MB
# → 50

npx wrangler secret put WEBP_QUALITY
# → 88
```

### Step 5: Deploy

```bash
npx wrangler deploy -c wrangler.jsonc
```

The Worker is now live. The frontend's `NEXT_PUBLIC_UPLOAD_WORKER_URL` should point to:
`https://agaseke-upload.<your-account-id>.workers.dev`

### Step 6: Frontend Env

```
NEXT_PUBLIC_UPLOAD_WORKER_URL=https://agaseke-upload.<your-account-id>.workers.dev
```

## API

### Upload (POST /)

**FormData (for files):**

| Field             | Required | Description                                      |
|-------------------|----------|--------------------------------------------------|
| `file`            | yes      | The file blob                                    |
| `assetType`       | yes      | One of the asset types from the table above      |
| `creatorHandle`   | no       | Creator handle (defaults to Firebase UID)        |
| `subType`         | for docs | Document sub-type (e.g. `"perk_file"`)           |
| `country`         | for KYC  | Country code for verification documents          |

**JSON (for base64 images — profile/cover):**

```json
{
  "image": "data:image/jpeg;base64,...",
  "assetType": "creator_profile"
}
```

**Response:**

```json
{
  "url": "https://assets.agaseke.me/creator_profiles/uuid.jpg",
  "publicId": "creator_profiles/uuid.jpg",
  "assetType": "creator_profile",
  "assetId": "firestore-doc-id"
}
```

## Local Development

```bash
cd workers/upload
npx wrangler dev
```

Worker runs at `http://localhost:8787`. For local testing without a custom domain, set:

```
ASSETS_BASE_URL=http://localhost:8787
```

The frontend's `.env` defaults `NEXT_PUBLIC_UPLOAD_WORKER_URL` to `http://localhost:8787`.

## Image Optimization

Cloudflare optimizes images automatically at the edge:

1. **Cloudflare Polish** (Pro+) – Automatic compression of images served through the CDN
2. **Cloudflare Image Resizing** (Pro+) – On-the-fly format conversion via URL parameters

Enable in Cloudflare Dashboard → Speed → Optimization → Polish / Image Resizing
