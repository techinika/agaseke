import type { Env } from "../types";
import { firestoreQuery, firestoreQueryAll, firestoreGet, convertFromFields, convertToFields, firestorePost, firestoreSet } from "../firestore";

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
