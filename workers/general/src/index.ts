import { requireAuth } from "./auth";
import { corsHeaders } from "./cors";
import { encrypt, decrypt, isEncrypted } from "./encryption";
import type { Env } from "./types";

function json(data: unknown, status = 200, origin?: string | null): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
      ...corsHeaders(origin || null),
    },
  });
}

function isInternalAuth(request: Request, secret: string): boolean {
  const internal = request.headers.get("X-Internal-Auth");
  return internal === secret;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("origin");
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    try {
      if (path === "/health" && request.method === "GET") {
        return json({ status: "ok" }, 200, origin);
      }

      if (path === "/api/general/encrypt" && request.method === "POST") {
        if (!isInternalAuth(request, env.INTERNAL_AUTH_SECRET)) {
          const auth = await requireAuth(request, env.FIREBASE_API_KEY, env.FIREBASE_PROJECT_ID);
          if (auth instanceof Response) return auth;
        }

        const { text } = (await request.json()) as { text: string };
        if (!text || typeof text !== "string") {
          return json({ error: "Text is required" }, 400, origin);
        }

        const encrypted = await encrypt(text, env.ENCRYPTION_KEY);
        return json({ encrypted }, 200, origin);
      }

      if (path === "/api/general/decrypt" && request.method === "POST") {
        if (!isInternalAuth(request, env.INTERNAL_AUTH_SECRET)) {
          const auth = await requireAuth(request, env.FIREBASE_API_KEY, env.FIREBASE_PROJECT_ID);
          if (auth instanceof Response) return auth;
        }

        const { encrypted } = (await request.json()) as { encrypted: string };
        if (!encrypted || typeof encrypted !== "string") {
          return json({ error: "Encrypted text is required" }, 400, origin);
        }

        const plaintext = await decrypt(encrypted, env.ENCRYPTION_KEY);
        return json({ plaintext }, 200, origin);
      }

      if (path === "/api/general/is-encrypted" && request.method === "POST") {
        const { text } = (await request.json()) as { text: string };
        if (!text || typeof text !== "string") {
          return json({ error: "Text is required" }, 400, origin);
        }

        return json({ isEncrypted: isEncrypted(text) }, 200, origin);
      }

      return json({ error: "Not found" }, 404, origin);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Internal error";
      console.error("General worker error:", request.method, url.pathname, err);
      return json({ error: message }, 500, origin);
    }
  },
};
