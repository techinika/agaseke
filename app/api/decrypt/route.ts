import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/authMiddleware";
import { adminDb } from "@/db/firebaseAdmin";
import { decrypt, isEncrypted } from "@/lib/encryption";

type DecryptRequest =
  | { kind: "booking_reason"; bookingId: string }
  | { kind: "chat_message"; chatroomId: string; messageId: string }
  | { kind: "chatroom_last_message"; chatroomId: string };

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function notFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

function forbidden() {
  return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
}

function decryptValue(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  if (!isEncrypted(value)) return value;

  try {
    return decrypt(value);
  } catch {
    return null;
  }
}

async function canAccessBooking(
  uid: string,
  isAdmin: boolean,
  data: Record<string, unknown>,
): Promise<boolean> {
  if (isAdmin) return true;
  if (data.bookerId === uid) return true;
  if (data.creatorUid === uid) return true;
  if (data.creatorId === uid) return true;

  const creatorHandle = data.creatorHandle;
  if (typeof creatorHandle === "string" && creatorHandle) {
    const creatorSnap = await adminDb.collection("creators").doc(creatorHandle).get();
    return creatorSnap.exists && creatorSnap.data()?.uid === uid;
  }

  return false;
}

async function canAccessChatroom(
  uid: string,
  isAdmin: boolean,
  data: Record<string, unknown>,
): Promise<boolean> {
  return isAdmin || data.creatorId === uid || data.supporterId === uid;
}

export async function POST(request: NextRequest) {
  const authUser = await requireAuth(request);
  if (authUser instanceof NextResponse) return authUser;

  let body: DecryptRequest;
  try {
    body = (await request.json()) as DecryptRequest;
  } catch {
    return badRequest("Invalid JSON body");
  }

  if (!body || typeof body !== "object" || !("kind" in body)) {
    return badRequest("kind is required");
  }

  try {
    if (body.kind === "booking_reason") {
      if (typeof body.bookingId !== "string" || !body.bookingId) {
        return badRequest("bookingId is required");
      }

      const bookingSnap = await adminDb
        .collection("bookingRequests")
        .doc(body.bookingId)
        .get();
      if (!bookingSnap.exists) return notFound();

      const data = bookingSnap.data() || {};
      if (!(await canAccessBooking(authUser.uid, authUser.isAdmin, data))) {
        return forbidden();
      }

      const plaintext = decryptValue(data.reason);
      if (plaintext === null) {
        return NextResponse.json({ error: "Unable to decrypt reason" }, { status: 422 });
      }

      return NextResponse.json({ plaintext });
    }

    if (body.kind === "chat_message") {
      if (
        typeof body.chatroomId !== "string" ||
        !body.chatroomId ||
        typeof body.messageId !== "string" ||
        !body.messageId
      ) {
        return badRequest("chatroomId and messageId are required");
      }

      const chatroomSnap = await adminDb
        .collection("chatrooms")
        .doc(body.chatroomId)
        .get();
      if (!chatroomSnap.exists) return notFound();

      const chatroom = chatroomSnap.data() || {};
      if (!(await canAccessChatroom(authUser.uid, authUser.isAdmin, chatroom))) {
        return forbidden();
      }

      const messageSnap = await adminDb
        .collection("chatrooms")
        .doc(body.chatroomId)
        .collection("messages")
        .doc(body.messageId)
        .get();
      if (!messageSnap.exists) return notFound();

      const plaintext = decryptValue(messageSnap.data()?.content);
      if (plaintext === null) {
        return NextResponse.json({ error: "Unable to decrypt message" }, { status: 422 });
      }

      return NextResponse.json({ plaintext });
    }

    if (body.kind === "chatroom_last_message") {
      if (typeof body.chatroomId !== "string" || !body.chatroomId) {
        return badRequest("chatroomId is required");
      }

      const chatroomSnap = await adminDb
        .collection("chatrooms")
        .doc(body.chatroomId)
        .get();
      if (!chatroomSnap.exists) return notFound();

      const chatroom = chatroomSnap.data() || {};
      if (!(await canAccessChatroom(authUser.uid, authUser.isAdmin, chatroom))) {
        return forbidden();
      }

      const plaintext = decryptValue(chatroom.lastMessage);
      if (plaintext === null) {
        return NextResponse.json({ error: "Unable to decrypt message" }, { status: 422 });
      }

      return NextResponse.json({ plaintext });
    }

    return badRequest("Unsupported kind");
  } catch (error) {
    console.error("Scoped decryption error:", error);
    return NextResponse.json({ error: "Decryption failed" }, { status: 500 });
  }
}
