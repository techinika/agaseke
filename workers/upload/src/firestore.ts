import * as jose from "jose";
import type { Env, AssetDocument, AssetType } from "./types";

function normalizePrivateKey(key: string): string {
  const cleaned = key.replace(/\\n/g, "\n");
  if (cleaned.includes("-----BEGIN PRIVATE KEY-----")) return cleaned;
  return `-----BEGIN PRIVATE KEY-----\n${cleaned}\n-----END PRIVATE KEY-----`;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(env: Env): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

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
    console.error("OAuth token error:", err);
    throw new Error("Failed to get Firestore access token");
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: data.access_token, expiresAt: now + data.expires_in - 60 };
  return data.access_token;
}

function toFirestoreValue(value: string | number | boolean, type?: string): Record<string, unknown> {
  if (type === "timestamp") {
    return { timestampValue: String(value) };
  }
  if (type === "integer" || typeof value === "number") {
    return { integerValue: String(value) };
  }
  return { stringValue: String(value) };
}

export async function createAssetDocument(
  env: Env,
  doc: AssetDocument
): Promise<string | null> {
  try {
    const token = await getAccessToken(env);
    const now = new Date().toISOString();

    const fields: Record<string, unknown> = {
      url: { stringValue: doc.url },
      publicId: { stringValue: doc.publicId },
      mimeType: { stringValue: doc.mimeType },
      fileSize: { integerValue: String(doc.fileSize) },
      assetType: { stringValue: doc.assetType },
      creatorId: { stringValue: doc.creatorId },
      creatorHandle: { stringValue: doc.creatorHandle },
      originalName: { stringValue: doc.originalName },
      usage: { stringValue: doc.usage },
      createdAt: { timestampValue: now },
      updatedAt: { timestampValue: now },
    };

    for (const [key, val] of Object.entries(doc.metadata)) {
      fields[key] = { stringValue: val };
    }

    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/assets`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fields }),
      }
    );

    if (!res.ok) {
      const errBody = await res.text();
      console.error("Firestore write error:", res.status, errBody);
      return null;
    }

    const result = (await res.json()) as { name?: string };
    return result.name?.split("/").pop() || null;
  } catch (err) {
    console.error("Firestore createAssetDocument error:", err);
    return null;
  }
}
