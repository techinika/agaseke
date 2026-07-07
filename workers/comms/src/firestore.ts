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
