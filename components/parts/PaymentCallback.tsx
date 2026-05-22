/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { db } from "@/db/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import {
  XCircle,
  Heart,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { formatCurrency } from "@/lib/format";

export default function PaymentCallback() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"verifying" | "success" | "error">(
    "verifying",
  );
  const [txData, setTxData] = useState<any>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const merchantRef = searchParams.get("OrderMerchantReference");

  const triggerConfetti = useCallback(() => {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#ea580c", "#fb923c", "#fff"],
    });
  }, []);

  const listenToTransaction = useCallback((ref: string) => {
    const q = query(collection(db, "transactions"), where("ref", "==", ref));

    unsubscribeRef.current = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        setTxData(data);

        if (data.status === "successful" || data.status === "success") {
          setStatus("success");
          triggerConfetti();
          if (unsubscribeRef.current) unsubscribeRef.current();
        } else if (data.status === "failed") {
          setStatus("error");
          if (unsubscribeRef.current) unsubscribeRef.current();
        }
      }
    });
  }, [triggerConfetti]);

  useEffect(() => {
    if (merchantRef) {
      listenToTransaction(merchantRef);
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus("error");
    }

    return () => {
      if (unsubscribeRef.current) unsubscribeRef.current();
    };
  }, [merchantRef, listenToTransaction]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/60 overflow-hidden border border-slate-100">
        <div className="p-8 text-center space-y-6">
          {status === "verifying" && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="relative mx-auto w-20 h-20">
                <div className="absolute inset-0 border-4 border-slate-100 rounded-full" />
                <div className="absolute inset-0 border-4 border-t-orange-600 rounded-full animate-spin" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-slate-900">
                  {txData?.type === "store" 
                    ? "Confirming your order payment..." 
                    : "Confirming your gift..."}
                </h1>
                <p className="text-slate-500 text-sm">
                  {txData?.type === "store"
                    ? "We're verifying your order payment with the bank. This won't take long."
                    : "We're verifying your transaction with the bank. This won't take long."}
                </p>
              </div>
              <div className="text-[10px] font-mono text-slate-300 uppercase tracking-widest">
                Ref: {merchantRef}
              </div>
            </div>
          )}

          {status === "success" && (
            <div className="space-y-6 animate-in zoom-in-95 duration-500">
              <div className="w-20 h-20 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-orange-50/50">
                <Heart size={40} fill="currentColor" />
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-black text-slate-900">
                  Thank You!
                </h1>
                <p className="text-slate-600 font-medium">
                  {txData?.type === "store"
                    ? `Your payment of `
                    : `Your gift of `}
                  <span className="text-orange-600 font-bold">
                    {formatCurrency(txData?.amount || 0, txData?.currency)}
                  </span>{" "}
                  {txData?.type === "store"
                    ? "has been processed successfully."
                    : "has been sent successfully."}
                </p>
              </div>
              <div className="pt-4">
                <Link
                  href={`/${txData?.creatorId || ""}`}
                  className="inline-flex items-center gap-2 text-orange-600 font-bold text-sm hover:text-orange-700 transition-colors"
                >
                  Back to Profile <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-6 animate-in zoom-in-95 duration-500">
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
                <XCircle size={40} />
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-black text-slate-900">
                  Payment Failed
                </h1>
                <p className="text-slate-500 font-medium">
                  {txData?.type === "store"
                    ? "Something went wrong processing your payment."
                    : "Something went wrong sending your gift."}
                </p>
              </div>
              <div className="pt-4">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-lg font-bold text-sm hover:bg-orange-600 transition-colors"
                >
                  Try Again
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
