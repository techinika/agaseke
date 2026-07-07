import { requireAuth } from "./auth";
import type { Env, MomoInitRequest, CardInitRequest, PesapalIPNPayload } from "./types";
import { initiateMomoPayment } from "./services/momo";
import { initiateCardPayment } from "./services/card";
import { handlePaypackWebhook, handlePesapalIPN } from "./services/webhooks";
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

function badRequest(message: string, origin?: string | null): Response {
  return json({ error: message }, 400, origin);
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
        const body = await request.text();
        const signature = request.headers.get("x-paypack-signature");
        const result = await handlePaypackWebhook(env, body, signature);
        return json(result, 200, origin);
      }

      if (path === "/api/payments/webhooks/pesapal" && request.method === "POST") {
        const body = (await request.json()) as PesapalIPNPayload;
        const result = await handlePesapalIPN(env, body);
        return json(result, 200, origin);
      }

      if (request.method !== "POST") {
        return json({ error: "Method not allowed" }, 405, origin);
      }

      const auth = await requireAuth(request, env.FIREBASE_API_KEY);
      if (auth instanceof Response) return auth;

      if (path === "/api/payments/momo/initiate") {
        const body = (await request.json()) as MomoInitRequest;
        const result = await initiateMomoPayment(env, body, auth.uid);
        return json(result, 200, origin);
      }

      if (path === "/api/payments/card/initiate") {
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
      }).catch(() => {});
      return json({ error: message }, 500, origin);
    }
  },
};
