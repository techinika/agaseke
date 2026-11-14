import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/db/firebase";

export interface UserFeedbackInput {
  creatorId: string;
  handle: string;
  referralLikelihood: number;
  loveScale: number;
  message: string;
}

export interface UserFeedbackRecord extends Record<string, unknown> {
  id: string;
}

export async function submitUserFeedback(input: UserFeedbackInput): Promise<void> {
  await addDoc(collection(db, "userFeedback"), {
    ...input,
    createdAt: serverTimestamp(),
  });
}

export function subscribeToUserFeedback(
  onData: (items: UserFeedbackRecord[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(collection(db, "userFeedback"), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => {
      onData(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })),
      );
    },
    (error) => onError?.(error),
  );
}
