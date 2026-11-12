"use client";

import { useRef, useState } from "react";
import { CreditCard, Smartphone, TicketPercent } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Sheet } from "@/components/ui/Sheet";
import { StatusScreen } from "@/components/ui/StatusScreen";
import { db } from "@/db/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { isValidRwandaPhone, normalizeRwandaPhone } from "@/lib/format/phone";
import { formatMoney } from "@/lib/format/money";
import { t } from "@/lib/i18n";
import { initiateCardPayment, initiateMomoPayment } from "@/lib/paymentsService";
import { CreatorTrustRow } from "@/features/actions";
import { useTransactionPayment } from "@/features/payments";
import type { CartItem, ShippingAddress } from "../types";

const platformSharePercentage = Number(process.env.NEXT_PUBLIC_PLATFORM_SHARE) || 0.15;

type CheckoutStep = "info" | "shipping" | "payment";

export interface CheckoutUser {
  uid: string;
  email?: string | null;
  displayName?: string | null;
}

export interface CheckoutSheetProps {
  open: boolean;
  onClose: () => void;
  cart: CartItem[];
  creatorId: string;
  creatorName: string;
  creatorHandle: string;
  creatorPhotoURL?: string | null;
  creatorVerified?: boolean;
  getItemPrice: (item: CartItem) => number;
  total: number;
  currency?: string;
  currentUser: CheckoutUser | null;
  onPaid?: () => void;
}

