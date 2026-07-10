import type { Env } from "../types";
import { firestoreQueryAll, firestoreGet, convertFromFields, convertToFields, firestoreSet } from "../firestore";

export interface MemberInfo {
  subscriptionId: string;
  userId: string;
  userEmail: string;
  userName: string;
  tierId: string;
  tierName: string;
  status: string;
  subscribedAt: string;
  expiresAt: string;
  amount: number;
  currency?: string;
  interval: string;
  autoRenew: boolean;
}

export async function getMembers(
  env: Env,
  creatorHandle: string
): Promise<MemberInfo[]> {
  const docs = await firestoreQueryAll(env, "communitySubscriptions", "creatorHandle", { stringValue: creatorHandle });
  return docs.map((doc) => {
    const data = convertFromFields(doc.fields) as Record<string, unknown>;
    const parts = doc.name.split("/");
    return {
      subscriptionId: parts[parts.length - 1],
      userId: (data.userId as string) || "",
      userEmail: (data.userEmail as string) || "",
      userName: (data.userName as string) || "",
      tierId: (data.tierId as string) || "",
      tierName: (data.tierName as string) || "",
      status: (data.status as string) || "pending",
      subscribedAt: (data.subscribedAt as string) || "",
      expiresAt: (data.expiresAt as string) || "",
      amount: Number(data.amount) || 0,
      currency: (data.currency as string) || "RWF",
      interval: (data.interval as string) || "monthly",
      autoRenew: !!data.autoRenew,
    };
  });
}

export async function getMemberSubscriptions(
  env: Env,
  userId: string
): Promise<{ tierId: string; status: string; expiresAt: string }[]> {
  const docs = await firestoreQueryAll(env, "communitySubscriptions", "userId", { stringValue: userId });
  return docs.map((doc) => {
    const data = convertFromFields(doc.fields);
    return {
      tierId: (data.tierId as string) || "",
      status: (data.status as string) || "",
      expiresAt: (data.expiresAt as string) || "",
    };
  });
}

async function ensureChatDocExists(
  env: Env,
  creatorHandle: string,
  tierId: string,
  tierName?: string,
): Promise<void> {
  const chatId = `${creatorHandle}_${tierId}`;
  const chatPath = `communityChats/${chatId}`;
  const existing = await firestoreGet(env, chatPath);
  if (existing) return;

  const tierDoc = await firestoreGet(env, `creators/${creatorHandle}`);
  const creatorId = tierDoc
    ? (convertFromFields(tierDoc.fields as Record<string, unknown>).uid as string) || ""
    : "";

  await firestoreSet(env, chatPath, convertToFields({
    tierId,
    tierName: tierName || "",
    creatorHandle,
    creatorId,
    createdAt: new Date().toISOString(),
    lastMessage: "",
    lastMessageAt: null,
    lastSenderName: "",
    memberCount: 1,
  }));
}

export async function addChatMember(
  env: Env,
  creatorHandle: string,
  tierId: string,
  userId: string,
  userName: string,
  status: "active" | "expired" | "cancelled",
  tierName?: string,
): Promise<void> {
  await ensureChatDocExists(env, creatorHandle, tierId, tierName);
  const chatId = `${creatorHandle}_${tierId}`;
  const memberPath = `communityChats/${chatId}/members/${userId}`;
  await firestoreSet(env, memberPath, convertToFields({
    userId,
    userName,
    status,
    addedAt: new Date().toISOString(),
  }));
}

export async function updateChatMemberStatus(
  env: Env,
  creatorHandle: string,
  tierId: string,
  userId: string,
  status: "active" | "expired" | "cancelled",
): Promise<void> {
  const chatId = `${creatorHandle}_${tierId}`;
  const memberPath = `communityChats/${chatId}/members/${userId}`;
  const existing = await firestoreGet(env, memberPath);
  if (!existing) {
    await addChatMember(env, creatorHandle, tierId, userId, "", status);
    return;
  }
  const data = convertFromFields(existing.fields as Record<string, unknown>);
  await firestoreSet(env, memberPath, convertToFields({
    ...data,
    status,
    updatedAt: new Date().toISOString(),
  }));
}
