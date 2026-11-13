"use client";

import { useCallback, useState } from "react";
import { checkCoupon } from "../api";
import { t } from "@/lib/i18n";

export function useCoupon(creatorId: string, total: number, currency: string) {
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const applyCoupon = useCallback(
    async (code: string) => {
      const normalized = code.trim().toUpperCase();
      if (!normalized || applyingCoupon) return;
      setApplyingCoupon(true);
      setCouponError(null);
      const result = await checkCoupon(creatorId, normalized, total, currency);
      if (result.ok) {
        setAppliedCoupon(normalized);
        setCouponDiscount(result.discount);
      } else {
        setCouponError(t(result.errorKey, result.errorVars));
      }
      setApplyingCoupon(false);
    },
    [creatorId, total, currency, applyingCoupon],
  );

  const clearCouponError = useCallback(() => {
    setCouponError(null);
  }, []);

  return {
    applyingCoupon,
    couponError,
    appliedCoupon,
    couponDiscount,
    applyCoupon,
    clearCouponError,
  };
}
