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

async function scopedDecrypt(body: Record<string, string>): Promise<string> {
  const headers = await getAuthHeaders();
  const res = await fetch("/api/decrypt", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error("Decryption failed");

  const data = await res.json();
  if (typeof data.plaintext !== "string") throw new Error("Invalid decryption response");
  return data.plaintext;
}

export async function decryptBookingReason(bookingId: string): Promise<string> {
  return scopedDecrypt({ kind: "booking_reason", bookingId });
}

export async function decryptChatMessage(
  chatroomId: string,
  messageId: string,
): Promise<string> {
  return scopedDecrypt({ kind: "chat_message", chatroomId, messageId });
}

export async function decryptChatroomLastMessage(chatroomId: string): Promise<string> {
  return scopedDecrypt({ kind: "chatroom_last_message", chatroomId });
}

export function isEncrypted(text: string): boolean {
  return /^[0-9a-f]{32}:[0-9a-f]{32}:/i.test(text);
}
