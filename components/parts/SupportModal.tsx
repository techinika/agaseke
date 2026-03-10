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
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

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

  const unsubscribeRef = useRef<(() => void) | null>(null);
  const popupRef = useRef<Window | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderTrackingId = params.get("OrderTrackingId");
    const merchantRef = params.get("OrderMerchantReference");

    if (orderTrackingId && merchantRef && merchantRef.includes("AGS-CARD")) {
      setStep("processing");
      window.history.replaceState({}, document.title, window.location.pathname);

      listenToTransaction(merchantRef);
    }
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
      const response = await fetch("/api/support/with-momo/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          phone: phone,
          creatorId: creatorId,
          creatorUid: uid,
          message: message ?? "",
          referralUid: referralUid,
          referralId: referralId,
          supporterId: currentUser?.uid || "anonymous",
          includeReferral: includeReferral,
        }),
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
    onClose();
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
          sendSupportEmail(Number(txData.amount * 0.9)); // Simplified share
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
    try {
      const res = await fetch("/api/support/with-card/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
          callback_url: `${window.location.origin}/api/support/with-card/close-popup`,
        }),
      });

      const data = await res.json();

      if (data.redirect_url) {
        setStep("processing");

        listenToTransaction(data.merchant_reference);

        popupRef.current = window.open(data.redirect_url, "_blank");

        if (!popupRef.current) {
          toast.error("Popup blocked! Please allow popups for this site.");
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-6">
      <div className="bg-white w-full max-w-lg rounded-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="p-8 pb-0 flex justify-between items-center">
          <h3 className="text-3xl font-bold tracking-tight">
            Send gift to {creatorName.split(" ")[0]}
          </h3>
          <button
            onClick={handleClose}
            className="p-3 bg-slate-50 rounded-full text-slate-400 hover:text-slate-900 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-10">
          {step === "input" && (
            <div className="space-y-8">
              <div className="text-center">
                <p className="text-slate-500 text-sm font-medium mb-4">
                  How much would you like to gift {creatorName.split(" ")[0]}?
                </p>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="1000"
                    className="w-full text-center text-6xl font-bold text-slate-900 outline-none placeholder:text-slate-100"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <span className="block text-[10px] font-bold text-slate-300 mt-2 uppercase tracking-[0.3em]">
                    Rwandan Francs (RWF)
                  </span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <button
                  onClick={() => setPaymentMethod("momo")}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    paymentMethod === "momo"
                      ? "border-orange-500 bg-orange-50"
                      : "border-slate-100 hover:border-slate-200"
                  }`}
                >
                  <Smartphone
                    size={24}
                    className={
                      paymentMethod === "momo"
                        ? "text-orange-600"
                        : "text-slate-400"
                    }
                  />
                  <span
                    className={`text-[10px] font-bold uppercase tracking-widest ${paymentMethod === "momo" ? "text-orange-900" : "text-slate-500"}`}
                  >
                    MoMo
                  </span>
                </button>

                <button
                  onClick={() => setPaymentMethod("card")}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    paymentMethod === "card"
                      ? "border-orange-500 bg-orange-50"
                      : "border-slate-100 hover:border-slate-200"
                  }`}
                >
                  <div className="flex gap-1">
                    <ShieldCheck
                      size={24}
                      className={
                        paymentMethod === "card"
                          ? "text-orange-600"
                          : "text-slate-400"
                      }
                    />
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-widest ${paymentMethod === "card" ? "text-orange-900" : "text-slate-500"}`}
                  >
                    Bank Cards
                  </span>
                </button>
              </div>

              <div className="space-y-4">
                {paymentMethod === "momo" && (
                  <>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      MoMo Phone Number
                    </label>
                    <div className="relative">
                      <Smartphone
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                        size={18}
                      />
                      <input
                        type="tel"
                        placeholder="078 000 0000"
                        className="w-full bg-slate-50 border-2 border-slate-50 p-4 pl-12 rounded-lg font-bold focus:border-orange-500 outline-none transition-all"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                  </>
                )}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    Heartfelt Message{" "}
                    <Heart size={10} className="text-pink-500" />
                  </label>
                  <textarea
                    placeholder="Write a nice note to the creator..."
                    className="w-full mt-1 bg-slate-50 border-2 border-slate-50 p-4 rounded-lg font-medium text-sm focus:border-orange-500 outline-none transition-all resize-none h-24"
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
                className="w-full bg-orange-600 text-white py-6 rounded-lg font-bold text-xl shadow-xl shadow-orange-100 hover:bg-orange-700 transition-all flex items-center justify-center gap-4 active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader className="w-6 h-6 rounded-full animate-spin" />
                ) : (
                  <>
                    {paymentMethod === "momo"
                      ? "Pay with MoMo"
                      : "Pay with Card"}
                  </>
                )}
              </button>
            </div>
          )}

          {step === "processing" && (
            <div className="py-12 text-center space-y-6">
              <div className="relative mx-auto w-20 h-20">
                <div className="absolute inset-0 border-4 border-slate-100 rounded-full" />
                <div className="absolute inset-0 border-4 border-t-orange-600 rounded-full animate-spin" />
              </div>
              <h4 className="text-xl font-bold">Verifying Payment...</h4>
              <p className="text-slate-500 font-medium leading-relaxed">
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
            <div className="py-12 text-center space-y-6 animate-in fade-in zoom-in">
              <div className="w-24 h-24 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldCheck size={48} />
              </div>
              <h4 className="text-3xl font-bold text-slate-900">
                Payment Verified!
              </h4>
              <p className="text-slate-500 font-medium leading-relaxed">
                Your gift of <b>{amount} RWF</b> was delivered.
              </p>
              <button
                onClick={handleClose}
                className="w-full bg-slate-900 text-white py-4 rounded-lg font-bold hover:bg-orange-600 transition-colors"
              >
                Back to Profile
              </button>
            </div>
          )}

          {step === "error" && (
            <div className="py-12 text-center space-y-6 animate-in fade-in zoom-in">
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <X size={40} />
              </div>
              <h4 className="text-2xl font-bold text-slate-900">
                Payment Failed
              </h4>
              <p className="text-slate-500 font-medium">{errorMessage}</p>
              <button
                onClick={() => setStep("input")}
                className="w-full bg-slate-100 text-slate-900 py-4 rounded-lg font-bold hover:bg-slate-200 transition-colors"
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
