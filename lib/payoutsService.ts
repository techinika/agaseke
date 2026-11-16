import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { auth, db } from "@/db/firebase";
import { sendCommsEmail } from "@/lib/commsService";
import {
  buildPayoutOverview,
  type CurrencyBalance,
  type PayoutOverview,
} from "@/lib/payouts/overview";

export type { CurrencyBalance, PayoutOverview };

export async function fetchPayoutOverview(creator: {
  handle?: string | null;
  uid?: string | null;
  pendingPayout?: number;
  totalEarnings?: number;
  [key: string]: unknown;
}): Promise<PayoutOverview | null> {
  if (!creator.handle) return null;

  const creatorRef = doc(db, "creators", creator.handle);
  const snap = await getDoc(creatorRef);
  if (!snap.exists()) return null;

  const data = snap.data() as Record<string, unknown>;

  const currenciesSnap = await getDocs(collection(db, "currencies"));
  const policies = currenciesSnap.docs.map(
    (currencyDoc) => currencyDoc.data() as { code?: unknown; payoutThreshold?: unknown },
  );

  return buildPayoutOverview(data, policies);
}

export function subscribeToCreatorPayouts(
  creatorUid: string,
  onData: (items: Array<Record<string, unknown>>) => void,
): Unsubscribe {
  const qPayouts = query(
    collection(db, "payouts"),
    where("creatorUid", "==", creatorUid),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(qPayouts, (snap) => {
    onData(
      snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })),
    );
  });
}

export function subscribeToCreatorWithdrawRequests(
  creatorUid: string,
  onData: (items: Array<Record<string, unknown>>) => void,
): Unsubscribe {
  const qRequests = query(
    collection(db, "withdrawRequests"),
    where("creatorId", "==", creatorUid),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(qRequests, (snap) => {
    onData(
      snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })),
    );
  });
}

export function subscribeToLatestVerificationRequest(
  uid: string,
  onData: (item: Record<string, unknown> | null) => void,
): Unsubscribe {
  const qVerification = query(
    collection(db, "verificationRequests"),
    where("uid", "==", uid),
    orderBy("createdAt", "desc"),
    limit(1),
  );
  return onSnapshot(qVerification, (snap) => {
    if (snap.empty) {
      onData(null);
      return;
    }
    onData({ id: snap.docs[0].id, ...(snap.docs[0].data() as Record<string, unknown>) });
  });
}

export async function submitWithdrawRequest(params: {
  creatorUid: string;
  creatorName: string;
  amount: string | number;
  currency: string;
  idempotencyKey: string;
}): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in to request a withdrawal");

  const token = await user.getIdToken();
  const response = await fetch("/api/payouts/withdraw", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      amount: params.amount,
      currency: params.currency,
      idempotencyKey: params.idempotencyKey,
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(payload?.error || `Withdrawal request failed (${response.status})`);
  }

  const profileSnap = await getDoc(doc(db, "profiles", params.creatorUid));
  const creatorEmail =
    (profileSnap.data() as { email?: string } | undefined)?.email || "";

  try {
    await sendCommsEmail("withdrawal_request", {
      adminEmail: process.env.NEXT_PUBLIC_ADMIN_EMAIL || "agasekeforcreators@gmail.com",
      creatorName: params.creatorName,
      creatorEmail,
      amount: params.amount,
      currency: params.currency,
      method: "MoMo",
      accountNumber: "",
    });
  } catch (error) {
    console.warn("Withdrawal request created but admin email failed:", error);
  }
}
