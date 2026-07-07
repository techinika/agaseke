import * as jose from "jose";
import type { Env } from "./types";

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
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return null;

  return res.json() as Promise<Record<string, unknown>>;
}

export async function firestorePost(
  env: Env,
  path: string,
  body: Record<string, unknown>,
  documentId?: string
): Promise<Record<string, unknown> | null> {
  const token = await getFirestoreToken(env);
  if (!token) return null;

  let url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}`;
  if (documentId) {
    url += `?documentId=${encodeURIComponent(documentId)}`;
  }

  const res = await fetch(url, {
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

export async function firestorePatch(
  env: Env,
  path: string,
  fields: Record<string, unknown>
): Promise<Record<string, unknown> | null> {
  const token = await getFirestoreToken(env);
  if (!token) return null;

  const fieldPaths = Object.keys(fields)
    .map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
    .join("&");
  const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}?${fieldPaths}`;

  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    console.error("Firestore PATCH error:", res.status, await res.text());
    return null;
  }

  return res.json() as Promise<Record<string, unknown>>;
}

export async function firestoreRunQuery(
  env: Env,
  collectionId: string,
  filters: Array<{
    fieldPath: string;
    op: "EQUAL" | "IN" | "ARRAY_CONTAINS";
    value: unknown;
  }>,
  limit?: number
): Promise<Array<Record<string, unknown>> | null> {
  const token = await getFirestoreToken(env);
  if (!token) return null;

  const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery`;

  function toFirestoreFilterValue(val: unknown): Record<string, unknown> {
    if (Array.isArray(val)) {
      return {
        arrayValue: {
          values: val.map((v) => toFirestoreFilterValue(v)),
        },
      };
    }
    if (typeof val === "string") return { stringValue: val };
    if (typeof val === "number") return { integerValue: String(val) };
    if (typeof val === "boolean") return { booleanValue: val };
    return { stringValue: String(val) };
  }

  const queryFilters = filters.map((f) => ({
    fieldFilter: {
      field: { fieldPath: f.fieldPath },
      op: f.op,
      value: toFirestoreFilterValue(f.value),
    },
  }));

  const structuredQuery: Record<string, unknown> = {
    from: [{ collectionId }],
  };

  if (queryFilters.length > 0) {
    structuredQuery.where = {
      compositeFilter: {
        op: "AND",
        filters: queryFilters,
      },
    };
  }

  if (limit) {
    structuredQuery.limit = limit;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ structuredQuery }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("Firestore query error:", res.status, text);
    return null;
  }

  const data = (await res.json()) as Array<Record<string, unknown>>;
  return data
    .filter((d) => (d as Record<string, unknown>).document)
    .map((d) => ((d as Record<string, unknown>).document as Record<string, unknown>));
}

export function extractFirestoreValue(val: Record<string, unknown>): unknown {
  if ("stringValue" in val && val.stringValue !== undefined) return val.stringValue;
  if ("integerValue" in val && val.integerValue !== undefined) return Number(val.integerValue);
  if ("doubleValue" in val && val.doubleValue !== undefined) return val.doubleValue;
  if ("booleanValue" in val && val.booleanValue !== undefined) return val.booleanValue;
  if ("timestampValue" in val) return val.timestampValue;
  if ("nullValue" in val) return null;
  if ("mapValue" in val) {
    const mapVal = val.mapValue as { fields?: Record<string, unknown> };
    if (mapVal.fields) {
      return extractFirestoreDocument(mapVal.fields);
    }
    return {};
  }
  if ("arrayValue" in val) {
    const arrVal = val.arrayValue as { values?: Array<Record<string, unknown>> };
    if (arrVal.values) {
      return arrVal.values.map((v) => extractFirestoreValue(v));
    }
    return [];
  }
  return null;
}

export function extractFirestoreDocument(fields: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(fields)) {
    result[key] = extractFirestoreValue(val as Record<string, unknown>);
  }
  return result;
}

export function getDocumentId(doc: Record<string, unknown>): string | null {
  const name = (doc as { name?: string }).name;
  if (!name) return null;
  const parts = name.split("/");
  return parts[parts.length - 1] || null;
}
