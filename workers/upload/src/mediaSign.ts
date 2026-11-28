import type { MultipartUploadTicket } from "./types";

/**
 * Verifies the short-lived capability token issued by the app for a private
 * object. The app (which holds the entitlement logic) signs `media:{key}:{exp}`
 * with MEDIA_SIGNING_SECRET; this worker only enforces that the exact key was
 * authorised and that the grant has not expired.
 */

function toBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < arr.length; i++) {
    binary += String.fromCharCode(arr[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array | null {
  try {
    const padded =
      value.replace(/-/g, "+").replace(/_/g, "/") +
      "=".repeat((4 - (value.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
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

export async function signUploadTicket(
  secret: string,
  payload: MultipartUploadTicket,
): Promise<string> {
  const encoded = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await sign(secret, `upload:${encoded}`);
  return `${encoded}.${signature}`;
}

export async function verifyUploadTicket(
  secret: string,
  token: string,
): Promise<MultipartUploadTicket | null> {
  if (!secret || !token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encoded, signature] = parts;
  if (!encoded || !signature) return null;

  const expected = await sign(secret, `upload:${encoded}`);
  if (!timingSafeEqualString(expected, signature)) return null;

  const bytes = fromBase64Url(encoded);
  if (!bytes) return null;

  try {
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as MultipartUploadTicket;
    if (!parsed || typeof parsed.uid !== "string" || typeof parsed.key !== "string") {
      return null;
    }
    if (!Number.isFinite(parsed.exp) || parsed.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
