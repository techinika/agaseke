import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/db/firebase";

export interface ContentPostRecord extends Record<string, unknown> {
  id: string;
}

export function subscribeToCreatorContent(
  creatorHandle: string,
  onData: (items: ContentPostRecord[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, "creatorContent"),
    where("creatorId", "==", creatorHandle),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(q, (snapshot) => {
    onData(
      snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })),
    );
  });
}

export async function deleteCreatorPost(postId: string): Promise<void> {
  await deleteDoc(doc(db, "creatorContent", postId));
}

export async function fetchPostComments(postId: string) {
  const q = query(
    collection(db, "postComments"),
    where("postId", "==", postId),
    orderBy("createdAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }));
}

export async function addPostComment(data: Record<string, unknown>): Promise<void> {
  await addDoc(collection(db, "postComments"), { ...data, createdAt: serverTimestamp() });
}

export async function updateCreatorContent(
  postId: string,
  data: Record<string, unknown>,
): Promise<void> {
  await updateDoc(doc(db, "creatorContent", postId), data);
}

export async function createCreatorContent(
  data: Record<string, unknown>,
): Promise<string> {
  const docRef = await addDoc(collection(db, "creatorContent"), {
    ...data,
    createdAt: serverTimestamp(),
    publishedAt: serverTimestamp(),
  });
  return docRef.id;
}
