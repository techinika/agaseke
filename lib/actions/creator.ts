"use server";

import { adminDb } from "@/db/firebaseAdmin";

export async function getCreatorByHandle(username: string) {
  try {
    const creatorSnap = await adminDb.collection("creators").doc(username).get();
    if (!creatorSnap.exists) return null;

    const creator = { id: creatorSnap.id, ...creatorSnap.data() } as Record<string, unknown>;
    const profileSnap = await adminDb.collection("profiles").doc(creator.uid as string).get();
    const profile = profileSnap.exists ? { id: profileSnap.id, ...profileSnap.data() } : null;

    const profileData = profile as Record<string, unknown> | null;
    const referralId = profileData?.referralCreator
      ? (await adminDb.collection("creators").doc(String(profileData.referralCreator)).get()).data()?.uid || null
      : null;

    return { creator, profile, referralId };
  } catch (error) {
    console.error("Server action error (getCreatorByHandle):", error);
    return null;
  }
}

export async function getFeaturedPartners(creatorId: string) {
  try {
    const snap = await adminDb
      .collection("creatorPartners")
      .where("creatorId", "==", creatorId)
      .where("featured", "==", true)
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error("Server action error (getFeaturedPartners):", error);
    return [];
  }
}
