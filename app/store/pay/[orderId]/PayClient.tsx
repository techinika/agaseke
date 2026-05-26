"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader, Check, ArrowLeft } from "lucide-react";
import { db } from "@/db/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "sonner";

export default function PayClient() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;
  const { user: currentUser } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"momo" | "card">("momo");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) return;

      const orderDoc = await getDoc(doc(db, "storeOrders", orderId));
      if (orderDoc.exists()) {
        const data = orderDoc.data();
        setOrder({ id: orderDoc.id, ...data });
      }
      setLoading(false);
    };

    fetchOrder();
  }, [orderId]);

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
      const items = order.items && Array.isArray(order.items)
        ? order.items
        : order.productIds && Array.isArray(order.productIds)
          ? order.productIds.map((p: any) => ({
              productId: p.productId,
              quantity: p.quantity,
              price: p.price,
            }))
          : order.productId
            ? [{ productId: order.productId, quantity: order.quantity || 1, price: order.productPrice || order.total }]
            : [];

      const firstItem = items[0];
      if (!firstItem) {
        toast.error("No products in this order");
        return;
      }

      const productSnap = await getDoc(doc(db, "storeProducts", firstItem.productId));
      const productData = productSnap.exists() ? productSnap.data() : null;

      const totalAmount = order.total || order.totalAmount || firstItem.price * firstItem.quantity;

      const payload: Record<string, any> = {
        productId: firstItem.productId,
        quantity: firstItem.quantity,
        productPrice: firstItem.price,
        productName: productData?.name || order.productName || "Product",
        supporterId: currentUser.uid,
        buyerId: currentUser.uid,
        buyerName: currentUser.displayName || order.buyerName || order.customerName || "Customer",
        buyerEmail: currentUser.email || order.buyerEmail || order.customerEmail || "",
        phone: phone.replace(/\s/g, ""),
        amount: totalAmount,
        creatorId: order.creatorId || productData?.creatorId || "",
        creatorUid: order.creatorUid || productData?.creatorUid || "",
        platformFeePayer: productData?.platformFeePayer || "buyer",
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
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Payment failed");
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <Loader className="animate-spin text-orange-600" size={32} />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="text-center p-8">
          <p className="text-red-500 font-bold">Order not found</p>
          <button onClick={() => router.push("/")} className="text-orange-600 underline mt-4 block mx-auto">
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (order.paymentStatus === "paid" || order.status === "paid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="text-center p-8 bg-card rounded-xl shadow-lg">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="text-green-600" size={32} />
          </div>
          <h1 className="text-2xl font-bold mb-2">Already Paid</h1>
          <p className="text-muted-foreground">This order has already been paid.</p>
          <button onClick={() => router.push("/supporter")} className="text-orange-600 underline mt-4 block mx-auto">
            Go to My Orders
          </button>
        </div>
      </div>
    );
  }

  if (paid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="text-center p-8 bg-card rounded-xl shadow-lg">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="text-green-600" size={32} />
          </div>
          <h1 className="text-2xl font-bold mb-2">Payment Initiated!</h1>
          <p className="text-muted-foreground mb-4">
            {paymentMethod === "momo"
              ? "Check your phone to complete the payment."
              : "You will be redirected to complete your payment."}
          </p>
          <button onClick={() => router.push("/supporter")} className="text-orange-600 underline block mx-auto">
            Go to My Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted">
      <div className="max-w-md mx-auto px-4 pt-20 pb-24">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition mb-6"
        >
          <ArrowLeft size={20} />
          <span className="font-medium">Back</span>
        </button>

        <div className="bg-card rounded-xl shadow-lg p-6">
          <h1 className="text-xl font-bold mb-6">Pay Order</h1>

          <div className="bg-muted rounded-lg p-4 mb-6">
            <p className="text-sm text-muted-foreground mb-1">Order Total</p>
            <p className="text-2xl font-bold">{(order.total || order.totalAmount || 0).toLocaleString()} RWF</p>
          </div>

          {order.items && Array.isArray(order.items) && order.items.length > 0 && (
            <div className="mb-6 space-y-2">
              <p className="text-sm font-bold">Items</p>
              {order.items.map((item: any, idx: number) => (
                <div key={idx} className="text-sm text-muted-foreground flex justify-between">
                  <span>{item.quantity}x {item.productName || item.name || "Product"}</span>
                  <span>{(item.price * item.quantity).toLocaleString()} RWF</span>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-4 mb-6">
            <p className="font-bold">Payment Method</p>

            <button
              onClick={() => setPaymentMethod("momo")}
              className={`w-full p-4 rounded-lg border-2 text-left transition ${
                paymentMethod === "momo"
                  ? "border-orange-500 bg-orange-50 dark:bg-orange-950/20"
                  : "border-border bg-card"
              }`}
            >
              <p className="font-bold">Mobile Money (MoMo)</p>
              <p className="text-sm text-muted-foreground">Pay via MTN or Airtel Money</p>
            </button>

            <button
              onClick={() => setPaymentMethod("card")}
              className={`w-full p-4 rounded-lg border-2 text-left transition ${
                paymentMethod === "card"
                  ? "border-orange-500 bg-orange-50 dark:bg-orange-950/20"
                  : "border-border bg-card"
              }`}
            >
              <p className="font-bold">Bank Card</p>
              <p className="text-sm text-muted-foreground">Visa, Mastercard</p>
            </button>
          </div>

          {paymentMethod === "momo" && (
            <div className="mb-6">
              <label className="block text-sm font-bold mb-2">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="2507..."
                className="w-full p-4 rounded-lg border border-border-strong bg-background text-foreground outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          )}

          <button
            onClick={handlePay}
            disabled={paying || (paymentMethod === "momo" && !phone.trim())}
            className="w-full bg-green-600 text-white py-4 rounded-lg font-bold hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {paying ? (
              <Loader className="animate-spin" size={20} />
            ) : (
              `Pay ${(order.total || order.totalAmount || 0).toLocaleString()} RWF`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
