import {
  collection,
  documentId,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/db/firebase";

export interface SaleRecord {
  id: string;
  txRef?: string;
  buyerId?: string;
  buyerName?: string;
  buyerEmail?: string;
  creatorId?: string;
  creatorUid?: string;
  productId?: string;
  productName?: string;
  quantity?: number;
  productPrice?: number;
  totalAmount?: number;
  platformFee?: number;
  creatorEarnings?: number;
  referralEarnings?: number;
  referralUid?: string;
  status?: string;
  paymentMethod?: string;
  currency?: string;
  createdAt?: unknown;
  [key: string]: unknown;
}

export interface ProductInfo {
  id: string;
  name?: string;
  description?: string;
  price?: number;
  type?: "digital" | "physical";
  stock?: number;
  imageUrl?: string;
  fileUrl?: string;
  active?: boolean;
  creatorId?: string;
  [key: string]: unknown;
}

export interface ProfileInfo {
  id: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
  phoneNumber?: string;
  role?: string;
  handle?: string;
  [key: string]: unknown;
}

export function subscribeToCreatorSales(
  creatorHandle: string,
  onData: (items: SaleRecord[]) => void,
): Unsubscribe {
  const salesRef = collection(db, "sales");
  const q = query(
    salesRef,
    where("creatorId", "==", creatorHandle),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(q, (snapshot) => {
    const salesData = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Record<string, unknown>),
    })) as SaleRecord[];
    onData(salesData);
  });
}

async function fetchByIds<T extends { id: string }>(
  collectionName: string,
  ids: string[],
): Promise<Record<string, T>> {
  const result: Record<string, T> = {};
  if (ids.length === 0) return result;
  const ref = collection(db, collectionName);
  const batchSize = 10;
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const q = query(ref, where(documentId(), "in", batch));
    const snap = await getDocs(q);
    snap.docs.forEach((d) => {
      result[d.id] = { id: d.id, ...(d.data() as Record<string, unknown>) } as T;
    });
  }
  return result;
}

export async function fetchProductsByIds(
  ids: string[],
): Promise<Record<string, ProductInfo>> {
  return fetchByIds<ProductInfo>("storeProducts", ids);
}

export async function fetchProfilesByIds(
  ids: string[],
): Promise<Record<string, ProfileInfo>> {
  return fetchByIds<ProfileInfo>("profiles", ids);
}
