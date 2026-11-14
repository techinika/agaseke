import { db } from "@/db/firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  type Unsubscribe,
} from "firebase/firestore";

export interface PublishContentInput {
  creatorHandle: string;
  creatorUid: string;
  title: string;
  description: string;
  type: string;
  contentUrl?: string | null;
  isPrivate: boolean;
}

export async function publishCreatorContent(input: PublishContentInput): Promise<string> {
  const contentData = {
    creatorId: input.creatorHandle,
    creatorUid: input.creatorUid,
    title: input.title,
    description: input.description,
    type: input.type,
    contentUrl: input.contentUrl,
    isPrivate: input.isPrivate,
    createdAt: serverTimestamp(),
    publishedAt: serverTimestamp(),
    views: 0,
  };

  const docRef = await addDoc(collection(db, "creatorContent"), contentData);
  return docRef.id;
}

export function subscribeToCreatorArticles(
  creatorHandle: string,
  onData: (items: Array<Record<string, unknown>>) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, "creatorContent"),
    where("creatorId", "==", creatorHandle),
    where("type", "==", "article"),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(
    q,
    (snapshot) => {
      onData(
        snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Record<string, unknown>),
        })),
      );
    },
    (error) => onError?.(error),
  );
}

export async function deleteCreatorContent(contentId: string): Promise<void> {
  await deleteDoc(doc(db, "creatorContent", contentId));
}
