"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Loader,
  Check,
  ArrowLeft,
  CreditCard,
  AlertCircle,
} from "lucide-react";
import { db } from "@/db/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "sonner";
import Link from "next/link";

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
  const [paid, setPaid] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"momo" | "card">("momo");
  const [phone, setPhone] = useState("");
  const [isPaid, setIsPaid] = useState(false);
  const [creatorHandle, setCreatorHandle] = useState("");

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) return;

      const snap = await getDoc(doc(db, "storeOrders", orderId));
      if (!snap.exists()) {
        setLoading(false);
        return;
      }

      const data: any = { id: snap.id, ...snap.data() };
      setOrder(data);
      setIsPaid(data.status === "paid");

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

      // resolve creator handle from uid (profiles/{uid} doc has username field)
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

      setLoading(false);
    };

    fetchOrder();
  }, [orderId]);

  const items: any[] = order?.items || [];
  const firstProduct = products[items[0]?.productId];

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

  const handlePay = async () => {
    if (!order || !currentUser?.uid) {
      toast.error("Please log in");
      return;
    }

    if (paymentMethod === "momo" && !phone.trim()) {
      toast.error("Please enter your phone number");
      return;
    }

    setPaying(true);

    try {
      const firstItem = items[0];

      const payload: Record<string, any> = {
        productId: firstItem?.productId,
        quantity: items.reduce((s: number, i: any) => s + (i.quantity || 0), 0),
        supporterId: currentUser.uid,
        buyerId: currentUser.uid,
        buyerEmail: currentUser.email || order.buyerEmail || "",
        buyerName: currentUser.displayName || order.buyerName || "Customer",
        phone: phone.replace(/\s/g, ""),
        selectedSize: firstItem?.selectedSize,
        productPrice: firstItem?.price,
        productName: firstItem?.productName || firstProduct?.name || "Product",
        creatorId: creatorHandle,
        creatorUid: firstProduct?.creatorUid || order?.creatorUid || "",
        platformFeePayer: firstProduct?.platformFeePayer || "buyer",
        amount: amountToPay,
        email: currentUser.email || "",
        firstName: currentUser.displayName?.split(" ")[0] || "Customer",
        lastName: currentUser.displayName?.split(" ")[1] || "",
      };

      const endpoint =
        paymentMethod === "momo"
          ? "/api/support/with-momo/pay"
          : "/api/support/with-card/pay";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Payment failed to initiate");
        return;
      }

      if (paymentMethod === "card" && data.redirect_url) {
        window.location.href = data.redirect_url;
        return;
      }

      toast.success("Payment initiated! Check your phone to complete.");
      setPaid(true);
      setIsPaid(true);
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Payment failed");
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader className="animate-spin text-orange-600" size={32} />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center p-8">
          <p className="text-red-500 font-bold">Order not found</p>
          <button
            onClick={() => router.push("/")}
            className="text-orange-600 underline mt-4 block mx-auto"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] bg-muted/30">
      <div className="max-w-lg mx-auto px-4 pt-10 pb-24">
        {creatorHandle && (
          <Link
            href={`/${creatorHandle}?tab=store`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition mb-6"
          >
            <ArrowLeft size={16} />
            Back to Store
          </Link>
        )}

        <div className="bg-card rounded-xl shadow-lg p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">Order Details</h1>
              <p className="text-sm text-muted-foreground">
                Order #{order.id.slice(0, 8)}
              </p>
            </div>
            {isPaid && (
              <span className="flex items-center gap-1.5 bg-green-100 text-green-700 text-xs font-bold px-3 py-1.5 rounded-full">
                <Check size={14} />
                Paid
              </span>
            )}
          </div>

          {/* Order Summary */}
          <div className="bg-muted rounded-xl p-4 space-y-2">
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
                  <span className="font-medium">
                    {(item.price * item.quantity).toLocaleString()} RWF
                  </span>
                </div>
              ))
            ) : (
              <div className="flex justify-between text-sm">
                <span>{order.productName || "Product"}</span>
                <span className="font-medium">
                  {(order.productPrice || order.total || 0).toLocaleString()}{" "}
                  RWF
                </span>
              </div>
            )}
            <div className="border-t border-border pt-2 flex justify-between font-bold">
              <span>Total</span>
              <span>{(order.total || 0).toLocaleString()} RWF</span>
            </div>
          </div>

          {/* Buyer Info */}
          <div className="bg-muted rounded-xl p-4 space-y-1">
            <h4 className="font-bold text-sm mb-2">Buyer</h4>
            <p className="text-sm">{order.buyerName || "N/A"}</p>
            <p className="text-sm text-muted-foreground">
              {order.buyerEmail || ""}
            </p>
            {order.shippingAddress && (
              <>
                <p className="text-sm text-muted-foreground mt-2">
                  {order.shippingAddress.address}, {order.shippingAddress.city},{" "}
                  {order.shippingAddress.country}
                </p>
                <p className="text-sm text-muted-foreground">
                  Phone: {order.shippingAddress.phone}
                </p>
              </>
            )}
          </div>

          {/* Payment section - only if not already paid */}
          {isPaid ? (
            <div className="bg-green-50 rounded-xl p-4 flex items-start gap-3">
              <Check size={20} className="text-green-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold text-green-800">
                  Payment Completed
                </p>
                <p className="text-xs text-green-600 mt-1">
                  This order has been paid successfully.
                </p>
              </div>
            </div>
          ) : paid ? (
            <div className="bg-green-50 rounded-xl p-4 flex items-start gap-3">
              <Check size={20} className="text-green-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold text-green-800">
                  Payment Initiated
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {paymentMethod === "momo"
                    ? "Check your phone to complete the payment."
                    : "You will be redirected to complete your payment."}
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Payment Method */}
              <div className="space-y-3">
                <p className="font-bold text-sm">Payment Method</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPaymentMethod("momo")}
                    className={`py-3 px-4 rounded-lg border-2 font-bold text-sm transition-all ${
                      paymentMethod === "momo"
                        ? "border-orange-600 bg-orange-50 text-orange-600"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    Mobile Money
                  </button>
                  <button
                    onClick={() => setPaymentMethod("card")}
                    className={`py-3 px-4 rounded-lg border-2 font-bold text-sm transition-all ${
                      paymentMethod === "card"
                        ? "border-orange-600 bg-orange-50 text-orange-600"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    Card Payment
                  </button>
                </div>
              </div>

              {paymentMethod === "momo" && (
                <div className="bg-amber-50 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle
                    size={20}
                    className="text-amber-600 mt-0.5 shrink-0"
                  />
                  <p className="text-sm text-amber-800">
                    Payment will be processed via Mobile Money. You will receive
                    a prompt on your phone to complete the payment.
                  </p>
                </div>
              )}

              {paymentMethod === "momo" && (
                <div className="space-y-2">
                  <label className="text-sm font-bold">
                    MTN Mobile Money Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="07X XXX XXXX"
                    className="w-full bg-muted p-4 rounded-lg text-sm font-medium outline-none"
                  />
                </div>
              )}

              {paymentMethod === "card" && (
                <div className="bg-blue-50 rounded-xl p-4 flex items-start gap-3">
                  <CreditCard
                    size={20}
                    className="text-blue-600 mt-0.5 shrink-0"
                  />
                  <p className="text-sm text-blue-800">
                    You will be redirected to a secure payment page to complete
                    your card payment.
                  </p>
                </div>
              )}

              <button
                onClick={handlePay}
                disabled={paying || (paymentMethod === "momo" && !phone.trim())}
                className="w-full bg-green-600 text-white py-4 rounded-lg font-bold hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {paying ? (
                  <>
                    <Loader className="animate-spin" size={20} />
                    Processing...
                  </>
                ) : (
                  <>
                    <Check size={20} />
                    Pay {amountToPay.toLocaleString()} RWF
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
