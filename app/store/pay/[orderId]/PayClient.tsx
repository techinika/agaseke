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
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "sonner";
import { initiateMomoPayment, initiateCardPayment } from "@/lib/paymentsService";
import { subscribeToTransactionByRef } from "@/lib/transactions";
import Link from "next/link";
import { formatMoney as formatCurrency } from "@/lib/format/money";
import { isCurrencySupportedByMethod } from "@/lib/money/rails";

const platformSharePercentage =
  Number(process.env.NEXT_PUBLIC_PLATFORM_SHARE) || 0.15;

export default function PayClient() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;
  const { user: currentUser } = useAuth();

  const [order, setOrder] = useState<any>(null);
  const [products, setProducts] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paymentPhase, setPaymentPhase] = useState<
    "idle" | "waiting" | "confirmed" | "failed"
  >("idle");
  const [paymentError, setPaymentError] = useState("");
  const [cardRedirectUrl, setCardRedirectUrl] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"momo" | "card">("momo");
  const [phone, setPhone] = useState("");
  const [creatorHandle, setCreatorHandle] = useState("");
  const unsubTxRef = useRef<(() => void) | null>(null);

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
      const data: any = { id: snap.id, ...snap.data() };
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

      const data: any = { id: snap.id, ...snap.data() };
      setOrder(data);
      if (data.status === "paid" || data.paymentStatus === "paid") {
        setPaymentPhase("confirmed");
      }
      if (data.shippingAddress?.phone) {
        setPhone((prev) => prev || String(data.shippingAddress.phone));
      }

      const orderItems: any[] = data.items || [];
      const map: Record<string, any> = {};
      for (const item of orderItems) {
        if (item.productId && !map[item.productId]) {
          const pSnap = await getDoc(doc(db, "storeProducts", item.productId));
          if (pSnap.exists()) {
            map[item.productId] = { id: pSnap.id, ...pSnap.data() };
          }
        }
      }
      setProducts(map);

      const firstItem = orderItems[0];
      const pData = map[firstItem?.productId];
      const uid =
        pData?.creatorUid ||
        data.creatorUid ||
        pData?.creatorId ||
        data.creatorId ||
        "";
      if (uid) {
        const profileSnap = await getDoc(doc(db, "profiles", uid));
        if (profileSnap.exists()) {
          const profile = profileSnap.data();
          const h = profile.username || "";
          if (h) setCreatorHandle(h);
        } else if (uid.length < 20) {
          setCreatorHandle(uid);
        }
      }

      const derivedCurrency = (
        data.currency ||
        (data.items || [])[0]?.currency ||
        "RWF"
      ) as string;
      if (
        derivedCurrency &&
        !isCurrencySupportedByMethod("momo", derivedCurrency as any)
      ) {
        setPaymentMethod("card");
      }
      setLoading(false);
    };

    void fetchOrder();
    return () => unsubOrder();
  }, [orderId]);

  const items: any[] = order?.items || [];

  let platformFee = 0;
  let buyerPaysMore = false;
  for (const item of items) {
    const product = products[item.productId];
    const feePayer = product?.platformFeePayer || "buyer";
    if (feePayer === "buyer") {
      platformFee += item.price * item.quantity * platformSharePercentage;
      buyerPaysMore = true;
    }
  }

  const finalTotal = order?.total || 0;
  const totalWithPlatformFee = finalTotal + platformFee;
  const amountToPay = buyerPaysMore ? totalWithPlatformFee : finalTotal;

  const currency = (
    order?.currency ||
    items[0]?.currency ||
    items[0]?.productCurrency ||
    "RWF"
  ) as string;
  const momoSupported = currency
    ? isCurrencySupportedByMethod("momo", currency as any)
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
      } else if (tx.status === "failed") {
        setPaymentPhase("failed");
        setPaymentError("The payment was declined or cancelled.");
        toast.error("Payment failed. Please try again.");
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

      const payload: Record<string, any> = {
        type: "store",
        ...(currency ? { currency } : {}),
        creatorHandle,
        productId: firstItem?.productId,
        quantity: items.reduce((s: number, i: any) => s + (i.quantity || 0), 0),
        selectedSize: firstItem?.selectedSize,
        buyerEmail: currentUser.email || order.buyerEmail || "",
        buyerName: currentUser.displayName || order.buyerName || "Customer",
        phone: phone.replace(/\s/g, ""),
        email: currentUser.email || "",
        firstName: currentUser.displayName?.split(" ")[0] || "Customer",
        lastName: currentUser.displayName?.split(" ")[1] || "",
        idempotencyKey: crypto.randomUUID(),
      };

      if (activeMethod === "momo") {
        const res = await initiateMomoPayment(payload as any);
        setCardRedirectUrl(null);
        setPaymentPhase("waiting");
        watchTransaction(res.ref);
        toast.success("Payment prompt sent! Confirm on your phone.");
      } else {
        const data = await initiateCardPayment(payload as any);
        setCardRedirectUrl(data.redirect_url || null);
        setPaymentPhase("waiting");
        watchTransaction(data.merchant_reference || data.ref);
        if (data.redirect_url) {
          window.open(data.redirect_url, "_blank", "noopener,noreferrer");
        }
      }
    } catch (error) {
      console.error("Payment error:", error);
      const message =
        error instanceof Error ? error.message : "Payment failed to start";
      setPaymentError(message);
      toast.error(message);
    } finally {
      setPaying(false);
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
                Order #{order.id.slice(0, 8)}
              </p>
            </div>
            {isConfirmed && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-success">
                <Check size={14} />
                Paid
              </span>
            )}
          </div>

          <div className="bg-surface-sunken rounded-control p-4 space-y-2">
            <h4 className="font-bold text-sm">Order Summary</h4>
            {items.length > 0 ? (
              items.map((item: any, idx: number) => (
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
                    ? formatCurrency(order.productPrice || order.total || 0, currency)
                    : (order.productPrice || order.total || 0).toLocaleString()}
                </span>
              </div>
            )}
            <div className="border-t border-line pt-2 flex justify-between font-bold">
              <span>Total</span>
              <span className="tabular-nums">
                {currency
                  ? formatCurrency(order.total || 0, currency)
                  : (order.total || 0).toLocaleString()}
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
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-brand-strong hover:underline"
                  >
                    Open checkout page <ExternalLink size={14} />
                  </a>
                )}
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
                      onClick={() => setPaymentMethod("momo")}
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
                      onClick={() => setPaymentMethod("card")}
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

              <button
                type="button"
                onClick={handlePay}
                disabled={paying || (activeMethod === "momo" && !phone.trim())}
                className="w-full bg-success text-on-success py-4 rounded-control font-bold hover:bg-success transition disabled:opacity-50 flex items-center justify-center gap-2"
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
