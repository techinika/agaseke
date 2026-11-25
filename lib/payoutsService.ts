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
import { getClientAdminEmail } from "@/lib/comms/adminEmail";
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

  const currentUser = auth.currentUser;
  if (currentUser && typeof currentUser.getIdToken === "function") {
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch("/api/payouts/overview", {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = (await res.json()) as PayoutOverview;
        if (data && Array.isArray(data.perCurrencyBalances)) {
          return {
            creatorCurrency: data.creatorCurrency,
            withdrawThreshold: data.withdrawThreshold,
            perCurrencyBalances: data.perCurrencyBalances,
          };
        }
      }
    } catch {
      // Fall back to direct Firestore reads when API route is unavailable
    }
  }

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
    limit(10),
  );
  return onSnapshot(qVerification, (snap) => {
    if (snap.empty) {
      onData(null);
      return;
    }
    const items = snap.docs.map(
      (d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as Record<string, unknown>,
    );
    const preferred =
      items.find((item) => String(item.status || "").toLowerCase() === "approved") ??
      items[0];
    onData(preferred);
  });
}

export interface WithdrawalQuoteSource {
  currency: string;
  amountMinor: number;
  amountMajor: number;
  payoutAmountMinor: number;
  payoutAmountMajor: number;
  effectiveRate: number;
  fxRateId?: string;
  rateSource?: string;
  rateTimestamp?: string;
}

export interface WithdrawalQuote {
  id: string;
  payoutCurrency: string;
  requestedPayoutAmountMinor: number;
  requestedPayoutAmountMajor: number;
  sources: WithdrawalQuoteSource[];
  expiresAt: string;
  createdAt: string;
}

export async function requestWithdrawalQuote(params: {
  amount: string | number;
  payoutCurrency: string;
}): Promise<WithdrawalQuote> {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in to request a withdrawal");

  const token = await user.getIdToken();
  const response = await fetch("/api/payouts/withdraw/quote", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      amount: params.amount,
      payoutCurrency: params.payoutCurrency,
    }),
  });

  const payload = (await response.json().catch(() => null)) as {
    error?: string;
    quote?: WithdrawalQuote;
  } | null;
  if (!response.ok || !payload?.quote) {
    throw new Error(payload?.error || `Withdrawal quote failed (${response.status})`);
  }
  return payload.quote;
}

export async function submitWithdrawRequest(params: {
  creatorUid: string;
  creatorName: string;
  amount: string | number;
  currency: string;
  idempotencyKey: string;
  quoteId?: string;
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
      payoutCurrency: params.currency,
      idempotencyKey: params.idempotencyKey,
      ...(params.quoteId ? { quoteId: params.quoteId } : {}),
    }),
  });

  const payload = (await response.json().catch(() => null)) as {
    error?: string;
    rail?: string;
    method?: string;
    accountNumber?: string;
  } | null;
  if (!response.ok) {
    throw new Error(payload?.error || `Withdrawal request failed (${response.status})`);
  }

  const profileSnap = await getDoc(doc(db, "profiles", params.creatorUid));
  const creatorEmail =
    (profileSnap.data() as { email?: string } | undefined)?.email || "";

  try {
    await sendCommsEmail("withdrawal_request", {
      adminEmail: getClientAdminEmail(),
      creatorName: params.creatorName,
      creatorEmail,
      amount: params.amount,
      currency: params.currency,
      method: payload?.method || (payload?.rail === "bank_transfer" ? "Bank" : "MoMo"),
      accountNumber: payload?.accountNumber || "",
    });
  } catch (error) {
    console.warn("Withdrawal request created but admin email failed:", error);
  }
}
