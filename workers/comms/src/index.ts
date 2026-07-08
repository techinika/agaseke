import { requireAuth } from "./auth";
import { corsHeaders } from "./cors";
import type { Env, CommsRequest, CommsResponse } from "./types";
import { getService, listPurposes } from "./services";
import { renderEmailHtml, renderEmailText } from "./template";

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

async function sendEmail(
  req: CommsRequest,
  env: Env,
  auth: { uid: string; email: string | null },
): Promise<CommsResponse> {
  const service = getService(req.purpose);
  if (!service) throw new Error(`Unknown purpose: ${req.purpose}`);

  const appUrl = env.APP_URL || "https://agaseke.me";
  const assetsUrl = env.ASSETS_URL || appUrl;

  const enrichedData = { ...req.data, env, appUrl };

  const [addresses, templateData] = await Promise.all([
    service.resolveRecipients(enrichedData, env),
    service.buildTemplateData(enrichedData, env),
  ]);

  const to = addresses.to;
  const toArr = Array.isArray(to) ? to : [to];
  if (toArr.length === 0) throw new Error("No recipients resolved");

  const subject = service.buildSubject(enrichedData);
  const from = addresses.from || { email: env.FROM_EMAIL, name: env.FROM_NAME };

  const html = renderEmailHtml(templateData, appUrl, assetsUrl);
  const text = renderEmailText(templateData.body, appUrl);

  const response = await env.EMAIL.send({
    to: addresses.to,
    cc: addresses.cc,
    bcc: addresses.bcc,
    from,
    subject,
    html,
    text,
  });

  console.info(
    `Email sent: purpose=${req.purpose}, recipients=${toArr.length}, messageId=${response.messageId}`,
  );

  return {
    success: true,
    messageId: response.messageId,
    purpose: req.purpose,
    recipientCount: toArr.length,
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("origin");

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method !== "POST") {
      return json({ error: "Method not allowed. Use POST." }, 405, origin);
    }

    try {
      const auth = await requireAuth(request, env.FIREBASE_API_KEY, env.FIREBASE_PROJECT_ID);
      if (auth instanceof Response) return auth;

      const body = (await request.json()) as Partial<CommsRequest>;
      if (!body.purpose || !body.data) {
        return badRequest("Missing required fields: purpose, data", origin);
      }

      const result = await sendEmail(body as CommsRequest, env, auth);
      return json(result, 200, origin);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Internal error";
      console.error("Comms error:", request.method, request.url, err);
      return json({ error: message }, 500, origin);
    }
  },
};
