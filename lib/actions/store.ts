"use server";

import { adminDb } from "@/db/firebaseAdmin";

export async function getStoreProducts(creatorId: string, limitCount = 3) {
  try {
    const snap = await adminDb
      .collection("storeProducts")
      .where("creatorId", "==", creatorId)
      .where("active", "==", true)
      .orderBy("createdAt", "desc")
      .limit(limitCount)
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error("Server action error (getStoreProducts):", error);
    return [];
  }
}
