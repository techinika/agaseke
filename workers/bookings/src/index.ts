import { requireAuth } from "./auth";
import { corsHeaders } from "./cors";
import type {
  Env,
  CreateBookingRequest,
  RespondBookingRequest,
  AvailabilityRequest,
} from "./types";
import { createBooking } from "./services/create";
import { respondToBooking } from "./services/respond";
import { checkDateAvailability } from "./services/availability";
import { handleBookingCallback } from "./services/callback";
import { logActivity } from "./logger";
import { checkRateLimit } from "./rateLimit";

function json(data: unknown, status = 200, origin?: string | null): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
      ...corsHeaders(origin || null),
    },
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

    if (url.pathname === "/api/bookings/callback") {
      const limited = isRateLimited(request, 30, 60000);
      if (limited) return limited;
      const authHeader = request.headers.get("X-Internal-Auth");
      if (!authHeader || authHeader !== env.INTERNAL_AUTH_SECRET) {
        return json({ error: "Unauthorized" }, 401, origin);
      }
      try {
        const body = (await request.json()) as Record<string, unknown>;
        const result = await handleBookingCallback(env, body);
        return json(result, 200, origin);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Internal error";
        console.error("Booking callback error:", err);
        return json({ error: message }, 500, origin);
      }
    }

    try {
      const auth = await requireAuth(request, env.FIREBASE_API_KEY, env.FIREBASE_PROJECT_ID);
      if (auth instanceof Response) return auth;

      if (url.pathname === "/api/bookings/create") {
        const limited = isRateLimited(request, 10, 60000);
        if (limited) return limited;
        const body = (await request.json()) as CreateBookingRequest;
        body.bookerId = auth.uid;
        const result = await createBooking(env, body, auth);
        if ("error" in result) {
          return json(result, 400, origin);
        }
        return json(result, 200, origin);
      }

      if (url.pathname === "/api/bookings/respond") {
        const limited = isRateLimited(request, 10, 60000);
        if (limited) return limited;
        const body = (await request.json()) as RespondBookingRequest;
        const result = await respondToBooking(env, body, auth);
        if (!result.success) {
          const status = result.error?.includes("not found") ? 404 : 400;
          return json(result, status, origin);
        }
        return json(result, 200, origin);
      }

      if (url.pathname === "/api/bookings/availability") {
        const limited = isRateLimited(request, 30, 60000);
        if (limited) return limited;
        const body = (await request.json()) as AvailabilityRequest;
        if (!body.creatorHandle) {
          return badRequest("Missing required field: creatorHandle", origin);
        }

        if (body.date) {
          const result = await checkDateAvailability(
            env,
            body.creatorHandle,
            body.date,
          );
          return json(result, 200, origin);
        }

        return json({ enabled: true }, 200, origin);
      }

      return json({ error: "Not found" }, 404, origin);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Internal error";
      console.error("Bookings error:", request.method, request.url, err);
      try {
        await logActivity(
          env,
          "error",
          "booking",
          `Unhandled error: ${message}`,
          {
            url: request.url,
            method: request.method,
          },
        );
      } catch {}
      return json({ error: message }, 500, origin);
    }
  },
};
