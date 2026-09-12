import { requireAuth } from "./auth";
import { corsHeaders } from "./cors";
import type { Env, CommsRequest, CommsResponse, EmailQueueMessage, EmailService, EmailPurpose } from "./types";
import { getService } from "./services";
import { renderEmailHtml, renderEmailText } from "./template";
import { firestorePost } from "./firestore";
import { checkRateLimit } from "./rateLimit";
import { sendSesEmail } from "./ses";
import { deferAudit, drainPending, flushPending } from "./audit";
import { logEmailSend } from "./logger";
import type { MessageBatch, ExecutionContext } from "@cloudflare/workers-types";

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

function badRequest(message: string, origin?: string | null): Response {
  return json({ error: message }, 400, origin);
}

function toArray(v: string | string[] | undefined | null): string[] {
  if (!v) return [];
  return (Array.isArray(v) ? v : [v]).filter(Boolean);
}

const BATCH_SIZE = 100;
const SEND_CONCURRENCY = 8;

const BULK_PURPOSES = new Set(["broadcast", "message_digest", "content_new"]);

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}

async function sendSesBatch(
  items: { email: string; name: string; subject: string; html: string; text: string }[],
  purpose: string,
  env: Env,
  from: string,
  uid: string,
): Promise<{ sentCount: number; lastId?: string }> {
  let sentCount = 0;
  let lastId: string | undefined;
  let index = 0;
  const errors: unknown[] = [];

  const archive = (fields: Record<string, unknown>): void => {
    deferAudit(firestorePost(env, "sentEmails", { fields }));
  };

  async function worker(): Promise<void> {
    while (index < items.length && errors.length === 0) {
      const item = items[index++];
      const now = new Date().toISOString();
      try {
        const messageId = await sendSesEmail(env, {
          to: [item.email],
          subject: item.subject,
          html: item.html,
          text: item.text,
        });
        sentCount += 1;
        lastId = messageId;

        archive({
          email: { stringValue: item.email },
          status: { stringValue: "sent" },
          from: { stringValue: from },
          messageId: { stringValue: messageId },
          purpose: { stringValue: purpose },
          subject: { stringValue: item.subject },
          recipientName: { stringValue: item.name },
          sentAt: { timestampValue: now },
        });
      } catch (err) {
        errors.push(err);
        archive({
          email: { stringValue: item.email },
          status: { stringValue: "failed" },
          from: { stringValue: from },
          purpose: { stringValue: purpose },
          subject: { stringValue: item.subject },
          recipientName: { stringValue: item.name },
          error: {
            stringValue: (err instanceof Error ? err.message : String(err)).slice(0, 2000),
          },
          sentAt: { timestampValue: now },
        });
        console.error(`SES send failed: purpose=${purpose}, email=${item.email}`, err);
      }
    }
  }

  const workers: Promise<void>[] = [];
  const poolSize = Math.min(SEND_CONCURRENCY, items.length);
  for (let i = 0; i < poolSize; i++) workers.push(worker());
  await Promise.all(workers);

  if (errors.length > 0) {
    deferAudit(
      logEmailSend(env, {
        purpose: purpose as EmailPurpose,
        recipientCount: items.length,
        recipients: items.map((i) => i.email).join(", "),
        subject: items[0]?.subject ?? "",
        uid,
        error: errors[0] instanceof Error ? errors[0].message : String(errors[0]),
      }),
    );
    throw errors[0];
  }

  return { sentCount, lastId };
}

async function sendEmailBatch(
  allRecipients: string[],
  recipientMeta: Record<string, { name?: string; handle?: string }>,
  service: EmailService,
  enrichedData: Record<string, unknown>,
  env: Env,
  uid = "",
): Promise<{ lastId?: string; count: number }> {
  const appUrl = env.APP_URL || "https://agaseke.me";
  const from = `${env.FROM_NAME} <${env.FROM_EMAIL}>`;

  const templateData = await service.buildTemplateData(enrichedData, env);
  const subject = service.buildSubject(enrichedData);
  const creatorHandle = ((enrichedData as Record<string, unknown>).creatorHandle as string) || "";

  const rawHtml = renderEmailHtml(templateData, appUrl, env.ASSETS_URL || appUrl);
  const rawText = renderEmailText(templateData.body, appUrl);
  const rawSubject = subject;

  let sentCount = 0;
  let lastId: string | undefined;
  const purpose = enrichedData.purpose as string;

  const items = allRecipients.map((email) => {
    const info = recipientMeta[email] ?? {};
    const name = info.name || email.split("@")[0] || "there";
    const handle = info.handle || creatorHandle;

    return {
      email,
      name,
      subject: rawSubject.replace(/\[NAME\]/g, name).replace(/\[HANDLE\]/g, handle),
      html: rawHtml.replace(/\[NAME\]/g, name).replace(/\[HANDLE\]/g, handle),
      text: rawText.replace(/\[NAME\]/g, name).replace(/\[HANDLE\]/g, handle),
    };
  });

  for (const batchChunk of chunk(items, BATCH_SIZE)) {
    const { sentCount: chunkSent, lastId: chunkLastId } = await sendSesBatch(
      batchChunk,
      purpose,
      env,
      from,
      uid,
    );
    sentCount += chunkSent;
    lastId = chunkLastId ?? lastId;

    console.info(
      `Batch sent: purpose=${purpose}, batch=${chunkSent}, sent=${sentCount}/${allRecipients.length}`,
    );
  }

  deferAudit(
    logEmailSend(env, {
      purpose: purpose as EmailPurpose,
      recipientCount: allRecipients.length,
      recipients: allRecipients.join(", "),
      subject: rawSubject,
      uid,
      messageId: lastId,
    }),
  );

  return { lastId, count: allRecipients.length };
}

