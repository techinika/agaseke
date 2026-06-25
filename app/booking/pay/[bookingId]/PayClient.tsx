"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  Star,
  ArrowLeft,
  Check,
  Loader,
} from "lucide-react";
import { db } from "@/db/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "sonner";
import Link from "next/link";
import Navbar from "@/components/parts/Navigation";
import Footer from "@/components/parts/Footer";
import { logError } from "@/lib/logger";
import { CommercePaymentSection } from "@/components/parts/payment/CommercePaymentSection";

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
        bookingId: booking.id,
        amount: booking.paymentAmount || 0,
        phone: phone.replace(/\s/g, ""),
        email: currentUser.email || booking.bookerEmail || "",
        firstName: currentUser.displayName?.split(" ")[0] || booking.bookerName || "Customer",
        lastName: currentUser.displayName?.split(" ")[1] || "",
        supporterId: currentUser.uid,
        buyerId: currentUser.uid,
        buyerName: currentUser.displayName || booking.bookerName || "Customer",
        creatorId: booking.creatorHandle,
        creatorUid: booking.creatorId || "",
      };

      const endpoint =
        paymentMethod === "momo"
          ? "/api/support/with-momo/pay"
          : "/api/support/with-card/pay";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Payment failed to initiate");
        logError("payment", "PayClient: Payment failed to initiate", {
          userId: currentUser?.uid || undefined,
          userEmail: currentUser?.email || undefined,
          userName: currentUser?.displayName || undefined,
          metadata: { bookingId, creatorHandle: booking?.creatorHandle, creatorName: booking?.creatorName, paymentMethod, amount: booking?.paymentAmount, apiError: data.error },
        });
        return;
      }

      if (paymentMethod === "card" && data.redirect_url) {
        window.open(data.redirect_url, "_blank");
        toast.success("Payment page opened in a new tab");
        setPaid(true);
        return;
      }

      toast.success("Payment initiated! Check your phone to complete.");
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
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader className="animate-spin text-orange-600" size={32} />
        </div>
        <Footer />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center p-8">
            <p className="text-red-500 font-bold">Booking not found</p>
            <button
              onClick={() => router.push("/")}
              className="text-orange-600 underline mt-4 block mx-auto"
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 pt-10 pb-24">
        {handle && (
          <Link
            href={`/${handle}/booking`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition mb-6"
          >
            <ArrowLeft size={16} />
            Back to Booking
          </Link>
        )}

        <div className="bg-card rounded-xl shadow-lg p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">Complete Payment</h1>
              <p className="text-sm text-muted-foreground">
                Booking with {booking.creatorName || handle}
              </p>
            </div>
            {isPaid && (
              <span className="flex items-center gap-1.5 bg-green-100 text-green-700 text-xs font-bold px-3 py-1.5 rounded-full">
                <Check size={14} />
                Paid
              </span>
            )}
          </div>

          {/* Booking Summary */}
          <div className="bg-muted rounded-xl p-4 space-y-3">
            <h4 className="font-bold text-sm">Booking Summary</h4>
            {booking.tierName && (
              <div className="flex items-center gap-2 text-sm">
                <Star size={16} className="text-orange-500 shrink-0" />
                <span className="font-medium">{booking.tierName}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Calendar size={16} className="text-muted-foreground shrink-0" />
              <span>{booking.preferredDate}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock size={16} className="text-muted-foreground shrink-0" />
              <span>{booking.preferredTime}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {booking.preferredType === "online" ? (
                <Video size={16} className="text-muted-foreground shrink-0" />
              ) : (
                <MapPin size={16} className="text-muted-foreground shrink-0" />
              )}
              <span className="capitalize">{booking.preferredType} Meeting</span>
            </div>
            {booking.meetingLocation && (
              <div className="flex items-start gap-2 text-sm">
                {booking.preferredType === "online" ? (
                  <Video size={16} className="text-orange-500 shrink-0 mt-0.5" />
                ) : (
                  <MapPin size={16} className="text-orange-500 shrink-0 mt-0.5" />
                )}
                <span className="text-muted-foreground break-all">
                  {booking.preferredType === "online" ? "Link: " : "Location: "}
                  {booking.meetingLocation}
                </span>
              </div>
            )}
            <div className="border-t border-border pt-3 flex justify-between font-bold">
              <span>Amount</span>
              <span className="text-orange-600">
                {(booking.paymentAmount || 0).toLocaleString()} RWF
              </span>
            </div>
          </div>

          {/* Booker Info */}
          <div className="bg-muted rounded-xl p-4 space-y-1">
            <h4 className="font-bold text-sm mb-2">Your Information</h4>
            <p className="text-sm">{booking.bookerName}</p>
            <p className="text-sm text-muted-foreground">{booking.bookerEmail}</p>
            {booking.bookerPhone && (
              <p className="text-sm text-muted-foreground">{booking.bookerPhone}</p>
            )}
          </div>

          {/* Payment section */}
          <CommercePaymentSection
            amount={booking.paymentAmount || 0}
            paid={isPaid || confirmed}
            paying={paying}
            paymentMethod={paymentMethod}
            onPaymentMethodChange={setPaymentMethod}
            phone={phone}
            onPhoneChange={setPhone}
            onPay={handlePay}
            waitingForConfirmation={paid && !(isPaid || confirmed)}
            confirmationMessage={
              paymentMethod === "momo"
                ? "Please check your phone to complete the payment. Waiting for confirmation..."
                : "Waiting for card payment confirmation..."
            }
          />
        </div>
      </div>
      <Footer />
    </div>
  );
}
