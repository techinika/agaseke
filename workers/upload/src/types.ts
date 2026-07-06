export type AssetType =
  | "creator_profile"
  | "creator_cover"
  | "post_image"
  | "post_video"
  | "post_document"
  | "product_thumbnail"
  | "product_content"
  | "partner_logo"
  | "verification_document";

export interface Env {
  UPLOADS_BUCKET: R2Bucket;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
  ASSETS_BASE_URL: string;
  MAX_IMAGE_SIZE_MB: string;
  MAX_VIDEO_SIZE_MB: string;
  WEBP_QUALITY: string;
}

export interface UploadResult {
  url: string;
  publicId: string;
  format?: string;
  assetId?: string;
  assetType: AssetType;
}

export interface AssetDocument {
  url: string;
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
  }
}

const MIME_EXT_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/x-msvideo": "avi",
  "video/webm": "webm",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
};

export function extFromMime(mime: string): string {
  return MIME_EXT_MAP[mime] || mime.split("/")[1] || "bin";
}