async function sendEmail(
  req: CommsRequest,
  env: Env,
  auth: { uid: string; email: string | null },
): Promise<CommsResponse> {
  const service = getService(req.purpose);
  if (!service) throw new Error(`Unknown purpose: ${req.purpose}`);

  const appUrl = env.APP_URL || "https://agaseke.me";
  const enrichedData = { ...req.data, env, appUrl, purpose: req.purpose };

  const [addresses] = await Promise.all([
    service.resolveRecipients(enrichedData, env),
  ]);

  const toArr = toArray(addresses.to);
  if (toArr.length === 0) throw new Error("No recipients resolved");

  const ccArr = toArray(addresses.cc);
  const bccFromService = toArray(addresses.bcc);
  const reqCc = toArray(req.cc);
  const reqBcc = toArray(req.bcc);

  const allRecipients = [...new Set([...toArr, ...ccArr, ...bccFromService, ...reqCc, ...reqBcc])];
  const meta = addresses.recipientMeta ?? {};

  if (BULK_PURPOSES.has(req.purpose) && env.AGASEKE_EMAIL_QUEUE) {
    let sendTarget: string[] = toArr;
    if (ccArr.length > 0 || bccFromService.length > 0 || reqCc.length > 0 || reqBcc.length > 0) {
      sendTarget = allRecipients;
      console.warn(`Bulk purpose "${req.purpose}" with cc/bcc delivered inline`);
      const result = await sendEmailBatch(sendTarget, meta, service, enrichedData, env, auth.uid);
      return {
        success: true,
        messageId: result.lastId,
        purpose: req.purpose,
        recipientCount: result.count,
        queued: false,
      };
    }

    const message: EmailQueueMessage = {
      purpose: req.purpose as EmailQueueMessage["purpose"],
      to: sendTarget,
      data: req.data,
      recipientMeta: meta,
    };
    await env.AGASEKE_EMAIL_QUEUE.send(message);
    return {
      success: true,
      purpose: req.purpose,
      recipientCount: sendTarget.length,
      queued: true,
    };
  }

  const result = await sendEmailBatch(allRecipients, meta, service, enrichedData, env, auth.uid);
  console.info(
    `Email sent: purpose=${req.purpose}, recipients=${result.count}, emailId=${result.lastId}`,
  );

  return {
    success: true,
    messageId: result.lastId,
    purpose: req.purpose,
    recipientCount: result.count,
    queued: false,
  };
}

async function handleWebhook(request: Request, env: Env): Promise<Response> {
  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const type = String(payload.Type || "Notification");
  const messageId = (payload.MessageId as string) || "";

  await firestorePost(env, "emailEvents", {
    fields: {
      type: { stringValue: type },
      messageId: { stringValue: messageId },
      data: { stringValue: JSON.stringify(payload) },
      receivedAt: { stringValue: new Date().toISOString() },
    },
  }).catch((err: unknown) => {
    console.error("Failed to store webhook event:", err);
  });

  if (type === "SubscriptionConfirmation" || type === "UnsubscribeConfirmation") {
    console.info(
      `SNS ${type} received for ${messageId || "unknown"}; confirm the subscription in the AWS console.`,
    );
  } else if (type === "Notification") {
    console.info(`SNS email event received: messageId=${messageId}`);
  }

  return json({ received: true }, 200);
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const origin = request.headers.get("origin");
      const url = new URL(request.url);

      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders(origin) });
      }

      if (request.method !== "POST") {
        return json({ error: "Method not allowed. Use POST." }, 405, origin);
      }

      if (url.pathname === "/webhook") {
        const limited = isRateLimited(request, 30, 60000);
        if (limited) return limited;
        return handleWebhook(request, env);
      }

      try {
        const limited = isRateLimited(request, 20, 60000);
        if (limited) return limited;
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
    } finally {
      drainPending(ctx);
    }
  },

  async queue(batch: MessageBatch<EmailQueueMessage>, env: Env) {
    for (const message of batch.messages) {
      const job = message.body;
      try {
        const service = getService(job.purpose as CommsRequest["purpose"]);
        if (!service) {
          console.error(`Comms queue: unknown purpose ${job.purpose}`);
          continue;
        }

        const appUrl = env.APP_URL || "https://agaseke.me";
        const enrichedData = { ...job.data, env, appUrl, purpose: job.purpose };

        const result = await sendEmailBatch(
          job.to,
          job.recipientMeta ?? {},
          service,
          enrichedData,
          env,
        );
        console.info(
          `Queued email sent: purpose=${job.purpose}, recipients=${result.count}, emailId=${result.lastId}`,
        );
      } catch (error) {
        console.error(`Comms queue processing error for ${job.purpose}:`, error);
        message.retry();
      }
    }

    await flushPending();
  },
};
