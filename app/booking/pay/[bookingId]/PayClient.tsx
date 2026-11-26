"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Loader,
  Check,
  ArrowLeft,
  CreditCard,
  AlertCircle,
  Calendar,
  Clock,
  MapPin,
  Video,
  Star,
  ExternalLink,
  XCircle,
} from "lucide-react";
import { db } from "@/db/firebase";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "sonner";
import {
  cancelTransaction,
  initiateMomoPayment,
  initiateCardPayment,
  type PaymentInitRequest,
} from "@/lib/paymentsService";
import { subscribeToTransactionByRef } from "@/lib/transactions";
import { normalizeRwandaPhone } from "@/lib/format/phone";
import { isCurrencySupportedByMethod } from "@/lib/money/rails";
import Link from "next/link";
import { PublicHeader as Navbar } from "@/components/shell/PublicHeader";
import { PublicFooter as Footer } from "@/components/shell/PublicFooter";
import { logError } from "@/lib/logger";
import { formatMoney as formatCurrency } from "@/lib/format/money";

interface BookingRecord {
  id: string;
  creatorHandle?: string;
  creatorName?: string;
  tierName?: string;
  preferredDate?: string;
  preferredTime?: string;
  preferredType?: string;
  meetingLocation?: string;
  paymentAmount?: number;
  currency?: string;
  paymentStatus?: string;
  bookerName?: string;
  bookerEmail?: string;
  bookerPhone?: string;
}

