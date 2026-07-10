import { Resend } from "resend";
import { requireAuth } from "./auth";
import { corsHeaders } from "./cors";
import type { Env, CommsRequest, CommsResponse } from "./types";
import { getService } from "./services";
import { renderEmailHtml, renderEmailText } from "./template";
import { firestorePost } from "./firestore";

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

function toArray(v: string | string[] | undefined | null): string[] {
  if (!v) return [];
  return (Array.isArray(v) ? v : [v]).filter(Boolean);
}

const BATCH_SIZE = 100;

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}

async function sendEmail(
  req: CommsRequest,
  env: Env,
  auth: { uid: string; email: string | null },
): Promise<CommsResponse> {
  const resend = new Resend(env.RESEND_API_KEY);

  const service = getService(req.purpose);
  if (!service) throw new Error(`Unknown purpose: ${req.purpose}`);

  const appUrl = env.APP_URL || "https://agaseke.me";
  const assetsUrl = env.ASSETS_URL || appUrl;

  const enrichedData = { ...req.data, env, appUrl };

  const [addresses, templateData] = await Promise.all([
    service.resolveRecipients(enrichedData, env),
    service.buildTemplateData(enrichedData, env),
  ]);

  const toArr = toArray(addresses.to);
  if (toArr.length === 0) throw new Error("No recipients resolved");

  const ccArr = toArray(addresses.cc);
  const bccFromService = toArray(addresses.bcc);
  const reqCc = toArray(req.cc);
  const reqBcc = toArray(req.bcc);

  const subject = service.buildSubject(enrichedData);
  const from = `${env.FROM_NAME} <${env.FROM_EMAIL}>`;

  const html = renderEmailHtml(templateData, appUrl, assetsUrl);
  const text = renderEmailText(templateData.body, appUrl);

  const allBcc = [...new Set([...ccArr, ...bccFromService, ...reqCc, ...reqBcc])];

  const totalRecipients = toArr.length + allBcc.length;
  const allRecipients = [...new Set([...toArr, ...allBcc])];

  let sentCount = 0;
  let lastId: string | undefined;

  const useBatch = allRecipients.length > 50;

  if (useBatch) {
    for (const batch of chunk(allRecipients, BATCH_SIZE)) {
      const batchPayload = batch.map((email) => ({
        from,
        to: [email],
        subject,
        html,
        text,
      }));

      const { data, error } = await resend.batch.send(batchPayload);

      if (error) {
        console.error(`Resend batch error: purpose=${req.purpose}`, error);
        throw new Error(error.message);
      }

      const batchIds: { id: string }[] = (data as unknown as { data: { id: string }[] })?.data ?? [];
      sentCount += batchIds.length;
      lastId = batchIds[batchIds.length - 1]?.id ?? lastId;

      console.info(
        `Batch sent: purpose=${req.purpose}, batch=${batch.length}, sent=${sentCount}/${allRecipients.length}`,
      );
    }
  } else {
    const sendParams = {
      from,
      to: toArr.length > 1 ? [env.FROM_EMAIL] : toArr,
      bcc: toArr.length > 1 ? [...new Set([...toArr, ...allBcc])] : (allBcc.length ? allBcc : undefined),
      subject,
      html,
      text,
    };

    const { data, error } = await resend.emails.send(sendParams);

    if (error) {
      console.error(`Resend error: purpose=${req.purpose}`, error);
      throw new Error(error.message);
    }

    sentCount = totalRecipients;
    lastId = data?.id;
  }

  console.info(
    `Email sent: purpose=${req.purpose}, recipients=${allRecipients.length}, emailId=${lastId}`,
  );

  return {
    success: true,
    messageId: lastId,
    purpose: req.purpose,
    recipientCount: allRecipients.length,
  };
}

async function handleWebhook(request: Request, env: Env): Promise<Response> {
  const resend = new Resend(env.RESEND_API_KEY);

  const payload = await request.text();

  if (!env.RESEND_WEBHOOK_SECRET) {
    console.warn("RESEND_WEBHOOK_SECRET not set, skipping signature verification");
    return json({ error: "Webhook secret not configured" }, 500);
  }

  try {
    const event = resend.webhooks.verify({
      payload,
      headers: {
        id: request.headers.get("svix-id") || "",
        timestamp: request.headers.get("svix-timestamp") || "",
        signature: request.headers.get("svix-signature") || "",
      },
      webhookSecret: env.RESEND_WEBHOOK_SECRET,
    });

    console.info(`Resend webhook: type=${event.type}`, event.data);

    await firestorePost(env, "emailEvents", {
      fields: {
        type: { stringValue: event.type },
        data: { stringValue: JSON.stringify(event.data) },
        receivedAt: { stringValue: new Date().toISOString() },
      },
    }).catch((err: unknown) => {
      console.error("Failed to store webhook event:", err);
    });

    return json({ received: true }, 200);
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return json({ error: "Invalid signature" }, 400);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("origin");
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method !== "POST") {
      return json({ error: "Method not allowed. Use POST." }, 405, origin);
    }

    if (url.pathname === "/webhook") {
      return handleWebhook(request, env);
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
