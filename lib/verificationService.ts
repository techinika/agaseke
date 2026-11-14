import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/db/firebase";

export async function markCreatorPhoneVerified(handle: string): Promise<void> {
  await updateDoc(doc(db, "creators", handle), { phoneVerified: true });
}

export async function hasPendingVerificationRequest(uid: string): Promise<boolean> {
  const existingQ = query(
    collection(db, "verificationRequests"),
    where("uid", "==", uid),
    where("status", "==", "pending"),
    limit(1),
  );
  const existingSnap = await getDocs(existingQ);
  return !existingSnap.empty;
}

export async function submitVerificationRequest(
  payload: Record<string, unknown>,
  handle: string,
): Promise<void> {
  await addDoc(collection(db, "verificationRequests"), {
    ...payload,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "creators", handle), {
    verificationStatus: "pending",
    verificationSubmitted: true,
  });
}
