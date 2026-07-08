/* eslint-disable import/no-anonymous-default-export */
import { requireAuth } from "./auth";
import { corsHeaders } from "./cors";
import {
  Env,
  UploadResult,
  AssetType,
  getStoragePath,
  extFromMime,
} from "./types";
import { createAssetDocument } from "./firestore";

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

async function writeAssetDoc(
  env: Env,
  params: {
    url: string;
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
    const maxImageMB = parseInt(env.MAX_IMAGE_SIZE_MB || "20");
    const maxVideoMB = parseInt(env.MAX_VIDEO_SIZE_MB || "50");
    const maxSize = isVideo
      ? maxVideoMB * 1024 * 1024
      : maxImageMB * 1024 * 1024;

    if (file.size > maxSize) {
      const limit = isVideo ? maxVideoMB : maxImageMB;
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

    await env.UPLOADS_BUCKET.put(storagePath, bytes, {
      httpMetadata: {
        contentType: mimeType,
        contentDisposition: `inline; filename="${fileName}"`,
        cacheControl: "public, max-age=31536000, immutable",
      },
      customMetadata: {
        uploadedBy: uid,
        originalName: file.name,
        assetType,
      },
    });

    const baseUrl = env.ASSETS_BASE_URL || deriveBaseUrl(request);
    const url = `${baseUrl}/${storagePath}`;

    const assetId = await writeAssetDoc(env, {
      url,
      publicId: storagePath,
      mimeType,
      fileSize,
      assetType,
      creatorId: uid,
      creatorHandle,
      originalName: file.name,
      metadata: { originalSize: String(file.size) },
    });

    const result: UploadResult = { url, publicId: storagePath, assetType };
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
    };
    const dataUri = body.image;
    const assetType = body.assetType || "creator_profile";

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

    await env.UPLOADS_BUCKET.put(storagePath, bytes, {
      httpMetadata: {
        contentType: detectedType,
        cacheControl: "public, max-age=31536000, immutable",
      },
      customMetadata: {
        uploadedBy: uid,
        assetType,
      },
    });

    const baseUrl = env.ASSETS_BASE_URL || deriveBaseUrl(request);
    const url = `${baseUrl}/${storagePath}`;

    const assetId = await writeAssetDoc(env, {
      url,
      publicId: storagePath,
      mimeType: detectedType,
      fileSize: bytes.byteLength,
      assetType,
      creatorId: uid,
      creatorHandle: uid,
      originalName: fileName,
    });

    const result: UploadResult = { url, publicId: storagePath, assetType };
    if (assetId) result.assetId = assetId;

    return json(result, 200, origin);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    console.error("Base64 upload error:", err);
    return json({ error: message }, 500, origin);
  }
}

/** Cloudflare Image Resizing – re-encodes JPEG/PNG to WebP at edge.
 *  Requires Image Resizing subscription on the zone. No-op otherwise. */
async function optimizeWithCfImage(
  buffer: ArrayBuffer,
  contentType: string,
  env: Env,
): Promise<{ buffer: ArrayBuffer; contentType: string } | null> {
  return null;
}

function deriveBaseUrl(request: Request): string {
  const url = new URL(request.url);
  return `${url.protocol}//${url.hostname}${url.port ? `:${url.port}` : ""}`;
}

// ── Main fetch handler ──────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("origin");

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: { ...corsHeaders(origin) },
      });
    }

    try {
      if (request.method === "POST") {
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
      const message = err instanceof Error ? err.message : "Internal error";
      console.error("Worker error:", request.method, request.url, err);
      return json({ error: message }, 500, origin);
    }
  },
};
