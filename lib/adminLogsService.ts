import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/db/firebase";

export interface ActivityLogRecord extends Record<string, unknown> {
  id: string;
}

export function subscribeToActivityLogs(
  onData: (items: ActivityLogRecord[]) => void,
  max = 500,
): Unsubscribe {
  const q = query(
    collection(db, "activityLogs"),
    orderBy("createdAt", "desc"),
    limit(max),
  );
  return onSnapshot(q, (snapshot) => {
    onData(
      snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })),
    );
  });
}
