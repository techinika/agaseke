import type { Env } from "../types";
import {
  convertFromFields,
  convertToFields,
  firestoreCreateIfAbsent,
  firestoreGet,
  firestoreSet,
} from "../firestore";
import { PaymentRequestError } from "./pricing";

export interface IdempotencyAttempt {
  idempotencyKey: string;
  uid: string;
  requestHash: string;
  status: string;
  ref?: string;
  redirectUrl?: string;
  merchantReference?: string;
  type?: string;
  creatorHandle?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function normalizeIdempotencyKey(raw: unknown): string {
  const key = typeof raw === "string" ? raw.trim() : "";
  if (!key) return "";
  if (!/^[A-Za-z0-9._:-]{8,128}$/.test(key)) {
    throw new PaymentRequestError(
      "INVALID_IDEMPOTENCY_KEY",
      "Idempotency-Key must be 8-128 characters (letters, numbers, . _ : -)",
    );
  }
  return key;
}

export async function hashRequest(
  parts: Record<string, unknown>,
): Promise<string> {
  const canonical = JSON.stringify(
    Object.keys(parts)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = parts[key] ?? null;
        return acc;
      }, {}),
  );
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonical),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function getAttempt(
  env: Env,
  key: string,
): Promise<IdempotencyAttempt | null> {
  const doc = await firestoreGet(env, `paymentAttempts/${key}`);
  if (!doc || !doc.fields) return null;
  return convertFromFields(
    doc.fields as Record<string, unknown>,
  ) as unknown as IdempotencyAttempt;
}

export interface ReservationResult {
  created: boolean;
  existing: IdempotencyAttempt | null;
}

export async function reserveAttempt(
  env: Env,
  key: string,
  data: Record<string, unknown>,
): Promise<ReservationResult> {
  const now = new Date().toISOString();
  const created = await firestoreCreateIfAbsent(
    env,
    `paymentAttempts/${key}`,
    convertToFields({
      ...data,
      idempotencyKey: key,
      status: "reserved",
      createdAt: now,
      updatedAt: now,
    }),
  );

  if (created) return { created: true, existing: null };
  return { created: false, existing: await getAttempt(env, key) };
}

export async function completeAttempt(
  env: Env,
  key: string,
  fields: Record<string, unknown>,
): Promise<void> {
  await firestoreSet(
    env,
    `paymentAttempts/${key}`,
    convertToFields({
      ...fields,
      status: "initiated",
      updatedAt: new Date().toISOString(),
    }),
  );
}

export async function failAttempt(
  env: Env,
  key: string,
  error: unknown,
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  await firestoreSet(
    env,
    `paymentAttempts/${key}`,
    convertToFields({
      status: "failed",
      error: message.slice(0, 500),
      updatedAt: new Date().toISOString(),
    }),
  );
}
