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
    void import("canvas-confetti").then((mod) => {
      mod.default({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#ea580c", "#fb923c", "#fff"],
      });
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
    <div className="min-h-screen bg-muted flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-card rounded-3xl shadow-xl shadow-border-strong/60 overflow-hidden border border-border">
        <div className="p-8 text-center space-y-6">
          {status === "verifying" && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="relative mx-auto w-20 h-20">
                <div className="absolute inset-0 border-4 border-border rounded-full" />
                <div className="absolute inset-0 border-4 border-t-orange-600 rounded-full animate-spin" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-foreground">
                  {txData?.type === "store" 
                    ? "Confirming your order payment..." 
                    : "Confirming your gift..."}
                </h1>
                <p className="text-muted-foreground text-sm">
                  {txData?.type === "store"
                    ? "We're verifying your order payment with the bank. This won't take long."
                    : "We're verifying your transaction with the bank. This won't take long."}
                </p>
              </div>
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
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
                <h1 className="text-3xl font-black text-foreground">
                  Thank You!
                </h1>
                <p className="text-muted-foreground font-medium">
                  {txData?.type === "store"
                    ? `Your payment of `
                    : `Your gift of `}
                  <span className="text-orange-600 font-bold">
                    {txData?.amount} RWF
                  </span>{" "}
                  {txData?.type === "store"
                    ? "has been processed successfully."
                    : "has been sent successfully."}
                </p>
              </div>
              <div className="pt-4">
                <Link
                  href={`/${txData?.creatorId || ""}`}
                  className="w-full bg-foreground text-background py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-orange-600 transition-all group"
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
                <h1 className="text-2xl font-bold text-foreground">
                  Payment Failed
                </h1>
                <p className="text-muted-foreground text-sm">
                  We couldn&apos;t verify this transaction. It might have been
                  cancelled or declined.
                </p>
              </div>
              <button
                onClick={() => router.back()}
                className="w-full bg-border text-foreground py-4 rounded-2xl font-bold hover:bg-border-strong transition-all"
              >
                Go Back & Try Again
              </button>
            </div>
          )}
        </div>

        <div className="bg-muted p-4 border-t border-border flex items-center justify-center gap-2">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
            Powered by
          </span>
          <span className="text-xs font-bold text-foreground tracking-tighter">
            agaseke.me
          </span>
        </div>
      </div>
    </div>
  );
}