function newKey(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `checkout_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function checkoutPlatformFee(
  cart: CartItem[],
  getItemPrice: (item: CartItem) => number,
): { fee: number; buyerPaysMore: boolean } {
  let fee = 0;
  let buyerPaysMore = false;

  for (const item of cart) {
    const feePayer = item.product.platformFeePayer || "buyer";
    if (feePayer === "buyer") {
      fee += getItemPrice(item) * platformSharePercentage;
      buyerPaysMore = true;
    }
  }

  return { fee, buyerPaysMore };
}

export function CheckoutSheet({
  open,
  onClose,
  cart,
  creatorId,
  creatorName,
  creatorHandle,
  creatorPhotoURL,
  creatorVerified,
  getItemPrice,
  total,
  currency = "RWF",
  currentUser,
  onPaid,
}: CheckoutSheetProps) {
  const isUSD = currency === "USD";
  const [step, setStep] = useState<CheckoutStep>("info");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"momo" | "card">(
    isUSD ? "card" : "momo",
  );
  const [error, setError] = useState<string | null>(null);
  const keyRef = useRef(newKey());
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    fullName: currentUser?.displayName || "",
    phone: "",
    address: "",
    city: "",
    country: "Rwanda",
  });

  const hasPhysicalProducts = cart.some((item) => item.product.type === "physical");
  const { fee: platformFee, buyerPaysMore } = checkoutPlatformFee(cart, getItemPrice);
  const finalTotal = Math.max(0, total - couponDiscount);
  const totalWithPlatformFee = finalTotal + platformFee;
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const method = isUSD ? "card" : paymentMethod;
  const phoneValid = isValidRwandaPhone(shippingAddress.phone);

  const payment = useTransactionPayment({
    open,
    failureMessage: t("actions.checkout.failedBody"),
    onSuccess: () => onPaid?.(),
  });

  const updateShipping = (patch: Partial<ShippingAddress>) => {
    setShippingAddress((prev) => ({ ...prev, ...patch }));
    setError(null);
  };

  const shippingComplete =
    !hasPhysicalProducts ||
    Boolean(
      shippingAddress.fullName.trim() &&
      shippingAddress.phone.trim() &&
      shippingAddress.address.trim() &&
      shippingAddress.city.trim(),
    );

  const applyCoupon = async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code || applyingCoupon) return;

    setApplyingCoupon(true);
    setCouponError(null);
    try {
      const couponsRef = collection(db, "storeCoupons");
      const snapshot = await getDocs(
        query(
          couponsRef,
          where("creatorId", "==", creatorId),
          where("code", "==", code),
          where("active", "==", true),
        ),
      );

      if (snapshot.empty) {
        setCouponError(t("actions.checkout.couponInvalid"));
        return;
      }

      const coupon = snapshot.docs[0].data();
      if (coupon.minPurchase && total < coupon.minPurchase) {
        setCouponError(
          t("actions.checkout.couponMin", {
            amount: formatMoney(coupon.minPurchase, currency),
          }),
        );
        return;
      }
      if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
        setCouponError(t("actions.checkout.couponUsed"));
        return;
      }

      const discount =
        coupon.discountType === "percentage"
          ? (total * Number(coupon.discountValue)) / 100
          : Number(coupon.discountValue);

      setCouponDiscount(Math.min(total, Math.max(0, discount)));
      setAppliedCoupon(code);
    } catch {
      setCouponError(t("actions.checkout.couponFailed"));
    } finally {
      setApplyingCoupon(false);
    }
  };

  const placeOrder = async () => {
    if (!currentUser?.uid) {
      setError(t("actions.checkout.signedOut"));
      return;
    }

    if (!shippingComplete) {
      setStep("shipping");
      setError(t("actions.checkout.shippingRequired"));
      return;
    }

    if (method === "momo" && !phoneValid) {
      setError(t("actions.checkout.invalidPhone"));
      return;
    }

    setError(null);
    const firstItem = cart[0];
    const phone = normalizeRwandaPhone(shippingAddress.phone) || shippingAddress.phone;
    const payload = {
      type: "store" as const,
      creatorHandle,
      productId: firstItem?.product.id,
      quantity: itemCount,
      selectedSize: firstItem?.selectedSize,
      couponCode: appliedCoupon || undefined,
      buyerEmail: currentUser.email || "",
      buyerName: currentUser.displayName || "Customer",
      phone,
      currency,
      email: currentUser.email || "",
      firstName: currentUser.displayName?.split(" ")[0] || "Customer",
      lastName: currentUser.displayName?.split(" ")[1] || "",
      idempotencyKey: keyRef.current,
    };

    await payment.startPayment(async () => {
      if (method === "momo") {
        const result = await initiateMomoPayment(
          payload as Parameters<typeof initiateMomoPayment>[0],
          keyRef.current,
        );
        return { reference: result.ref };
      }

      const result = await initiateCardPayment(
        payload as Parameters<typeof initiateCardPayment>[0],
        keyRef.current,
      );
      return {
        reference: result.merchant_reference || result.ref,
        redirectUrl: result.redirect_url || null,
      };
    });
  };

  const goNext = () => {
    setError(null);
    if (step === "info") {
      setStep(hasPhysicalProducts ? "shipping" : "payment");
      return;
    }
    if (step === "shipping") {
      if (!shippingComplete) {
        setError(t("actions.checkout.shippingRequired"));
        return;
      }
      setStep("payment");
    }
  };

  const goBack = () => {
    setError(null);
    if (step === "payment") {
      setStep(hasPhysicalProducts ? "shipping" : "info");
      return;
    }
    if (step === "shipping") setStep("info");
  };

  const retry = () => {
    keyRef.current = newKey();
    setError(null);
    payment.retry();
    setStep("payment");
  };

  const footer = (() => {
    if (payment.status === "success") {
      return (
        <Button fullWidth size="lg" onClick={onClose}>
          {t("common.done")}
        </Button>
      );
    }

    if (payment.status === "failed") {
      return (
        <Button fullWidth size="lg" onClick={retry}>
          {t("common.retry")}
        </Button>
      );
    }

    if (payment.status === "waiting") {
      return (
        <div className="space-y-2">
          <Button
            fullWidth
            size="lg"
            loading={payment.checking}
            onClick={() => void payment.checkNow()}
          >
            {payment.checking ? t("actions.ticket.checking") : t("actions.ticket.check")}
          </Button>
          {payment.cardRedirectUrl && (
            <Button
              fullWidth
              size="lg"
              variant="secondary"
              onClick={payment.openCardPage}
            >
              {t("actions.ticket.cardOpen")}
            </Button>
          )}
        </div>
      );
    }

    if (step === "payment") {
      return (
        <div className="flex gap-2">
          <Button variant="secondary" size="lg" onClick={goBack}>
            {t("common.back")}
          </Button>
          <Button
            fullWidth
            size="lg"
            loading={payment.submitting}
            disabled={!currentUser || (method === "momo" && !phoneValid)}
            onClick={() => void placeOrder()}
          >
            {payment.submitting
              ? t("actions.checkout.paying")
              : t("actions.checkout.pay")}
          </Button>
        </div>
      );
    }

    return (
      <div className="flex gap-2">
        {step !== "info" && (
          <Button variant="secondary" size="lg" onClick={goBack}>
            {t("common.back")}
          </Button>
        )}
        <Button fullWidth size="lg" onClick={goNext}>
          {t("common.next")}
        </Button>
      </div>
    );
  })();

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t("actions.checkout.title")}
      description={payment.status === "idle" ? t("actions.checkout.hint") : undefined}
      footer={footer}
    >
      {payment.status === "waiting" ? (
        <StatusScreen
          status="waiting"
          title={t("actions.checkout.waitingTitle")}
          description={
            method === "card"
              ? t("support.status.waiting.bodyCard")
              : t("support.status.waiting.body")
          }
          reference={payment.reference ?? undefined}
        />
      ) : payment.status === "success" ? (
        <StatusScreen
          status="success"
          title={t("actions.checkout.successTitle")}
          description={t("actions.checkout.successBody", { count: itemCount })}
          reference={payment.reference ?? undefined}
        />
      ) : payment.status === "failed" ? (
        <StatusScreen
          status="failed"
          title={t("actions.checkout.failedTitle")}
          description={payment.error || t("actions.checkout.failedBody")}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex gap-1.5" aria-label={t("actions.checkout.title")}>
            {(["info", "shipping", "payment"] as CheckoutStep[])
              .filter((item) => item !== "shipping" || hasPhysicalProducts)
              .map((item) => (
                <span
                  key={item}
                  className={[
                    "flex-1 rounded-full px-2 py-1.5 text-center text-caption font-semibold",
                    item === step
                      ? "bg-brand-strong text-on-brand"
                      : "bg-surface-raised text-muted-fg",
                  ].join(" ")}
                >
                  {t(`actions.checkout.steps.${item}`)}
                </span>
              ))}
          </div>

          <CreatorTrustRow
            name={creatorName}
            photoURL={creatorPhotoURL}
            verified={creatorVerified}
            subtitle={t("actions.ticket.hostedBy", { name: creatorName })}
          />

          {step === "info" && (
            <div className="space-y-4">
              <div className="space-y-3 rounded-control border border-line bg-surface p-4">
                <p className="text-label font-bold uppercase tracking-wide text-muted-fg">
                  {t("actions.checkout.summary")}
                </p>
                {cart.map((item) => (
                  <div
                    key={`${item.product.id}-${item.selectedSize ?? ""}`}
                    className="flex justify-between gap-3 text-label"
                  >
                    <span className="min-w-0 truncate text-fg">
                      {item.quantity}× {item.product.name}
                    </span>
                    <span className="shrink-0 font-semibold text-fg">
                      {formatMoney(getItemPrice(item), currency)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-line pt-3 text-label">
                  <span className="text-muted-fg">{t("actions.checkout.subtotal")}</span>
                  <span className="font-semibold text-fg">
                    {formatMoney(total, currency)}
                  </span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-label text-success">
                    <span>{t("actions.checkout.discount")}</span>
                    <span className="font-semibold">
                      −{formatMoney(couponDiscount, currency)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-body font-bold">
                  <span>{t("actions.checkout.total")}</span>
                  <span>{formatMoney(totalWithPlatformFee, currency)}</span>
                </div>
                {buyerPaysMore && (
                  <p className="text-caption text-muted-fg">
                    {t("support.breakdown.fee")}: {formatMoney(platformFee, currency)}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <Input
                    containerClassName="flex-1"
                    label={t("actions.checkout.coupon")}
                    placeholder={t("actions.checkout.couponPlaceholder")}
                    value={couponCode}
                    disabled={Boolean(appliedCoupon)}
                    onChange={(event) => {
                      setCouponCode(event.target.value.toUpperCase());
                      setCouponError(null);
                    }}
                    leading={<TicketPercent className="size-4" aria-hidden="true" />}
                  />
                  {!appliedCoupon && (
                    <Button
                      size="md"
                      variant="secondary"
                      className="mt-[26px] shrink-0"
                      loading={applyingCoupon}
                      disabled={!couponCode.trim()}
                      onClick={() => void applyCoupon()}
                    >
                      {applyingCoupon
                        ? t("actions.checkout.applying")
                        : t("actions.checkout.apply")}
                    </Button>
                  )}
                </div>
                {appliedCoupon && (
                  <p className="rounded-control bg-success-bg p-3 text-label text-success">
                    {t("actions.checkout.couponApplied", {
                      code: appliedCoupon,
                      amount: formatMoney(couponDiscount, currency),
                    })}
                  </p>
                )}
                {couponError && (
                  <p role="alert" className="text-caption font-medium text-danger">
                    {couponError}
                  </p>
                )}
              </div>
            </div>
          )}

          {step === "shipping" && (
            <div className="space-y-3">
              <p className="text-label font-bold uppercase tracking-wide text-muted-fg">
                {t("actions.checkout.shippingTitle")}
              </p>
              <Input
                label={t("actions.checkout.fullName")}
                autoComplete="name"
                value={shippingAddress.fullName}
                onChange={(event) => updateShipping({ fullName: event.target.value })}
              />
              <Input
                label={t("actions.checkout.phone")}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="078 000 0000"
                value={shippingAddress.phone}
                onChange={(event) => updateShipping({ phone: event.target.value })}
              />
              <Input
                label={t("actions.checkout.address")}
                autoComplete="street-address"
                value={shippingAddress.address}
                onChange={(event) => updateShipping({ address: event.target.value })}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label={t("actions.checkout.city")}
                  autoComplete="address-level2"
                  value={shippingAddress.city}
                  onChange={(event) => updateShipping({ city: event.target.value })}
                />
                <Input
                  label={t("actions.checkout.country")}
                  autoComplete="country-name"
                  value={shippingAddress.country}
                  onChange={(event) => updateShipping({ country: event.target.value })}
                />
              </div>
            </div>
          )}

          {step === "payment" && (
            <div className="space-y-4">
              <div className="space-y-2 rounded-control border border-line bg-surface p-4">
                <div className="flex justify-between text-label">
                  <span className="text-muted-fg">{t("actions.checkout.subtotal")}</span>
                  <span className="font-semibold text-fg">
                    {formatMoney(total, currency)}
                  </span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-label text-success">
                    <span>{t("actions.checkout.discount")}</span>
                    <span className="font-semibold">
                      −{formatMoney(couponDiscount, currency)}
                    </span>
                  </div>
                )}
                {buyerPaysMore && (
                  <div className="flex justify-between text-label">
                    <span className="text-muted-fg">
                      {t("actions.checkout.platformFee")}
                    </span>
                    <span className="font-semibold text-fg">
                      {formatMoney(platformFee, currency)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t border-line pt-2 text-body font-bold">
                  <span>{t("actions.checkout.total")}</span>
                  <span>{formatMoney(totalWithPlatformFee, currency)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-label font-semibold text-fg">
                  {t("support.method.title")}
                </p>
                {isUSD ? (
                  <p className="rounded-control bg-surface-raised p-3 text-label text-muted-fg">
                    {t("actions.checkout.cardOnly")}
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      aria-pressed={paymentMethod === "momo"}
                      onClick={() => setPaymentMethod("momo")}
                      className={[
                        "flex min-h-12 items-center justify-center gap-2 rounded-control border-2 px-3 text-label font-semibold transition-colors",
                        paymentMethod === "momo"
                          ? "border-brand-strong bg-surface-raised text-brand-strong"
                          : "border-line text-muted-fg",
                      ].join(" ")}
                    >
                      <Smartphone className="size-4" aria-hidden="true" />
                      {t("support.method.momo")}
                    </button>
                    <button
                      type="button"
                      aria-pressed={paymentMethod === "card"}
                      onClick={() => setPaymentMethod("card")}
                      className={[
                        "flex min-h-12 items-center justify-center gap-2 rounded-control border-2 px-3 text-label font-semibold transition-colors",
                        paymentMethod === "card"
                          ? "border-brand-strong bg-surface-raised text-brand-strong"
                          : "border-line text-muted-fg",
                      ].join(" ")}
                    >
                      <CreditCard className="size-4" aria-hidden="true" />
                      {t("support.method.card")}
                    </button>
                  </div>
                )}
              </div>

              {method === "momo" && (
                <Input
                  label={t("support.details.phone")}
                  hint={t("actions.checkout.momoHint")}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="078 000 0000"
                  value={shippingAddress.phone}
                  onChange={(event) => updateShipping({ phone: event.target.value })}
                />
              )}

              {method === "card" && (
                <p className="rounded-control bg-surface-raised p-3 text-label text-muted-fg">
                  {t("actions.checkout.cardHint")}
                </p>
              )}

              {!currentUser && (
                <p className="rounded-control bg-warning-bg p-3 text-label text-warning">
                  {t("actions.checkout.signedOut")}
                </p>
              )}
            </div>
          )}

          {error && (
            <p role="alert" className="text-caption font-medium text-danger">
              {error}
            </p>
          )}

          <p className="text-caption text-muted-fg">{t("actions.trustNote")}</p>
        </div>
      )}
    </Sheet>
  );
}
