/* eslint-disable import/no-anonymous-default-export */
import { requireAuth, forbidden } from "./auth";
import { corsHeaders } from "./cors";
import {
  Env,
  UploadResult,
  AssetType,
  AssetVisibility,
  getStoragePath,
  extFromMime,
} from "./types";
import { timingSafeEqualString, verifyMediaKeySignature } from "./mediaSign";
import { createAssetDocument } from "./firestore";
import { checkRateLimit } from "./rateLimit";
import { drainPending } from "./audit";
import type { ExecutionContext } from "@cloudflare/workers-types";

function getClientIp(request: Request): string {
  return request.headers.get("CF-Connecting-IP") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
}

function isRateLimited(request: Request, maxRequests = 30, windowMs = 60000): Response | null {
  const ip = getClientIp(request);
  const path = new URL(request.url).pathname;
  const result = checkRateLimit(`${ip}:${path}`, maxRequests, windowMs);
  if (!result.allowed) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: {
        "content-type": "application/json",
        "retry-after": String(Math.ceil((result.resetAt - Date.now()) / 1000)),
      },
    });
  }
  return null;
}

function json(data: unknown, status = 200, origin?: string | null): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
      ...corsHeaders(origin || null),
    },
  });
}

const VALID_ASSET_TYPES: AssetType[] = [
  "creator_profile",
  "creator_cover",
  "post_image",
  "post_video",
  "post_document",
  "product_thumbnail",
  "product_content",
  "partner_logo",
  "verification_document",
  "message_attachment",
];

const ASSET_USAGE: Record<AssetType, string> = {
  creator_profile: "Creator profile picture",
  creator_cover: "Creator cover/banner image",
  post_image: "Content post image",
  post_video: "Content post video",
  post_document: "Content post document",
  product_thumbnail: "Product thumbnail/cover image",
  product_content: "Product downloadable file",
  partner_logo: "Partner logo image",
  verification_document: "KYC verification document",
  message_attachment: "Chat message attachment",
};

const IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
]);

// ── Upload handler ──────────────────────────────────────────

async function handleUpload(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get("origin");

  const auth = await requireAuth(request, env.FIREBASE_API_KEY, env.FIREBASE_PROJECT_ID);
  if (auth instanceof Response) {
    return new Response(auth.body, {
      status: auth.status,
      statusText: auth.statusText,
      headers: {
        ...Object.fromEntries(auth.headers.entries()),
        ...corsHeaders(origin), // This ensures your allowed origin goes back to the client!
      },
    });
  }

  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    return handleFormDataUpload(request, env, auth.uid, origin);
  }

  if (contentType.includes("application/json")) {
    return handleBase64Upload(request, env, auth.uid, origin);
  }

  return json(
    {
      error:
        "Unsupported content type. Use multipart/form-data or application/json.",
    },
    400,
    origin,
  );
}

function bucketFor(env: Env, visibility: AssetVisibility): R2Bucket {
  if (visibility === "private") {
    if (!env.UPLOADS_PRIVATE_BUCKET) {
      throw new Error("Private media storage is not configured");
    }
    return env.UPLOADS_PRIVATE_BUCKET;
  }
  return env.UPLOADS_BUCKET;
}

function parseVisibility(value: unknown, origin: string | null): AssetVisibility | Response {
  if (value === undefined || value === null || value === "") return "public";
  if (value === "public" || value === "private") return value;
  return json(
    { error: 'visibility must be "public" or "private"' },
    400,
    origin,
  );
}

function cacheControlFor(visibility: AssetVisibility): string {
  return visibility === "private"
    ? "private, max-age=0, no-store"
    : "public, max-age=31536000, immutable";
}

async function writeAssetDoc(
  env: Env,
  params: {
    url: string;
    visibility: AssetVisibility;
    publicId: string;
    mimeType: string;
    fileSize: number;
    assetType: AssetType;
    creatorId: string;
    creatorHandle: string;
    originalName: string;
    metadata?: Record<string, string>;
  },
): Promise<string | null> {
  return createAssetDocument(env, {
    url: params.url,
    visibility: params.visibility,
    publicId: params.publicId,
    mimeType: params.mimeType,
    fileSize: params.fileSize,
    assetType: params.assetType,
    creatorId: params.creatorId,
    creatorHandle: params.creatorHandle,
    originalName: params.originalName,
    usage: ASSET_USAGE[params.assetType],
    metadata: params.metadata || {},
  });
}

