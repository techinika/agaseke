import { requireAuth } from "./auth";
import { corsHeaders } from "./cors";
import type { Env } from "./types";
import { handleStoreCallback } from "./services/callback";
import { handleDownload } from "./services/download";
import { logActivity } from "./logger";
import { checkRateLimit } from "./rateLimit";

function getClientIp(request: Request): string {
  return request.headers.get("CF-Connecting-IP") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
}

function isRateLimited(request: Request, maxRequests = 30, windowMs = 60000): Response | null {
  const ip = getClientIp(request);
  const path = new URL(request.url).pathname;
  const result = checkRateLimit(`${ip}:${path}`, maxRequests, windowMs);
  if (!result.allowed) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: {
        "content-type": "application/json",
        "retry-after": String(Math.ceil((result.resetAt - Date.now()) / 1000)),
      },
    });
  }
  return null;
}

function json(data: unknown, status = 200, origin?: string | null): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
      ...corsHeaders(origin || null),
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("origin");

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    const url = new URL(request.url);

    if (url.pathname === "/health" && request.method === "GET") {
      return json({ status: "ok" }, 200, origin);
    }

    if (url.pathname === "/api/store/callback" && request.method === "POST") {
      const limited = isRateLimited(request, 30, 60000);
      if (limited) return limited;
      const authHeader = request.headers.get("X-Internal-Auth");
      if (!authHeader || authHeader !== env.INTERNAL_AUTH_SECRET) {
        return json({ error: "Unauthorized" }, 401, origin);
      }
      try {
        const body = (await request.json()) as Record<string, unknown>;
        const result = await handleStoreCallback(env, body);
        return json(result, 200, origin);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Internal error";
        console.error("Store callback error:", err);
        return json({ error: message }, 500, origin);
      }
    }

    const downloadMatch = url.pathname.match(/^\/api\/store\/download\/(.+)$/);
    if (downloadMatch && request.method === "GET") {
      const limited = isRateLimited(request, 20, 60000);
      if (limited) return limited;
      try {
        const auth = await requireAuth(request, env.FIREBASE_API_KEY, env.FIREBASE_PROJECT_ID);
        if (auth instanceof Response) return auth;
        return await handleDownload(env, downloadMatch[1], auth.uid);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Internal error";
        console.error("Download error:", err);
        return json({ error: message }, 500, origin);
      }
    }

    if (url.pathname === "/api/store/status" && request.method === "POST") {
      const limited = isRateLimited(request, 20, 60000);
      if (limited) return limited;
      try {
        const auth = await requireAuth(request, env.FIREBASE_API_KEY, env.FIREBASE_PROJECT_ID);
        if (auth instanceof Response) return auth;
        const body = (await request.json()) as { ref?: string };
        if (!body.ref) {
          return json({ error: "Missing ref" }, 400, origin);
        }
        const { firestoreRunQuery, extractFirestoreDocument } =
          await import("./firestore");
        const docs = await firestoreRunQuery(env, "transactions", [
          { fieldPath: "ref", op: "EQUAL", value: body.ref },
        ]);
        if (!docs || docs.length === 0) {
          return json({ error: "Transaction not found" }, 404, origin);
        }
        const data = extractFirestoreDocument(
          docs[0].fields as Record<string, unknown>,
        );
        return json({ status: data.status || "unknown" }, 200, origin);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Internal error";
        console.error("Store status error:", err);
        return json({ error: message }, 500, origin);
      }
    }

    return json({ error: "Not found" }, 404, origin);
  },
};