function generateIdempotencyKey(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export default function BookingPayClient() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.bookingId as string;
  const { user: currentUser } = useAuth();

  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paymentPhase, setPaymentPhase] = useState<
    "idle" | "waiting" | "confirmed" | "failed"
  >("idle");
  const [paymentError, setPaymentError] = useState("");
  const [cardRedirectUrl, setCardRedirectUrl] = useState<string | null>(null);
  const [activeTxRef, setActiveTxRef] = useState<string | null>(null);
  const [cancellingTx, setCancellingTx] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"momo" | "card">("momo");
  const [phone, setPhone] = useState("");
  const [fallbackCurrency, setFallbackCurrency] = useState("RWF");
  const unsubTxRef = useRef<(() => void) | null>(null);
  const idempotencyKeyRef = useRef<string>("");

  const getIdempotencyKey = () => {
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = generateIdempotencyKey("booking");
    }
    return idempotencyKeyRef.current;
  };

  const resetIdempotencyKey = () => {
    idempotencyKeyRef.current = generateIdempotencyKey("booking");
  };

  useEffect(() => {
    return () => {
      unsubTxRef.current?.();
      unsubTxRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!bookingId) return;

    const unsubBooking = onSnapshot(
      doc(db, "bookingRequests", bookingId),
      (snap) => {
        if (!snap.exists()) return;
        const data: BookingRecord = { id: snap.id, ...(snap.data() as Omit<BookingRecord, "id">) };
        setBooking(data);
        if (data.paymentStatus === "paid") {
          setPaymentPhase("confirmed");
        }
      },
    );

    const fetchBooking = async () => {
      const snap = await getDoc(doc(db, "bookingRequests", bookingId));
      if (!snap.exists()) {
        setLoading(false);
        logError("payment", "PayClient: Booking not found", {
          userId: currentUser?.uid || undefined,
          userEmail: currentUser?.email || undefined,
          metadata: { bookingId },
        });
        return;
      }
      const data: BookingRecord = { id: snap.id, ...(snap.data() as Omit<BookingRecord, "id">) };
      setBooking(data);
      if (data.bookerPhone) {
        setPhone((prev) => prev || String(data.bookerPhone));
      }
      let resolvedCurr = data.currency ? String(data.currency).toUpperCase() : "";
      if (!resolvedCurr && data.creatorHandle) {
        const creatorSnap = await getDoc(doc(db, "creators", String(data.creatorHandle)));
        if (creatorSnap.exists() && creatorSnap.data()?.currency) {
          resolvedCurr = String(creatorSnap.data().currency).toUpperCase();
        }
      }
      const derivedCurrency = resolvedCurr || "RWF";
      setFallbackCurrency(derivedCurrency);
      if (!isCurrencySupportedByMethod("momo", derivedCurrency)) {
        setPaymentMethod("card");
      }
      if (data.paymentStatus === "paid") {
        setPaymentPhase("confirmed");
      }
      if (!data.paymentAmount || data.paymentAmount <= 0) {
        router.push(`/${data.creatorHandle || ""}/booking`);
        return;
      }
      setLoading(false);
    };

    void fetchBooking();
    return () => unsubBooking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  const currency = String(booking?.currency || fallbackCurrency || "RWF").toUpperCase();
  const momoSupported = isCurrencySupportedByMethod("momo", currency);
  const activeMethod = momoSupported ? paymentMethod : "card";

  const watchTransaction = (txRef: string) => {
    unsubTxRef.current?.();
    const unsub = subscribeToTransactionByRef(txRef, (tx) => {
      if (!tx) return;
      if (tx.status === "successful" || tx.status === "success") {
        setPaymentPhase("confirmed");
        setBooking((prev) => (prev ? { ...prev, paymentStatus: "paid" } : prev));
        toast.success("Booking payment confirmed!");
        unsub();
      } else if (tx.status === "failed" || tx.status === "expired") {
        setPaymentPhase("failed");
        setPaymentError(
          tx.status === "expired"
            ? "The payment session expired. Please try again."
            : "The payment was declined or cancelled.",
        );
        resetIdempotencyKey();
        toast.error(
          tx.status === "expired"
            ? "Payment session expired. Please try again."
            : "Payment failed. Please try again.",
        );
        unsub();
      }
    });
    unsubTxRef.current = unsub;
  };

  const handlePay = async () => {
    if (!booking || !currentUser?.uid) {
      toast.error("Please log in");
      return;
    }

    if (activeMethod === "momo" && !phone.trim()) {
      toast.error("Please enter your phone number");
      return;
    }

    setPaying(true);
    setPaymentError("");

    try {
      const cleanedPhone = normalizeRwandaPhone(phone) || phone.replace(/\s/g, "");
      const payload: PaymentInitRequest = {
        type: "booking",
        creatorHandle: booking.creatorHandle,
        bookingId: booking.id,
        phone: cleanedPhone,
        email: currentUser.email || booking.bookerEmail || "",
        firstName:
          currentUser.displayName?.split(" ")[0] || booking.bookerName || "Customer",
        lastName: currentUser.displayName?.split(" ")[1] || "",
        buyerName: currentUser.displayName || booking.bookerName || "Customer",
        buyerEmail: currentUser.email || booking.bookerEmail || "",
        currency,
        idempotencyKey: getIdempotencyKey(),
      };

      if (activeMethod === "momo") {
        const res = await initiateMomoPayment(payload);
        setActiveTxRef(res.ref);
        setCardRedirectUrl(null);
        setPaymentPhase("waiting");
        watchTransaction(res.ref);
        toast.success("Payment initiated! Check your phone to complete.");
      } else {
        const data = await initiateCardPayment(payload);
        const ref = data.merchant_reference || data.ref;
        setActiveTxRef(ref);
        setCardRedirectUrl(data.redirect_url || null);
        setPaymentPhase("waiting");
        watchTransaction(ref);
        if (data.redirect_url) {
          const popup = window.open(data.redirect_url, "_blank", "noopener,noreferrer");
          if (!popup) {
            window.location.assign(data.redirect_url);
          } else {
            toast.success("Payment page opened in a new tab");
          }
        }
      }
    } catch (error) {
      console.error("Payment error:", error);
      const message = error instanceof Error ? error.message : "Payment failed";
      setPaymentError(message);
      toast.error(message);
      logError("payment", "PayClient: Payment initiation threw exception", {
        userId: currentUser?.uid || undefined,
        userEmail: currentUser?.email || undefined,
        userName: currentUser?.displayName || undefined,
        metadata: {
          bookingId,
          creatorHandle: booking?.creatorHandle,
          creatorName: booking?.creatorName,
          paymentMethod: activeMethod,
          amount: booking?.paymentAmount,
          error: String(error),
        },
      });
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas">
        <Navbar />
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader className="animate-spin text-brand-strong" size={32} />
        </div>
        <Footer />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-canvas">
        <Navbar />
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center p-8">
            <p className="text-danger font-bold">Booking not found</p>
            <button
              onClick={() => router.push("/")}
              className="text-brand-strong underline mt-4 block mx-auto"
            >
              Go Home
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const handle = booking.creatorHandle;
  const isPaid = booking.paymentStatus === "paid" || paymentPhase === "confirmed";

  return (
    <div className="min-h-screen bg-canvas">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 pt-10 pb-24">
        {handle && (
          <Link
            href={`/${handle}/booking`}
            className="inline-flex items-center gap-2 text-sm text-muted-fg hover:text-fg transition mb-6"
          >
            <ArrowLeft size={16} />
            Back to Booking
          </Link>
        )}

        <div className="bg-surface rounded-control shadow-lg p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">Complete Payment</h1>
              <p className="text-sm text-muted-fg">
                Booking with {booking.creatorName || handle} · Charging in {currency}
              </p>
            </div>
            {isPaid && (
              <span className="flex items-center gap-1.5 text-success text-xs font-bold">
                <Check size={14} />
                Paid
              </span>
            )}
          </div>

          <div className="bg-surface-sunken rounded-control p-4 space-y-3">
            <h4 className="font-bold text-sm">Booking Summary</h4>
            {booking.tierName && (
              <div className="flex items-center gap-2 text-sm">
                <Star size={16} className="text-brand-strong shrink-0" />
                <span className="font-medium">{booking.tierName}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Calendar size={16} className="text-muted-fg shrink-0" />
              <span>{booking.preferredDate}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock size={16} className="text-muted-fg shrink-0" />
              <span>{booking.preferredTime}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {booking.preferredType === "online" ? (
                <Video size={16} className="text-muted-fg shrink-0" />
              ) : (
                <MapPin size={16} className="text-muted-fg shrink-0" />
              )}
              <span className="capitalize">{booking.preferredType} Meeting</span>
            </div>
            {booking.meetingLocation && (
              <div className="flex items-start gap-2 text-sm">
                {booking.preferredType === "online" ? (
                  <Video size={16} className="text-brand-strong shrink-0 mt-0.5" />
                ) : (
                  <MapPin size={16} className="text-brand-strong shrink-0 mt-0.5" />
                )}
                <span className="text-muted-fg break-all">
                  {booking.preferredType === "online" ? "Link: " : "Location: "}
                  {booking.meetingLocation}
                </span>
              </div>
            )}
            <div className="border-t border-line pt-3 flex justify-between font-bold">
              <span>Amount</span>
              <span className="text-brand-strong tabular-nums">
                {formatCurrency(booking.paymentAmount || 0, currency)}
              </span>
            </div>
          </div>

          <div className="bg-surface-sunken rounded-control p-4 space-y-1">
            <h4 className="font-bold text-sm mb-2">Your Information</h4>
            <p className="text-sm">{booking.bookerName}</p>
            <p className="text-sm text-muted-fg">{booking.bookerEmail}</p>
            {booking.bookerPhone && (
              <p className="text-sm text-muted-fg">{booking.bookerPhone}</p>
            )}
          </div>

          {isPaid ? (
            <div className="bg-success-bg rounded-control p-4 flex items-start gap-3">
              <Check size={20} className="text-success mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold text-success">
                  Payment Completed
                </p>
                <p className="text-xs text-success mt-1">
                  Your booking has been paid successfully. The creator will confirm your meeting.
                </p>
              </div>
            </div>
          ) : paymentPhase === "waiting" ? (
            <div className="bg-warning-bg rounded-control p-4 flex items-start gap-3">
              <Loader
                size={20}
                className="animate-spin text-warning mt-0.5 shrink-0"
              />
              <div className="flex-1">
                <p className="text-sm font-bold text-warning">
                  Waiting for Payment Confirmation
                </p>
                <p className="text-xs text-warning mt-1">
                  {activeMethod === "momo"
                    ? "Please check your phone to complete the payment. Waiting for confirmation..."
                    : "Complete payment in the checkout tab."}
                </p>
                {cardRedirectUrl && (
                  <a
                    href={cardRedirectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-xs font-bold text-brand-strong hover:underline"
                  >
                    Open checkout page <ExternalLink size={14} />
                  </a>
                )}
                <button
                  type="button"
                  disabled={cancellingTx}
                  onClick={async () => {
                    setCancellingTx(true);
                    try {
                      if (activeTxRef) await cancelTransaction(activeTxRef);
                      unsubTxRef.current?.();
                      unsubTxRef.current = null;
                      resetIdempotencyKey();
                      setActiveTxRef(null);
                      setCardRedirectUrl(null);
                      setPaymentError("");
                      setPaymentPhase("idle");
                      toast.success("Payment cancelled.");
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Failed to cancel payment");
                    } finally {
                      setCancellingTx(false);
                    }
                  }}
                  className="mt-2 block min-h-11 text-xs font-semibold text-muted-fg underline hover:text-fg disabled:opacity-50"
                >
                  {cancellingTx ? "Cancelling..." : "Cancel payment & try again"}
                </button>
              </div>
            </div>
          ) : (
            <>
              {paymentPhase === "failed" && paymentError && (
                <div className="bg-danger-bg rounded-control p-4 flex items-start gap-3">
                  <XCircle size={20} className="text-danger mt-0.5 shrink-0" />
                  <p className="text-sm font-medium text-danger">{paymentError}</p>
                </div>
              )}

              <div className="space-y-3">
                <p className="font-bold text-sm">Payment Method</p>
                {!momoSupported ? (
                  <p className="text-sm text-muted-fg">
                    Mobile money is not available for {currency}. Card payment is required.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (paymentMethod !== "momo") resetIdempotencyKey();
                        setPaymentMethod("momo");
                      }}
                      className={`py-3 px-4 rounded-control border-2 font-bold text-sm transition-all ${
                        paymentMethod === "momo"
                          ? "border-brand-strong bg-brand-soft text-brand-strong"
                          : "border-line text-muted-fg"
                      }`}
                    >
                      Mobile Money
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (paymentMethod !== "card") resetIdempotencyKey();
                        setPaymentMethod("card");
                      }}
                      className={`py-3 px-4 rounded-control border-2 font-bold text-sm transition-all ${
                        paymentMethod === "card"
                          ? "border-brand-strong bg-brand-soft text-brand-strong"
                          : "border-line text-muted-fg"
                      }`}
                    >
                      Card Payment
                    </button>
                  </div>
                )}
              </div>

              {activeMethod === "momo" && (
                <div className="bg-warning-bg rounded-control p-4 flex items-start gap-3">
                  <AlertCircle
                    size={20}
                    className="text-warning mt-0.5 shrink-0"
                  />
                  <p className="text-sm text-warning">
                    Payment will be processed via Mobile Money. You will receive
                    a prompt on your phone to complete the payment.
                  </p>
                </div>
              )}

              {activeMethod === "momo" && (
                <div className="space-y-2">
                  <label className="text-sm font-bold">
                    Mobile Money Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="07X XXX XXXX"
                    className="w-full bg-surface-sunken p-4 rounded-control text-sm font-medium outline-none"
                  />
                </div>
              )}

              {activeMethod === "card" && (
                <div className="bg-info-bg rounded-control p-4 flex items-start gap-3">
                  <CreditCard
                    size={20}
                    className="text-info mt-0.5 shrink-0"
                  />
                  <p className="text-sm text-info">
                    You will be redirected to a secure payment page to complete
                    your card payment.
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={handlePay}
                disabled={paying || (activeMethod === "momo" && !phone.trim())}
                className="w-full bg-success text-on-success py-4 rounded-control font-bold hover:bg-success transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {paying ? (
                  <>
                    <Loader className="animate-spin" size={20} />
                    Processing...
                  </>
                ) : (
                  <>
                    <Check size={20} />
                    Pay {formatCurrency(booking.paymentAmount || 0, currency)}
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