async function handleFormDataUpload(
  request: Request,
  env: Env,
  uid: string,
  origin: string | null,
): Promise<Response> {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const assetType = (formData.get("assetType") as AssetType) || "post_image";
    const creatorHandle = (formData.get("creatorHandle") as string) || uid;
    const subType = (formData.get("subType") as string) || "general";
    const country = (formData.get("country") as string) || "ANY";

    const visibility = parseVisibility(formData.get("visibility"), origin);
    if (visibility instanceof Response) return visibility;

    if (!file) {
      return json({ error: "No file provided" }, 400, origin);
    }

    if (!VALID_ASSET_TYPES.includes(assetType)) {
      return json(
        {
          error: `Invalid assetType. Must be one of: ${VALID_ASSET_TYPES.join(", ")}`,
        },
        400,
        origin,
      );
    }

    // Size limits
    const isImage = IMAGE_MIMES.has(file.type);
    const isVideo = file.type.startsWith("video/");
    const isDocument = assetType === "message_attachment" && !isImage && !isVideo;
    const maxImageMB = parseInt(env.MAX_IMAGE_SIZE_MB || "20");
    const maxVideoMB = parseInt(env.MAX_VIDEO_SIZE_MB || "50");
    const maxDocMB = 25;
    const maxSize = isVideo
      ? maxVideoMB * 1024 * 1024
      : isDocument
        ? maxDocMB * 1024 * 1024
        : maxImageMB * 1024 * 1024;

    if (file.size > maxSize) {
      const limit = isVideo ? maxVideoMB : isDocument ? maxDocMB : maxImageMB;
      return json(
        {
          error: `File too large. Maximum size is ${limit}MB. Your file is ${(file.size / (1024 * 1024)).toFixed(1)}MB`,
        },
        400,
        origin,
      );
    }

    const ext = extFromMime(file.type);
    const fileName = `upload.${ext}`;
    const storagePath = getStoragePath(
      assetType,
      creatorHandle,
      subType,
      country,
      fileName,
    );
    const bytes = await file.arrayBuffer();
    const mimeType = file.type;
    const fileSize = bytes.byteLength;

    if (visibility === "private" && !env.UPLOADS_PRIVATE_BUCKET) {
      return json({ error: "Private media storage is not configured" }, 503, origin);
    }

    await bucketFor(env, visibility).put(storagePath, bytes, {
      httpMetadata: {
        contentType: mimeType,
        contentDisposition: `inline; filename="${fileName}"`,
        cacheControl: cacheControlFor(visibility),
      },
      customMetadata: {
        uploadedBy: uid,
        originalName: file.name,
        assetType,
        visibility,
      },
    });

    const baseUrl = env.ASSETS_BASE_URL || deriveBaseUrl(request);
    // Private assets have no public URL; callers must store `key` and read it
    // through the signed /private/{key} route.
    const url = visibility === "public" ? `${baseUrl}/${storagePath}` : "";

    const assetId = await writeAssetDoc(env, {
      url,
      visibility,
      publicId: storagePath,
      mimeType,
      fileSize,
      assetType,
      creatorId: uid,
      creatorHandle,
      originalName: file.name,
      metadata: { originalSize: String(file.size) },
    });

    const result: UploadResult = {
      url,
      key: storagePath,
      visibility,
      publicId: storagePath,
      assetType,
    };
    if (assetId) result.assetId = assetId;

    return json(result, 200, origin);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    console.error("FormData upload error:", err);
    return json({ error: message }, 500, origin);
  }
}

