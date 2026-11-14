import { db } from "@/db/firebase";
import {
  doc,
  collection,
  setDoc,
  addDoc,
  serverTimestamp,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  limit,
  type Unsubscribe,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

export interface ChatAttachment {
  url: string;
  publicId?: string;
  mimeType: string;
  originalName: string;
  fileSize: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderType: "creator" | "member";
  text?: string;
  attachments?: ChatAttachment[];
  createdAt: unknown;
}

export interface ChatMember {
  userId: string;
  userName: string;
  userPhoto?: string;
  status: "active" | "expired" | "cancelled";
}

export function getChatId(creatorHandle: string, tierId: string): string {
  return `${creatorHandle}_${tierId}`;
}

export function getChatRef(creatorHandle: string, tierId: string) {
  const chatId = getChatId(creatorHandle, tierId);
  return doc(db, "communityChats", chatId);
}

export function getMessagesRef(creatorHandle: string, tierId: string) {
  const chatId = getChatId(creatorHandle, tierId);
  return collection(db, "communityChats", chatId, "messages");
}

export function getMembersRef(creatorHandle: string, tierId: string) {
  const chatId = getChatId(creatorHandle, tierId);
  return collection(db, "communityChats", chatId, "members");
}

export function getMemberRef(creatorHandle: string, tierId: string, userId: string) {
  const chatId = getChatId(creatorHandle, tierId);
  return doc(db, "communityChats", chatId, "members", userId);
}

export async function ensureChatExists(
  creatorHandle: string,
  tierId: string,
  tierName: string,
  creatorId: string,
): Promise<void> {
  const chatRef = getChatRef(creatorHandle, tierId);
  const snap = await getDoc(chatRef);
  if (!snap.exists()) {
    await setDoc(chatRef, {
      tierId,
      tierName,
      creatorHandle,
      creatorId,
      createdAt: serverTimestamp(),
      lastMessage: "",
      lastMessageAt: null,
      lastSenderName: "",
      memberCount: 0,
    }).catch((err) => {
      console.error("Failed to ensure chat exists", err);
    });
  }
}

export async function sendChatMessage(
  creatorHandle: string,
  tierId: string,
  text: string,
  attachments?: ChatAttachment[],
): Promise<string | null> {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return null;

  const messagesRef = getMessagesRef(creatorHandle, tierId);
  const messageData: Record<string, unknown> = {
    senderId: user.uid,
    senderName: user.displayName || "Anonymous",
    senderType: "member",
    createdAt: serverTimestamp(),
  };
  if (text.trim()) messageData.text = text.trim();
  if (attachments && attachments.length > 0) messageData.attachments = attachments;

  const ref = await addDoc(messagesRef, messageData);
  return ref.id;
}

export interface CommunityChatMessageRecord {
  id: string;
  senderId?: string;
  senderName?: string;
  senderType?: "creator" | "member";
  text?: string;
  attachments?: ChatAttachment[];
  createdAt?: unknown;
  [key: string]: unknown;
}

export interface CommunityChatAccess {
  canAccess: boolean;
  tierName?: string;
}

export async function getCommunityChatAccess(
  chatId: string,
  userId: string | null,
  isCreator: boolean,
): Promise<CommunityChatAccess> {
  const chatRef = doc(db, "communityChats", chatId);
  const snap = await getDoc(chatRef);
  const tierName = snap.exists()
    ? (snap.data().tierName as string | undefined)
    : undefined;

  if (isCreator) return { canAccess: true, tierName };
  if (!userId) return { canAccess: false, tierName };

  const memberRef = doc(db, "communityChats", chatId, "members", userId);
  const memberSnap = await getDoc(memberRef);
  return {
    canAccess: memberSnap.exists() && memberSnap.data().status === "active",
    tierName,
  };
}

export function subscribeToCommunityChatMessages(
  chatId: string,
  onMessages: (messages: CommunityChatMessageRecord[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const messagesRef = collection(db, "communityChats", chatId, "messages");
  const q = query(messagesRef, orderBy("createdAt", "asc"), limit(200));
  return onSnapshot(
    q,
    (snap) => {
      const list: CommunityChatMessageRecord[] = [];
      snap.forEach((d) => {
        list.push({
          id: d.id,
          ...(d.data() as Record<string, unknown>),
        } as CommunityChatMessageRecord);
      });
      onMessages(list);
    },
    (error) => onError?.(error),
  );
}

export function subscribeToCommunityChatMemberCount(
  chatId: string,
  onCount: (count: number) => void,
): Unsubscribe {
  const membersRef = collection(db, "communityChats", chatId, "members");
  return onSnapshot(membersRef, (snap) => {
    let count = 0;
    snap.forEach((d) => {
      if (d.data().status === "active") count++;
    });
    onCount(count);
  });
}

export async function addCommunityChatMessage(
  chatId: string,
  payload: {
    senderId: string;
    senderName: string;
    senderType: "creator" | "member";
    text?: string;
    attachments?: ChatAttachment[];
  },
): Promise<void> {
  const messagesRef = collection(db, "communityChats", chatId, "messages");
  await addDoc(messagesRef, {
    ...payload,
    createdAt: serverTimestamp(),
  });
}
