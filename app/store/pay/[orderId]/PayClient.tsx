"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Loader,
  Check,
  ArrowLeft,
  CreditCard,
  AlertCircle,
  ExternalLink,
  XCircle,
} from "lucide-react";
import { db } from "@/db/firebase";
import { collection, doc, getDoc, getDocs, limit, onSnapshot, query, where } from "firebase/firestore";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "sonner";
import {
  cancelStoreOrder,
  cancelTransaction,
  initiateMomoPayment,
  initiateCardPayment,
  type PaymentInitRequest,
} from "@/lib/paymentsService";
import { subscribeToTransactionByRef } from "@/lib/transactions";
import Link from "next/link";
import { formatMoney as formatCurrency } from "@/lib/format/money";
import { normalizeRwandaPhone } from "@/lib/format/phone";
import { isCurrencySupportedByMethod } from "@/lib/money/rails";
import type { CurrencyCode } from "@/lib/money/registry.generated";

const platformSharePercentage =
  Number(process.env.NEXT_PUBLIC_PLATFORM_SHARE) || 0.1;

interface StoreOrderItem {
  productId: string;
  productName?: string;
  quantity: number;
  price: number;
  selectedSize?: string;
  currency?: string;
  productCurrency?: string;
}

interface StoreOrderShippingAddress {
  fullName?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
}

interface StoreOrderRecord {
  id: string;
  status?: string;
  paymentStatus?: string;
  currency?: string;
  total?: number;
  totalAmount?: number;
  creatorHandle?: string;
  creatorUid?: string;
  creatorId?: string;
  buyerName?: string;
  buyerEmail?: string;
  couponCode?: string;
  productId?: string;
  productName?: string;
  productPrice?: number;
  quantity?: number;
  selectedSize?: string;
  shippingAddress?: StoreOrderShippingAddress;
  items?: StoreOrderItem[];
}

interface StoreProductRecord {
  id: string;
  name?: string;
  creatorUid?: string;
  creatorId?: string;
  platformFeePayer?: "buyer" | "creator";
}

