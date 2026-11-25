export const DEFAULT_ADMIN_EMAIL = "agasekeforcreators@gmail.com";

const LEGACY_ADMIN_EMAILS = new Set(["songa@agaseke.me"]);

function pickValidAdminEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (LEGACY_ADMIN_EMAILS.has(trimmed.toLowerCase())) return null;
  return trimmed;
}

/**
 * Always resolves admin recipients cleanly on the worker side so stale client
 * environment overrides (e.g. legacy `songa@agaseke.me`) cannot misroute alerts.
 */
export function resolveAdminRecipient(
  data: Record<string, unknown>,
  env?: { ADMIN_EMAIL?: string },
): string {
  return (
    pickValidAdminEmail(env?.ADMIN_EMAIL) ||
    pickValidAdminEmail(data.adminEmail) ||
    DEFAULT_ADMIN_EMAIL
  );
}
