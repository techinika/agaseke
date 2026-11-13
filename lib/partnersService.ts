import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/db/firebase";

export interface CreatorPartnerRecord extends Record<string, unknown> {
  id: string;
}

export function subscribeToCreatorPartners(
  creatorUid: string,
  onData: (items: CreatorPartnerRecord[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, "creatorPartners"),
    where("creatorId", "==", creatorUid),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(q, (snapshot) => {
    onData(
      snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })),
    );
  });
}

export async function createCreatorPartner(data: Record<string, unknown>): Promise<void> {
  await addDoc(collection(db, "creatorPartners"), {
    ...data,
    createdAt: serverTimestamp(),
  });
}

export async function updateCreatorPartner(
  id: string,
  data: Record<string, unknown>,
): Promise<void> {
  await updateDoc(doc(db, "creatorPartners", id), data);
}

export async function deleteCreatorPartner(id: string): Promise<void> {
  await deleteDoc(doc(db, "creatorPartners", id));
}

export async function setCreatorPartnerFeatured(
  id: string,
  featured: boolean,
): Promise<void> {
  await updateDoc(doc(db, "creatorPartners", id), { featured });
}
