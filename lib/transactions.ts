import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/db/firebase";

export function subscribeToTransactionByRef(
  ref: string,
  onData: (data: Record<string, unknown> | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(collection(db, "transactions"), where("ref", "==", ref));
  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        onData(null);
        return;
      }
      onData(snapshot.docs[0].data() as Record<string, unknown>);
    },
    (error) => {
      onError?.(error);
    },
  );
}

export async function fetchGatheringById(
  gatheringId: string,
): Promise<Record<string, unknown> | null> {
  const snap = await getDoc(doc(db, "creatorGatherings", gatheringId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Record<string, unknown>) };
}