async function handleBase64Upload(
  request: Request,
  env: Env,
  uid: string,
  origin: string | null,
): Promise<Response> {
  try {
    const body = (await request.json()) as {
      image?: string;
      assetType?: AssetType;
      visibility?: string;
    };
    const dataUri = body.image;
    const assetType = body.assetType || "creator_profile";

    const visibility = parseVisibility(body.visibility, origin);
    if (visibility instanceof Response) return visibility;

    if (!dataUri || typeof dataUri !== "string") {
      return json({ error: "No image data provided" }, 400, origin);
    }

    if (!VALID_ASSET_TYPES.includes(assetType)) {
      return json({ error: `Invalid assetType: ${assetType}` }, 400, origin);
    }

    const matches = dataUri.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      return json({ error: "Invalid data URI format" }, 400, origin);
    }

    const detectedType = matches[1];
    const base64 = matches[2];
    const maxImageMB = parseInt(env.MAX_IMAGE_SIZE_MB || "20");
    const maxImageBytes = maxImageMB * 1024 * 1024;

    // Estimate decoded size: base64 is ~4/3 of binary
    if ((base64.length * 3) / 4 > maxImageBytes) {
      return json({ error: `File too large. Maximum size is ${maxImageMB}MB.` }, 400, origin);
    }

    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const ext = extFromMime(detectedType);
    const fileName = `upload.${ext}`;
    const storagePath = getStoragePath(
      assetType,
      uid,
      "general",
      "ANY",
      fileName,
    );

    if (visibility === "private" && !env.UPLOADS_PRIVATE_BUCKET) {
      return json({ error: "Private media storage is not configured" }, 503, origin);
    }

    await bucketFor(env, visibility).put(storagePath, bytes, {
      httpMetadata: {
        contentType: detectedType,
        cacheControl: cacheControlFor(visibility),
      },
      customMetadata: {
        uploadedBy: uid,
        assetType,
        visibility,
      },
    });

    const baseUrl = env.ASSETS_BASE_URL || deriveBaseUrl(request);
    const url = visibility === "public" ? `${baseUrl}/${storagePath}` : "";

    const assetId = await writeAssetDoc(env, {
      url,
      visibility,
      publicId: storagePath,
      mimeType: detectedType,
      fileSize: bytes.byteLength,
      assetType,
      creatorId: uid,
      creatorHandle: uid,
      originalName: fileName,
    });

    const result: UploadResult = {
      url,
      key: storagePath,
      visibility,
      publicId: storagePath,
      assetType,
    };
    if (assetId) result.assetId = assetId;

    return json(result, 200, origin);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    console.error("Base64 upload error:", err);
    return json({ error: message }, 500, origin);
  }
}
// ── Private media reads ──────────────────────────────────────

/**
 * Serves an object from the private bucket. The bucket has no public domain, so
 * this route plus the HMAC grant issued by the app is the only read path.
 */
export function isValidPrivateKey(key: string): boolean {
  if (!key || key.length > 1024) return false;
  if (key.startsWith("/") || key.includes("..") || key.includes("\\")) return false;
  for (let i = 0; i < key.length; i++) {
    const code = key.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return false;
  }
  return true;
}

