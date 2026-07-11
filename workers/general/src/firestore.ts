import * as jose from "jose";

let cachedToken: { token: string; expiresAt: number } | null = null;

function normalizePrivateKey(key: string): string {
  const cleaned = key.replace(/\\n/g, "\n");
  if (cleaned.includes("-----BEGIN PRIVATE KEY-----")) return cleaned;
  return `-----BEGIN PRIVATE KEY-----\n${cleaned}\n-----END PRIVATE KEY-----`;
}

function getFirestoreUrl(projectId: string, path: string): string {
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${encodeURIComponent(path)}`;
}

async function getFirestoreToken(env: {
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
  FIREBASE_PROJECT_ID: string;
}): Promise<string | null> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.token;

  try {
    const now = Math.floor(Date.now() / 1000);
    const privateKey = await jose.importPKCS8(normalizePrivateKey(env.FIREBASE_PRIVATE_KEY), "RS256");

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
      console.error("General worker: Firestore OAuth error:", await res.text());
      return null;
    }

    const data = (await res.json()) as { access_token: string; expires_in: number };
    cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 60) * 1000,
    };
    return data.access_token;
  } catch {
    return null;
  }
}

export async function firestorePost(
  env: { FIREBASE_CLIENT_EMAIL: string; FIREBASE_PRIVATE_KEY: string; FIREBASE_PROJECT_ID: string },
  path: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  const token = await getFirestoreToken(env);
  if (!token) return null;

  const url = getFirestoreUrl(env.FIREBASE_PROJECT_ID, path);
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) return null;

  return res.json() as Promise<Record<string, unknown>>;
}