function generateIdempotencyKey(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export default function PayClient() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;
  const { user: currentUser } = useAuth();

  const [order, setOrder] = useState<StoreOrderRecord | null>(null);
  const [products, setProducts] = useState<Record<string, StoreProductRecord>>({});
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paymentPhase, setPaymentPhase] = useState<
    "idle" | "waiting" | "confirmed" | "failed"
  >("idle");
  const [paymentError, setPaymentError] = useState("");
  const [cardRedirectUrl, setCardRedirectUrl] = useState<string | null>(null);
  const [activeTxRef, setActiveTxRef] = useState<string | null>(null);
  const [cancellingTx, setCancellingTx] = useState(false);
  const [cancellingOrder, setCancellingOrder] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"momo" | "card">("momo");
  const [phone, setPhone] = useState("");
  const [creatorHandle, setCreatorHandle] = useState("");
  const [creatorCurrency, setCreatorCurrency] = useState("");
  const unsubTxRef = useRef<(() => void) | null>(null);
  const idempotencyKeyRef = useRef<string>("");

  const getIdempotencyKey = () => {
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = generateIdempotencyKey("store");
    }
    return idempotencyKeyRef.current;
  };

  const resetIdempotencyKey = () => {
    idempotencyKeyRef.current = generateIdempotencyKey("store");
  };

  useEffect(() => {
    return () => {
      unsubTxRef.current?.();
      unsubTxRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!orderId) return;

    const unsubOrder = onSnapshot(doc(db, "storeOrders", orderId), (snap) => {
      if (!snap.exists()) return;
      const data: StoreOrderRecord = {
        id: snap.id,
        ...(snap.data() as Omit<StoreOrderRecord, "id">),
      };
      setOrder(data);
      if (data.status === "paid" || data.paymentStatus === "paid") {
        setPaymentPhase("confirmed");
      }
    });

    const fetchOrder = async () => {
      const snap = await getDoc(doc(db, "storeOrders", orderId));
      if (!snap.exists()) {
        setLoading(false);
        return;
      }

      const data: StoreOrderRecord = {
        id: snap.id,
        ...(snap.data() as Omit<StoreOrderRecord, "id">),
      };
      setOrder(data);
      if (data.status === "paid" || data.paymentStatus === "paid") {
        setPaymentPhase("confirmed");
      }
      const shippingPhone = data.shippingAddress?.phone;
      if (shippingPhone) {
        setPhone((prev) => prev || String(shippingPhone));
      }

      const rawItems =
        data.items && data.items.length > 0
          ? data.items
          : ((data as unknown as { productIds?: StoreOrderItem[] }).productIds ?? []);
      const orderItems: StoreOrderItem[] = rawItems;
      const map: Record<string, StoreProductRecord> = {};
      for (const item of orderItems) {
        if (item.productId && !map[item.productId]) {
          const pSnap = await getDoc(doc(db, "storeProducts", item.productId));
          if (pSnap.exists()) {
            map[item.productId] = {
              id: pSnap.id,
              ...(pSnap.data() as Omit<StoreProductRecord, "id">),
            };
          }
        }
      }
      if (data.productId && !map[data.productId]) {
        const pSnap = await getDoc(doc(db, "storeProducts", data.productId));
        if (pSnap.exists()) {
          map[data.productId] = {
            id: pSnap.id,
            ...(pSnap.data() as Omit<StoreProductRecord, "id">),
          };
        }
      }
      setProducts(map);

      let resolvedHandle = typeof data.creatorHandle === "string" ? data.creatorHandle : "";
      let resolvedCurrency = "";
      const firstItem = orderItems[0];
      const pData = map[firstItem?.productId];
      const uid =
        pData?.creatorUid ||
        data.creatorUid ||
        pData?.creatorId ||
        data.creatorId ||
        "";

      if (resolvedHandle) {
        const cSnap = await getDoc(doc(db, "creators", resolvedHandle));
        if (cSnap.exists()) {
          resolvedCurrency = String(cSnap.data()?.currency || "");
        }
      } else if (uid) {
        const profileSnap = await getDoc(doc(db, "profiles", uid));
        if (profileSnap.exists()) {
          const profile = profileSnap.data();
          if (profile.username) resolvedHandle = String(profile.username);
        }
        if (!resolvedHandle) {
          const cQuery = query(collection(db, "creators"), where("uid", "==", uid), limit(1));
          const cQuerySnap = await getDocs(cQuery);
          if (!cQuerySnap.empty) {
            resolvedHandle = cQuerySnap.docs[0].id;
            resolvedCurrency = String(cQuerySnap.docs[0].data()?.currency || "");
          } else {
            const directCreator = await getDoc(doc(db, "creators", uid));
            if (directCreator.exists()) {
              resolvedHandle = directCreator.id;
              resolvedCurrency = String(directCreator.data()?.currency || "");
            } else if (uid.length < 20) {
              resolvedHandle = uid;
            }
          }
        } else {
          const cSnap = await getDoc(doc(db, "creators", resolvedHandle));
          if (cSnap.exists()) {
            resolvedCurrency = String(cSnap.data()?.currency || "");
          }
        }
      }

      if (resolvedHandle) setCreatorHandle(resolvedHandle);
      if (resolvedCurrency) setCreatorCurrency(resolvedCurrency);

      const derivedCurrency = (
        data.currency ||
        (data.items || [])[0]?.currency ||
        resolvedCurrency ||
        "RWF"
      ) as string;
      if (
        derivedCurrency &&
        !isCurrencySupportedByMethod("momo", derivedCurrency as CurrencyCode)
      ) {
        setPaymentMethod("card");
      }
      setLoading(false);
    };

    void fetchOrder();
    return () => unsubOrder();
  }, [orderId]);

  const rawOrderProductIds = (order as unknown as { productIds?: StoreOrderItem[] } | null)?.productIds;
  const items: StoreOrderItem[] =
    order?.items && order.items.length > 0 ? order.items : rawOrderProductIds || [];

  const rawItemsSubtotal =
    items.length > 0
      ? items.reduce(
          (sum, item) => sum + Number(item.price || 0) * Math.max(1, Number(item.quantity) || 1),
          0,
        )
      : Number(order?.productPrice || 0) * Math.max(1, Number(order?.quantity) || 1);
  const storedOrderTotal = Number(order?.total ?? order?.totalAmount ?? rawItemsSubtotal);
  const discount = Math.max(0, Number((order as unknown as { discount?: number } | null)?.discount || 0));
  const itemsSubtotal = rawItemsSubtotal > 0 ? rawItemsSubtotal : storedOrderTotal;
  const netSubtotal =
    items.length > 0 && discount > 0
      ? Math.max(0, itemsSubtotal - discount)
      : Math.max(0, storedOrderTotal);
  const discountFactor = itemsSubtotal > 0 ? netSubtotal / itemsSubtotal : 1;

  let rawPlatformFee = 0;
  let buyerPaysMore = false;
  if (items.length > 0) {
    for (const item of items) {
      const product = products[item.productId];
      const feePayer = product?.platformFeePayer || "buyer";
      if (feePayer === "buyer") {
        rawPlatformFee +=
          Number(item.price || 0) * Math.max(1, Number(item.quantity) || 1) * platformSharePercentage;
        buyerPaysMore = true;
      }
    }
  } else if (order?.productId) {
    const product = products[order.productId];
    const feePayer = product?.platformFeePayer || "buyer";
    if (feePayer === "buyer") {
      rawPlatformFee = itemsSubtotal * platformSharePercentage;
      buyerPaysMore = true;
    }
  }

  const savedPlatformFee = (order as unknown as { platformFee?: number } | null)?.platformFee;
  const platformFee =
    savedPlatformFee != null ? Number(savedPlatformFee) : rawPlatformFee * discountFactor;
  const finalTotal = netSubtotal;
  const totalWithPlatformFee = finalTotal + (buyerPaysMore ? platformFee : 0);
  const amountToPay =
    order?.total != null && Number(order.total) > netSubtotal + 0.001
      ? Number(order.total)
      : buyerPaysMore
        ? totalWithPlatformFee
        : finalTotal;

  const currency = (
    order?.currency ||
    items[0]?.currency ||
    items[0]?.productCurrency ||
    creatorCurrency ||
    "RWF"
  ) as string;
  const momoSupported = currency
    ? isCurrencySupportedByMethod("momo", currency as CurrencyCode)
    : false;
  const activeMethod = momoSupported ? paymentMethod : "card";

  const watchTransaction = (txRef: string) => {
    unsubTxRef.current?.();
    const unsub = subscribeToTransactionByRef(txRef, (tx) => {
      if (!tx) return;
      if (tx.status === "successful" || tx.status === "success") {
        setPaymentPhase("confirmed");
        toast.success("Payment confirmed!");
        unsub();
      } else if (tx.status === "failed" || tx.status === "expired") {
        setPaymentPhase("failed");
        setPaymentError(
          tx.status === "expired"
            ? "The payment session expired. Please try again."
            : "The payment was declined or cancelled.",
        );
        resetIdempotencyKey();
        toast.error(
          tx.status === "expired"
            ? "Payment session expired. Please try again."
            : "Payment failed. Please try again.",
        );
        unsub();
      }
    });
    unsubTxRef.current = unsub;
  };

  const handlePay = async () => {
    if (!order || !currentUser?.uid) {
      toast.error("Please log in");
      return;
    }

    if (activeMethod === "momo" && !phone.trim()) {
      toast.error("Please enter your phone number");
      return;
    }

    setPaying(true);
    setPaymentError("");

    try {
      const firstItem = items[0];
      const checkoutItems =
        items.length > 0
          ? items.map((item) => ({
              productId: item.productId,
              quantity: Math.max(1, Number(item.quantity) || 1),
              ...(item.selectedSize ? { selectedSize: item.selectedSize } : {}),
            }))
          : order.productId
            ? [
                {
                  productId: order.productId,
                  quantity: Math.max(1, Number(order.quantity) || 1),
                  ...(order.selectedSize ? { selectedSize: order.selectedSize } : {}),
                },
              ]
            : [];

      const cleanedPhone = normalizeRwandaPhone(phone) || phone.replace(/\s/g, "");
      const payload: PaymentInitRequest = {
        type: "store",
        orderId: order.id,
        ...(currency ? { currency } : {}),
        creatorHandle,
        items: checkoutItems,
        productId: firstItem?.productId || order.productId,
        quantity: checkoutItems.reduce((s, i) => s + i.quantity, 0) || 1,
        selectedSize: firstItem?.selectedSize || order.selectedSize,
        ...(order.shippingAddress ? { shippingAddress: order.shippingAddress } : {}),
        ...(order.couponCode ? { couponCode: order.couponCode } : {}),
        buyerEmail: currentUser.email || order.buyerEmail || "",
        buyerName: currentUser.displayName || order.buyerName || "Customer",
        phone: cleanedPhone,
        email: currentUser.email || order.buyerEmail || "",
        firstName: currentUser.displayName?.split(" ")[0] || "Customer",
        lastName: currentUser.displayName?.split(" ")[1] || "",
        idempotencyKey: getIdempotencyKey(),
      };

      if (activeMethod === "momo") {
        const res = await initiateMomoPayment(payload);
        setActiveTxRef(res.ref);
        setCardRedirectUrl(null);
        setPaymentPhase("waiting");
        watchTransaction(res.ref);
        toast.success("Payment prompt sent! Confirm on your phone.");
      } else {
        const data = await initiateCardPayment(payload);
        const ref = data.merchant_reference || data.ref;
        setActiveTxRef(ref);
        setCardRedirectUrl(data.redirect_url || null);
        setPaymentPhase("waiting");
        watchTransaction(ref);
        if (data.redirect_url) {
          const popup = window.open(data.redirect_url, "_blank", "noopener,noreferrer");
          if (!popup) window.location.assign(data.redirect_url);
        }
      }
    } catch (error) {
      console.error("Payment error:", error);
      const message =
        error instanceof Error ? error.message : "Payment failed to start";
      setPaymentPhase("failed");
      setPaymentError(message);
      toast.error(message);
    } finally {
      setPaying(false);
    }
  };

  const handleCancelPendingPayment = async () => {
    if (cancellingTx) return;
    setCancellingTx(true);
    try {
      if (activeTxRef) {
        await cancelTransaction(activeTxRef);
      }
      unsubTxRef.current?.();
      unsubTxRef.current = null;
      resetIdempotencyKey();
      setActiveTxRef(null);
      setCardRedirectUrl(null);
      setPaymentError("");
      setPaymentPhase("idle");
      toast.success("Payment cancelled.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel payment");
    } finally {
      setCancellingTx(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!order || cancellingOrder) return;
    setCancellingOrder(true);
    try {
      await cancelStoreOrder(order.id);
      unsubTxRef.current?.();
      unsubTxRef.current = null;
      setActiveTxRef(null);
      setCardRedirectUrl(null);
      setOrder((prev) => (prev ? { ...prev, status: "cancelled" } : prev));
      toast.success("Order cancelled.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel order");
    } finally {
      setCancellingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader className="animate-spin text-brand-strong" size={32} />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center p-8">
          <p className="text-danger font-bold">Order not found</p>
          <button
            onClick={() => router.push("/")}
            className="text-brand-strong underline mt-4 block mx-auto"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const isConfirmed =
    paymentPhase === "confirmed" ||
    order.status === "paid" ||
    order.paymentStatus === "paid";
  const isCancelledOrder =
    String(order.status || "").toLowerCase() === "cancelled" ||
    String(order.status || "").toLowerCase() === "canceled";

  return (
    <div className="min-h-[60vh] bg-surface-sunken/30">
      <div className="max-w-lg mx-auto px-4 pt-10 pb-24">
        {creatorHandle && (
          <Link
            href={`/${creatorHandle}/store`}
            className="inline-flex items-center gap-2 text-sm text-muted-fg hover:text-fg transition mb-6"
          >
            <ArrowLeft size={16} />
            Back to Store
          </Link>
        )}

        <div className="bg-surface rounded-control shadow-lg p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">Order Details</h1>
              <p className="text-sm text-muted-fg">
                Order #{order.id.slice(0, 8)} · Charging in {currency}
              </p>
            </div>
            {isConfirmed ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-success">
                <Check size={14} />
                Paid
              </span>
            ) : isCancelledOrder ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-danger">
                <XCircle size={14} />
                Cancelled
              </span>
            ) : null}
          </div>

          <div className="bg-surface-sunken rounded-control p-4 space-y-2">
            <h4 className="font-bold text-sm">Order Summary</h4>
            {items.length > 0 ? (
              items.map((item, idx: number) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span>
                    {item.quantity}x{" "}
                    {item.productName ||
                      products[item.productId]?.name ||
                      "Product"}
                    {item.selectedSize && ` (${item.selectedSize})`}
                  </span>
                  <span className="font-medium tabular-nums">
                    {currency
                      ? formatCurrency(item.price * item.quantity, currency)
                      : (item.price * item.quantity).toLocaleString()}
                  </span>
                </div>
              ))
            ) : (
              <div className="flex justify-between text-sm">
                <span>{order.productName || "Product"}</span>
                <span className="font-medium tabular-nums">
                  {currency
                    ? formatCurrency(order.productPrice || finalTotal, currency)
                    : (order.productPrice || finalTotal).toLocaleString()}
                </span>
              </div>
            )}
            {discount > 0 && (
              <div className="flex justify-between text-sm text-success">
                <span>Discount</span>
                <span className="font-medium tabular-nums">
                  -{currency ? formatCurrency(discount, currency) : discount.toLocaleString()}
                </span>
              </div>
            )}
            {buyerPaysMore && platformFee > 0 && (
              <div className="flex justify-between text-sm text-muted-fg">
                <span>Platform fee</span>
                <span className="font-medium tabular-nums">
                  {currency ? formatCurrency(platformFee, currency) : platformFee.toLocaleString()}
                </span>
              </div>
            )}
            <div className="border-t border-line pt-2 flex justify-between font-bold">
              <span>Total</span>
              <span className="tabular-nums">
                {currency
                  ? formatCurrency(amountToPay, currency)
                  : amountToPay.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="bg-surface-sunken rounded-control p-4 space-y-1">
            <h4 className="font-bold text-sm mb-2">Buyer</h4>
            <p className="text-sm">{order.buyerName || "N/A"}</p>
            <p className="text-sm text-muted-fg">{order.buyerEmail || ""}</p>
            {order.shippingAddress && (
              <>
                <p className="text-sm text-muted-fg mt-2">
                  {order.shippingAddress.address}, {order.shippingAddress.city},{" "}
                  {order.shippingAddress.country}
                </p>
                <p className="text-sm text-muted-fg">
                  Phone: {order.shippingAddress.phone}
                </p>
              </>
            )}
          </div>

          {isConfirmed ? (
            <div className="bg-success-bg rounded-control p-4 flex items-start gap-3">
              <Check size={20} className="text-success mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold text-success">
                  Payment Completed
                </p>
                <p className="text-xs text-success mt-1">
                  This order has been paid successfully.
                </p>
              </div>
            </div>
          ) : isCancelledOrder ? (
            <div className="bg-danger-bg rounded-control p-4 flex items-start gap-3">
              <XCircle size={20} className="text-danger mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold text-danger">
                  Order Cancelled
                </p>
                <p className="text-xs text-danger mt-1">
                  This order was cancelled and no payment is required.
                </p>
              </div>
            </div>
          ) : paymentPhase === "waiting" ? (
            <div className="bg-warning-bg rounded-control p-4 flex items-start gap-3">
              <Loader
                size={20}
                className="animate-spin text-warning mt-0.5 shrink-0"
              />
              <div className="flex-1">
                <p className="text-sm font-bold text-warning">
                  Waiting for Payment Confirmation
                </p>
                <p className="text-xs text-warning mt-1">
                  {activeMethod === "momo"
                    ? "Check your phone and enter your PIN to confirm payment."
                    : "Complete your payment in the checkout tab."}
                </p>
                {cardRedirectUrl && (
                  <a
                    href={cardRedirectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-xs font-bold text-brand-strong hover:underline"
                  >
                    Open checkout page <ExternalLink size={14} />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => void handleCancelPendingPayment()}
                  disabled={cancellingTx}
                  className="mt-2 block min-h-11 text-xs font-semibold text-muted-fg underline hover:text-fg disabled:opacity-50"
                >
                  {cancellingTx ? "Cancelling..." : "Cancel payment & try again"}
                </button>
              </div>
            </div>
          ) : (
            <>
              {paymentPhase === "failed" && paymentError && (
                <div className="bg-danger-bg rounded-control p-4 flex items-start gap-3">
                  <XCircle size={20} className="text-danger mt-0.5 shrink-0" />
                  <p className="text-sm font-medium text-danger">{paymentError}</p>
                </div>
              )}

              <div className="space-y-3">
                <p className="font-bold text-sm">Payment Method</p>
                {!momoSupported ? (
                  <p className="text-sm text-muted-fg">
                    Mobile money is not available for {currency || "this currency"}. Card payment is required.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (paymentMethod !== "momo") resetIdempotencyKey();
                        setPaymentMethod("momo");
                      }}
                      className={`py-3 px-4 rounded-control border-2 font-bold text-sm transition-all ${
                        paymentMethod === "momo"
                          ? "border-brand-strong bg-brand-soft text-brand-strong"
                          : "border-line text-muted-fg"
                      }`}
                    >
                      Mobile Money
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (paymentMethod !== "card") resetIdempotencyKey();
                        setPaymentMethod("card");
                      }}
                      className={`py-3 px-4 rounded-control border-2 font-bold text-sm transition-all ${
                        paymentMethod === "card"
                          ? "border-brand-strong bg-brand-soft text-brand-strong"
                          : "border-line text-muted-fg"
                      }`}
                    >
                      Card Payment
                    </button>
                  </div>
                )}
              </div>

              {activeMethod === "momo" && (
                <div className="bg-warning-bg rounded-control p-4 flex items-start gap-3">
                  <AlertCircle
                    size={20}
                    className="text-warning mt-0.5 shrink-0"
                  />
                  <p className="text-sm text-warning">
                    Payment will be processed via Mobile Money. You will receive
                    a prompt on your phone to complete the payment.
                  </p>
                </div>
              )}

              {activeMethod === "momo" && (
                <div className="space-y-2">
                  <label className="text-sm font-bold">
                    Mobile Money Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="07X XXX XXXX"
                    className="w-full bg-surface-sunken p-4 rounded-control text-sm font-medium outline-none"
                  />
                </div>
              )}

              {activeMethod === "card" && (
                <div className="bg-info-bg rounded-control p-4 flex items-start gap-3">
                  <CreditCard
                    size={20}
                    className="text-info mt-0.5 shrink-0"
                  />
                  <p className="text-sm text-info">
                    You will be redirected to a secure payment page to complete
                    your card payment.
                  </p>
                </div>
              )}

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={handlePay}
                  disabled={paying || (activeMethod === "momo" && !phone.trim())}
                  className="w-full min-h-12 bg-success text-on-success py-3.5 px-4 rounded-control font-bold hover:bg-success transition disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  {paying ? (
                    <>
                      <Loader className="animate-spin" size={20} />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Check size={20} />
                      Pay{" "}
                      {currency
                        ? formatCurrency(amountToPay, currency)
                        : amountToPay.toLocaleString()}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => void handleCancelOrder()}
                  disabled={cancellingOrder || paying}
                  className="w-full min-h-11 py-3 px-4 rounded-control border border-line text-sm font-semibold text-muted-fg hover:text-fg hover:bg-surface-sunken transition disabled:opacity-50"
                >
                  {cancellingOrder ? "Cancelling order..." : "Cancel Order"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
