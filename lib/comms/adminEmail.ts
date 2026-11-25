export const DEFAULT_ADMIN_EMAIL = "agasekeforcreators@gmail.com";

const LEGACY_ADMIN_EMAILS = new Set(["songa@agaseke.me"]);

/**
 * Resolves the destination email for admin operational notifications
 * (verification requests, withdrawal requests). Legacy addresses such as
 * `songa@agaseke.me` are never returned even if stale env vars still carry them.
 */
export function resolveAdminNotificationEmail(
  configured?: string | null,
): string {
  const candidate = typeof configured === "string" ? configured.trim() : "";
  if (!candidate || LEGACY_ADMIN_EMAILS.has(candidate.toLowerCase())) {
    return DEFAULT_ADMIN_EMAIL;
  }
  return candidate;
}

export function getClientAdminEmail(): string {
  return resolveAdminNotificationEmail(process.env.NEXT_PUBLIC_ADMIN_EMAIL);
}
