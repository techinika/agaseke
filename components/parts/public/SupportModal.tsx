/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useAuth } from "@/auth/AuthContext";
import { sendCommsEmail } from "@/lib/commsService";
import { doc, getDoc, getDocs, collection } from "firebase/firestore";
import { db } from "@/db/firebase";
import { subscribeToTransactionByRef } from "@/lib/transactions";
import { Heart, Loader, ShieldCheck, Smartphone, X } from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { getCurrencySymbol } from "@/types/currency";
import {
  initiateMomoPayment,
  initiateCardPayment,
  getPaymentMethods,
  type PaymentMethodOption,
} from "@/lib/paymentsService";

export function SupportModal({
  isOpen,
  onClose,
  creatorName,
  creatorId,
  uid,
  defaultMessage = "",
}: any) {
  const { user: currentUser } = useAuth();
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState(defaultMessage);
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState("input");
  const [errorMessage, setErrorMessage] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"momo" | "card" | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState("");
  const [isClosing, setIsClosing] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState("");
  const [minByCurrency, setMinByCurrency] = useState<Record<string, number>>({});
  const [availableCurrencies, setAvailableCurrencies] = useState<string[]>([]);
  const [methods, setMethods] = useState<PaymentMethodOption[]>([]);
  const [loadingMethods, setLoadingMethods] = useState(false);

  const CREATOR_SHARE = Number(process.env.NEXT_PUBLIC_CREATOR_SHARE) || 0.9;

  const sendSupportEmail = async (txAmount: number) => {
    try {
      const creatorRef = doc(db, "profiles", uid);
      const creatorSnap = await getDoc(creatorRef);
      if (creatorSnap.exists()) {
        const profileData = creatorSnap.data();
        await sendCommsEmail("support_received", {
          creatorEmail: profileData.email || "",
          creatorName,
          supporterName: currentUser?.displayName || "A generous supporter",
          amount: txAmount,
          message: message.trim() || null,
        });
      }
    } catch (error) {
      console.error("Failed to trigger support email:", error);
    }
  };

  useEffect(() => {
    if (!creatorId) return;
    const fetchCreatorCurrency = async () => {
      try {
        const creatorRef = doc(db, "creators", creatorId);
        const creatorSnap = await getDoc(creatorRef);
        if (creatorSnap.exists()) {
          const data = creatorSnap.data();
          const currency = data.currency ? String(data.currency).toUpperCase() : "";
          if (currency) setSelectedCurrency(currency);

          const currenciesSnap = await getDocs(collection(db, "currencies"));
          const enabled: string[] = [];
          const mins: Record<string, number> = {};
          currenciesSnap.docs.forEach((d) => {
            const c = d.data() as any;
            const code = String(c.code || d.id || "").toUpperCase();
            if (!code) return;
            if (c.enabled === false) return;
            enabled.push(code);
            if (c.minSupportAmount != null) mins[code] = Number(c.minSupportAmount);
          });
          if (currency && !enabled.includes(currency)) enabled.unshift(currency);
          setAvailableCurrencies(Array.from(new Set(enabled)).sort());
          setMinByCurrency(mins);
        }
      } catch {
        /* silently fail */
      }
    };
    fetchCreatorCurrency();
  }, [creatorId]);

  useEffect(() => {
    let cancelled = false;
    if (!selectedCurrency) return;
    const loadMethods = () => {
      if (cancelled) return;
      setLoadingMethods(true);
      getPaymentMethods(selectedCurrency)
        .then((m) => {
          if (cancelled) return;
          setMethods(m);
          setPaymentMethod((prev) =>
            m.some((x) => x.method === prev) ? prev : (m[0]?.method ?? ""),
          );
        })
        .catch(() => {
          if (!cancelled) setMethods([]);
        })
        .finally(() => {
          if (!cancelled) setLoadingMethods(false);
        });
    };
    queueMicrotask(loadMethods);
    return () => {
      cancelled = true;
    };
  }, [selectedCurrency]);

  const unsubscribeRef = useRef<(() => void) | null>(null);
  const supportTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const listenToTransaction = (reference: string) => {
    unsubscribeRef.current = subscribeToTransactionByRef(reference, (txData) => {
      if (!txData) return;
      if (txData.status === "success" || txData.status === "successful") {
        if (unsubscribeRef.current) unsubscribeRef.current();
        setStep("success");
        sendSupportEmail(Number(txData.amount) * CREATOR_SHARE);
        toast.success("Payment verified!");
      } else if (txData.status === "failed") {
        if (unsubscribeRef.current) unsubscribeRef.current();
        setStep("error");
        setErrorMessage("The transaction was declined.");
      }
    });
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderTrackingId = params.get("OrderTrackingId");
    const merchantRef = params.get("OrderMerchantReference");
    if (orderTrackingId && merchantRef && merchantRef.includes("AGS-CARD")) {
      queueMicrotask(() => {
        setStep("processing");
        window.history.replaceState({}, document.title, window.location.pathname);
        listenToTransaction(merchantRef);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) unsubscribeRef.current();
      if (supportTimeoutRef.current) clearTimeout(supportTimeoutRef.current);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  if (!isOpen) return null;

  const minSupportAmount = minByCurrency[selectedCurrency] ?? 1;
  const numericAmount = Number(amount);
  const amountValid = Number.isFinite(numericAmount) && numericAmount >= minSupportAmount;
  const hasMomo = methods.some((m) => m.method === "momo");
  const hasCard = methods.some((m) => m.method === "card");

  const handleSupport = async () => {
    if (!selectedCurrency || paymentMethod !== "momo") return;
    setStep("processing");
    setErrorMessage("");
    try {
      const data = await initiateMomoPayment({
        type: "support",
        creatorHandle: creatorId,
        amount: numericAmount,
        phone,
        message: message ?? "",
        currency: selectedCurrency,
        idempotencyKey: crypto.randomUUID(),
      });
      listenToTransaction(data.ref);
      supportTimeoutRef.current = setTimeout(() => {
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
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 250);
  };

  const handlePesapalSupport = async () => {
    if (!selectedCurrency || paymentMethod !== "card") return;
    if (!amountValid) {
      return toast.error(`Minimum support amount is ${minSupportAmount} ${selectedCurrency}`);
    }
    setIsSubmitting(true);
    setStep("processing");
    try {
      const data = await initiateCardPayment({
        type: "support",
        creatorHandle: creatorId,
        amount: numericAmount,
        email: currentUser?.email || "supporter@agaseke.me",
        firstName: currentUser?.displayName?.split(" ")[0] || "Supporter",
        lastName: currentUser?.displayName?.split(" ")[1] || "Agaseke",
        message: message.trim() || "",
        currency: selectedCurrency,
        idempotencyKey: crypto.randomUUID(),
      });
      setRedirectUrl(data.redirect_url);
      const newWindow = window.open(data.redirect_url, "_blank");
      if (!newWindow || newWindow.closed || typeof newWindow.closed === "undefined") {
        setPopupBlocked(true);
        setStep("error");
        setErrorMessage(
          "Your browser blocked the payment window. Please click the button below to continue.",
        );
      } else {
        listenToTransaction(data.merchant_reference);
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
      <div className={`bg-surface w-full max-w-lg rounded-t-2xl sm:rounded-control shadow-2xl max-h-[90vh] overflow-y-auto ${isClosing ? "animate-out slide-out-to-bottom-full sm:zoom-out-95 duration-200" : "animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-200"}`}>
        <div className="sticky top-0 bg-surface z-10 p-4 sm:p-6 pb-0 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight">
              Support {creatorName.split(" ")[0]}
            </h3>
            {availableCurrencies.length > 1 && (
              <select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className="text-xs font-bold bg-brand-soft text-brand-strong px-2 py-1 rounded-control border border-brand-strong outline-none"
              >
                {availableCurrencies.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}
          </div>
          <button onClick={handleClose} className="p-2 sm:p-3 bg-surface-sunken rounded-full text-muted-fg hover:text-fg transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          {step === "input" && (
            <div className="space-y-5 sm:space-y-8">
              <div className="text-center">
                <p className="text-muted-fg text-xs sm:text-sm font-medium mb-3 sm:mb-4">
                  How much would you like to support {creatorName.split(" ")[0]}?
                </p>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min={minSupportAmount}
                    placeholder={String(minSupportAmount)}
                    className="w-full text-center text-4xl sm:text-5xl lg:text-6xl font-bold text-fg outline-none placeholder:text-muted-fg"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <span className="block text-caption font-bold text-muted-fg mt-2 uppercase tracking-[0.3em]">
                    {selectedCurrency ? `${selectedCurrency} (${getCurrencySymbol(selectedCurrency as any)})` : "Select currency"}
                  </span>
                </div>
              </div>

              {loadingMethods ? (
                <div className="flex justify-center py-4"><Loader className="w-5 h-5 animate-spin text-brand-strong" /></div>
              ) : methods.length === 0 ? (
                <div className="rounded-control bg-surface-sunken p-4 text-center text-sm text-muted-fg">
                  No payment methods available for {selectedCurrency}.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-2">
                    {hasMomo && (
                      <button
                        onClick={() => setPaymentMethod("momo")}
                        className={`flex flex-col items-center gap-1.5 sm:gap-2 p-3 sm:p-4 rounded-control border-2 transition-all ${paymentMethod === "momo" ? "border-brand-strong bg-brand-soft" : "border-line hover:border-line"}`}
                      >
                        <Smartphone size={20} className={paymentMethod === "momo" ? "text-brand-strong" : "text-muted-fg"} />
                        <span className={`text-caption font-bold uppercase tracking-widest ${paymentMethod === "momo" ? "text-brand-strong" : "text-muted-fg"}`}>MoMo</span>
                      </button>
                    )}
                    {hasCard && (
                      <button
                        onClick={() => setPaymentMethod("card")}
                        className={`flex flex-col items-center gap-1.5 sm:gap-2 p-3 sm:p-4 rounded-control border-2 transition-all ${paymentMethod === "card" ? "border-brand-strong bg-brand-soft" : "border-line hover:border-line"}`}
                      >
                        <ShieldCheck size={20} className={paymentMethod === "card" ? "text-brand-strong" : "text-muted-fg"} />
                        <span className={`text-caption font-bold uppercase tracking-widest ${paymentMethod === "card" ? "text-brand-strong" : "text-muted-fg"}`}>Card</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-3 sm:space-y-4">
                    {paymentMethod === "momo" && (
                      <div>
                        <label className="text-caption font-bold uppercase tracking-widest text-muted-fg">MoMo Phone Number</label>
                        <div className="relative mt-1">
                          <Smartphone className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-muted-fg" size={16} />
                          <input
                            type="tel"
                            placeholder="078 000 0000"
                            className="w-full bg-surface-sunken border-2 border-line p-3 sm:p-4 pl-10 sm:pl-12 rounded-control font-bold focus:border-brand-strong outline-none transition-all text-sm sm:text-base"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="text-caption font-bold uppercase tracking-widest text-muted-fg flex items-center gap-2">
                        Heartfelt Message <Heart size={16} className="text-brand-strong" />
                      </label>
                      <textarea
                        placeholder="Write a nice note to the creator..."
                        className="w-full mt-1 bg-surface-sunken border-2 border-line p-3 sm:p-4 rounded-control font-medium text-sm focus:border-brand-strong outline-none transition-all resize-none h-20 sm:h-24"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                      />
                    </div>
                  </div>

                  <p className="text-caption text-muted-fg">
                    You pay {amountValid ? numericAmount : minSupportAmount} {selectedCurrency}. The creator receives the amount in {selectedCurrency} after platform fees.
                  </p>

                  <button
                    onClick={paymentMethod === "momo" ? handleSupport : handlePesapalSupport}
                    disabled={!selectedCurrency || !amountValid || !paymentMethod || (paymentMethod === "momo" && !phone) || isSubmitting || methods.length === 0}
                    className="w-full bg-brand-strong text-on-brand py-4 sm:py-6 rounded-control font-bold text-base sm:text-xl shadow-xl shadow-brand-strong hover:bg-brand-strong transition-all flex items-center justify-center gap-4 active:scale-95 disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader className="w-5 h-5 sm:w-6 sm:h-6 rounded-full animate-spin" /> : (
                      paymentMethod === "momo" ? "Support with MoMo" : "Support with Card"
                    )}
                  </button>
                </>
              )}
            </div>
          )}

          {step === "processing" && (
            <div className="py-8 sm:py-12 text-center space-y-4 sm:space-y-6">
              <div className="relative mx-auto w-16 h-16 sm:w-20 sm:h-20">
                <div className="absolute inset-0 border-4 border-line rounded-full" />
                <div className="absolute inset-0 border-4 border-t-orange-600 rounded-full animate-spin" />
              </div>
              <h4 className="text-lg sm:text-xl font-bold">Verifying Payment...</h4>
              <p className="text-muted-fg font-medium leading-relaxed text-sm sm:text-base">
                {paymentMethod === "momo" ? (
                  <>We sent a MoMo prompt to <b>{phone}</b>.<br />Enter your PIN on your phone to finish.</>
                ) : (
                  <>We are confirming your transaction. This usually takes a few seconds.</>
                )}
              </p>
            </div>
          )}

          {step === "success" && (
            <div className="py-8 sm:py-12 text-center space-y-4 sm:space-y-6 animate-in fade-in zoom-in">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-success-bg text-success rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <ShieldCheck size={40} />
              </div>
              <h4 className="text-2xl sm:text-3xl font-bold text-fg">Payment Verified!</h4>
              <p className="text-muted-fg font-medium leading-relaxed text-sm sm:text-base">
                Your support of <b>{amount} {selectedCurrency}</b> was delivered.
              </p>
              <button onClick={handleClose} className="w-full bg-foreground text-background py-3 sm:py-4 rounded-control font-bold text-sm sm:text-base hover:bg-brand-strong transition-colors">
                Back to Profile
              </button>
            </div>
          )}

          {step === "error" && (
            <div className="py-8 sm:py-12 text-center space-y-4 sm:space-y-6 animate-in fade-in zoom-in">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-danger-bg text-danger rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <X size={32} />
              </div>
              <h4 className="text-xl sm:text-2xl font-bold text-fg">Payment Failed</h4>
              <p className="text-muted-fg font-medium text-sm sm:text-base">{errorMessage}</p>
              {popupBlocked && (
                <Link href={redirectUrl} target="_blank" className="w-full bg-brand-strong text-center text-on-brand py-3 sm:py-4 rounded-control font-bold text-sm sm:text-base block">
                  Open Payment Window
                </Link>
              )}
              <button onClick={() => setStep("input")} className="w-full bg-surface-sunken text-fg py-3 sm:py-4 rounded-control font-bold text-sm sm:text-base hover:bg-surface-sunken transition-colors">
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
