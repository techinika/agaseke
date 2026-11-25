import { isBareMediaKey } from "@/lib/mediaKey";

export type VerificationStatusValue = "pending" | "approved" | "rejected";

export type VerificationBadgeState =
  | "verified"
  | "pending"
  | "rejected"
  | "unverified";

export type DocumentKind = "image" | "pdf" | "file" | "none";

export interface NormalizedVerificationRequest {
  requestId: string;
  uid: string;
  creatorHandle: string;
  creatorName: string;
  creatorProfilePicture: string;
  email: string;
  phoneNumber: string;
  phoneVerified: boolean;
  payoutPreference: string;
  country: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  swiftCode: string;
  idDocumentValue: string;
  idDocumentName: string;
  idDocumentMimeType: string;
  idDocumentKind: DocumentKind;
  status: VerificationStatusValue;
  creatorVerified: boolean;
  creatorVerificationStatus: VerificationStatusValue | null;
  rejectionReason: string;
  reviewedBy: string;
  submittedAtIso: string | null;
  reviewedAtIso: string | null;
  schemaVersion: number;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStatus(value: unknown): VerificationStatusValue | null {
  const raw = asString(value).toLowerCase();
  if (raw === "pending" || raw === "approved" || raw === "rejected") {
    return raw;
  }
  return null;
}

export function parseVerificationTimestamp(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") {
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const ms = value > 1e12 ? value : value * 1000;
    return new Date(ms).toISOString();
  }
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.toISOString() : null;
  }
  if (typeof value === "object") {
    const obj = value as { toDate?: () => Date; seconds?: number; _seconds?: number };
    if (typeof obj.toDate === "function") {
      const d = obj.toDate();
      return Number.isFinite(d.getTime()) ? d.toISOString() : null;
    }
    const seconds = typeof obj.seconds === "number" ? obj.seconds : obj._seconds;
    if (typeof seconds === "number" && Number.isFinite(seconds)) {
      return new Date(seconds * 1000).toISOString();
    }
  }
  return null;
}

export function inferDocumentKind(
  value: string,
  mimeType = "",
  fileName = "",
): DocumentKind {
  if (!value) return "none";
  const mime = mimeType.toLowerCase();
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("image/")) return "image";

  const candidate = (fileName || value.split("?")[0]).toLowerCase();
  if (candidate.endsWith(".pdf")) return "pdf";
  if (/\.(png|jpe?g|webp|gif|avif|bmp|heic)$/i.test(candidate)) return "image";
  if (isBareMediaKey(value) || /^https?:\/\//i.test(value)) return "image";
  return "file";
}

export function isCreatorAlreadyVerified(
  creatorData?: Record<string, unknown> | null,
): boolean {
  if (!creatorData) return false;
  if (creatorData.verified === true) return true;
  return normalizeStatus(creatorData.verificationStatus) === "approved";
}

export function resolveVerificationBadgeState(
  creatorData?: Record<string, unknown> | null,
  latestRequest?: Record<string, unknown> | null,
): VerificationBadgeState {
  if (isCreatorAlreadyVerified(creatorData)) return "verified";
  const creatorStatus = normalizeStatus(creatorData?.verificationStatus);
  if (creatorStatus === "pending") return "pending";
  const reqStatus = normalizeStatus(latestRequest?.status);
  if (reqStatus === "pending") return "pending";
  if (creatorStatus === "rejected" || reqStatus === "rejected") return "rejected";
  return "unverified";
}

/**
 * Normalizes both legacy (`{ uid, country, bankName, accountName, accountNumber, swiftCode, payoutPreference, idDocumentUrl, status }`)
 * and v2 (`creatorHandle`, `creatorName`, `email`, `idDocumentKey`, `reviewedBy`, ...) verificationRequests documents
 * without letting creator document IDs overwrite `requestId`.
 */
