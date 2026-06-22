"use server";

import { adminDb } from "@/db/firebaseAdmin";

export async function getCreatorPosts(creatorUid: string, creatorHandle: string, limitCount = 3) {
  try {
    const snap = await adminDb
      .collection("creatorContent")
      .where("creatorId", "in", [creatorHandle, creatorUid])
      .where("isPrivate", "==", false)
      .orderBy("createdAt", "desc")
      .limit(limitCount)
      .get();
    return snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate?.()?.toISOString() || null,
    }));
  } catch (error) {
    console.error("Server action error (getCreatorPosts):", error);
    return [];
  }
}
