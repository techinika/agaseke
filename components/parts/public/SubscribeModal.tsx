/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { subscribeToTransactionByRef } from "@/lib/transactions";
import { useAuth } from "@/auth/AuthContext";
import {
  X,
  Loader,
  Check,
  Crown,
  Smartphone,
  CreditCard,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  initiateSubscription,
  getCommunityTiers,
  getMySubscriptions,
  type CommunityTier,
} from "@/lib/communityService";
import { cancelTransaction } from "@/lib/paymentsService";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/db/firebase";
import { isSubscriptionActive } from "@/lib/contentAccess";
import { formatMoney as formatCurrency } from "@/lib/format/money";
import { getPrice } from "@/lib/priceMap";
import { isCurrencySupportedByMethod } from "@/lib/money/rails";

interface SubscribeModalProps {
  isOpen: boolean;
  onClose: () => void;
  creatorName: string;
  creatorHandle: string;
  creatorUid: string;
}

export function SubscribeModal({
  isOpen,
  onClose,
  creatorName,
  creatorHandle,
  creatorUid,
}: SubscribeModalProps) {
  const { user } = useAuth();
  const [tiers, setTiers] = useState<CommunityTier[]>([]);
  const [activeTierIds, setActiveTierIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState<CommunityTier | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"momo" | "card" | null>(null);
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"browse" | "payment" | "processing" | "success" | "error">("browse");
  const [errorMessage, setErrorMessage] = useState("");
  const [activeRef, setActiveRef] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const processingRef = useRef<string | null>(null);
  const stepRef = useRef(step);
  const paymentTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  /* eslint-disable react-hooks/set-state-in-effect -- load tiers when modal opens */
  useEffect(() => {
    if (!isOpen || !creatorHandle) return;
    setLoading(true);
    const tierPromise = getCommunityTiers(creatorHandle);
    const workerSubsPromise = user ? getMySubscriptions() : Promise.resolve([]);
    const firestoreSubsPromise = user
      ? getDocs(
          query(
            collection(db, "communitySubscriptions"),
            where("userId", "==", user.uid),
          ),
        )
      : Promise.resolve(null);

    Promise.allSettled([tierPromise, workerSubsPromise, firestoreSubsPromise])
      .then(([tierRes, workerRes, firestoreRes]) => {
        if (tierRes.status === "fulfilled") {
          setTiers(tierRes.value.tiers.filter((t) => t.isActive));
        }
        const active = new Set<string>();
        if (workerRes.status === "fulfilled") {
          for (const s of workerRes.value) {
            if (
              isSubscriptionActive(s as unknown as Record<string, unknown>) &&
              (!s.creatorHandle || s.creatorHandle === creatorHandle) &&
              s.tierId
            ) {
              active.add(s.tierId);
            }
          }
        }
        if (firestoreRes.status === "fulfilled" && firestoreRes.value) {
          for (const docSnap of firestoreRes.value.docs) {
            const d = docSnap.data() as Record<string, unknown>;
            if (
              isSubscriptionActive(d) &&
              (!d.creatorHandle || d.creatorHandle === creatorHandle) &&
              typeof d.tierId === "string" &&
              d.tierId
            ) {
              active.add(d.tierId);
            }
          }
        }
        setActiveTierIds(active);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [isOpen, creatorHandle, user]);

  /* eslint-disable react-hooks/set-state-in-effect -- reset modal state on close */
  useEffect(() => {
    if (!isOpen) {
      setStep("browse");
      setSelectedTier(null);
      setPaymentMethod(null);
      setPhone("");
      setErrorMessage("");
      setActiveRef(null);
      setCancelling(false);
      processingRef.current = null;
      if (paymentTimeoutRef.current) {
        clearTimeout(paymentTimeoutRef.current);
        paymentTimeoutRef.current = null;
      }
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (paymentTimeoutRef.current) {
        clearTimeout(paymentTimeoutRef.current);
        paymentTimeoutRef.current = null;
      }
    };
  }, []);

  const tierAmount = (t: CommunityTier) => getPrice(t);

  const tierCurrency = selectedTier?.currency ? String(selectedTier.currency).toUpperCase() : "";
  const momoSupported = tierCurrency ? isCurrencySupportedByMethod("momo", tierCurrency as any) : false;

  const handleSubscribe = async () => {
    if (!selectedTier || !user || !tierCurrency) return;
    const method = momoSupported ? paymentMethod : "card";
    if (!method) return;
    if (method === "momo" && !phone.trim()) {
      toast.error("Enter your phone number");
      return;
    }

    setStep("processing");
    const subId = `sub-${Date.now()}`;
    processingRef.current = subId;

    try {
      const subData: any = {
        tierId: selectedTier.id,
        tierName: selectedTier.name,
        creatorId: creatorUid,
        creatorHandle,
        amount: tierAmount(selectedTier),
        interval: selectedTier.interval,
        ...(tierCurrency ? { currency: tierCurrency } : {}),
        paymentMethod: method,
        supporterId: user.uid,
      };

      if (method === "momo") {
        subData.phone = phone;
      } else {
        subData.email = user.email || "";
        subData.firstName = user.displayName || "Supporter";
        subData.lastName = "";
      }

      const result = await initiateSubscription(subData);

      const txRef = result.paymentRef;
      setActiveRef(txRef);

      const unsub = subscribeToTransactionByRef(txRef, (txData) => {
        if (processingRef.current !== subId) {
          unsub();
          return;
        }
        if (!txData) return;
        if (txData.status === "successful" || txData.status === "success") {
          setStep("success");
          unsub();
        } else if (txData.status === "failed" || txData.status === "cancelled") {
          setErrorMessage(
            txData.status === "cancelled"
              ? "Payment cancelled."
              : "Payment failed. Please try again.",
          );
          setStep("error");
          unsub();
        }
      });

      if (paymentTimeoutRef.current) clearTimeout(paymentTimeoutRef.current);
      paymentTimeoutRef.current = setTimeout(() => {
        unsub();
        if (processingRef.current === subId && stepRef.current === "processing") {
          setErrorMessage("Payment confirmation timed out. Check your transactions.");
          setStep("error");
        }
      }, 120000);

      if (method === "card" && result.paymentUrl) {
        window.open(result.paymentUrl, "_blank", "noopener,noreferrer");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Something went wrong");
      setStep("error");
    }
  };

  const handleCancelPayment = async () => {
    if (!activeRef || cancelling) return;
    setCancelling(true);
    try {
      await cancelTransaction(activeRef);
      processingRef.current = null;
      if (paymentTimeoutRef.current) {
        clearTimeout(paymentTimeoutRef.current);
        paymentTimeoutRef.current = null;
      }
      toast.success("Payment cancelled.");
      setStep("payment");
    } catch (err: any) {
      toast.error(err?.message || "Could not cancel payment");
    } finally {
      setCancelling(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-surface border border-line shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-surface border-b border-line px-6 py-4 flex items-center justify-between z-10">
          <h2 className="font-bold text-lg">
            {step === "browse"
              ? "Join Community"
              : step === "payment"
                ? "Confirm Subscription"
                : step === "processing"
                  ? "Processing..."
                  : step === "success"
                    ? "Welcome!"
                    : "Error"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-sunken rounded-control transition"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          {step === "browse" && (
            <>
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader className="animate-spin text-brand-strong" size={32} />
                </div>
              ) : tiers.length === 0 ? (
                <div className="text-center py-12">
                  <Crown size={40} className="mx-auto text-muted-fg mb-3" />
                  <p className="text-sm text-muted-fg">
                    No membership tiers available yet
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-fg mb-4">
                    {activeTierIds.size > 0
                      ? `You are already a member of ${creatorName}'s community.`
                      : `Support ${creatorName} by choosing a membership tier`}
                  </p>
                  {tiers.map((tier) => {
                    const isSubscribed = activeTierIds.has(tier.id);
                    const content = (
                      <>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-bold">{tier.name}</h3>
                          {isSubscribed ? (
                            <span className="text-xs font-bold text-brand-strong">
                              Explore Community →
                            </span>
                          ) : (
                            <ChevronRight
                              size={18}
                              className="text-muted-fg group-hover:text-brand-strong transition"
                            />
                          )}
                        </div>
                        <p className="text-2xl font-bold text-brand-strong mb-2">
                          {tier.currency ? formatCurrency(tierAmount(tier), tier.currency as any) : tierAmount(tier)}
                          <span className="text-xs font-normal text-muted-fg ml-1">
                            /{tier.interval === "yearly" ? "year" : "month"}
                          </span>
                        </p>
                        {tier.description && (
                          <p className="text-xs text-muted-fg mb-3">
                            {tier.description}
                          </p>
                        )}
                        {tier.benefits && tier.benefits.length > 0 && (
                          <ul className="space-y-1">
                            {tier.benefits.map((b, i) => (
                              <li
                                key={i}
                                className="text-xs text-muted-fg flex items-center gap-2"
                              >
                                <Check size={12} className="text-success shrink-0" />
                                {b}
                              </li>
                            ))}
                          </ul>
                        )}
                      </>
                    );

                    return isSubscribed ? (
                      <Link
                        key={tier.id}
                        href={`/${creatorHandle}/community/chat/${tier.id}`}
                        onClick={onClose}
                        className="block w-full text-left bg-surface-sunken border border-brand-strong p-5 hover:bg-brand-soft/30 transition group"
                      >
                        {content}
                      </Link>
                    ) : (
                      <button
                        key={tier.id}
                        onClick={() => {
                          setSelectedTier(tier);
                          setStep("payment");
                        }}
                        className="w-full text-left bg-surface-sunken border border-line p-5 hover:border-brand-strong transition group"
                      >
                        {content}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {step === "payment" && selectedTier && (
            <div className="space-y-6">
              <div className="bg-surface-sunken rounded-control p-4">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-xs text-muted-fg">Selected Plan</p>
                  {tierCurrency && (
                    <span className="text-xs font-semibold text-muted-fg">
                      Charging in {tierCurrency}
                    </span>
                  )}
                </div>
                <p className="font-bold">{selectedTier.name}</p>
                  <p className="text-lg font-bold text-brand-strong">
                    {tierCurrency ? formatCurrency(tierAmount(selectedTier), tierCurrency as any) : tierAmount(selectedTier)}
                    <span className="text-xs font-normal text-muted-fg ml-1">
                      /{selectedTier.interval === "yearly" ? "year" : "month"}
                    </span>
                  </p>
              </div>

              <div>
                <p className="text-xs font-bold text-muted-fg mb-3">
                  Payment Method
                </p>
                {!momoSupported ? (
                  <p className="text-sm text-muted-fg">
                    Mobile money is not available for {tierCurrency || "this currency"}. Card payment is required.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setPaymentMethod("momo")}
                      className={`p-4 border rounded-control text-center transition ${
                        paymentMethod === "momo"
                          ? "border-brand-strong bg-brand-soft"
                          : "border-line hover:border-brand-strong"
                      }`}
                    >
                      <Smartphone
                        size={24}
                        className={`mx-auto mb-2 ${
                          paymentMethod === "momo"
                            ? "text-brand-strong"
                            : "text-muted-fg"
                        }`}
                      />
                      <span
                        className={`text-xs font-bold ${
                          paymentMethod === "momo"
                            ? "text-brand-strong"
                            : "text-muted-fg"
                        }`}
                      >
                        Mobile Money
                      </span>
                    </button>
                    <button
                      onClick={() => setPaymentMethod("card")}
                      className={`p-4 border rounded-control text-center transition ${
                        paymentMethod === "card"
                          ? "border-brand-strong bg-brand-soft"
                          : "border-line hover:border-brand-strong"
                      }`}
                    >
                      <CreditCard
                        size={24}
                        className={`mx-auto mb-2 ${
                          paymentMethod === "card"
                            ? "text-brand-strong"
                            : "text-muted-fg"
                        }`}
                      />
                      <span
                        className={`text-xs font-bold ${
                          paymentMethod === "card"
                            ? "text-brand-strong"
                            : "text-muted-fg"
                        }`}
                      >
                        Bank Card
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {momoSupported && paymentMethod === "momo" && (
                <div>
                  <label className="text-xs font-bold text-muted-fg mb-1 block">
                    Phone Number
                  </label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="07XX XXXXXX"
                    className="w-full px-3 py-2 bg-surface-sunken border border-line rounded-control text-sm"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setStep("browse")}
                  className="w-full py-3 border border-line bg-surface text-sm font-bold text-fg rounded-control hover:bg-surface-sunken transition whitespace-nowrap"
                >
                  Back
                </button>
                <button
                  onClick={handleSubscribe}
                  disabled={!tierCurrency || (momoSupported && !paymentMethod) || (paymentMethod === "momo" && !phone.trim())}
                  className="w-full py-3 bg-brand-strong text-on-brand text-sm font-bold rounded-control hover:bg-brand-strong transition disabled:opacity-50 whitespace-nowrap"
                >
                  Pay {tierCurrency ? formatCurrency(tierAmount(selectedTier), tierCurrency as any) : ""}
                </button>
              </div>
            </div>
          )}

          {step === "processing" && (
            <div className="text-center py-10 space-y-4">
              <Loader className="animate-spin mx-auto text-brand-strong" size={40} />
              <div>
                <p className="font-bold mb-1">Processing Payment</p>
                {tierCurrency && selectedTier && (
                  <p className="text-xs font-semibold text-brand-strong mb-1">
                    Charging in {tierCurrency} ({formatCurrency(tierAmount(selectedTier), tierCurrency as any)})
                  </p>
                )}
                <p className="text-xs text-muted-fg">
                  {(momoSupported ? paymentMethod : "card") === "momo"
                    ? "Check your phone and enter your PIN to confirm"
                    : "Complete payment in the opened window"}
                </p>
              </div>
              {activeRef && (
                <button
                  onClick={handleCancelPayment}
                  disabled={cancelling}
                  className="px-4 py-2 border border-line text-xs font-semibold text-muted-fg rounded-control hover:text-danger hover:border-danger transition disabled:opacity-50"
                >
                  {cancelling ? "Cancelling..." : "Cancel payment"}
                </button>
              )}
            </div>
          )}

          {step === "success" && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-success-bg rounded-full flex items-center justify-center mx-auto mb-4">
                <Check size={32} className="text-success" />
              </div>
              <h3 className="font-bold text-lg mb-2">Welcome to the Community!</h3>
              <p className="text-sm text-muted-fg mb-6">
                You are now a member of {creatorName}&apos;s {selectedTier?.name} tier
              </p>
              <button
                onClick={onClose}
                className="px-6 py-3 bg-brand-strong text-on-brand text-sm font-bold rounded-control hover:bg-brand-strong transition block mx-auto"
              >
                Done
              </button>
              <Link
                href="/community/manage"
                onClick={onClose}
                className="block mt-4 text-xs text-muted-fg hover:text-brand-strong transition"
              >
                Manage my subscription
              </Link>
            </div>
          )}

          {step === "error" && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-danger-bg rounded-full flex items-center justify-center mx-auto mb-4">
                <X size={32} className="text-danger" />
              </div>
              <h3 className="font-bold text-lg mb-2">Payment Failed</h3>
              <p className="text-sm text-muted-fg mb-6">{errorMessage}</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setStep("payment")}
                  className="px-6 py-3 bg-brand-strong text-on-brand text-sm font-bold rounded-control hover:bg-brand-strong transition"
                >
                  Try Again
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-3 bg-surface-sunken text-sm font-bold rounded-control hover:bg-border transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
