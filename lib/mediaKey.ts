const MAX_MEDIA_KEY_LENGTH = 1024;

export type StoredAssetVisibility = "public" | "private";

/**
 * A private-bucket object key is a relative object path, never a URL. Reject
 * schemes, protocol-relative values, leading slashes, parent traversal and
 * control characters so a media value cannot be turned into a different URL by
 * the proxy or the worker.
 */
export function isBareMediaKey(value: string): boolean {
  if (!value || value.length > MAX_MEDIA_KEY_LENGTH) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return false;
  if (value.startsWith("//") || value.startsWith("/")) return false;
  if (value.includes("..")) return false;
  if (/[\u0000-\u001f\u007f]/.test(value)) return false;
  return true;
}

export function isPrivateObjectKey(value: string): boolean {
  return isBareMediaKey(value);
}

/**
 * Classify a stored media value so forms can refuse to keep a public asset on a
 * supporters-only post. Returns null for empty values or unknown schemes.
 */
export function storedAssetVisibility(
  value: string | string[] | null | undefined,
): StoredAssetVisibility | null {
  const first = Array.isArray(value) ? value[0] : value;
  if (!first) return null;
  const trimmed = first.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return "public";
  if (isBareMediaKey(trimmed)) return "private";
  return null;
}
