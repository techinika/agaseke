import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/db/firebase";

export async function fetchCreatorPartners(creatorUid: string) {
  const partnersRef = collection(db, "creatorPartners");
  const q = query(partnersRef, where("creatorId", "==", creatorUid));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Record<string, unknown>),
  }));
}

export async function createGiveaway(data: Record<string, unknown>): Promise<void> {
  await addDoc(collection(db, "giveaways"), {
    ...data,
    startDate: serverTimestamp(),
    createdAt: serverTimestamp(),
  });
}

export async function updateGiveaway(
  id: string,
  data: Record<string, unknown>,
): Promise<void> {
  await updateDoc(doc(db, "giveaways", id), data);
}
