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

export type AssetVisibility = "public" | "private";

export interface Env {
  UPLOADS_BUCKET: R2Bucket;
  /** Private bucket. Has no public domain; objects are only readable with a signed grant. */
  UPLOADS_PRIVATE_BUCKET?: R2Bucket;
  MEDIA_SIGNING_SECRET?: string;
  /** Shared secret that lets the migration script call /migrate-private. */
  MIGRATION_TOKEN?: string;
  FIREBASE_API_KEY: string;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
  ASSETS_BASE_URL: string;
  MAX_IMAGE_SIZE_MB: string;
  MAX_VIDEO_SIZE_MB: string;
  WEBP_QUALITY: string;
}

export interface UploadResult {
  /** Public URL. Empty for private assets, which must be referenced by `key`. */
  url: string;
  /** Object key; this is what should be stored for private assets. */
  key: string;
  visibility: AssetVisibility;
  publicId: string;
  format?: string;
  assetId?: string;
  assetType: AssetType;
}

export interface AssetDocument {
  url: string;
  visibility: AssetVisibility;
  publicId: string;
  mimeType: string;
  fileSize: number;
  assetType: AssetType;
  creatorId: string;
  creatorHandle: string;
  originalName: string;
  usage: string;
  metadata: Record<string, string>;
}

const ASSET_FOLDER_MAP: Record<AssetType, string> = {
  creator_profile: "creator_profiles",
  creator_cover: "creator_banners",
  post_image: "agaseke/posts",
  post_video: "agaseke/videos",
  post_document: "agaseke/documents",
  product_thumbnail: "store/thumbnails",
  product_content: "store/content",
  partner_logo: "partners",
  verification_document: "agaseke/verifications",
  message_attachment: "agaseke/messages",
};

export function getStoragePath(
  assetType: AssetType,
  creatorHandle: string,
  subType: string,
  country: string,
  fileName: string
): string {
  const uuid = crypto.randomUUID();
  const ext = fileName.split(".").pop() || "bin";
  const folder = ASSET_FOLDER_MAP[assetType];

  switch (assetType) {
    case "post_image":
      return `${folder}/${creatorHandle}/${uuid}.${ext}`;
    case "post_video":
      return `${folder}/${creatorHandle}/${uuid}.${ext}`;
    case "post_document":
      return `${folder}/${subType || "general"}/${creatorHandle}/${uuid}.${ext}`;
    case "product_thumbnail":
      return `${folder}/${creatorHandle}/${uuid}.${ext}`;
    case "product_content":
      return `${folder}/${creatorHandle}/${uuid}.${ext}`;
    case "partner_logo":
      return `${folder}/${creatorHandle}/${uuid}.${ext}`;
    case "creator_profile":
      return `${folder}/${uuid}.${ext}`;
    case "creator_cover":
      return `${folder}/${uuid}.${ext}`;
    case "verification_document":
      return `${folder}/${country || "ANY"}/${uuid}.${ext}`;
    case "message_attachment":
      return `${folder}/${creatorHandle}/${uuid}.${ext}`;
  }
}

export interface MultipartUploadTicket {
  uid: string;
  key: string;
  uploadId: string;
  visibility: AssetVisibility;
  assetType: AssetType;
  creatorHandle: string;
  mimeType: string;
  fileSize: number;
  originalName: string;
  maxSizeBytes: number;
  exp: number;
}

const MIME_EXT_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/mp4v-es": "mp4",
  "video/x-m4v": "m4v",
  "video/quicktime": "mov",
  "video/x-msvideo": "avi",
  "video/webm": "webm",
  "video/x-matroska": "mkv",
  "video/3gpp": "3gp",
  "video/3gpp2": "3g2",
  "video/ogg": "ogv",
  "video/mp2t": "ts",
  "video/mpeg": "mpeg",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
};

export const VIDEO_EXTENSIONS =
  /\.(mp4|mov|webm|m4v|mkv|avi|3gp|3g2|mpeg|mpg|ogv|ts)$/i;

export function normalizeMimeType(mime: string): string {
  return (mime || "").split(";")[0].trim().toLowerCase();
}

export function isVideoFileMeta(mime: string, fileName?: string): boolean {
  const normalized = normalizeMimeType(mime);
  if (normalized.startsWith("video/")) return true;
  if (fileName && VIDEO_EXTENSIONS.test(fileName)) return true;
  return false;
}

export function extFromMime(mime: string, fileName?: string): string {
  const normalized = normalizeMimeType(mime);
  if (MIME_EXT_MAP[normalized]) return MIME_EXT_MAP[normalized];
  if (normalized && normalized !== "application/octet-stream") {
    const subtype = normalized.split("/")[1]?.replace(/[^a-z0-9]/g, "");
    if (subtype) return subtype;
  }
  const fileExt = fileName?.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
  return fileExt || "bin";
}
