import { doc, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { db } from "@/db/firebase";
import type { Creator } from "@/types/creator";

export function subscribeToCreatorSettings(
  handle: string,
  onData: (creator: Creator | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, "creators", handle),
    (snapshot) => {
      onData(snapshot.exists() ? (snapshot.data() as Creator) : null);
    },
    (error) => {
      onError?.(error);
    },
  );
}
