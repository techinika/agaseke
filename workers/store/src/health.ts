import * as jose from "jose";
import { corsHeaders } from "./cors";
import { requireAuth } from "./auth";

export interface HealthEnv {
  FIREBASE_API_KEY: string;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
  INTERNAL_AUTH_SECRET?: string;
}

function json(data: unknown, status: number, origin: string | null, noStore = false): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
      ...(noStore ? { "cache-control": "no-store" } : {}),
      ...corsHeaders(origin),
    },
  });
}

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const aBytes = enc.encode(a);
  const bBytes = enc.encode(b);
  if (aBytes.byteLength !== bBytes.byteLength) return false;
  let diff = 0;
  for (let i = 0; i < aBytes.byteLength; i += 1) {
    diff |= aBytes[i] ^ bBytes[i];
  }
  return diff === 0;
}

function normalizePrivateKey(key: string): string {
  const cleaned = key.replace(/\\n/g, "\n").trim();
  if (cleaned.includes("-----BEGIN PRIVATE KEY-----")) return cleaned;
  return `-----BEGIN PRIVATE KEY-----\n${cleaned}\n-----END PRIVATE KEY-----`;
}

function sanitizeMessage(raw: string, maxLen = 180): string {
  return raw
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]")
    .replace(/-----BEGIN[^-]+-----[\s\S]*?-----END[^-]+-----/g, "[private-key]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

async function isAuthorizedProbe(request: Request, env: HealthEnv): Promise<Response | null> {
  const internal = request.headers.get("X-Internal-Auth");
  if (internal && env.INTERNAL_AUTH_SECRET && timingSafeEqual(internal, env.INTERNAL_AUTH_SECRET)) {
    return null;
  }

  const auth = await requireAuth(request, env.FIREBASE_API_KEY, env.FIREBASE_PROJECT_ID);
  if (auth instanceof Response) return auth;
  return null;
}

export async function handleHealthRequest(
  request: Request,
  env: HealthEnv,
  service: string,
): Promise<Response> {
  const origin = request.headers.get("origin");
  const url = new URL(request.url);

  if (url.searchParams.get("check") !== "db") {
    return json({ status: "ok", service }, 200, origin, false);
  }

  const authErr = await isAuthorizedProbe(request, env);
  if (authErr) return authErr;

  const startedAt = Date.now();
  const missing: string[] = [];
  if (!env.FIREBASE_PROJECT_ID?.trim()) missing.push("FIREBASE_PROJECT_ID");
  if (!env.FIREBASE_CLIENT_EMAIL?.trim()) missing.push("FIREBASE_CLIENT_EMAIL");
  if (!env.FIREBASE_PRIVATE_KEY?.trim()) missing.push("FIREBASE_PRIVATE_KEY");

  if (missing.length > 0) {
    return json(
      {
        status: "degraded",
        service,
        firestore: {
          ok: false,
          latencyMs: Date.now() - startedAt,
          httpStatus: null,
          stage: "config",
          error: `Missing Firestore configuration: ${missing.join(", ")}`,
        },
      },
      503,
      origin,
      true,
    );
  }

  try {
    const now = Math.floor(Date.now() / 1000);
    const privateKey = await jose.importPKCS8(
      normalizePrivateKey(env.FIREBASE_PRIVATE_KEY),
      "RS256",
    );
    const jwt = await new jose.SignJWT({
      iss: env.FIREBASE_CLIENT_EMAIL,
      sub: env.FIREBASE_CLIENT_EMAIL,
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 300,
      scope: "https://www.googleapis.com/auth/datastore",
    })
      .setProtectedHeader({ alg: "RS256", kid: "" })
      .sign(privateKey);

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!tokenRes.ok) {
      let reason = `OAuth token request failed (HTTP ${tokenRes.status})`;
      try {
        const body = (await tokenRes.json()) as { error_description?: string; error?: string };
        const detail = body.error_description || body.error;
        if (detail) reason = `OAuth ${tokenRes.status}: ${detail}`;
      } catch {
        // Keep HTTP status message
      }
      return json(
        {
          status: "degraded",
          service,
          firestore: {
            ok: false,
            latencyMs: Date.now() - startedAt,
            httpStatus: tokenRes.status,
            stage: "oauth",
            error: sanitizeMessage(reason),
          },
        },
        503,
        origin,
        true,
      );
    }

    const tokenData = (await tokenRes.json()) as { access_token?: string };
    if (!tokenData.access_token) {
      return json(
        {
          status: "degraded",
          service,
          firestore: {
            ok: false,
            latencyMs: Date.now() - startedAt,
            httpStatus: 502,
            stage: "oauth",
            error: "OAuth token endpoint returned no access token",
          },
        },
        503,
        origin,
        true,
      );
    }

    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      env.FIREBASE_PROJECT_ID.trim(),
    )}/databases/(default)/documents/currencies?pageSize=1`;
    const fsRes = await fetch(firestoreUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
      signal: AbortSignal.timeout(5000),
    });

    if (!fsRes.ok) {
      let detail = `Firestore returned HTTP ${fsRes.status}`;
      try {
        const errPayload = (await fsRes.json()) as {
          error?: { message?: string; status?: string };
        };
        const msg = errPayload.error?.message || errPayload.error?.status;
        if (msg) detail = `Firestore HTTP ${fsRes.status}: ${msg}`;
      } catch {
        // Keep HTTP status message
      }
      return json(
        {
          status: "degraded",
          service,
          firestore: {
            ok: false,
            latencyMs: Date.now() - startedAt,
            httpStatus: fsRes.status,
            stage: "firestore",
            error: sanitizeMessage(detail),
          },
        },
        503,
        origin,
        true,
      );
    }

    return json(
      {
        status: "ok",
        service,
        firestore: {
          ok: true,
          latencyMs: Date.now() - startedAt,
          httpStatus: fsRes.status,
        },
      },
      200,
      origin,
      true,
    );
  } catch (err: unknown) {
    const rawMsg = err instanceof Error ? err.message : "Firestore connectivity probe failed";
    return json(
      {
        status: "degraded",
        service,
        firestore: {
          ok: false,
          latencyMs: Date.now() - startedAt,
          httpStatus: null,
          stage: "network",
          error: sanitizeMessage(rawMsg || "Firestore probe error"),
        },
      },
      503,
      origin,
      true,
    );
  }
}
