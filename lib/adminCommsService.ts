import {
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/db/firebase";

export interface BroadcastRecord extends Record<string, unknown> {
  id: string;
}

export function subscribeToAdminBroadcasts(
  onData: (items: BroadcastRecord[]) => void,
): Unsubscribe {
  const q = query(collection(db, "adminBroadcasts"), orderBy("sentAt", "desc"));
  return onSnapshot(q, (snap) => {
    onData(
      snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })),
    );
  });
}

export interface CommsRecipient {
  uid: string;
  email: string;
  name?: string;
  handle?: string;
}

export async function fetchBroadcastRecipients(
  target: "all" | "creators" | "verified" | "not-verified",
): Promise<CommsRecipient[]> {
  const profilesSnap = await getDocs(collection(db, "profiles"));
  const profilesMap = new Map<string, Record<string, unknown>>();
  profilesSnap.forEach((d) => profilesMap.set(d.id, d.data() as Record<string, unknown>));

  if (target === "all") {
    return Array.from(profilesMap.entries())
      .map(([uid, p]) => ({
        uid,
        email: (p.email as string) || "",
        name: p.displayName as string | undefined,
        handle: p.username as string | undefined,
      }))
      .filter((r) => r.email);
  }

  let creatorQuery;
  if (target === "verified") {
    creatorQuery = query(collection(db, "creators"), where("verified", "==", true));
  } else if (target === "not-verified") {
    creatorQuery = query(collection(db, "creators"), where("verified", "==", false));
  } else {
    creatorQuery = collection(db, "creators");
  }

  const cSnap = await getDocs(creatorQuery);
  const result: CommsRecipient[] = [];
  cSnap.docs.forEach((docSnap) => {
    const uid = (docSnap.data() as Record<string, unknown>).uid as string | undefined;
    if (!uid) return;
    const profile = profilesMap.get(uid);
    if (!profile?.email) return;
    result.push({
      uid,
      email: profile.email as string,
      name: profile.displayName as string | undefined,
      handle: profile.username as string | undefined,
    });
  });
  return result;
}
