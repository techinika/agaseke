/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  XCircle,
  Heart,
  ArrowRight,
  Ticket,
  Calendar,
  Clock,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import { AgasekeLogo } from "@/components/brand/AgasekeLogo";
import { fetchGatheringById, subscribeToTransactionByRef } from "@/lib/transactions";
import { formatMoney as formatCurrency } from "@/lib/format/money";
import { getCurrencyDefinition } from "@/lib/money/registry.generated";

function formatMinorUnits(minor: unknown, currency: unknown): string | null {
  const amount = Number(minor);
  const code = typeof currency === "string" ? currency : "";
  if (!Number.isFinite(amount) || amount <= 0 || !code) return null;
  let factor = 1;
  try {
    factor = 10 ** getCurrencyDefinition(code as never).minorUnit;
  } catch {
    factor = 1;
  }
  return formatCurrency(amount / factor, code);
}

function originalChargeLabel(data: any): string | null {
  if (!data?.sourceCurrency || !data?.currency || data.sourceCurrency === data.currency) {
    return null;
  }
  const original = formatMinorUnits(data.sourceAmountMinor, data.sourceCurrency);
  if (!original) return null;
  return `Original ${original} · charged in ${data.currency}`;
}

export default function PaymentCallback() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [txData, setTxData] = useState<any>(null);
  const [gatheringData, setGatheringData] = useState<any>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const merchantRef = searchParams.get("OrderMerchantReference");

  const triggerConfetti = useCallback(() => {
    void import("canvas-confetti").then((mod) => {
      mod.default({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["--ag-brand-strong", "--ag-brand-soft", "--ag-fg"].map((token) =>
          getComputedStyle(document.documentElement).getPropertyValue(token).trim(),
        ),
      });
    });
  }, []);

  const listenToTransaction = useCallback(
    (ref: string) => {
      unsubscribeRef.current = subscribeToTransactionByRef(ref, async (data) => {
        if (!data) return;
        setTxData(data);

        if (data.type === "gathering" && data.gatheringId) {
          try {
            const gathering = await fetchGatheringById(String(data.gatheringId));
            if (gathering) setGatheringData(gathering);
          } catch (e) {
            console.error("Failed to fetch gathering:", e);
          }
        }

        if (data.status === "successful" || data.status === "success") {
          setStatus("success");
          triggerConfetti();
          if (unsubscribeRef.current) unsubscribeRef.current();
        } else if (data.status === "failed") {
          setStatus("error");
          if (unsubscribeRef.current) unsubscribeRef.current();
        }
      });
    },
    [triggerConfetti],
  );

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

  const isGathering = txData?.type === "gathering";
  const isStore = txData?.type === "store";

  return (
    <div className="min-h-screen bg-surface-sunken flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-surface rounded-card shadow-xl shadow-border-strong/60 overflow-hidden border border-line">
        <div className="p-8 text-center space-y-6">
          {status === "verifying" && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="relative mx-auto w-20 h-20">
                <div className="absolute inset-0 border-4 border-line rounded-full" />
                <div className="absolute inset-0 border-4 border-t-orange-600 rounded-full animate-spin" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-fg">
                  {isStore
                    ? "Confirming your order payment..."
                    : isGathering
                      ? "Confirming your ticket purchase..."
                      : "Confirming your gift..."}
                </h1>
                <p className="text-muted-fg text-sm">
                  {isStore
                    ? "We're verifying your order payment with the bank. This won't take long."
                    : isGathering
                      ? "We're verifying your ticket payment with the bank. This won't take long."
                      : "We're verifying your transaction with the bank. This won't take long."}
                </p>
              </div>
              <div className="text-caption font-mono text-muted-fg uppercase tracking-widest">
                Ref: {merchantRef}
              </div>
            </div>
          )}

          {status === "success" && (
            <div className="space-y-6 animate-in zoom-in-95 duration-500">
              {isGathering ? (
                <>
                  <div className="w-20 h-20 bg-success-bg text-success rounded-full flex items-center justify-center mx-auto ring-8 ring-success-bg/50">
                    <Ticket size={40} />
                  </div>
                  <div className="space-y-2">
                    <h1 className="text-3xl font-black text-fg">
                      Ticket Purchased!
                    </h1>
                    <p className="text-muted-fg font-medium">
                      Your ticket for{" "}
                      <span className="text-brand-strong font-bold">
                        {formatCurrency(Number(txData?.amount || 0), txData?.currency || "")}
                      </span>{" "}
                      has been confirmed.
                    </p>
                    {originalChargeLabel(txData) && (
                      <p className="text-xs text-muted-fg">
                        {originalChargeLabel(txData)}
                      </p>
                    )}
                    <p className="text-sm text-muted-fg">
                      Your ticket details will be sent to your email.
                    </p>
                  </div>
                  {gatheringData && (
                    <div className="bg-surface-sunken rounded-control p-4 space-y-2 text-left">
                      <p className="font-bold text-sm">{gatheringData.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-fg">
                        <Calendar size={12} />
                        <span>{gatheringData.date}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-fg">
                        <Clock size={12} />
                        <span>{gatheringData.time}</span>
                      </div>
                      {gatheringData.location && (
                        <div className="flex items-center gap-2 text-xs text-muted-fg">
                          <MapPin size={12} />
                          <span>{gatheringData.location}</span>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="pt-2">
                    <Link
                      href={`/${txData?.creatorId || ""}/gatherings/${txData?.gatheringId || ""}`}
                      className="w-full bg-foreground text-background py-4 rounded-card font-bold flex items-center justify-center gap-2 hover:bg-brand-strong transition-all group"
                    >
                      View Your Ticket{" "}
                      <ArrowRight
                        size={18}
                        className="group-hover:translate-x-1 transition-transform"
                      />
                    </Link>
                  </div>
                </>
              ) : isStore ? (
                <>
                  <div className="w-20 h-20 bg-brand-soft text-brand-strong rounded-full flex items-center justify-center mx-auto ring-8 ring-brand-soft/50">
                    <Heart size={40} fill="currentColor" />
                  </div>
                  <div className="space-y-2">
                    <h1 className="text-3xl font-black text-fg">Thank You!</h1>
                    <p className="text-muted-fg font-medium">
                      Your payment of{" "}
                      <span className="text-brand-strong font-bold">
                        {formatCurrency(Number(txData?.amount || 0), txData?.currency || "")}
                      </span>{" "}
                      has been processed successfully.
                    </p>
                    {originalChargeLabel(txData) && (
                      <p className="text-xs text-muted-fg">
                        {originalChargeLabel(txData)}
                      </p>
                    )}
                  </div>
                  <div className="pt-4">
                    <Link
                      href={`/${txData?.creatorId || ""}`}
                      className="w-full bg-foreground text-background py-4 rounded-card font-bold flex items-center justify-center gap-2 hover:bg-brand-strong transition-all group"
                    >
                      Back to Store{" "}
                      <ArrowRight
                        size={18}
                        className="group-hover:translate-x-1 transition-transform"
                      />
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 bg-brand-soft text-brand-strong rounded-full flex items-center justify-center mx-auto ring-8 ring-brand-soft/50">
                    <Heart size={40} fill="currentColor" />
                  </div>
                  <div className="space-y-2">
                    <h1 className="text-3xl font-black text-fg">Thank You!</h1>
                    <p className="text-muted-fg font-medium">
                      Your gift of{" "}
                      <span className="text-brand-strong font-bold">
                        {formatCurrency(Number(txData?.amount || 0), txData?.currency || "")}
                      </span>{" "}
                      has been sent successfully.
                    </p>
                    {originalChargeLabel(txData) && (
                      <p className="text-xs text-muted-fg">
                        {originalChargeLabel(txData)}
                      </p>
                    )}
                  </div>
                  <div className="pt-4">
                    <Link
                      href={`/${txData?.creatorId || ""}`}
                      className="w-full bg-foreground text-background py-4 rounded-card font-bold flex items-center justify-center gap-2 hover:bg-brand-strong transition-all group"
                    >
                      Back to Creator{" "}
                      <ArrowRight
                        size={18}
                        className="group-hover:translate-x-1 transition-transform"
                      />
                    </Link>
                  </div>
                </>
              )}
            </div>
          )}

          {status === "error" && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              <div className="w-20 h-20 bg-danger-bg text-danger rounded-full flex items-center justify-center mx-auto">
                <XCircle size={40} />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-fg">Payment Failed</h1>
                <p className="text-muted-fg text-sm">
                  We couldn&apos;t verify this transaction. It might have been cancelled
                  or declined.
                </p>
              </div>
              <button
                onClick={() => router.back()}
                className="w-full bg-border text-fg py-4 rounded-card font-bold hover:bg-border-strong transition-all"
              >
                Go Back & Try Again
              </button>
            </div>
          )}
        </div>

        <div className="bg-surface-sunken p-4 border-t border-line flex items-center justify-center gap-2">
          <span className="text-caption font-bold text-muted-fg uppercase tracking-[0.2em]">
            Powered by
          </span>
          <AgasekeLogo size="xs" />
        </div>
      </div>
    </div>
  );
}
