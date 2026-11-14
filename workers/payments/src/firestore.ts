import * as jose from "jose";
import type { Env } from "./types";
import { auditedFetch } from "./audit";

function normalizePrivateKey(key: string): string {
  const cleaned = key.replace(/\\n/g, "\n");
  if (cleaned.includes("-----BEGIN PRIVATE KEY-----")) return cleaned;
  return `-----BEGIN PRIVATE KEY-----\n${cleaned}\n-----END PRIVATE KEY-----`;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getFirestoreToken(env: Env): Promise<string | null> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.token;

  try {
    const now = Math.floor(Date.now() / 1000);
    const privateKey = await jose.importPKCS8(
      normalizePrivateKey(env.FIREBASE_PRIVATE_KEY),
      "RS256"
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
      const err = await res.text();
      console.error("Firestore OAuth error:", err);
      return null;
    }

    const data = (await res.json()) as { access_token: string; expires_in: number };
    cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 60) * 1000,
    };
    return data.access_token;
  } catch (err) {
    console.error("getFirestoreToken error:", err);
    return null;
  }
}

export async function firestoreGet(
  env: Env,
  path: string
): Promise<Record<string, unknown> | null> {
  const token = await getFirestoreToken(env);
  if (!token) return null;

  const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}`;
  const res = await auditedFetch(env, "GET", path, url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return null;

  return res.json() as Promise<Record<string, unknown>>;
}

export async function firestorePost(
  env: Env,
  path: string,
  body: Record<string, unknown>
): Promise<Record<string, unknown> | null> {
  const token = await getFirestoreToken(env);
  if (!token) return null;

  const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}`;
  const res = await auditedFetch(env, "POST", path, url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) return null;

  return res.json() as Promise<Record<string, unknown>>;
}

export async function firestoreSet(
  env: Env,
  path: string,
  fields: Record<string, unknown>
): Promise<Record<string, unknown> | null> {
  const token = await getFirestoreToken(env);
  if (!token) return null;

  const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}`;
  const res = await auditedFetch(env, "PATCH", path, url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) return null;
  return res.json() as Promise<Record<string, unknown>>;
}

export async function firestoreQuery(
  env: Env,
  collection: string,
  field: string,
  value: Record<string, unknown>,
  limit = 1
): Promise<Array<{ name: string; fields: Record<string, unknown>; createTime: string; updateTime: string }>> {
  const token = await getFirestoreToken(env);
  if (!token) return [];

  const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery`;
  const res = await auditedFetch(env, "POST", `${collection}:runQuery`, url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: collection }],
        where: {
          fieldFilter: {
            field: { fieldPath: field },
            op: "EQUAL",
            value,
          },
        },
        limit,
      },
    }),
  });
  if (!res.ok) {
    const errorBody = await res.text();
    console.error("[firestore] query failed", {
      collection,
      field,
      status: res.status,
      error: errorBody.slice(0, 1000),
    });
    return [];
  }
  const data = (await res.json()) as Array<Record<string, unknown>>;
  return data
    .filter((d): d is { document: { name: string; fields: Record<string, unknown>; createTime: string; updateTime: string } } =>
      d !== null && typeof d === "object" && "document" in d
    )
    .map((d) => d.document);
}

export async function firestoreQueryAll(
  env: Env,
  collection: string,
  field: string,
  value: Record<string, unknown>
): Promise<Array<{ name: string; fields: Record<string, unknown>; createTime: string; updateTime: string }>> {
  const results: Array<{ name: string; fields: Record<string, unknown>; createTime: string; updateTime: string }> = [];

  while (true) {
    const token = await getFirestoreToken(env);
    if (!token) break;

    const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery`;
    const body: any = {
      structuredQuery: {
        from: [{ collectionId: collection }],
        where: {
          fieldFilter: {
            field: { fieldPath: field },
            op: "EQUAL",
            value,
          },
        },
        limit: 300,
      },
    };
    if (results.length > 0) body.structuredQuery.offset = results.length;

    const res = await auditedFetch(env, "POST", `${collection}:runQuery`, url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) break;

    const data = (await res.json()) as Array<Record<string, unknown>>;
    const docs = data
      .filter((d): d is { document: { name: string; fields: Record<string, unknown>; createTime: string; updateTime: string } } =>
        d !== null && typeof d === "object" && "document" in d
      )
      .map((d) => d.document);

    results.push(...docs);
    if (docs.length < 300) break;
  }

  return results;
}

export function firestoreDocumentName(env: Env, path: string): string {
  return `projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}`;
}

export interface FirestoreCommitResult {
  ok: boolean;
  status: number;
  errorStatus?: string;
  error?: string;
}

/**
 * Low-level Firestore commit used by the payment state machine. Supports
 * preconditions (`currentDocument.exists` / `updateTime`) so a state change
 * and its idempotency marker can be written atomically.
 */
export async function firestoreCommit(
  env: Env,
  writes: unknown[],
): Promise<FirestoreCommitResult> {
  const token = await getFirestoreToken(env);
  if (!token) {
    return { ok: false, status: 0, error: "No Firestore token" };
  }

  const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents:commit`;
  const res = await auditedFetch(env, "POST", "documents:commit", url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ writes }),
  });

  if (res.ok) return { ok: true, status: res.status };

  let errorStatus: string | undefined;
  let error: string | undefined;
  try {
    const data = (await res.json()) as {
      error?: { status?: string; message?: string };
    };
    errorStatus = data.error?.status;
    error = data.error?.message;
  } catch {
    error = await res.text().catch(() => "");
  }

  return { ok: false, status: res.status, errorStatus, error };
}

