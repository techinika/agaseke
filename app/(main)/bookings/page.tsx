"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/auth/AuthContext";
import { db } from "@/db/firebase";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { formatCurrency } from "@/types/currency";
import { isEncrypted } from "@/lib/generalWorkerService";
import type { BookingRequest } from "@/types/booking";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { buttonClasses } from "@/components/ui/Button";
import {
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

const FILTER_LABELS: Record<Filter, string> = {
  all: "All",
  "payment-pending": "Pending payment",
  awaiting: "Awaiting response",
  upcoming: "Upcoming",
  ended: "Ended",
  declined: "Declined",
};

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

  const statusMeta = (b: BookingRequest) => {
    if (b.paymentStatus === "pending") {
      return (
        <span className="inline-flex items-center gap-1 shrink-0 text-caption font-semibold text-warning">
          <CreditCard className="size-3.5" aria-hidden="true" /> Payment pending
        </span>
      );
    }
    if (b.status === "pending") {
      return (
        <span className="inline-flex items-center gap-1 shrink-0 text-caption font-semibold text-info">
          <Hourglass className="size-3.5" aria-hidden="true" /> Awaiting response
        </span>
      );
    }
    if (b.status === "accepted") {
      const isPast = b.preferredDate && b.preferredDate < todayKey;
      return isPast ? (
        <span className="inline-flex items-center gap-1 shrink-0 text-caption font-semibold text-muted-fg">
          <CheckCircle2 className="size-3.5" aria-hidden="true" /> Ended
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 shrink-0 text-caption font-semibold text-success">
          <CheckCircle2 className="size-3.5" aria-hidden="true" /> Confirmed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 shrink-0 text-caption font-semibold text-danger">
        <XCircle className="size-3.5" aria-hidden="true" /> {b.status === "declined" ? "Declined" : "Cancelled"}
      </span>
    );
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8">
        <p className="text-caption font-semibold uppercase tracking-wider text-brand-strong">
          Account
        </p>
        <h1 className="mt-1 text-heading font-bold tracking-tight text-fg">
          Bookings
        </h1>
        <p className="mt-1 text-label text-muted-fg">
          Meetings booked with creators, pending payments, and confirmations.
        </p>
      </div>

      {!isLoggedIn ? (
        <EmptyState
          icon={<Calendar className="size-6" aria-hidden="true" />}
          title="Log in to view your bookings"
          description="Sign in to check your upcoming meetings and pending booking payments."
          action={
            <Link href="/login" className={buttonClasses({ variant: "primary" })}>
              Log in
            </Link>
          }
        />
      ) : loading ? (
        <LoadingState variant="list" label="Loading bookings" />
      ) : (
        <>
          <div className="mb-6 flex gap-1 overflow-x-auto border-b border-line pb-px" role="tablist" aria-label="Filter bookings">
            {FILTERS.map((f) => {
              const active = filter === f;
              return (
                <button
                  key={f}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(f)}
                  className={`shrink-0 border-b-2 px-3 py-2.5 text-label font-semibold transition-colors ${
                    active
                      ? "border-brand-strong text-fg"
                      : "border-transparent text-muted-fg hover:text-fg"
                  }`}
                >
                  {FILTER_LABELS[f]}
                  <span className="ml-1.5 text-caption text-muted-fg">
                    {counts[f]}
                  </span>
                </button>
              );
            })}
          </div>

          {sections.paymentPending.length > 0 && (
            <div className="mb-6 flex items-start gap-2.5 rounded-card border border-warning/30 bg-warning-bg p-3.5 text-label">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
              <p className="text-fg">
                <span className="font-bold">{sections.paymentPending.length}</span> booking
                {sections.paymentPending.length > 1 ? "s need" : " needs"} payment before the creator can confirm.
              </p>
            </div>
          )}

          {filtered.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="size-6" aria-hidden="true" />}
              title={bookings.length === 0 ? "No bookings yet" : "No matching bookings"}
              description={
                bookings.length === 0
                  ? "When you book a session with a creator, it appears here."
                  : "Try switching tabs above to view other bookings."
              }
            />
          ) : (
            <div className="space-y-3">
              {filtered.map((b) => (
                <Card key={b.id} className="p-4 sm:p-5">
                  <div className="mb-2.5 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-body font-bold text-fg">
                        {b.tierName ? `${b.tierName} booking` : "Booking"}
                      </p>
                      {b.creatorHandle && (
                        <Link
                          href={`/${b.creatorHandle}`}
                          className="mt-0.5 inline-flex items-center gap-1 text-caption font-semibold text-brand-strong hover:underline"
                        >
                          <Calendar className="size-3" aria-hidden="true" /> @{b.creatorHandle}
                          {b.creatorName ? ` · ${b.creatorName}` : ""}
                        </Link>
                      )}
                    </div>
                    {statusMeta(b)}
                  </div>

                  <div className="mb-3 grid grid-cols-2 gap-2.5 text-label text-muted-fg">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="size-3.5" aria-hidden="true" /> {formatDate(b.preferredDate)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="size-3.5" aria-hidden="true" /> {b.preferredTime}
                    </span>
                    <span className="flex items-center gap-1.5">
                      {b.preferredType === "online" ? (
                        <Video className="size-3.5" aria-hidden="true" />
                      ) : (
                        <MapPin className="size-3.5" aria-hidden="true" />
                      )}
                      {typeName(b.preferredType)}
                    </span>
                    {(b.paymentAmount || 0) > 0 && (
                      <span className="flex items-center gap-1.5 font-semibold text-fg">
                        <CreditCard className="size-3.5" aria-hidden="true" />
                        {b.currency
                          ? formatCurrency(b.paymentAmount || 0, b.currency as never)
                          : `${b.paymentAmount || 0}`}
                      </span>
                    )}
                  </div>

                  {((b.reason && !isEncrypted(b.reason)) || b.responseNote) && (
                    <div className="mb-3 space-y-2">
                      {b.reason && !isEncrypted(b.reason) && (
                        <div className="rounded-control bg-surface-sunken p-3 text-label">
                          <p className="mb-1 text-caption font-semibold uppercase tracking-wide text-muted-fg">
                            Your note
                          </p>
                          <p className="text-fg">{b.reason}</p>
                        </div>
                      )}
                      {b.responseNote && (
                        <div className="rounded-control border border-success/25 bg-success-bg p-3 text-label">
                          <p className="mb-1 inline-flex items-center gap-1 text-caption font-semibold uppercase tracking-wide text-success">
                            <MessageSquare className="size-3" aria-hidden="true" /> Creator reply
                          </p>
                          <p className="text-fg">{b.responseNote}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {b.bookerEmail && (
                    <p className="mb-3 flex items-center gap-1.5 text-caption text-muted-fg">
                      <Mail className="size-3" aria-hidden="true" /> {b.bookerEmail}
                    </p>
                  )}

                  {b.paymentStatus === "pending" && (
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                      <p className="text-label text-muted-fg">
                        Complete payment to confirm this booking.
                      </p>
                      <Link
                        href={`/booking/pay/${b.id}`}
                        className={buttonClasses({ variant: "primary", size: "sm" })}
                      >
                        <CreditCard className="size-4" aria-hidden="true" /> Complete Payment
                      </Link>
                    </div>
                  )}
                  {b.status === "accepted" && b.paymentStatus !== "pending" && (
                    <div className="flex items-center gap-2 border-t border-line pt-3">
                      <CalendarCheck className="size-4 text-success" aria-hidden="true" />
                      <p className="text-label text-muted-fg">
                        {b.preferredDate && b.preferredDate < todayKey
                          ? "This meeting has taken place."
                          : "Your booking is confirmed with the creator."}
                      </p>
                    </div>
                  )}
                  {b.status === "pending" && b.paymentStatus !== "pending" && (
                    <div className="flex items-center gap-2 border-t border-line pt-3">
                      <Hourglass className="size-4 text-info" aria-hidden="true" />
                      <p className="text-label text-muted-fg">
                        Waiting for {b.creatorName || "the creator"} to respond.
                      </p>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}