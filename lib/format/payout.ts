/**
 * Payout number masking. Shows only the first two and last three digits,
 * e.g. "078 000 0000" -> "07••••• 000". The full number is never rendered for
 * display; the protected change flow (re-auth/OTP) lives server-side.
 */

/** "078 000 0000" -> "07••••• 000" */
export function maskPayoutNumber(value: string): string {
  const digits = (value || "").replace(/\D/g, "");
  if (!digits) return "";
  const last3 = digits.slice(-3);
  const keep = Math.min(2, Math.max(digits.length - 3, 0));
  const visible = digits.slice(0, keep);
  const middle = digits.slice(keep, digits.length - 3);
  if (middle.length === 0) return `${visible}${last3}`;
  return `${visible}${"•".repeat(middle.length)} ${last3}`;
}
