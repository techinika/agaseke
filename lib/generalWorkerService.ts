import { auth } from "@/db/firebase";

export const GENERAL_WORKER_URL =
  process.env.NEXT_PUBLIC_GENERAL_WORKER_URL || "http://localhost:8787";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export async function encrypt(text: string): Promise<string> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${GENERAL_WORKER_URL}/api/general/encrypt`, {
      method: "POST",
      headers,
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    return data.encrypted || text;
  } catch {
    return text;
  }
}

export async function decrypt(encrypted: string): Promise<string> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${GENERAL_WORKER_URL}/api/general/decrypt`, {
      method: "POST",
      headers,
      body: JSON.stringify({ encrypted }),
    });
    const data = await res.json();
    return data.plaintext || encrypted;
  } catch {
    return encrypted;
  }
}

export function isEncrypted(text: string): boolean {
  return /^[0-9a-f]{32}:[0-9a-f]{32}:/i.test(text);
}
