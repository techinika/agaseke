import { requireAuth } from "./auth";
import { corsHeaders } from "./cors";
import type { Env, MomoInitRequest, CardInitRequest, PesapalIPNPayload } from "./types";
import { initiateMomoPayment } from "./services/momo";
import { initiateCardPayment } from "./services/card";
import { handlePaypackWebhook, handlePesapalIPN } from "./services/webhooks";
import { logActivity } from "./logger";
import { checkRateLimit } from "./rateLimit";

function json(data: unknown, status = 200, origin?: string | null): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...corsHeaders(origin || null) },
  });
}

function badRequest(message: string, origin?: string | null): Response {
  return json({ error: message }, 400, origin);
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

      if (path === "/api/payments/webhooks/paypack" && request.method === "POST") {
        const limited = isRateLimited(request, 20, 60000);
        if (limited) return limited;
        const body = await request.text();
        const signature = request.headers.get("x-paypack-signature");
        const result = await handlePaypackWebhook(env, body, signature);
        return json(result, 200, origin);
      }

      if (path === "/api/payments/webhooks/pesapal" && request.method === "POST") {
        const limited = isRateLimited(request, 20, 60000);
        if (limited) return limited;
        const body = (await request.json()) as PesapalIPNPayload;
        const result = await handlePesapalIPN(env, body);
        return json(result, 200, origin);
      }

      if (request.method !== "POST") {
        return json({ error: "Method not allowed" }, 405, origin);
      }

      const auth = await requireAuth(request, env.FIREBASE_API_KEY, env.FIREBASE_PROJECT_ID);
      if (auth instanceof Response) return auth;

      if (path === "/api/payments/momo/initiate") {
        const limited = isRateLimited(request, 10, 60000);
        if (limited) return limited;
        const body = (await request.json()) as MomoInitRequest;
        const result = await initiateMomoPayment(env, body, auth.uid);
        return json(result, 200, origin);
      }

      if (path === "/api/payments/card/initiate") {
        const limited = isRateLimited(request, 10, 60000);
        if (limited) return limited;
        const body = (await request.json()) as CardInitRequest;
        const result = await initiateCardPayment(env, body, auth.uid);
        return json(result, 200, origin);
      }

      return json({ error: "Not found" }, 404, origin);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Internal error";
      console.error("Payments error:", request.method, url.pathname, err);
      await logActivity(env, "error", "payment", `Payments error: ${message}`, {
        path: url.pathname,
        method: request.method,
        error: err instanceof Error ? err.message : String(err),
      }).catch((logErr) => { console.error("Failed to log activity", logErr); });
      return json({ error: message }, 500, origin);
    }
  },
};
