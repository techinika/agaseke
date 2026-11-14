/**
 * Verifies the short-lived capability token issued by the app for a private
 * object. The app (which holds the entitlement logic) signs `media:{key}:{exp}`
 * with MEDIA_SIGNING_SECRET; this worker only enforces that the exact key was
 * authorised and that the grant has not expired.
 */

function toBase64Url(bytes: ArrayBuffer): string {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return toBase64Url(signature);
}

export function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function verifyMediaKeySignature(
  secret: string | undefined,
  key: string,
  exp: number,
  signature: string,
): Promise<boolean> {
  if (!secret || !key || !signature) return false;
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;

  const expected = await sign(secret, `media:${key}:${exp}`);
  return timingSafeEqualString(expected, signature);
}
