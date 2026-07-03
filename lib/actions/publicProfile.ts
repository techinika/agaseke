"use server";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { adminDb } from "@/db/firebaseAdmin";

export async function getCreatorByHandle(username: string) {
  try {
    const creatorSnap = await adminDb.collection("creators").doc(username).get();
    if (!creatorSnap.exists) return null;

    const creator = { id: creatorSnap.id, ...creatorSnap.data() } as any;
    const profileSnap = await adminDb.collection("profiles").doc(creator.uid as string).get();
    const profile = profileSnap.exists ? { id: profileSnap.id, ...profileSnap.data() } : null;

    const profileData = profile as any;
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
