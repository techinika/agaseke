"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/auth/AuthContext";
import { db } from "@/db/firebase";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { formatCurrency } from "@/types/currency";
import { isEncrypted } from "@/lib/generalWorkerService";
import type { BookingRequest } from "@/types/booking";
import {
  Loader,
  Calendar,
  CalendarDays,
  CalendarCheck,
  Clock,
  Video,
  MapPin,
  Mail,
  CreditCard,
  AlertTriangle,
  MessageSquare,
  Hourglass,
  CheckCircle2,
  XCircle,
} from "lucide-react";

const FILTERS = ["all", "payment-pending", "awaiting", "upcoming", "ended", "declined"] as const;
type Filter = (typeof FILTERS)[number];

function formatDate(date: string): string {
  if (!date) return "—";
  const d = new Date(date + "T00:00:00");
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function typeName(type: string): string {
  if (type === "online") return "Online meeting";
  if (type === "physical") return "In-person meeting";
  return "Meeting";
}

export default function BookingsPage() {
  const { isLoggedIn, user } = useAuth();
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    if (!isLoggedIn || !user?.uid) return;
    const ref = collection(db, "bookingRequests");
    const q = query(ref, where("bookerId", "==", user.uid), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        setBookings(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as BookingRequest[]);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsub();
  }, [isLoggedIn, user?.uid]);

  const pad2 = (n: number) => String(n).padStart(2, "0");
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;

  const sections = useMemo(() => {
    const paymentPending = bookings.filter((b) => b.paymentStatus === "pending");
    const awaiting = bookings.filter((b) => b.status === "pending" && b.paymentStatus !== "pending");
    const upcoming = bookings.filter(
      (b) => b.status === "accepted" && b.paymentStatus !== "pending" && (!b.preferredDate || b.preferredDate >= todayKey),
    );
    const ended = bookings.filter((b) => b.status === "accepted" && b.preferredDate && b.preferredDate < todayKey);
    const declined = bookings.filter((b) => b.status === "declined" || b.status === "cancelled");
    return { paymentPending, awaiting, upcoming, ended, declined };
  }, [bookings, todayKey]);

  const counts: Record<Filter, number> = {
    all: bookings.length,
    "payment-pending": sections.paymentPending.length,
    awaiting: sections.awaiting.length,
    upcoming: sections.upcoming.length,
    ended: sections.ended.length,
    declined: sections.declined.length,
  };

  const filtered = useMemo(() => {
    switch (filter) {
      case "payment-pending":
        return sections.paymentPending;
      case "awaiting":
        return sections.awaiting;
      case "upcoming":
        return sections.upcoming;
      case "ended":
        return sections.ended;
      case "declined":
        return sections.declined;
      default:
        return bookings;
    }
  }, [filter, bookings, sections]);

  const statusChip = (b: BookingRequest) => {
    if (b.paymentStatus === "pending")
      return (
        <span className="inline-flex items-center gap-1 shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
          <CreditCard size={12} /> Payment pending
        </span>
      );
    if (b.status === "pending")
      return (
        <span className="inline-flex items-center gap-1 shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full bg-sky-100 text-sky-700">
          <Hourglass size={12} /> Awaiting response
        </span>
      );
    if (b.status === "accepted") {
      const isPast = b.preferredDate && b.preferredDate < todayKey;
      return isPast ? (
        <span className="inline-flex items-center gap-1 shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
          <CheckCircle2 size={12} /> Ended
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700">
          <CheckCircle2 size={12} /> Confirmed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-700">
        <XCircle size={12} /> {b.status === "declined" ? "Declined" : "Cancelled"}
      </span>
    );
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Bookings</h1>
        <p className="text-sm text-muted-foreground">
          Meetings you have booked with creators — pending payments, responses,
          and past appointments.
        </p>
      </div>

      {!isLoggedIn ? (
        <div className="text-center py-16">
          <Calendar size={40} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            Log in to see your bookings.
          </p>
          <Link
            href="/login"
            className="px-6 py-3 bg-orange-600 text-white text-sm font-bold rounded-lg hover:bg-orange-700 transition"
          >
            Log in
          </Link>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-16">
          <Loader className="animate-spin text-orange-500" size={32} />
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-6">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 text-sm font-bold rounded-full border transition ${
                  filter === f
                    ? "bg-orange-600 text-white border-orange-600"
                    : "bg-card text-muted-foreground border-border hover:text-foreground"
                }`}
              >
                {f === "all"
                  ? "All"
                  : f === "payment-pending"
                    ? "Pending payment"
                    : f === "awaiting"
                      ? "Awaiting response"
                      : f === "upcoming"
                        ? "Upcoming"
                        : f === "ended"
                          ? "Ended"
                          : "Declined"}
                <span className="ml-1.5 text-xs opacity-70">{counts[f]}</span>
              </button>
            ))}
          </div>

          {sections.paymentPending.length > 0 && (
            <div className="flex items-start gap-2 mb-6 p-3 bg-amber-100/70 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-800 rounded-lg text-sm">
              <AlertTriangle className="shrink-0 text-amber-600 mt-0.5" size={16} />
              <p className="text-foreground">
                <span className="font-black">{sections.paymentPending.length}</span> booking
                {sections.paymentPending.length > 1 ? "s are" : " is"} waiting on you to
                complete payment so the creator can confirm.
              </p>
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="text-center py-16 bg-card border border-border rounded-xl">
              <CalendarDays size={40} className="mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                {bookings.length === 0
                  ? "You haven't booked any meetings yet."
                  : "No bookings in this filter."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((b) => (
                <div key={b.id} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-foreground truncate">
                        {b.tierName ? `${b.tierName} booking` : "Booking"}
                      </p>
                      {b.creatorHandle && (
                        <Link
                          href={`/${b.creatorHandle}`}
                          className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:underline mt-0.5"
                        >
                          <Calendar size={12} /> @{b.creatorHandle}
                          {b.creatorName ? ` · ${b.creatorName}` : ""}
                        </Link>
                      )}
                    </div>
                    {statusChip(b)}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground mb-3">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays size={14} /> {formatDate(b.preferredDate)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock size={14} /> {b.preferredTime}
                    </span>
                    <span className="flex items-center gap-1.5">
                      {b.preferredType === "online" ? <Video size={14} /> : <MapPin size={14} />}
                      {typeName(b.preferredType)}
                    </span>
                    {(b.paymentAmount || 0) > 0 && (
                      <span className="flex items-center gap-1.5 font-bold text-foreground">
                        <CreditCard size={14} />
                        {formatCurrency(b.paymentAmount || 0, b.currency || "RWF")}
                      </span>
                    )}
                  </div>

                  {(b.reason && !isEncrypted(b.reason)) || b.responseNote ? (
                    <div className="space-y-2 mb-3">
                      {b.reason && !isEncrypted(b.reason) && (
                        <div className="p-3 bg-muted rounded-lg text-sm">
                          <p className="text-xs font-black uppercase text-muted-foreground mb-1">
                            Your message
                          </p>
                          <p className="text-foreground">{b.reason}</p>
                        </div>
                      )}
                      {b.responseNote && (
                        <div className="p-3 bg-green-50 dark:bg-green-950/40 border border-green-100 dark:border-green-900 rounded-lg text-sm">
                          <p className="inline-flex items-center gap-1 text-xs font-black uppercase text-green-700 dark:text-green-400 mb-1">
                            <MessageSquare size={12} /> Creator feedback
                          </p>
                          <p className="text-foreground">{b.responseNote}</p>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {b.bookerEmail ? (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                      <Mail size={12} /> {b.bookerEmail}
                    </p>
                  ) : null}

                  {b.paymentStatus === "pending" && (
                    <div className="flex items-center justify-between border-t border-border pt-3">
                      <p className="text-sm text-muted-foreground">
                        Complete payment to confirm this booking.
                      </p>
                      <Link
                        href={`/booking/pay/${b.id}`}
                        className="shrink-0 inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition"
                      >
                        <CreditCard size={15} /> Complete Payment
                      </Link>
                    </div>
                  )}
                  {b.status === "accepted" && b.paymentStatus !== "pending" && (
                    <div className="flex items-center gap-2 border-t border-border pt-3">
                      <CalendarCheck size={14} className="text-green-600" />
                      <p className="text-sm text-muted-foreground">
                        {b.preferredDate && b.preferredDate < todayKey
                          ? "This meeting has taken place."
                          : "Your booking is confirmed with the creator."}
                      </p>
                    </div>
                  )}
                  {b.status === "pending" && b.paymentStatus !== "pending" && (
                    <div className="flex items-center gap-2 border-t border-border pt-3">
                      <Hourglass size={14} className="text-sky-600" />
                      <p className="text-sm text-muted-foreground">
                        Waiting for {b.creatorName || "the creator"} to respond.
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}