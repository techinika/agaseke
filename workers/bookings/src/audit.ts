/**
 * Firestore activity audit for the comms worker.
 *
 * Records every REST database operation (GET/POST/PATCH/DELETE) to the
 * `activityLogs` collection — including failures. Logging is fully
 * asynchronous and fire-and-forget:
 *  - Fetch paths defer the writes via `ctx.waitUntil` (drainPending), so they
 *    complete after the response without ever delaying the client.
 *  - Queue/scheduled paths should `await flushPending()` before returning.
 *  - Any failure to record is swallowed — a user never sees or feels it.
 */

import type { ExecutionContext } from "@cloudflare/workers-types";
import * as jose from "jose";

export type AuditEnv = {
  FIREBASE_PROJECT_ID: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
};

export interface AuditRecord {
  method: string;
  path: string;
  outcome: "success" | "failed";
  status?: number;
  error?: string;
  latencyMs: number;
}

function normalizePrivateKey(key: string): string {
  const cleaned = key.replace(/\\n/g, "\n");
  if (cleaned.includes("-----BEGIN PRIVATE KEY-----")) return cleaned;
  return `-----BEGIN PRIVATE KEY-----\n${cleaned}\n-----END PRIVATE KEY-----`;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAuditToken(env: AuditEnv): Promise<string | null> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.token;

  try {
    const now = Math.floor(Date.now() / 1000);
    const privateKey = await jose.importPKCS8(
      normalizePrivateKey(env.FIREBASE_PRIVATE_KEY),
      "RS256",
    );

    const jwt = await new jose.SignJWT({
      iss: env.FIREBASE_CLIENT_EMAIL,
      sub: env.FIREBASE_CLIENT_EMAIL,
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
      scope: "https://www.googleapis.com/auth/datastore",
    })
      .setProtectedHeader({ alg: "RS256", kid: "" })
      .sign(privateKey);

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });

    if (!res.ok) {
      console.error("Audit Firestore OAuth error:", await res.text());
      return null;
    }

    const data = (await res.json()) as { access_token: string; expires_in: number };
    cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 60) * 1000,
    };
    return data.access_token;
  } catch (err) {
    console.error("getAuditToken error:", err);
    return null;
  }
}

const pending: Promise<unknown>[] = [];

/** Defer a promise so it is flushed (waitUntil or awaited) after the response. */
export function deferAudit(promise: Promise<unknown>): void {
  pending.push(promise.catch(() => undefined));
}

/** Register all deferred writes so they keep running after the response goes out. */
export function drainPending(ctx: ExecutionContext): void {
  while (pending.length) ctx.waitUntil(pending.pop() as Promise<unknown>);
}

/** Wait for all deferred writes (used in queue/scheduled handlers without ctx). */
export async function flushPending(): Promise<void> {
  await Promise.allSettled(pending.splice(0));
}

async function recordOperation(env: AuditEnv, record: AuditRecord): Promise<void> {
  const token = await getAuditToken(env);
  if (!token) return;

  const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/activityLogs`;
  const now = new Date().toISOString();
  const fields: Record<string, unknown> = {
    level: { stringValue: record.outcome === "success" ? "info" : "error" },
    category: { stringValue: "db" },
    type: { stringValue: "db_operation" },
    message: {
      stringValue: `Database ${record.method} ${record.path} — ${record.outcome}`,
    },
    method: { stringValue: record.method },
    path: { stringValue: record.path.slice(0, 500) },
    outcome: { stringValue: record.outcome },
    status: { integerValue: String(record.status ?? 0) },
    latencyMs: { integerValue: String(record.latencyMs) },
    createdAt: { timestampValue: now },
  };
  if (record.error) {
    fields.error = { stringValue: record.error.slice(0, 2000) };
  }

  await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
  });
}

/**
 * Perform a Firestore REST call with non-blocking success/failure auditing.
 * Awaits nothing extra — audit writes are deferred and flushed via waitUntil.
 */
export async function auditedFetch(
  env: AuditEnv,
  method: string,
  path: string,
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const started = Date.now();
  try {
    const res = await fetch(url, init);
    deferAudit(
      recordOperation(env, {
        method,
        path,
        outcome: res.ok ? "success" : "failed",
        status: res.status,
        latencyMs: Date.now() - started,
      }),
    );
    return res;
  } catch (err) {
    deferAudit(
      recordOperation(env, {
        method,
        path,
        outcome: "failed",
        error: err instanceof Error ? err.message : "Network error",
        latencyMs: Date.now() - started,
      }),
    );
    throw err;
  }
}