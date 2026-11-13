import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/db/firebase";

export interface ChatMessageRecord {
  id: string;
  senderId?: string;
  senderName?: string;
  senderType?: string;
  content?: string;
  createdAt?: unknown;
  read?: boolean;
  [key: string]: unknown;
}

export interface ChatroomInfo {
  id: string;
  enabled: boolean;
}

export async function getOrCreateSupporterChatroom(params: {
  creatorId: string;
  supporterId: string;
  supporterName: string;
}): Promise<ChatroomInfo> {
  const chatroomsRef = collection(db, "chatrooms");
  const q = query(
    chatroomsRef,
    where("creatorId", "==", params.creatorId),
    where("supporterId", "==", params.supporterId),
  );

  const chatroomSnapshot = await getDocs(q);

  if (!chatroomSnapshot.empty) {
    const existingChatroom = chatroomSnapshot.docs[0];
    return {
      id: existingChatroom.id,
      enabled: existingChatroom.data().enabled !== false,
    };
  }

  let supporterPhoto: string | null = null;
  try {
    const profileSnap = await getDoc(doc(db, "profiles", params.supporterId));
    supporterPhoto = (profileSnap.data()?.photoURL as string | undefined) || null;
  } catch {
    // Profile might not exist
  }

  const newChatroom = await addDoc(chatroomsRef, {
    creatorId: params.creatorId,
    supporterId: params.supporterId,
    supporterName: params.supporterName || "Anonymous",
    supporterPhoto,
    lastMessage: "",
    lastMessageAt: serverTimestamp(),
    unreadCount: 0,
    enabled: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { id: newChatroom.id, enabled: true };
}

export function subscribeToChatMessages(
  chatroomId: string,
  onMessages: (messages: ChatMessageRecord[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const messagesRef = collection(db, "chatrooms", chatroomId, "messages");
  const q = query(messagesRef, orderBy("createdAt", "asc"));

  return onSnapshot(
    q,
    (snapshot) => {
      const msgs = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Record<string, unknown>),
      })) as ChatMessageRecord[];
      onMessages(msgs);
    },
    (error) => {
      onError?.(error);
    },
  );
}

export async function markChatMessagesAsRead(
  chatroomId: string,
  messageIds: string[],
): Promise<void> {
  if (messageIds.length === 0) return;
  const batch = writeBatch(db);
  for (const id of messageIds) {
    batch.update(doc(db, "chatrooms", chatroomId, "messages", id), { read: true });
  }
  await batch.commit();
}

export async function sendChatMessage(params: {
  chatroomId: string;
  senderId: string;
  senderName: string;
  senderType: "supporter" | "creator";
  content: string;
  lastMessage: string;
}): Promise<void> {
  const messagesRef = collection(db, "chatrooms", params.chatroomId, "messages");
  await addDoc(messagesRef, {
    senderId: params.senderId,
    senderName: params.senderName,
    senderType: params.senderType,
    content: params.content,
    createdAt: serverTimestamp(),
    read: false,
  });

  await updateDoc(doc(db, "chatrooms", params.chatroomId), {
    lastMessage: params.lastMessage,
    lastMessageAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    unreadCount: 0,
  });
}
