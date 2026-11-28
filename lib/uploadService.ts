import { auth } from "@/db/firebase";
export { storedAssetVisibility } from "@/lib/mediaKey";

export type AssetType =
  | "creator_profile"
  | "creator_cover"
  | "post_image"
  | "post_video"
  | "post_document"
  | "product_thumbnail"
  | "product_content"
  | "partner_logo"
  | "verification_document"
  | "message_attachment";

export const UPLOAD_WORKER_URL =
  process.env.NEXT_PUBLIC_UPLOAD_WORKER_URL || "http://localhost:8787";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export type AssetVisibility = "public" | "private";

export interface UploadResult {
  /** Public URL. Empty for private assets — use `key` instead. */
  url: string;
  /** Object key. Private assets must be stored by key, never by URL. */
  key: string;
  visibility: AssetVisibility;
  publicId: string;
  format?: string;
  assetId?: string;
  assetType: AssetType;
}

/**
 * What to persist for a successfully uploaded asset: the key for private media
 * (served through the signed proxy) or the CDN URL for public media.
 */
export function storedAssetValue(result: UploadResult): string {
  return result.visibility === "private" ? result.key : result.url;
}

export const MAX_IMAGE_SIZE_MB = 20;
export const MAX_VIDEO_SIZE_MB = 100;
export const MAX_DOCUMENT_SIZE_MB = 25;

export const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
export const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;
export const MAX_DOCUMENT_SIZE_BYTES = MAX_DOCUMENT_SIZE_MB * 1024 * 1024;

export const MULTIPART_THRESHOLD_BYTES = 15 * 1024 * 1024;
export const MULTIPART_PART_SIZE_BYTES = 8 * 1024 * 1024;

const VIDEO_EXTENSIONS =
  /\.(mp4|mov|webm|m4v|mkv|avi|3gp|3g2|mpeg|mpg|ogv|ts)$/i;

export function isVideoFile(file: { type?: string; name?: string }): boolean {
  const mime = (file.type || "").split(";")[0].trim().toLowerCase();
  if (mime.startsWith("video/")) return true;
  if (file.name && VIDEO_EXTENSIONS.test(file.name)) return true;
  return false;
}

export function getMaxUploadBytes(
  file: { type?: string; name?: string },
  assetType: AssetType,
): { limitMB: number; maxBytes: number } {
  const mime = (file.type || "").split(";")[0].trim().toLowerCase();
  const isImage = mime.startsWith("image/");
  const isVideo = assetType === "post_video" || isVideoFile(file);
  const isDocument =
    (assetType === "message_attachment" ||
      assetType === "post_document" ||
      assetType === "product_content") &&
    !isImage &&
    !isVideo;

  if (isVideo) {
    return { limitMB: MAX_VIDEO_SIZE_MB, maxBytes: MAX_VIDEO_SIZE_BYTES };
  }
  if (isDocument) {
    return { limitMB: MAX_DOCUMENT_SIZE_MB, maxBytes: MAX_DOCUMENT_SIZE_BYTES };
  }
  return { limitMB: MAX_IMAGE_SIZE_MB, maxBytes: MAX_IMAGE_SIZE_BYTES };
}

export interface UploadFileOptions {
  onProgress?: (percent: number) => void;
}

async function readErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    return data.error || `${fallback} (${res.status})`;
  } catch {
    return fallback;
  }
}

