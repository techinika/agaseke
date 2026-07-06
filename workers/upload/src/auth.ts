import * as jose from "jose";

const JWKS_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

const jwks = jose.createRemoteJWKSet(new URL(JWKS_URL));

export function unauthorized(): Response {
  return new Response(JSON.stringify({ error: "Authentication required" }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
}

export function forbidden(): Response {
  return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
    status: 403,
    headers: { "content-type": "application/json" },
  });
}

export async function requireAuth(
  request: Request,
  projectId: string
): Promise<{ uid: string; email: string | null } | Response> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return unauthorized();
  }

  const token = authHeader.split("Bearer ")[1];
  if (!token) return unauthorized();

  try {
    const { payload } = await jose.jwtVerify(token, jwks, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });

    return {
      uid: payload.sub as string,
      email: (payload.email as string) || null,
    };
  } catch (err) {
    console.error("JWT verification error:", err);
    return unauthorized();
  }
}
