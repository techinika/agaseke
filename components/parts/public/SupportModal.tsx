/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useAuth } from "@/auth/AuthContext";
import { db } from "@/db/firebase";
import {
  onSnapshot,
  collection,
  query,
  where,
  doc,
  getDoc,
} from "firebase/firestore";
import { Heart, Loader, ShieldCheck, Smartphone, X } from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { getCurrencySymbol } from "@/types/currency";
import { apiPost } from "@/lib/apiClient";

export function SupportModal({
  isOpen,
  onClose,
  creatorName,
  creatorId,
  uid,
  includeReferral,
  referralUid = "",
  referralId = "",
}: any) {
  const { user: currentUser } = useAuth();
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState("input");
  const [errorMessage, setErrorMessage] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("momo");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState("");
  const [isClosing, setIsClosing] = useState(false);
  const [creatorCurrency, setCreatorCurrency] = useState("RWF");

  useEffect(() => {
    if (!creatorId) return;
    const fetchCreatorCurrency = async () => {
      try {
        const creatorRef = doc(db, "creators", creatorId);
        const creatorSnap = await getDoc(creatorRef);
        if (creatorSnap.exists()) {
          const data = creatorSnap.data();
          setCreatorCurrency(data.currency || "RWF");
        }
      } catch { /* silently fail */ }
    };
    fetchCreatorCurrency();
  }, [creatorId]);

  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderTrackingId = params.get("OrderTrackingId");
    const merchantRef = params.get("OrderMerchantReference");

    if (orderTrackingId && merchantRef && merchantRef.includes("AGS-CARD")) {
      setStep("processing");
      window.history.replaceState({}, document.title, window.location.pathname);

      listenToTransaction(merchantRef);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) unsubscribeRef.current();
    };
  }, []);

  if (!isOpen) return null;

  const sendSupportEmail = async (txAmount: number) => {
    try {
      const creatorRef = doc(db, "profiles", uid);
      const creatorSnap = await getDoc(creatorRef);

      if (creatorSnap.exists()) {
        const profileData = creatorSnap.data();

        await fetch("/api/comms/email/support/received", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            creatorEmail: profileData.email || "",
            creatorName: creatorName,
            supporterName: currentUser?.displayName || "A generous supporter",
            amount: txAmount,
            message: message.trim() || null,
          }),
        });
      }
    } catch (error) {
      console.error("Failed to trigger support email:", error);
    }
  };

  const handleSupport = async () => {
    setStep("processing");
    setErrorMessage("");

    try {
      const response = await apiPost("/api/support/with-momo/pay", {
        amount: Number(amount),
        phone: phone,
        creatorId: creatorId,
        creatorUid: uid,
        message: message ?? "",
        referralUid: referralUid,
        referralId: referralId,
        supporterId: currentUser?.uid || "anonymous",
        includeReferral: includeReferral,
        currency: creatorCurrency,
      });

      const data = await response.json();

      if (!response.ok || !data.ref) {
        throw new Error(data.error || "Failed to initiate payment");
      }

      const q = query(
        collection(db, "transactions"),
        where("ref", "==", data.ref),
      );

      unsubscribeRef.current = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const txData = snapshot.docs[0].data();

          if (txData.status === "successful") {
            if (unsubscribeRef.current) unsubscribeRef.current();
            setStep("success");
            sendSupportEmail(
              Number(
                txData?.amount * Number(process.env.NEXT_PUBLIC_CREATOR_SHARE),
              ),
            );
            toast.success("Payment received!");
          } else if (txData.status === "failed") {
            if (unsubscribeRef.current) unsubscribeRef.current();
            setStep("error");
            setErrorMessage("The transaction was declined.");
          }
        }
      });

      setTimeout(() => {
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
          setStep("error");
          setErrorMessage("Payment timed out. Please check your phone.");
        }
      }, 120000);
    } catch (error: any) {
      setStep("error");
      setErrorMessage(error.message || "An unexpected error occurred.");
      toast.error(error.message || "An unexpected error occurred.");
    }
  };

  const handleClose = () => {
    if (unsubscribeRef.current) unsubscribeRef.current();
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 250);
  };

  const listenToTransaction = (reference: string) => {
    const q = query(
      collection(db, "transactions"),
      where("ref", "==", reference),
    );

    unsubscribeRef.current = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const txData = snapshot.docs[0].data();
        if (txData.status === "success" || txData.status === "successful") {
          if (unsubscribeRef.current) unsubscribeRef.current();
          setStep("success");
          sendSupportEmail(Number(txData.amount * 0.9));
          toast.success("Card payment verified!");
        } else if (txData.status === "failed") {
          if (unsubscribeRef.current) unsubscribeRef.current();
          setStep("error");
          setErrorMessage("The card transaction was declined.");
        }
      }
    });
  };

  const handlePesapalSupport = async () => {
    if (!amount || parseInt(amount) < 100) {
      return toast.error("Minimum gift amount is 100 RWF");
    }

    setIsSubmitting(true);
    setStep("processing");

    try {
      const res = await apiPost("/api/support/with-card/pay", {
        amount: Number(amount),
        email: currentUser?.email || "supporter@agaseke.me",
        firstName: currentUser?.displayName?.split(" ")[0] || "Supporter",
        lastName: currentUser?.displayName?.split(" ")[1] || "Agaseke",
        creatorId,
        creatorUid: uid,
        supporterId: currentUser?.uid || "anonymous",
        message: message.trim() || "",
        includeReferral,
        referralUid,
        referralId,
        callback_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment`,
        currency: creatorCurrency,
      });

      const data = await res.json();

      if (data.redirect_url) {
        setRedirectUrl(data.redirect_url);
        const newWindow = window.open(data.redirect_url, "_blank");

        if (
          !newWindow ||
          newWindow.closed ||
          typeof newWindow.closed === "undefined"
        ) {
          setPopupBlocked(true);
          setStep("error");
          setErrorMessage(
            "Your browser blocked the payment window. Please click the button below to continue.",
          );
        } else {
          listenToTransaction(data.merchant_reference);
        }
      } else {
        throw new Error(data.error || "Could not generate payment link.");
      }
    } catch (error: any) {
      setStep("error");
      setErrorMessage(error.message);
      toast.error(error.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-[100] flex items-end sm:items-center justify-center ${isClosing ? "animate-out fade-out duration-200" : "animate-in fade-in duration-200"} bg-foreground/60 backdrop-blur-md`}>
      <div className={`bg-card w-full max-w-lg rounded-t-2xl sm:rounded-lg shadow-2xl max-h-[90vh] overflow-y-auto ${isClosing ? "animate-out slide-out-to-bottom-full sm:zoom-out-95 duration-200" : "animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-200"}`}>
        <div className="sticky top-0 bg-card z-10 p-4 sm:p-6 pb-0 flex justify-between items-center">
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight">
            Send gift to {creatorName.split(" ")[0]}
          </h3>
          <button
            onClick={handleClose}
            className="p-2 sm:p-3 bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          {step === "input" && (
            <div className="space-y-5 sm:space-y-8">
              <div className="text-center">
                <p className="text-muted-foreground text-xs sm:text-sm font-medium mb-3 sm:mb-4">
                  How much would you like to gift {creatorName.split(" ")[0]}?
                </p>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="1000"
                    className="w-full text-center text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground outline-none placeholder:text-muted-foreground"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <span className="block text-[10px] font-bold text-muted-foreground mt-2 uppercase tracking-[0.3em]">
                    {creatorCurrency} ({getCurrencySymbol(creatorCurrency)})
                  </span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <button
              onClick={() => setPaymentMethod("momo")}
              className={`flex flex-col items-center gap-1.5 sm:gap-2 p-3 sm:p-4 rounded-xl border-2 transition-all ${
                paymentMethod === "momo"
                  ? "border-orange-500 bg-orange-50"
                  : "border-border hover:border-border"
              }`}
            >
              <Smartphone
                size={20}
                className={
                  paymentMethod === "momo"
                    ? "text-orange-600"
                    : "text-muted-foreground"
                }
              />
              <span
                className={`text-[10px] font-bold uppercase tracking-widest ${paymentMethod === "momo" ? "text-orange-900" : "text-muted-foreground"}`}
              >
                MoMo
              </span>
            </button>

            <button
              onClick={() => setPaymentMethod("card")}
              className={`flex flex-col items-center gap-1.5 sm:gap-2 p-3 sm:p-4 rounded-xl border-2 transition-all ${
                paymentMethod === "card"
                  ? "border-orange-500 bg-orange-50"
                  : "border-border hover:border-border"
              }`}
            >
              <div className="flex gap-1">
                <ShieldCheck
                  size={20}
                  className={
                    paymentMethod === "card"
                      ? "text-orange-600"
                      : "text-muted-foreground"
                  }
                />
              </div>
              <span
                className={`text-[10px] font-bold uppercase tracking-widest ${paymentMethod === "card" ? "text-orange-900" : "text-muted-foreground"}`}
              >
                Bank Cards
              </span>
            </button>
          </div>

          <div className="space-y-3 sm:space-y-4">
            {paymentMethod === "momo" && (
              <>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  MoMo Phone Number
                </label>
                <div className="relative">
                  <Smartphone
                    className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                    size={16}
                  />
                  <input
                    type="tel"
                    placeholder="078 000 0000"
                    className="w-full bg-muted border-2 border-border p-3 sm:p-4 pl-10 sm:pl-12 rounded-lg font-bold focus:border-orange-500 outline-none transition-all text-sm sm:text-base"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </>
            )}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                Heartfelt Message{" "}
                <Heart size={10} className="text-pink-500" />
              </label>
              <textarea
                placeholder="Write a nice note to the creator..."
                className="w-full mt-1 bg-muted border-2 border-border p-3 sm:p-4 rounded-lg font-medium text-sm focus:border-orange-500 outline-none transition-all resize-none h-20 sm:h-24"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
          </div>

          <button
            onClick={
              paymentMethod === "momo"
                ? handleSupport
                : handlePesapalSupport
            }
            disabled={
              !amount ||
              parseInt(amount) < 100 ||
              (paymentMethod === "momo" && !phone) ||
              isSubmitting
            }
            className="w-full bg-orange-600 text-white py-4 sm:py-6 rounded-lg font-bold text-base sm:text-xl shadow-xl shadow-orange-100 hover:bg-orange-700 transition-all flex items-center justify-center gap-4 active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader className="w-5 h-5 sm:w-6 sm:h-6 rounded-full animate-spin" />
            ) : (
              <>
                {paymentMethod === "momo"
                  ? "Gift with MoMo"
                  : "Gift with Card"}
              </>
            )}
          </button>
            </div>
          )}

          {step === "processing" && (
            <div className="py-8 sm:py-12 text-center space-y-4 sm:space-y-6">
              <div className="relative mx-auto w-16 h-16 sm:w-20 sm:h-20">
                <div className="absolute inset-0 border-4 border-border rounded-full" />
                <div className="absolute inset-0 border-4 border-t-orange-600 rounded-full animate-spin" />
              </div>
              <h4 className="text-lg sm:text-xl font-bold">Verifying Payment...</h4>
              <p className="text-muted-foreground font-medium leading-relaxed text-sm sm:text-base">
                {paymentMethod === "momo" ? (
                  <>
                    We sent a MoMo prompt to <b>{phone}</b>.<br />
                    Enter your PIN on your phone to finish.
                  </>
                ) : (
                  <>
                    We are confirming your transaction through Pesapal. This
                    usually takes a few seconds.
                  </>
                )}
              </p>
            </div>
          )}

          {step === "success" && (
            <div className="py-8 sm:py-12 text-center space-y-4 sm:space-y-6 animate-in fade-in zoom-in">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <ShieldCheck size={40} />
              </div>
              <h4 className="text-2xl sm:text-3xl font-bold text-foreground">
                Payment Verified!
              </h4>
              <p className="text-muted-foreground font-medium leading-relaxed text-sm sm:text-base">
                  Your gift of <b>{amount} {creatorCurrency}</b> was delivered.
              </p>
              <button
                onClick={handleClose}
                className="w-full bg-foreground text-background py-3 sm:py-4 rounded-lg font-bold text-sm sm:text-base hover:bg-orange-600 transition-colors"
              >
                Back to Profile
              </button>
            </div>
          )}

          {step === "error" && (
            <div className="py-8 sm:py-12 text-center space-y-4 sm:space-y-6 animate-in fade-in zoom-in">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <X size={32} />
              </div>
              <h4 className="text-xl sm:text-2xl font-bold text-foreground">
                Payment Failed
              </h4>
              <p className="text-muted-foreground font-medium text-sm sm:text-base">{errorMessage}</p>
              {popupBlocked && (
                <Link
                  href={redirectUrl}
                  target="_blank"
                  className="w-full bg-orange-600 text-center text-white py-3 sm:py-4 rounded-lg font-bold text-sm sm:text-base block"
                >
                  Open Payment Window
                </Link>
              )}
              <button
                onClick={() => setStep("input")}
                className="w-full bg-muted text-foreground py-3 sm:py-4 rounded-lg font-bold text-sm sm:text-base hover:bg-muted transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
