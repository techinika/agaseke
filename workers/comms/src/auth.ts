/* eslint-disable @typescript-eslint/no-explicit-any */
import { corsHeaders } from "./cors";
import { jwtVerify, createRemoteJWKSet, decodeProtectedHeader } from "jose";

const FIREBASE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

export function unauthorized(
  origin: string | null,
  reason: string,
  details?: unknown,
): Response {
  console.error({
    event: "AUTH_FAILURE",
    status: 401,
    reason: reason,
    details: details instanceof Error ? details.message : details,
  });

  return new Response(
    JSON.stringify({
      error: "Authentication required",
      reason: reason,
      origin: origin,
    }),
    {
      status: 401,
      headers: {
        "content-type": "application/json",
        ...corsHeaders(origin),
      },
    },
  );
}

export function forbidden(origin: string | null, reason: string): Response {
  console.error({
    event: "AUTH_FAILURE",
    status: 403,
    reason: reason,
  });

  return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
    status: 403,
    headers: {
      "content-type": "application/json",
      ...corsHeaders(origin),
    },
  });
}

async function verifyWithFirebaseREST(
  idToken: string,
  apiKey: string,
  origin: string | null,
): Promise<{ uid: string; email: string | null } | Response> {
  try {
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`;
    console.log("Calling Firebase REST:", url.replace(apiKey, "***"));

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });

    const errText = await res.text();
    console.log("Firebase REST response:", res.status, errText);

    if (!res.ok) {
      let structuredErr;
      try {
        structuredErr = JSON.parse(errText);
      } catch {
        structuredErr = errText;
      }
      return unauthorized(origin, "Firebase REST rejected token", structuredErr);
    }

    const data = JSON.parse(errText) as {
      users?: Array<{ localId: string; email?: string }>;
    };
    if (!data.users?.[0]) return unauthorized(origin, "No user payload returned");

    const user = data.users[0];
    return { uid: user.localId, email: user.email || null };
  } catch (err) {
    return unauthorized(origin, "Firebase REST network error", err);
  }
}

async function verifyWithJose(
  idToken: string,
  projectId: string,
  origin: string | null,
): Promise<{ uid: string; email: string | null } | Response> {
  try {
    const header = decodeProtectedHeader(idToken);
    console.log("Token header:", JSON.stringify(header));
  } catch (e) {
    console.log("Failed to decode token header:", e);
  }

  try {
    const { payload } = await jwtVerify(idToken, FIREBASE_JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });
    console.log("Verified with Firebase JWKS");
    return { uid: payload.sub as string, email: (payload.email as string) || null };
  } catch (err: any) {
    return unauthorized(origin, `Jose verification failed: ${err.message}`, err);
  }
}

export async function requireAuth(
  request: Request,
  apiKey: string,
  projectId: string,
): Promise<{ uid: string; email: string | null } | Response> {
  const origin = request.headers.get("origin");

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return unauthorized(origin, "Missing or malformed Authorization header");
  }

  const idToken = authHeader.split("Bearer ")[1];
  if (!idToken) return unauthorized(origin, "Empty token payload");

  const joseResult = await verifyWithJose(idToken, projectId, origin);
  if (!(joseResult instanceof Response)) {
    console.log("Jose verification succeeded");
    return joseResult;
  }

  console.log("Jose failed, falling back to Firebase REST API...");
  return verifyWithFirebaseREST(idToken, apiKey, origin);
}
