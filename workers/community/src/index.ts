import { requireAuth } from "./auth";
import { corsHeaders } from "./cors";
import type { Env, TierData, SubscribeRequest, CallbackPayload } from "./types";
import { getTiers, saveTiers } from "./services/tiers";
import { getMembers, getMemberSubscriptions } from "./services/members";
import {
  initiateSubscription,
  handlePaymentCallback,
  cancelSubscription,
  processRenewals,
} from "./services/subscriptions";
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

      if (path === "/api/community/tiers" && request.method === "GET") {
        const limited = isRateLimited(request, 60, 60000);
        if (limited) return limited;
        const creatorHandle = url.searchParams.get("creatorHandle");
        if (!creatorHandle)
          return json({ error: "creatorHandle required" }, 400, origin);
        const result = await getTiers(env, creatorHandle);
        return json(result, 200, origin);
      }

      if (path === "/api/community/tiers/save" && request.method === "POST") {
        const limited = isRateLimited(request, 20, 60000);
        if (limited) return limited;
        const auth = await requireAuth(request, env.FIREBASE_API_KEY, env.FIREBASE_PROJECT_ID);
        if (auth instanceof Response) return auth;

        const body = (await request.json()) as {
          creatorHandle: string;
          tiers: TierData[];
          enabled: boolean;
        };
        const creatorDoc = await fetchCreatorUid(env, body.creatorHandle);
        if (creatorDoc !== auth.uid)
          return json({ error: "Forbidden" }, 403, origin);

        await saveTiers(env, body.creatorHandle, body.tiers, body.enabled);
        return json({ success: true }, 200, origin);
      }

      if (
        path === "/api/community/subscribe/initiate" &&
        request.method === "POST"
      ) {
        const limited = isRateLimited(request, 10, 60000);
        if (limited) return limited;
        const auth = await requireAuth(request, env.FIREBASE_API_KEY, env.FIREBASE_PROJECT_ID);
        if (auth instanceof Response) return auth;

        const body = (await request.json()) as SubscribeRequest & {
          request: Request;
        };
        body.request = request;
        const result = await initiateSubscription(env, body, auth.uid);
        return json(result, 200, origin);
      }

      if (path === "/api/community/callback" && request.method === "POST") {
        const limited = isRateLimited(request, 30, 60000);
        if (limited) return limited;
        const internalAuth = request.headers.get("X-Internal-Auth");
        if (internalAuth !== env.INTERNAL_AUTH_SECRET) {
          return json({ error: "Unauthorized" }, 401, origin);
        }

        const body = (await request.json()) as CallbackPayload;
        await handlePaymentCallback(
          env,
          body.txData,
          body.totalAmount,
          body.paymentRef,
          body.paymentMethod,
        );
        return json({ received: true }, 200, origin);
      }

      if (path === "/api/community/members" && request.method === "GET") {
        const limited = isRateLimited(request, 30, 60000);
        if (limited) return limited;
        const auth = await requireAuth(request, env.FIREBASE_API_KEY, env.FIREBASE_PROJECT_ID);
        if (auth instanceof Response) return auth;

        const creatorHandle = url.searchParams.get("creatorHandle");
        if (!creatorHandle)
          return json({ error: "creatorHandle required" }, 400, origin);

        const creatorDoc = await fetchCreatorUid(env, creatorHandle);
        if (creatorDoc !== auth.uid)
          return json({ error: "Forbidden" }, 403, origin);

        const members = await getMembers(env, creatorHandle);
        return json({ members }, 200, origin);
      }

      if (
        path === "/api/community/my-subscriptions" &&
        request.method === "GET"
      ) {
        const limited = isRateLimited(request, 30, 60000);
        if (limited) return limited;
        const auth = await requireAuth(request, env.FIREBASE_API_KEY, env.FIREBASE_PROJECT_ID);
        if (auth instanceof Response) return auth;

        const subs = await getMemberSubscriptions(env, auth.uid);
        return json({ subscriptions: subs }, 200, origin);
      }

      if (path === "/api/community/cancel" && request.method === "POST") {
        const limited = isRateLimited(request, 10, 60000);
        if (limited) return limited;
        const auth = await requireAuth(request, env.FIREBASE_API_KEY, env.FIREBASE_PROJECT_ID);
        if (auth instanceof Response) return auth;

        const { subscriptionId } = (await request.json()) as {
          subscriptionId: string;
        };
        await cancelSubscription(env, subscriptionId, auth.uid);
        return json({ success: true }, 200, origin);
      }

      return json({ error: "Not found" }, 404, origin);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Internal error";
      console.error("Community error:", request.method, url.pathname, err);
      await logActivity(
        env,
        "error",
        "community",
        `Community error: ${message}`,
        {
          path: url.pathname,
          method: request.method,
        },
      ).catch((logErr) => { console.error("Failed to log activity", logErr); });
      return json({ error: message }, 500, origin);
    }
  },

  async scheduled(event: ScheduledEvent, env: Env): Promise<void> {
    await processRenewals(env);
  },
};

async function fetchCreatorUid(
  env: Env,
  handle: string,
): Promise<string | null> {
  const { firestoreGet, convertFromFields } = await import("./firestore");
  const doc = await firestoreGet(env, `creators/${handle}`);
  if (!doc) return null;
  const data = convertFromFields(doc.fields as Record<string, unknown>);
  return (data.uid as string) || null;
}
