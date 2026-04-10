"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader, Check } from "lucide-react";
import { db } from "@/db/firebase";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import Link from "next/link";

export default function PayStoreOrderPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;
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
    if (!order) return;
    
    setPaying(true);
    
    try {
      await updateDoc(doc(db, "storeOrders", orderId), {
        paymentStatus: "paid",
        status: "paid",
        paymentMethod,
        paidAt: serverTimestamp(),
      });
      
      setPaid(true);
    } catch (error) {
      console.error("Payment error:", error);
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="animate-spin text-orange-600" size={32} />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-8">
          <p className="text-red-500 font-bold">Order not found</p>
          <Link href="/" className="text-orange-600 underline mt-4 block">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  if (order.paymentStatus === "paid") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="text-green-600" size={32} />
          </div>
          <h1 className="text-2xl font-bold mb-2">Already Paid</h1>
          <p className="text-slate-500">This order has already been paid.</p>
          <Link href="/" className="text-orange-600 underline mt-4 block">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  if (paid) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="text-green-600" size={32} />
          </div>
          <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
          <p className="text-slate-500 mb-4">Your order has been confirmed.</p>
          <Link href="/" className="text-orange-600 underline">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-6">
        <h1 className="text-xl font-bold mb-6">Pay Order</h1>
        
        <div className="bg-slate-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-slate-500 mb-2">Order Total</p>
          <p className="text-2xl font-bold">{order.total.toLocaleString()} RWF</p>
        </div>

        <div className="space-y-4 mb-6">
          <p className="font-bold">Payment Method</p>
          
          <button
            onClick={() => setPaymentMethod("momo")}
            className={`w-full p-4 rounded-lg border-2 transition ${
              paymentMethod === "momo"
                ? "border-orange-500 bg-orange-50"
                : "border-slate-100"
            }`}
          >
            <p className="font-bold">Mobile Money (MoMo)</p>
            <p className="text-sm text-slate-500">Pay via MTN or Airtel Money</p>
          </button>
          
          <button
            onClick={() => setPaymentMethod("card")}
            className={`w-full p-4 rounded-lg border-2 transition ${
              paymentMethod === "card"
                ? "border-orange-500 bg-orange-50"
                : "border-slate-100"
            }`}
          >
            <p className="font-bold">Bank Card</p>
            <p className="text-sm text-slate-500">Visa, Mastercard</p>
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
              className="w-full p-4 rounded-lg border border-slate-200"
            />
          </div>
        )}

        <button
          onClick={handlePay}
          disabled={paying || (paymentMethod === "momo" && !phone)}
          className="w-full bg-green-600 text-white py-4 rounded-lg font-bold hover:bg-green-700 transition disabled:opacity-50"
        >
          {paying ? <Loader className="animate-spin mx-auto" /> : `Pay ${order.total.toLocaleString()} RWF`}
        </button>
      </div>
    </div>
  );
}