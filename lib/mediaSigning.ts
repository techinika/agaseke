import crypto from "crypto";

/**
 * Short-lived capability tokens for private media.
 *
 * `<img src>` cannot send a Firebase bearer token, so the authenticated sign
 * endpoint exchanges a post id for a signature that the stream endpoint accepts
 * without a session. The secret is read lazily so builds without the env var
 * still compile; callers must handle the missing-secret error.
 */
const SIGNED_URL_TTL_SECONDS = 600;

function signingSecret(): string {
  const secret = process.env.MEDIA_SIGNING_SECRET || process.env.ENCRYPTION_KEY;
  if (!secret) {
    throw new Error("MEDIA_SIGNING_SECRET (or ENCRYPTION_KEY) is not set");
  }
  return secret;
}

export function mediaTtlSeconds(): number {
  return SIGNED_URL_TTL_SECONDS;
}

function payload(postId: string, exp: number): string {
  return `${postId}.${exp}`;
}

export function signMediaPost(postId: string, exp: number): string {
  return crypto
    .createHmac("sha256", signingSecret())
    .update(payload(postId, exp))
    .digest("base64url");
}

/**
 * Sign a single object key for the private bucket. The upload worker verifies
 * this with the same secret and payload, so an authorised stream can redirect
 * the browser straight to Cloudflare instead of relaying bytes through Next.
 */
export function signMediaKey(key: string, exp: number): string {
  return crypto
    .createHmac("sha256", signingSecret())
    .update(mediaKeyPayload(key, exp))
    .digest("base64url");
}

export function mediaKeyPayload(key: string, exp: number): string {
  return `media:${key}:${exp}`;
}

export function verifyMediaSignature(
  postId: string,
  exp: number,
  signature: string,
): boolean {
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;

  let expected: string;
  try {
    expected = signMediaPost(postId, exp);
  } catch {
    return false;
  }

  const given = Buffer.from(signature);
  const want = Buffer.from(expected);
  if (given.length !== want.length) return false;
  return crypto.timingSafeEqual(given, want);
}
