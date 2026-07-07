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
  body: Record<string, unknown>
): Promise<Record<string, unknown> | null> {
  const token = await getFirestoreToken(env);
  if (!token) return null;

  const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}`;
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

export async function firestoreSet(
  env: Env,
  path: string,
  fields: Record<string, unknown>
): Promise<Record<string, unknown> | null> {
  const token = await getFirestoreToken(env);
  if (!token) return null;

  const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}`;
  const res = await fetch(url, {
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

  const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${collection}:runQuery`;
  const res = await fetch(url, {
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
  if (!res.ok) return [];
  const data = (await res.json()) as Array<Record<string, unknown>>;
  return data
    .filter((d): d is { document: { name: string; fields: Record<string, unknown>; createTime: string; updateTime: string } } =>
      d !== null && typeof d === "object" && "document" in d
    )
    .map((d) => d.document);
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

  const res = await fetch(url, {
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
