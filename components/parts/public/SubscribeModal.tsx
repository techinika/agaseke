/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/db/firebase";
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
  type CommunityTier,
} from "@/lib/communityService";
import { PAYMENTS_WORKER_URL } from "@/lib/paymentsService";

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
  const { user, isLoggedIn } = useAuth();
  const [tiers, setTiers] = useState<CommunityTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState<CommunityTier | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"momo" | "card" | null>(null);
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"browse" | "payment" | "processing" | "success" | "error">("browse");
  const [errorMessage, setErrorMessage] = useState("");
  const processingRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen || !creatorHandle) return;
    setLoading(true);
    getCommunityTiers(creatorHandle)
      .then((data) => {
        setTiers(data.tiers.filter((t) => t.isActive));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [isOpen, creatorHandle]);

  useEffect(() => {
    if (!isOpen) {
      setStep("browse");
      setSelectedTier(null);
      setPaymentMethod(null);
      setPhone("");
      setErrorMessage("");
      processingRef.current = null;
    }
  }, [isOpen]);

  const handleSubscribe = async () => {
    if (!selectedTier || !paymentMethod || !user) return;
    if (paymentMethod === "momo" && !phone.trim()) {
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
        amount: selectedTier.price,
        interval: selectedTier.interval,
        paymentMethod,
        supporterId: user.uid,
      };

      if (paymentMethod === "momo") {
        subData.phone = phone;
      } else {
        subData.email = user.email || "";
        subData.firstName = user.displayName || "Supporter";
        subData.lastName = "";
      }

      const result = await initiateSubscription(subData);

      const txRef = result.paymentRef;

      const unsub = onSnapshot(
        query(
          collection(db, "transactions"),
          where("ref", "==", txRef)
        ),
        (snap) => {
          if (processingRef.current !== subId) {
            unsub();
            return;
          }
          snap.docChanges().forEach((change) => {
            if (change.doc.data().status === "successful") {
              setStep("success");
              unsub();
            } else if (change.doc.data().status === "failed") {
              setErrorMessage("Payment failed. Please try again.");
              setStep("error");
              unsub();
            }
          });
        }
      );

      setTimeout(() => {
        unsub();
        if (processingRef.current === subId && step === "processing") {
          setErrorMessage("Payment confirmation timed out. Check your transactions.");
          setStep("error");
        }
      }, 120000);

      if (paymentMethod === "card" && result.paymentUrl) {
        window.open(result.paymentUrl, "_blank");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Something went wrong");
      setStep("error");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-card border border-border shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
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
            className="p-2 hover:bg-muted rounded-lg transition"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          {step === "browse" && (
            <>
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader className="animate-spin text-orange-500" size={32} />
                </div>
              ) : tiers.length === 0 ? (
                <div className="text-center py-12">
                  <Crown size={40} className="mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No membership tiers available yet
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Support {creatorName} by choosing a membership tier
                  </p>
                  {tiers.map((tier) => (
                    <button
                      key={tier.id}
                      onClick={() => {
                        setSelectedTier(tier);
                        setStep("payment");
                      }}
                      className="w-full text-left bg-muted border border-border p-5 hover:border-orange-300 transition group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold">{tier.name}</h3>
                        <ChevronRight
                          size={18}
                          className="text-muted-foreground group-hover:text-orange-500 transition"
                        />
                      </div>
                      <p className="text-2xl font-bold text-orange-600 mb-2">
                        {tier.price.toLocaleString()} RWF
                        <span className="text-xs font-normal text-muted-foreground ml-1">
                          /{tier.interval === "yearly" ? "year" : "month"}
                        </span>
                      </p>
                      {tier.description && (
                        <p className="text-xs text-muted-foreground mb-3">
                          {tier.description}
                        </p>
                      )}
                      {tier.benefits && tier.benefits.length > 0 && (
                        <ul className="space-y-1">
                          {tier.benefits.map((b, i) => (
                            <li
                              key={i}
                              className="text-xs text-muted-foreground flex items-center gap-2"
                            >
                              <Check size={12} className="text-green-500 shrink-0" />
                              {b}
                            </li>
                          ))}
                        </ul>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {step === "payment" && selectedTier && (
            <div className="space-y-6">
              <div className="bg-muted rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">Selected Plan</p>
                <p className="font-bold">{selectedTier.name}</p>
                <p className="text-lg font-bold text-orange-600">
                  {selectedTier.price.toLocaleString()} RWF
                  <span className="text-xs font-normal text-muted-foreground ml-1">
                    /{selectedTier.interval === "yearly" ? "year" : "month"}
                  </span>
                </p>
              </div>

              <div>
                <p className="text-xs font-bold text-muted-foreground mb-3">
                  Payment Method
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPaymentMethod("momo")}
                    className={`p-4 border rounded-lg text-center transition ${
                      paymentMethod === "momo"
                        ? "border-orange-500 bg-orange-50"
                        : "border-border hover:border-orange-300"
                    }`}
                  >
                    <Smartphone
                      size={24}
                      className={`mx-auto mb-2 ${
                        paymentMethod === "momo"
                          ? "text-orange-600"
                          : "text-muted-foreground"
                      }`}
                    />
                    <span
                      className={`text-xs font-bold ${
                        paymentMethod === "momo"
                          ? "text-orange-700"
                          : "text-muted-foreground"
                      }`}
                    >
                      Mobile Money
                    </span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod("card")}
                    className={`p-4 border rounded-lg text-center transition ${
                      paymentMethod === "card"
                        ? "border-orange-500 bg-orange-50"
                        : "border-border hover:border-orange-300"
                    }`}
                  >
                    <CreditCard
                      size={24}
                      className={`mx-auto mb-2 ${
                        paymentMethod === "card"
                          ? "text-orange-600"
                          : "text-muted-foreground"
                      }`}
                    />
                    <span
                      className={`text-xs font-bold ${
                        paymentMethod === "card"
                          ? "text-orange-700"
                          : "text-muted-foreground"
                      }`}
                    >
                      Bank Card
                    </span>
                  </button>
                </div>
              </div>

              {paymentMethod === "momo" && (
                <div>
                  <label className="text-xs font-bold text-muted-foreground mb-1 block">
                    Phone Number
                  </label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="07XX XXXXXX"
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm"
                  />
                </div>
              )}

              <button
                onClick={handleSubscribe}
                disabled={!paymentMethod}
                className="w-full py-3 bg-orange-600 text-white text-sm font-bold rounded-lg hover:bg-orange-700 transition disabled:opacity-50"
              >
                Subscribe Now
              </button>

              <button
                onClick={() => setStep("browse")}
                className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition"
              >
                Back to tiers
              </button>
            </div>
          )}

          {step === "processing" && (
            <div className="text-center py-12">
              <Loader className="animate-spin mx-auto text-orange-500 mb-4" size={40} />
              <p className="font-bold mb-2">Processing Payment</p>
              <p className="text-xs text-muted-foreground">
                {paymentMethod === "momo"
                  ? "Check your phone and enter your PIN to confirm"
                  : "Complete payment in the opened window"}
              </p>
            </div>
          )}

          {step === "success" && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check size={32} className="text-green-600" />
              </div>
              <h3 className="font-bold text-lg mb-2">Welcome to the Community!</h3>
              <p className="text-sm text-muted-foreground mb-6">
                You are now a member of {creatorName}&apos;s {selectedTier?.name} tier
              </p>
              <button
                onClick={onClose}
                className="px-6 py-3 bg-orange-600 text-white text-sm font-bold rounded-lg hover:bg-orange-700 transition"
              >
                Done
              </button>
            </div>
          )}

          {step === "error" && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <X size={32} className="text-red-600" />
              </div>
              <h3 className="font-bold text-lg mb-2">Payment Failed</h3>
              <p className="text-sm text-muted-foreground mb-6">{errorMessage}</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setStep("payment")}
                  className="px-6 py-3 bg-orange-600 text-white text-sm font-bold rounded-lg hover:bg-orange-700 transition"
                >
                  Try Again
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-3 bg-muted text-sm font-bold rounded-lg hover:bg-border transition"
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
