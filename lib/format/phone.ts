/**
 * Rwanda phone helpers. Numbers are stored with the local trunk format
 * (07XXXXXXXX) and displayed as 078 000 0000. MTN prefixes are 078/079 and
 * Airtel prefixes are 072/073.
 */

const RWANDA_LOCAL = /^0(7[2389])\d{7}$/;
const RWANDA_E164 = /^250(7[2389])\d{7}$/;

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/** Accepts 078..., 25078..., +25078... and returns 078... (or ""). */
export function normalizeRwandaPhone(value: string): string {
  const digits = digitsOnly(value);
  if (RWANDA_LOCAL.test(digits)) return digits;
  if (RWANDA_E164.test(digits)) return `0${digits.slice(3)}`;
  if (/^7[2389]\d{7}$/.test(digits)) return `0${digits}`;
  return "";
}

/** 0781234567 -> "+250781234567" for APIs that require E.164. */
export function toRwandaE164(value: string): string {
  const local = normalizeRwandaPhone(value);
  return local ? `+250${local.slice(1)}` : "";
}

/** 0781234567 -> "078 123 4567". */
export function formatRwandaPhone(value: string): string {
  const local = normalizeRwandaPhone(value);
  if (!local) return value;
  return `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
}

export function isValidRwandaPhone(value: string): boolean {
  return normalizeRwandaPhone(value) !== "";
}

export function getRwandaNetwork(value: string): "MTN" | "Airtel" | null {
  const local = normalizeRwandaPhone(value);
  if (!local) return null;
  const prefix = local.slice(0, 3);
  if (prefix === "078" || prefix === "079") return "MTN";
  if (prefix === "072" || prefix === "073") return "Airtel";
  return null;
}
