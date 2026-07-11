import { db } from "@/db/firebase";
import {
  doc,
  collection,
  setDoc,
  addDoc,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

export interface ChatAttachment {
  url: string;
  publicId: string;
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
  createdAt: any;
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
    }).catch((err) => { console.error("Failed to ensure chat exists", err); });
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
  const messageData: Record<string, any> = {
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
