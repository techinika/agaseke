import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/db/firebase";
import { formatMoney } from "@/lib/format/money";
import type { Coupon } from "./types";

export type CouponCheckResult =
  | { ok: true; discount: number; code: string }
  | { ok: false; errorKey: string; errorVars?: Record<string, string | number> };

export async function checkCoupon(
  creatorId: string,
  code: string,
  total: number,
  currency: string,
): Promise<CouponCheckResult> {
  try {
    const snapshot = await getDocs(
      query(
        collection(db, "storeCoupons"),
        where("creatorId", "==", creatorId),
        where("code", "==", code),
        where("active", "==", true),
      ),
    );

    if (snapshot.empty) {
      return { ok: false, errorKey: "actions.checkout.couponInvalid" };
    }

    const coupon = snapshot.docs[0].data() as Coupon;
    if (coupon.minPurchase && total < coupon.minPurchase) {
      return {
        ok: false,
        errorKey: "actions.checkout.couponMin",
        errorVars: { amount: formatMoney(coupon.minPurchase, currency) },
      };
    }
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return { ok: false, errorKey: "actions.checkout.couponUsed" };
    }

    const discount =
      coupon.discountType === "percentage"
        ? (total * Number(coupon.discountValue)) / 100
        : Number(coupon.discountValue);

    return { ok: true, discount: Math.min(total, Math.max(0, discount)), code };
  } catch {
    return { ok: false, errorKey: "actions.checkout.couponFailed" };
  }
}

export async function createStoreProduct(data: Record<string, unknown>): Promise<string> {
  const docRef = await addDoc(collection(db, "storeProducts"), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateStoreProduct(
  id: string,
  data: Record<string, unknown>,
): Promise<void> {
  await updateDoc(doc(db, "storeProducts", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}
