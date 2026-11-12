import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "@/db/firebase";
import {
  getUserTransactions,
  initiateCardPayment,
  initiateMomoPayment,
} from "@/lib/paymentsService";
import { normalizeRwandaPhone } from "@/lib/format/phone";
import { buildSupportConfig, transactionFromSnapshot } from "./utils";
import type { SupportConfig, TransactionSnapshot } from "./types";

const configCache = new Map<string, SupportConfig>();

export async function fetchSupportConfig(handle: string): Promise<SupportConfig> {
  const cached = configCache.get(handle);
  if (cached) return cached;

  const fallback = buildSupportConfig({});
  if (!db) return fallback;

  try {
    const creatorSnap = await getDoc(doc(db, "creators", handle));
    if (!creatorSnap.exists()) return fallback;

    const creator = creatorSnap.data();
    const currency = (creator.currency as string) || "RWF";
    let minAmount: unknown;

    try {
      const currencies = await getDocs(collection(db, "currencies"));
      const match = currencies.docs.find(
        (item) => (item.data().code as string) === currency,
      );
      minAmount = match?.data().minSupportAmount;
    } catch {
      // The creator currency is enough to pick a safe fallback.
    }

    const config = buildSupportConfig({ currency }, minAmount);
    configCache.set(handle, config);
    return config;
  } catch {
    return fallback;
  }
}

export interface SupportRequest {
  creatorHandle: string;
  amount: number;
  currency: string;
  phone?: string;
  message?: string;
  idempotencyKey: string;
  user?: User | null;
}

function basePayload(request: SupportRequest) {
  return {
    type: "support" as const,
    creatorHandle: request.creatorHandle,
    amount: request.amount,
    currency: request.currency,
    message: request.message ?? "",
    idempotencyKey: request.idempotencyKey,
  };
}

export async function startMomoSupport(
  request: SupportRequest,
): Promise<{ ref: string }> {
  const phone = normalizeRwandaPhone(request.phone ?? "") || request.phone || "";
  const result = await initiateMomoPayment(
    { ...basePayload(request), phone },
    request.idempotencyKey,
  );
  return { ref: result.ref };
}

export async function startCardSupport(request: SupportRequest): Promise<{
  ref: string;
  redirectUrl: string;
}> {
  const email = request.user?.email || "support@agaseke.com";
  const [firstName, ...rest] = (request.user?.displayName || "Supporter").split(" ");

  const result = await initiateCardPayment(
    {
      ...basePayload(request),
      email,
      buyerEmail: email,
      firstName: firstName || "Supporter",
      lastName: rest.join(" ") || "Agaseke",
    },
    request.idempotencyKey,
  );

  return {
    ref: result.merchant_reference || result.ref,
    redirectUrl: result.redirect_url,
  };
}

export function watchSupportTransaction(
  reference: string,
  onUpdate: (transaction: TransactionSnapshot) => void,
  onError?: (error: Error) => void,
): () => void {
  if (!db) {
    onError?.(new Error("Firebase is not configured"));
    return () => undefined;
  }

  const supportQuery = query(
    collection(db, "transactions"),
    where("ref", "==", reference),
  );

  return onSnapshot(
    supportQuery,
    (snapshot) => {
      if (snapshot.empty) return;
      const data = snapshot.docs[0].data();
      onUpdate(transactionFromSnapshot({ ...data, ref: data.ref ?? reference }));
    },
    (error) => onError?.(error),
  );
}

export async function pollSupportTransaction(
  reference: string,
): Promise<TransactionSnapshot | null> {
  try {
    const result = await getUserTransactions(50, 0);
    const match = result.transactions.find((item) => item.ref === reference);
    if (!match) return null;
    return {
      ref: match.ref,
      status: match.status,
      amount: match.amount,
      currency: match.currency,
      type: match.type,
    };
  } catch {
    return null;
  }
}
