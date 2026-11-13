import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/db/firebase";

export interface GatheringRecord extends Record<string, unknown> {
  id: string;
}

export interface GatheringAttendanceRecord extends Record<string, unknown> {
  id: string;
}

export function subscribeToCreatorGatherings(
  creatorUid: string,
  onData: (items: GatheringRecord[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, "creatorGatherings"),
    where("creatorId", "==", creatorUid),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(q, (snapshot) => {
    onData(
      snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })),
    );
  });
}

export function subscribeToGatheringAttendance(
  gatheringId: string,
  onData: (items: GatheringAttendanceRecord[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, "gatheringsAttendance"),
    where("gatheringId", "==", gatheringId),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(q, (snapshot) => {
    onData(
      snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })),
    );
  });
}

export function subscribeToCreatorTicketSales(
  creatorHandle: string,
  onData: (summary: { revenue: number; count: number }) => void,
): Unsubscribe {
  const q = query(
    collection(db, "ticketSales"),
    where("creatorHandle", "==", creatorHandle),
  );
  return onSnapshot(q, (snapshot) => {
    let revenue = 0;
    snapshot.docs.forEach((d) => {
      revenue += ((d.data() as Record<string, unknown>).ticketAmount as number) || 0;
    });
    onData({ revenue, count: snapshot.docs.length });
  });
}

export async function updateCreatorGatheringStatus(
  gatheringId: string,
  status: string,
): Promise<void> {
  await updateDoc(doc(db, "creatorGatherings", gatheringId), { status });
}

export async function deleteCreatorGathering(gatheringId: string): Promise<void> {
  await deleteDoc(doc(db, "creatorGatherings", gatheringId));
}

export async function checkInGatheringAttendee(attendeeId: string): Promise<void> {
  await updateDoc(doc(db, "gatheringsAttendance", attendeeId), {
    checkedIn: true,
    checkedInAt: serverTimestamp(),
  });
}

export async function declineGatheringAttendee(attendeeId: string): Promise<void> {
  await updateDoc(doc(db, "gatheringsAttendance", attendeeId), {
    checkedIn: false,
    checkInDeclined: true,
    checkInDeclinedAt: serverTimestamp(),
    checkInNote: "",
  });
}

export async function undoGatheringAttendeeCheckIn(attendeeId: string): Promise<void> {
  await updateDoc(doc(db, "gatheringsAttendance", attendeeId), {
    checkedIn: false,
    checkInDeclined: false,
    checkedInAt: null,
    checkInDeclinedAt: null,
  });
}