export function normalizeVerificationRequest(
  requestId: string,
  requestData: Record<string, unknown>,
  creatorData?: Record<string, unknown> | null,
  profileData?: Record<string, unknown> | null,
): NormalizedVerificationRequest {
  const uid = asString(requestData.uid) || asString(creatorData?.uid) || asString(profileData?.uid);
  const creatorHandle =
    asString(creatorData?.id) ||
    asString(creatorData?.handle) ||
    asString(requestData.creatorHandle) ||
    asString(requestData.handle) ||
    asString(profileData?.username);

  const creatorName =
    asString(creatorData?.name) ||
    asString(creatorData?.displayName) ||
    asString(requestData.creatorName) ||
    asString(profileData?.displayName) ||
    asString(requestData.accountName) ||
    creatorHandle ||
    "Creator";

  const idDocumentValue =
    asString(requestData.idDocumentKey) || asString(requestData.idDocumentUrl);
  const idDocumentMimeType = asString(requestData.idDocumentMimeType);
  const idDocumentName = asString(requestData.idDocumentName);

  const phoneNumber =
    asString(requestData.phoneNumber) ||
    asString(creatorData?.payoutNumber) ||
    asString(profileData?.phoneNumber) ||
    asString(requestData.accountNumber);

  const email =
    asString(requestData.email) ||
    asString(profileData?.email) ||
    asString(creatorData?.email);

  const status = normalizeStatus(requestData.status) ?? "pending";
  const creatorVerified = isCreatorAlreadyVerified(creatorData);
  const creatorVerificationStatus = normalizeStatus(creatorData?.verificationStatus);

  return {
    requestId,
    uid,
    creatorHandle,
    creatorName,
    creatorProfilePicture:
      asString(creatorData?.profilePicture) || asString(profileData?.photoURL),
    email,
    phoneNumber,
    phoneVerified: Boolean(
      creatorData?.phoneVerified ?? requestData.phoneVerified ?? false,
    ),
    payoutPreference:
      asString(requestData.payoutPreference) ||
      asString(creatorData?.payoutPreference) ||
      "momo",
    country: asString(requestData.country) || asString(creatorData?.country),
    bankName: asString(requestData.bankName) || asString(creatorData?.network),
    accountName: asString(requestData.accountName),
    accountNumber:
      asString(requestData.accountNumber) || asString(creatorData?.payoutNumber),
    swiftCode: asString(requestData.swiftCode),
    idDocumentValue,
    idDocumentName,
    idDocumentMimeType,
    idDocumentKind: inferDocumentKind(
      idDocumentValue,
      idDocumentMimeType,
      idDocumentName,
    ),
    status,
    creatorVerified,
    creatorVerificationStatus,
    rejectionReason: asString(requestData.rejectionReason),
    reviewedBy: asString(requestData.reviewedBy),
    submittedAtIso:
      parseVerificationTimestamp(requestData.submittedAt) ??
      parseVerificationTimestamp(requestData.createdAt),
    reviewedAtIso:
      parseVerificationTimestamp(requestData.reviewedAt) ??
      parseVerificationTimestamp(requestData.updatedAt),
    schemaVersion: Number(requestData.schemaVersion || 1),
  };
}

/**
 * Filters and deduplicates the admin verification queue:
 * - Keeps ONLY requests whose status is `"pending"`.
 * - Excludes creators who are already `verified === true` or `verificationStatus === "approved"`.
 * - Deduplicates by `uid` (keeping the newest pending submission).
 */
export function filterPendingVerificationQueue(
  items: NormalizedVerificationRequest[],
): NormalizedVerificationRequest[] {
  const sorted = [...items].sort((a, b) => {
    const aMs = a.submittedAtIso ? Date.parse(a.submittedAtIso) : 0;
    const bMs = b.submittedAtIso ? Date.parse(b.submittedAtIso) : 0;
    return bMs - aMs;
  });

  const seen = new Set<string>();
  const result: NormalizedVerificationRequest[] = [];

  for (const item of sorted) {
    if (item.status !== "pending") continue;
    if (item.creatorVerified || item.creatorVerificationStatus === "approved") {
      continue;
    }
    const dedupKey = item.uid || item.creatorHandle || item.requestId;
    if (!dedupKey || seen.has(dedupKey)) continue;
    seen.add(dedupKey);
    result.push(item);
  }

  return result;
}
