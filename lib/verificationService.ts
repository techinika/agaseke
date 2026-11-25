import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
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

export async function fetchLatestVerificationRequest(
  uid: string,
): Promise<Record<string, unknown> | null> {
  const qVerification = query(
    collection(db, "verificationRequests"),
    where("uid", "==", uid),
    orderBy("createdAt", "desc"),
    limit(1),
  );
  const snap = await getDocs(qVerification);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...(snap.docs[0].data() as Record<string, unknown>) };
}

export async function submitVerificationRequest(
  payload: Record<string, unknown>,
  handle: string,
): Promise<string> {
  const createdRef = await addDoc(collection(db, "verificationRequests"), {
    ...payload,
    submittedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "creators", handle), {
    verificationStatus: "pending",
    verificationSubmitted: true,
    latestVerificationRequestId: createdRef.id,
    verificationSubmittedAt: serverTimestamp(),
    verificationRejectionReason: "",
    updatedAt: serverTimestamp(),
  });
  return createdRef.id;
}
