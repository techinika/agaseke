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

/**
 * Upload a file (FormData-based) with a specific asset type.
 *
 * assetType tells the Worker what kind of upload this is:
 *   creator_profile       – profile picture
 *   creator_cover         – cover/banner image
 *   post_image            – content post image
 *   post_video            – content post video
 *   post_document         – content post document
 *   product_thumbnail     – product cover/thumbnail image
 *   product_content       – product downloadable file
 *   partner_logo          – partner logo image
 *   verification_document – KYC identity document
 */
export async function uploadFile(
  file: File,
  assetType: AssetType,
  creatorHandle: string,
  subType?: string,
  visibility: AssetVisibility = "public",
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("assetType", assetType);
  formData.append("creatorHandle", creatorHandle);
  formData.append("visibility", visibility);
  if (subType) formData.append("subType", subType);

  const headers = await getAuthHeaders();

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

  return res.json();
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
