import { requireAuth } from "./auth";
import type { Env } from "./types";
import { handleSupportCallback } from "./services/callback";
import { logActivity } from "./logger";

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://agaseke.me",
  "https://www.agaseke.me",
  "https://ndafana.netlify.app",
];

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "access-control-allow-origin": allowed,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "Content-Type, Authorization",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}

function json(data: unknown, status = 200, origin?: string | null): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...corsHeaders(origin || null) },
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

    if (request.method !== "POST") {
      return json({ error: "Method not allowed. Use POST." }, 405, origin);
    }

    if (url.pathname === "/api/support/callback") {
      const authHeader = request.headers.get("X-Internal-Auth");
      if (!authHeader || authHeader !== env.INTERNAL_AUTH_SECRET) {
        return json({ error: "Unauthorized" }, 401, origin);
      }
      try {
        const body = await request.json() as Record<string, unknown>;
        const result = await handleSupportCallback(env, body);
        return json(result, 200, origin);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Internal error";
        console.error("Support callback error:", err);
        return json({ error: message }, 500, origin);
      }
    }

    try {
      const auth = await requireAuth(request, env.FIREBASE_API_KEY);
      if (auth instanceof Response) return auth;

      if (url.pathname === "/api/support/status" && request.method === "POST") {
        const body = await request.json() as { ref?: string };
        if (!body.ref) {
          return json({ error: "Missing ref" }, 400, origin);
        }
        const { firestoreRunQuery, extractFirestoreDocument } = await import("./firestore");
        const docs = await firestoreRunQuery(env, "transactions", [
          { fieldPath: "ref", op: "EQUAL", value: body.ref },
        ]);
        if (!docs || docs.length === 0) {
          return json({ error: "Transaction not found" }, 404, origin);
        }
        const data = extractFirestoreDocument(docs[0].fields as Record<string, unknown>);
        return json({ status: data.status || "unknown" }, 200, origin);
      }

      return json({ error: "Not found" }, 404, origin);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Internal error";
      console.error("Support error:", request.method, request.url, err);
      try {
        await logActivity(env, "error", "support", `Unhandled error: ${message}`, {
          url: request.url,
          method: request.method,
        });
      } catch {
      }
      return json({ error: message }, 500, origin);
    }
  },
};
