import { requireAuth } from "./auth";
import { corsHeaders } from "./cors";
import { encrypt, decrypt, isEncrypted } from "./encryption";
import { logError } from "./logger";
import { firestorePost } from "./firestore";
import { checkRateLimit } from "./rateLimit";
import type { Env, QueueJob } from "./types";
import type { MessageBatch } from "@cloudflare/workers-types";

function json(data: unknown, status = 200, origin?: string | null): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
      ...corsHeaders(origin || null),
    },
  });
}

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

function isInternalAuth(request: Request, secret: string): boolean {
  const internal = request.headers.get("X-Internal-Auth");
  if (!internal || !secret) return false;
  const enc = new TextEncoder();
  const a = enc.encode(internal);
  const b = enc.encode(secret);
  if (a.byteLength !== b.byteLength) return false;
  return a.every((byte, i) => byte === b[i]);
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
        const limited = isRateLimited(request, 30, 60000);
        if (limited) return limited;

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
        const limited = isRateLimited(request, 30, 60000);
        if (limited) return limited;

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
        const limited = isRateLimited(request, 30, 60000);
        if (limited) return limited;

        const { text } = (await request.json()) as { text: string };
        if (!text || typeof text !== "string") {
          return json({ error: "Text is required" }, 400, origin);
        }

        return json({ isEncrypted: isEncrypted(text) }, 200, origin);
      }

      if (path === "/api/general/log-error" && request.method === "POST") {
        const limited = isRateLimited(request, 10, 60000);
        if (limited) return limited;

        const body = (await request.json()) as {
          level?: string;
          category?: string;
          message?: string;
          metadata?: Record<string, unknown>;
        };

        if (!body.message || typeof body.message !== "string") {
          return json({ error: "message is required" }, 400, origin);
        }

        await env.AGASEKE_LOG_QUEUE.send({
          kind: "log",
          level: body.level || "error",
          category: body.category || "client",
          message: body.message,
          metadata: body.metadata,
        });
        return json({ success: true, queued: true }, 200, origin);
      }

      if (path === "/api/general/notification" && request.method === "POST") {
        const limited = isRateLimited(request, 20, 60000);
        if (limited) return limited;

        const auth = await requireAuth(request, env.FIREBASE_API_KEY, env.FIREBASE_PROJECT_ID);
        if (auth instanceof Response) return auth;

        const body = (await request.json()) as {
          userId: string;
          type: string;
          title: string;
          message: string;
          link?: string;
          metadata?: Record<string, unknown>;
        };

        if (!body.userId || !body.type || !body.title || !body.message) {
          return json({ error: "userId, type, title, and message are required" }, 400, origin);
        }

        await env.AGASEKE_LOG_QUEUE.send({
          kind: "notification",
          userId: body.userId,
          type: body.type,
          title: body.title,
          message: body.message,
          link: body.link,
          metadata: body.metadata,
        });
        return json({ success: true, queued: true }, 200, origin);
      }

      return json({ error: "Not found" }, 404, origin);
    } catch {
      console.error("General worker error:", request.method, url.pathname);
      return json({ error: "Internal server error" }, 500, origin);
    }
  },

  async queue(batch: MessageBatch<QueueJob>, env: Env) {
    for (const message of batch.messages) {
      const job = message.body;
      try {
        if (job.kind === "log") {
          await logError(
            env as unknown as Record<string, string>,
            job.level,
            job.category,
            job.message,
            job.metadata,
          );
        } else {
          const now = new Date().toISOString();
          const fields: Record<string, unknown> = {
            userId: { stringValue: job.userId },
            type: { stringValue: job.type },
            title: { stringValue: job.title.slice(0, 200) },
            message: { stringValue: job.message.slice(0, 1000) },
            read: { booleanValue: false },
            createdAt: { timestampValue: now },
          };

          if (job.link) fields.link = { stringValue: job.link };
          if (job.metadata) {
            fields.metadata = { stringValue: JSON.stringify(job.metadata).slice(0, 5000) };
          }

          await firestorePost(env, `notifications`, { fields });
        }
      } catch (err) {
        console.error("General worker queue processing error:", err);
        message.retry();
      }
    }
  },
};