async function handlePrivateAsset(
  request: Request,
  env: Env,
  url: URL,
): Promise<Response> {
  if (!env.UPLOADS_PRIVATE_BUCKET) {
    return json({ error: "Private media storage is not configured" }, 503);
  }
  if (!env.MEDIA_SIGNING_SECRET) {
    return json({ error: "Private media signing is not configured" }, 503);
  }

  let key: string;
  try {
    key = decodeURIComponent(url.pathname.replace(/^\/private\//, ""));
  } catch {
    return json({ error: "Invalid media key" }, 400);
  }
  if (!isValidPrivateKey(key)) {
    return json({ error: "Invalid media key" }, 400);
  }

  const exp = Number(url.searchParams.get("exp") || 0);
  const sig = url.searchParams.get("sig") || "";

  const valid = await verifyMediaKeySignature(env.MEDIA_SIGNING_SECRET, key, exp, sig);
  if (!valid) {
    return json({ error: "Link expired or invalid" }, 403);
  }

  const object = await env.UPLOADS_PRIVATE_BUCKET.get(key, {
    range: request.headers,
  });
  if (!object) return json({ error: "Not found" }, 404);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("Cache-Control", "private, max-age=300");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("Accept-Ranges", "bytes");

  const isHead = request.method === "HEAD";
  if (isHead) await object.body.cancel();
  const range = object.range as { offset: number; length: number } | undefined;
  if (range && typeof range.length === "number") {
    headers.set(
      "content-range",
      `bytes ${range.offset}-${range.offset + range.length - 1}/${object.size}`,
    );
    headers.set("content-length", String(range.length));
    return new Response(isHead ? null : object.body, { status: 206, headers });
  }

  headers.set("content-length", String(object.size));
  return new Response(isHead ? null : object.body, { status: 200, headers });
}

// ── Private media migration ──────────────────────────────────

/**
 * Copies objects from the public bucket into the private bucket. Admin only;
 * idempotent, and leaves the source in place unless `deleteSource` is set so a
 * rollback stays possible while documents are being rewritten.
 */
async function handleMigratePrivate(
  request: Request,
  env: Env,
  auth: { uid: string; isAdmin: boolean },
  origin: string | null,
): Promise<Response> {
  if (!auth.isAdmin) return forbidden(origin, "Admin claim required");
  if (!env.UPLOADS_PRIVATE_BUCKET) {
    return json({ error: "Private media storage is not configured" }, 503, origin);
  }

  const body = (await request.json().catch(() => ({}))) as {
    keys?: unknown;
    deleteSource?: unknown;
  };
  const keys = Array.isArray(body.keys)
    ? body.keys.filter(
        (key): key is string => typeof key === "string" && isValidPrivateKey(key),
      )
    : [];

  if (keys.length === 0) return json({ error: "keys[] is required" }, 400, origin);
  if (keys.length > 200) return json({ error: "At most 200 keys per request" }, 400, origin);

  const deleteSource = body.deleteSource === true;
  const results: Array<{ key: string; status: string }> = [];

  for (const key of keys) {
    try {
      const object = await env.UPLOADS_BUCKET.get(key);
      if (!object) {
        results.push({ key, status: "missing" });
        continue;
      }

      await env.UPLOADS_PRIVATE_BUCKET.put(key, object.body, {
        httpMetadata: {
          contentType: object.httpMetadata?.contentType,
          contentDisposition: object.httpMetadata?.contentDisposition,
          cacheControl: cacheControlFor("private"),
        },
        customMetadata: { ...object.customMetadata, visibility: "private" },
      });

      if (deleteSource) await env.UPLOADS_BUCKET.delete(key);
      results.push({ key, status: "copied" });
    } catch (err: unknown) {
      console.error("Migrate error:", key, err);
      results.push({ key, status: "error" });
    }
  }

  return json({ results, deletedSource: deleteSource }, 200, origin);
}

function deriveBaseUrl(request: Request): string {
  const url = new URL(request.url);
  return `${url.protocol}//${url.hostname}${url.port ? `:${url.port}` : ""}`;
}

// ── Main fetch handler ──────────────────────────────────────

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const origin = request.headers.get("origin");

      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: { ...corsHeaders(origin) },
        });
      }

      try {
        const url = new URL(request.url);

        if (
          (request.method === "GET" || request.method === "HEAD") &&
          url.pathname.startsWith("/private/")
        ) {
          return await handlePrivateAsset(request, env, url);
        }

        if (request.method === "POST" && url.pathname === "/migrate-private") {
          const migrationToken = request.headers.get("x-migrate-token");
          const bearer = request.headers.get("authorization");

          // Operators run the migration script with a shared token; humans use
          // an admin session. Neither path is available unless configured.
          if (
            env.MIGRATION_TOKEN &&
            migrationToken &&
            timingSafeEqualString(env.MIGRATION_TOKEN, migrationToken)
          ) {
            return await handleMigratePrivate(request, env, { uid: "migration", isAdmin: true }, origin);
          }

          if (!bearer) return json({ error: "Authentication required" }, 401, origin);

          const auth = await requireAuth(request, env.FIREBASE_API_KEY, env.FIREBASE_PROJECT_ID);
          if (auth instanceof Response) return auth;
          return await handleMigratePrivate(request, env, auth, origin);
        }

        if (request.method === "POST") {
          const limited = isRateLimited(request, 10, 60000);
          if (limited) return limited;
          return await handleUpload(request, env);
        }

        return json(
          {
            error:
              "Not found. POST / to upload (assetType required). Assets are served via https://assets.agaseke.me/{publicId}",
          },
          404,
          origin,
        );
      } catch (err: unknown) {
        console.error("Worker error:", request.method, request.url, err);
        return json({ error: "Internal server error" }, 500, origin);
      }
    } finally {
      drainPending(ctx);
    }
  },
};
