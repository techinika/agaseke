"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { db } from "@/db/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import {
  CheckCircle2,
  Loader2,
  XCircle,
  Heart,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import confetti from "canvas-confetti";

export default function PaymentCallback() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"verifying" | "success" | "error">(
    "verifying",
  );
  const [txData, setTxData] = useState<any>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const orderTrackingId = searchParams.get("OrderTrackingId");
  const merchantRef = searchParams.get("OrderMerchantReference");

  useEffect(() => {
    if (merchantRef) {
      listenToTransaction(merchantRef);
    } else {
      setStatus("error");
    }

    return () => {
      if (unsubscribeRef.current) unsubscribeRef.current();
    };
  }, [merchantRef]);

  const listenToTransaction = (ref: string) => {
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
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#ea580c", "#fb923c", "#fff"],
    });
  };

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
                  Confirming your gift...
                </h1>
                <p className="text-slate-500 text-sm">
                  We're verifying your transaction with the bank. This won't
                  take long.
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
                  Your gift of{" "}
                  <span className="text-orange-600 font-bold">
                    {txData?.amount} RWF
                  </span>{" "}
                  has been sent successfully.
                </p>
              </div>
              <div className="pt-4">
                <Link
                  href={`/${txData?.creatorId || ""}`}
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-orange-600 transition-all group"
                >
                  Back to Creator{" "}
                  <ArrowRight
                    size={18}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </Link>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
                <XCircle size={40} />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-slate-900">
                  Payment Failed
                </h1>
                <p className="text-slate-500 text-sm">
                  We couldn't verify this transaction. It might have been
                  cancelled or declined.
                </p>
              </div>
              <button
                onClick={() => router.back()}
                className="w-full bg-slate-100 text-slate-900 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all"
              >
                Go Back & Try Again
              </button>
            </div>
          )}
        </div>

        <div className="bg-slate-50 p-4 border-t border-slate-100 flex items-center justify-center gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
            Powered by
          </span>
          <span className="text-xs font-bold text-slate-800 tracking-tighter">
            agaseke.me
          </span>
        </div>
      </div>
    </div>
  );
}
