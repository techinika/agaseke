const MAX_REDIRECT_LENGTH = 2048;
const BASE_ORIGIN = "https://agaseke.invalid";

function decodeRepeatedly(value: string): string | null {
  let decoded = value;

  for (let i = 0; i < 3; i++) {
    let next: string;
    try {
      next = decodeURIComponent(decoded);
    } catch {
      return null;
    }

    if (next === decoded) return decoded;
    decoded = next;
  }

  return decoded;
}

/**
 * Accepts only same-origin relative paths. Rejects absolute URLs,
 * protocol-relative paths, backslashes, control characters and encoded
 * variants that would escape the site origin.
 */
export function sanitizeRedirectPath(
  value: string | null | undefined,
): string | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_REDIRECT_LENGTH) return null;

  const decoded = decodeRepeatedly(trimmed);
  if (!decoded) return null;

  if (!decoded.startsWith("/")) return null;
  if (decoded.startsWith("//")) return null;
  if (decoded.includes("\\")) return null;
  if (/[\u0000-\u001f\u007f]/.test(decoded)) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(decoded)) return null;

  try {
    const url = new URL(decoded, BASE_ORIGIN);
    if (url.origin !== BASE_ORIGIN) return null;
    if (!url.pathname.startsWith("/")) return null;
    if (url.pathname.startsWith("//")) return null;
    if (url.pathname.includes("\\")) return null;

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}
