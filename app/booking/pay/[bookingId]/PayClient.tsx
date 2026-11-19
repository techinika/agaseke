"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";
import { db } from "@/db/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "sonner";
import { initiateMomoPayment, initiateCardPayment } from "@/lib/paymentsService";
import { isCurrencySupportedByMethod } from "@/lib/money/rails";
import Link from "next/link";
import Navbar from "@/components/parts/Navigation";
import Footer from "@/components/parts/Footer";
import { logError } from "@/lib/logger";
import { formatMoney as formatCurrency } from "@/lib/format/money";

export default function BookingPayClient() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.bookingId as string;
  const { user: currentUser } = useAuth();

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"momo" | "card">("momo");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    const fetchBooking = async () => {
      if (!bookingId) return;
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
      const data: any = { id: snap.id, ...snap.data() };
      setBooking(data);
      if (data.currency && !isCurrencySupportedByMethod("momo", data.currency)) setPaymentMethod("card");
      if (data.paymentStatus === "paid") { setPaid(true); setConfirmed(true); }
      if (!data.paymentAmount || data.paymentAmount <= 0) {
        router.push(`/${data.creatorHandle || ""}/booking`);
        return;
      }
      setLoading(false);
    };
    fetchBooking();
  }, [bookingId]);

  // Poll Firestore for payment confirmation after initiating payment
  useEffect(() => {
    if (!paid || confirmed || !bookingId) return;
    const interval = setInterval(async () => {
      try {
        const snap = await getDoc(doc(db, "bookingRequests", bookingId));
        if (snap.exists() && snap.data().paymentStatus === "paid") {
          setConfirmed(true);
          setBooking((prev: any) => ({ ...prev, paymentStatus: "paid" }));
          clearInterval(interval);
        }
      } catch {
        logError("payment", "PayClient: Polling error while waiting for payment confirmation", {
          userId: currentUser?.uid || undefined,
          userEmail: currentUser?.email || undefined,
          userName: currentUser?.displayName || undefined,
          metadata: { bookingId, creatorHandle: booking?.creatorHandle, creatorName: booking?.creatorName },
        });
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [paid, confirmed, bookingId]);

  const handlePay = async () => {
    if (!booking || !currentUser?.uid) {
      toast.error("Please log in");
      return;
    }

    if (paymentMethod === "momo" && !phone.trim()) {
      toast.error("Please enter your phone number");
      return;
    }

    setPaying(true);

    try {
      const payload: Record<string, any> = {
        type: "booking",
        creatorHandle: booking.creatorHandle,
        bookingId: booking.id,
        phone: phone.replace(/\s/g, ""),
        email: currentUser.email || booking.bookerEmail || "",
        firstName: currentUser.displayName?.split(" ")[0] || booking.bookerName || "Customer",
        lastName: currentUser.displayName?.split(" ")[1] || "",
        buyerName: currentUser.displayName || booking.bookerName || "Customer",
        buyerEmail: currentUser.email || booking.bookerEmail || "",
        ...(booking.currency ? { currency: booking.currency } : {}),
        idempotencyKey: crypto.randomUUID(),
      };

      if (paymentMethod === "momo") {
        await initiateMomoPayment(payload as any);
        toast.success("Payment initiated! Check your phone to complete.");
      } else {
        const data = await initiateCardPayment(payload as any);
        if (data.redirect_url) {
          window.open(data.redirect_url, "_blank");
          toast.success("Payment page opened in a new tab");
          setPaid(true);
          return;
        }
      }

      setPaid(true);
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Payment failed");
      logError("payment", "PayClient: Payment initiation threw exception", {
        userId: currentUser?.uid || undefined,
        userEmail: currentUser?.email || undefined,
        userName: currentUser?.displayName || undefined,
        metadata: { bookingId, creatorHandle: booking?.creatorHandle, creatorName: booking?.creatorName, paymentMethod, amount: booking?.paymentAmount, error: String(error) },
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
  const isPaid = booking.paymentStatus === "paid";
  const momoSupported = booking?.currency ? isCurrencySupportedByMethod("momo", booking.currency) : false;


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
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">Complete Payment</h1>
              <p className="text-sm text-muted-fg">
                Booking with {booking.creatorName || handle}
              </p>
            </div>
            {isPaid && (
              <span className="flex items-center gap-1.5 bg-success-bg text-success text-xs font-bold px-3 py-1.5 rounded-full">
                <Check size={14} />
                Paid
              </span>
            )}
          </div>

          {/* Booking Summary */}
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
              <span className="text-brand-strong">
                {booking.currency ? formatCurrency(booking.paymentAmount || 0, booking.currency) : `${booking.paymentAmount || 0}`}
              </span>
            </div>
          </div>

          {/* Booker Info */}
          <div className="bg-surface-sunken rounded-control p-4 space-y-1">
            <h4 className="font-bold text-sm mb-2">Your Information</h4>
            <p className="text-sm">{booking.bookerName}</p>
            <p className="text-sm text-muted-fg">{booking.bookerEmail}</p>
            {booking.bookerPhone && (
              <p className="text-sm text-muted-fg">{booking.bookerPhone}</p>
            )}
          </div>

          {/* Payment section */}
          {isPaid || confirmed ? (
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
          ) : paid ? (
            <div className="bg-warning-bg rounded-control p-4 flex items-start gap-3">
              <Loader size={20} className="animate-spin text-warning mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold text-warning">
                  Waiting for Payment Confirmation
                </p>
                <p className="text-xs text-warning mt-1">
                  {paymentMethod === "momo"
                    ? "Please check your phone to complete the payment. Waiting for confirmation..."
                    : "Waiting for card payment confirmation..."}
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Payment Method */}
              <div className="space-y-3">
                <p className="font-bold text-sm">Payment Method</p>
                {!momoSupported ? (
                  <p className="text-sm text-muted-fg">
                    Mobile money is not available for {booking.currency || "this currency"}. Card payment is required.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setPaymentMethod("momo")}
                      className={`py-3 px-4 rounded-control border-2 font-bold text-sm transition-all ${
                        paymentMethod === "momo"
                          ? "border-brand-strong bg-brand-soft text-brand-strong"
                          : "border-line text-muted-fg"
                      }`}
                    >
                      Mobile Money
                    </button>
                    <button
                      onClick={() => setPaymentMethod("card")}
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

              {momoSupported && paymentMethod === "momo" && (
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

              {momoSupported && paymentMethod === "momo" && (
                <div className="space-y-2">
                  <label className="text-sm font-bold">
                    MTN Mobile Money Number
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

              {paymentMethod === "card" && (
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
                onClick={handlePay}
                disabled={!booking.currency || paying || (paymentMethod === "momo" && !phone.trim())}
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
                    Pay {booking.currency ? formatCurrency(booking.paymentAmount || 0, booking.currency) : `${booking.paymentAmount || 0}`}
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