async function uploadMultipartFile(
  file: File,
  assetType: AssetType,
  creatorHandle: string,
  subType: string | undefined,
  visibility: AssetVisibility,
  options?: UploadFileOptions,
): Promise<UploadResult> {
  options?.onProgress?.(0);

  const authHeaders = await getAuthHeaders();
  const initRes = await fetch(`${UPLOAD_WORKER_URL}/multipart/init`, {
    method: "POST",
    headers: {
      ...authHeaders,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      fileSize: file.size,
      assetType,
      creatorHandle,
      subType: subType || "general",
      country: "ANY",
      visibility,
    }),
  });

  if (!initRes.ok) {
    throw new Error(
      await readErrorMessage(initRes, "Failed to initialize upload"),
    );
  }

  const { uploadToken } = (await initRes.json()) as { uploadToken: string };
  const parts: Array<{ partNumber: number; etag: string }> = [];
  let uploadedBytes = 0;

  try {
    const totalParts = Math.max(
      1,
      Math.ceil(file.size / MULTIPART_PART_SIZE_BYTES),
    );

    for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
      const start = (partNumber - 1) * MULTIPART_PART_SIZE_BYTES;
      const end = Math.min(file.size, start + MULTIPART_PART_SIZE_BYTES);
      const chunk = file.slice(start, end);

      const partHeaders = await getAuthHeaders();
      const partUrl = `${UPLOAD_WORKER_URL}/multipart/part?uploadToken=${encodeURIComponent(
        uploadToken,
      )}&partNumber=${partNumber}`;

      const partRes = await fetch(partUrl, {
        method: "POST",
        headers: {
          ...partHeaders,
          "Content-Type": "application/octet-stream",
        },
        body: chunk,
      });

      if (!partRes.ok) {
        throw new Error(
          await readErrorMessage(partRes, `Part ${partNumber} upload failed`),
        );
      }

      const partData = (await partRes.json()) as {
        partNumber: number;
        etag: string;
      };
      parts.push({ partNumber: partData.partNumber, etag: partData.etag });

      uploadedBytes = end;
      const pct = Math.min(99, Math.round((uploadedBytes / file.size) * 100));
      options?.onProgress?.(pct);
    }

    const completeHeaders = await getAuthHeaders();
    const completeRes = await fetch(`${UPLOAD_WORKER_URL}/multipart/complete`, {
      method: "POST",
      headers: {
        ...completeHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ uploadToken, parts }),
    });

    if (!completeRes.ok) {
      throw new Error(
        await readErrorMessage(completeRes, "Failed to finalize upload"),
      );
    }

    const result = (await completeRes.json()) as UploadResult;
    options?.onProgress?.(100);
    return result;
  } catch (err) {
    const abortHeaders = await getAuthHeaders().catch(() => ({}));
    await fetch(`${UPLOAD_WORKER_URL}/multipart/abort`, {
      method: "POST",
      headers: {
        ...abortHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ uploadToken }),
    }).catch(() => {});
    throw err;
  }
}

/**
 * Upload a file (FormData or chunked multipart for large files) with a specific asset type.
 *
 * assetType tells the Worker what kind of upload this is:
 *   creator_profile       – profile picture
 *   creator_cover         – cover/banner image
 *   post_image            – content post image
 *   post_video            – content post video (up to 100MB)
 *   post_document         – content post document
 *   product_thumbnail     – product cover/thumbnail image
 *   product_content       – product downloadable file
 *   partner_logo          – partner logo image
 *   verification_document – KYC identity document
 *   message_attachment    – community chat attachment
 */
export async function uploadFile(
  file: File,
  assetType: AssetType,
  creatorHandle: string,
  subType?: string,
  visibility: AssetVisibility = "public",
  options?: UploadFileOptions,
): Promise<UploadResult> {
  const { limitMB, maxBytes } = getMaxUploadBytes(file, assetType);
  if (file.size > maxBytes) {
    throw new Error(
      `File too large. Maximum size is ${limitMB}MB. Your file is ${(
        file.size /
        (1024 * 1024)
      ).toFixed(1)}MB`,
    );
  }

  if (file.size > MULTIPART_THRESHOLD_BYTES) {
    return uploadMultipartFile(
      file,
      assetType,
      creatorHandle,
      subType,
      visibility,
      options,
    );
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("assetType", assetType);
  formData.append("creatorHandle", creatorHandle);
  formData.append("visibility", visibility);
  if (subType) formData.append("subType", subType);

  const headers = await getAuthHeaders();
  options?.onProgress?.(10);

  const res = await fetch(UPLOAD_WORKER_URL, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    let errorMessage = "Upload failed";
    try {
      const data = await res.json();
      errorMessage = data.error || `Upload failed (${res.status})`;
    } catch {
      errorMessage = "Upload failed: Request too large.";
    }
    throw new Error(errorMessage);
  }

  const result = (await res.json()) as UploadResult;
  options?.onProgress?.(100);
  return result;
}

/**
 * Upload a base64-encoded image (for profile picture and banner).
 */
export async function uploadBase64Image(
  image: string,
  assetType: AssetType,
): Promise<UploadResult> {
  const headers = await getAuthHeaders();
  headers["Content-Type"] = "application/json";

  const res = await fetch(UPLOAD_WORKER_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ image, assetType }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Upload failed");
  }

  return res.json();
}