/**
 * Create a document only if it does not exist. Returns true when this caller
 * created it and false when it already existed (used for idempotency keys and
 * webhook event dedupe).
 */
export async function firestoreCreateIfAbsent(
  env: Env,
  path: string,
  fields: Record<string, unknown>,
): Promise<boolean> {
  const result = await firestoreCommit(env, [
    {
      update: {
        name: firestoreDocumentName(env, path),
        fields,
      },
      currentDocument: { exists: false },
    },
  ]);

  if (result.ok) return true;
  if (
    result.status === 409 ||
    result.status === 412 ||
    result.errorStatus === "ALREADY_EXISTS" ||
    result.errorStatus === "FAILED_PRECONDITION"
  ) {
    return false;
  }
  throw new Error(
    `Firestore create-if-absent failed for ${path}: ${result.status} ${result.error ?? ""}`,
  );
}

/**
 * Delete a document if it exists. Missing documents are treated as success so
 * callers can clean up idempotency markers safely.
 */
export async function firestoreDeleteIfExists(
  env: Env,
  path: string,
): Promise<boolean> {
  const result = await firestoreCommit(env, [
    {
      delete: firestoreDocumentName(env, path),
      currentDocument: { exists: true },
    },
  ]);

  if (result.ok) return true;
  if (
    result.status === 404 ||
    result.status === 409 ||
    result.status === 412 ||
    result.errorStatus === "NOT_FOUND" ||
    result.errorStatus === "FAILED_PRECONDITION"
  ) {
    return false;
  }
  throw new Error(
    `Firestore delete failed for ${path}: ${result.status} ${result.error ?? ""}`,
  );
}

export async function firestoreUpdateWithPrecondition(
  env: Env,
  path: string,
  fields: Record<string, unknown>,
  updateTime?: string,
  extraWrites: unknown[] = [],
): Promise<FirestoreCommitResult> {
  const write: Record<string, unknown> = {
    update: {
      name: firestoreDocumentName(env, path),
      fields,
    },
  };
  if (updateTime) write.currentDocument = { updateTime };
  return firestoreCommit(env, [write, ...extraWrites]);
}

export async function firestoreIncrement(
  env: Env,
  path: string,
  increments: Record<string, number>
): Promise<boolean> {
  const token = await getFirestoreToken(env);
  if (!token) return false;

  const docName = `projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}`;
  const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents:commit`;

  const writes = [
    {
      transform: {
        document: docName,
        fieldTransforms: Object.entries(increments).map(([fieldPath, val]) => ({
          fieldPath,
          increment: { integerValue: String(Math.round(val)) },
        })),
      },
    },
  ];

  const res = await auditedFetch(env, "POST", `${path}:commit`, url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ writes }),
  });
  return res.ok;
}

export function convertToFields(obj: Record<string, unknown>): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      fields[key] = { nullValue: null };
    } else if (typeof value === "string") {
      fields[key] = { stringValue: value };
    } else if (typeof value === "number") {
      fields[key] = Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
    } else if (typeof value === "boolean") {
      fields[key] = { booleanValue: value };
    } else if (value instanceof Date) {
      fields[key] = { timestampValue: value.toISOString() };
    } else if (Array.isArray(value)) {
      fields[key] = { arrayValue: { values: value.map((v) => toFieldValue(v)) } };
    } else if (typeof value === "object") {
      fields[key] = { mapValue: { fields: convertToFields(value as Record<string, unknown>) } };
    }
  }
  return fields;
}

function toFieldValue(value: unknown): Record<string, unknown> {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map((v) => toFieldValue(v)) } };
  if (typeof value === "object") return { mapValue: { fields: convertToFields(value as Record<string, unknown>) } };
  return { stringValue: String(value) };
}

function singleFieldToPlain(v: Record<string, unknown>): unknown {
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("timestampValue" in v) return v.timestampValue;
  if ("nullValue" in v) return null;
  if ("mapValue" in v) {
    const mv = v.mapValue as Record<string, unknown>;
    return mv.fields ? convertFromFields(mv.fields as Record<string, unknown>) : {};
  }
  if ("arrayValue" in v) {
    const av = v.arrayValue as Record<string, unknown>;
    const arrVals = av.values as Array<Record<string, unknown>> | undefined;
    return arrVals ? arrVals.map((fv) => singleFieldToPlain(fv)) : [];
  }
  return v;
}

export function convertFromFields(fields: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    result[key] = singleFieldToPlain(value as Record<string, unknown>);
  }
  return result;
}
