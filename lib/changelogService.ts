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
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/db/firebase";

export interface ChangelogRecord extends Record<string, unknown> {
  id: string;
}

export function subscribeToChangelog(
  onData: (items: ChangelogRecord[]) => void,
): Unsubscribe {
  const q = query(collection(db, "changelog"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    onData(
      snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })),
    );
  });
}

export async function addChangelogEntry(data: Record<string, unknown>) {
  await addDoc(collection(db, "changelog"), { ...data, createdAt: serverTimestamp() });
}

export async function updateChangelogEntry(id: string, data: Record<string, unknown>) {
  await updateDoc(doc(db, "changelog", id), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteChangelogEntry(id: string) {
  await deleteDoc(doc(db, "changelog", id));
}
