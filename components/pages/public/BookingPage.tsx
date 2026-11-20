/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Calendar,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Heart,
  MapPin,
  Video,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthContext";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { createBooking } from "@/lib/bookingsService";
import { cn } from "@/lib/cn";
import { formatMoney as formatCurrency } from "@/lib/format/money";
import { logError } from "@/lib/logger";
import { getPrice } from "@/lib/priceMap";
import type { BookingAvailability, BookingTier, BookingType } from "@/types/booking";

const LazySupportSheet = lazy(() =>
  import("@/features/support").then((module) => ({
    default: module.SupportSheet,
  })),
);

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function bookingTierAmount(tier: BookingTier): number {
  return getPrice(tier);
}

function formatTierPrice(tier: BookingTier): string {
  const amount = bookingTierAmount(tier);
  if (amount <= 0) return "Free";
  return tier.currency ? formatCurrency(amount, tier.currency as any) : `${amount}`;
}

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatReadableDate(dateStr: string): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function computeCalendarDates(avail: BookingAvailability | null): string[] {
  if (
    !avail ||
    !Array.isArray(avail.daysOfWeek) ||
    avail.daysOfWeek.length === 0 ||
    !Array.isArray(avail.defaultSlots) ||
    avail.defaultSlots.length === 0
  ) {
    return [];
  }

  const dates: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startRaw = avail.startDate ? new Date(`${avail.startDate}T00:00:00`) : new Date(today);
  if (Number.isNaN(startRaw.getTime())) return [];
  startRaw.setHours(0, 0, 0, 0);
  const start = startRaw > today ? startRaw : today;

  const endDate = avail.endDate ? new Date(`${avail.endDate}T23:59:59`) : new Date(today);
  if (Number.isNaN(endDate.getTime())) return [];
  if (!avail.endDate) endDate.setMonth(endDate.getMonth() + 2);

  for (let d = new Date(start); d <= endDate; d.setDate(d.getDate() + 1)) {
    if (avail.daysOfWeek.includes(d.getDay())) {
      dates.push(toLocalDateKey(d));
    }
  }
  return dates;
}

function monthIndex(date: Date): number {
  return date.getFullYear() * 12 + date.getMonth();
}

export default function BookingPage({
  username,
  creator,
}: {
  username: string;
  creator: any;
}) {
  const { user, isLoggedIn } = useAuth();
  const router = useRouter();

  const handle = creator?.handle || username;
  const displayName = creator?.name || handle;
  const photoURL = creator?.profilePicture || creator?.photoURL || null;

  const isTiered = creator?.bookingMode === "tiered";
  const activeTiers: BookingTier[] = useMemo(
    () => (creator?.bookingTiers || []).filter((t: BookingTier) => t.active),
    [creator],
  );

  const [step, setStep] = useState<"tier-select" | "form" | "success" | "error">(
    isTiered && activeTiers.length > 0 ? "tier-select" : "form",
  );
  const [supportOpen, setSupportOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTier, setSelectedTier] = useState<BookingTier | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedType, setSelectedType] = useState<BookingType>("online");
  const [reason, setReason] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
  }>({});
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    const min = new Date(now.getFullYear(), now.getMonth(), 1);
    if (creator?.bookingMode !== "tiered" && creator?.bookingAvailability) {
      const firstDates = computeCalendarDates(creator.bookingAvailability);
      if (firstDates.length > 0) {
        const [y, m] = firstDates[0].split("-").map(Number);
        if (y && m) {
          const firstMonth = new Date(y, m - 1, 1);
          if (monthIndex(firstMonth) > monthIndex(min)) return firstMonth;
        }
      }
    }
    return min;
  });

  const availability: BookingAvailability | null = useMemo(() => {
    if (isTiered) return selectedTier?.availability ?? null;
    return creator?.bookingAvailability ?? null;
  }, [isTiered, selectedTier, creator]);

  const calendarDates = useMemo(
    () => computeCalendarDates(availability),
    [availability],
  );
  const availableDateSet = useMemo(() => new Set(calendarDates), [calendarDates]);

  useEffect(() => {
    if (!user) return;
    /* eslint-disable react-hooks/set-state-in-effect -- hydrate user contact fields once after auth loads */
    setName((prev) => prev || user.displayName || "");
    setEmail((prev) => prev || user.email || "");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [user]);

  const selectTier = (tier: BookingTier) => {
    setSelectedTier(tier);
    setSelectedDate("");
    setSelectedTime("");
    setSelectedType(
      tier.availability.bookingType === "physical" ? "physical" : "online",
    );
    const firstDates = computeCalendarDates(tier.availability);
    if (firstDates.length > 0) {
      const [y, m] = firstDates[0].split("-").map(Number);
      if (y && m) setCurrentMonth(new Date(y, m - 1, 1));
    }
    setStep("form");
  };

  if (!creator) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <EmptyState
          icon={<CalendarDays className="size-6" aria-hidden="true" />}
          title="Creator not found"
          description="This creator page is not available right now."
          action={
            <Link href="/explore" className={buttonClasses({ variant: "primary" })}>
              Explore creators
            </Link>
          }
        />
      </div>
    );
  }

  if (creator.bookingEnabled === false) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-6">
          <Link
            href={`/${handle}`}
            className="inline-flex min-h-11 items-center gap-2 text-label font-semibold text-muted-fg transition-colors hover:text-fg"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to profile
          </Link>
        </div>
        <EmptyState
          icon={<CalendarDays className="size-6" aria-hidden="true" />}
          title="Bookings are paused"
          description={`${displayName} isn't accepting new meeting requests right now.`}
          action={
            <Link
              href={`/${handle}`}
              className={buttonClasses({ variant: "secondary" })}
            >
              Return to @{handle}
            </Link>
          }
        />
      </div>
    );
  }

  const today = new Date();
  const minMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const canGoPrev = monthIndex(currentMonth) > monthIndex(minMonth);

  const resolvedType: BookingType =
    availability?.bookingType === "online"
      ? "online"
      : availability?.bookingType === "physical"
        ? "physical"
        : selectedType === "physical"
          ? "physical"
          : "online";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedDate || !selectedTime) {
      toast.error("Please select a date and time slot.");
      return;
    }

    const errors: { name?: string; email?: string } = {};
    if (!name.trim()) errors.name = "Enter your full name.";
    if (!email.trim() || !email.includes("@")) {
      errors.email = "Enter a valid email address.";
    }
    if (errors.name || errors.email) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);

    try {
      const data = await createBooking({
        creatorHandle: handle,
        bookerId: user?.uid || null,
        bookerName: name.trim(),
        bookerEmail: email.trim(),
        bookerPhone: phone.trim(),
        reason: reason.trim(),
        preferredDate: selectedDate,
        preferredTime: selectedTime,
        preferredType: resolvedType,
        tierId: selectedTier?.id || null,
        tierName: selectedTier?.name || null,
        paymentAmount: selectedTier ? bookingTierAmount(selectedTier) : 0,
        ...(selectedTier?.currency ? { currency: selectedTier.currency } : {}),
      });

      if (data?.paymentRequired && data?.bookingId) {
        router.push(`/booking/pay/${data.bookingId}`);
      } else {
        setStep("success");
      }
    } catch (err) {
      toast.error("Could not send your booking request.");
      setStep("error");
      logError("payment", "BookingPage: Failed to submit booking", {
        userName: user?.displayName || name,
        userEmail: user?.email || email,
        creatorHandle: handle,
        creatorId: creator?.uid,
        metadata: {
          creatorName: creator?.name,
          preferredDate: selectedDate,
          preferredTime: selectedTime,
          tierName: selectedTier?.name,
          tierPrice: selectedTier?.price,
          error: String(err),
        },
      });
    } finally {
      setSubmitting(false);
    }
  };

  const hasAvailability =
    Boolean(availability) &&
    (availability?.daysOfWeek?.length ?? 0) > 0 &&
    (availability?.defaultSlots?.length ?? 0) > 0;

  const isPaidTier = Boolean(selectedTier && bookingTierAmount(selectedTier) > 0);

  return (
    <>
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/${handle}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-control px-2 text-label font-semibold text-muted-fg transition-colors hover:bg-surface-raised hover:text-fg"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            <span>Back to @{handle}</span>
          </Link>

          {creator?.uid && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSupportOpen(true)}
              leadingIcon={<Heart className="size-4 text-brand-strong" aria-hidden="true" />}
            >
              Support
            </Button>
          )}
        </div>

        {/* Creator identity summary */}
        <Card className="mb-6 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <Avatar src={photoURL} name={displayName} size="md" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-heading font-bold text-fg">
                    Book a meeting
                  </h1>
                  {creator.verified && (
                    <Badge tone="info">
                      <BadgeCheck className="size-3.5" aria-hidden="true" />
                      Verified
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 text-label text-muted-fg">
                  with <span className="font-semibold text-fg">{displayName}</span> · @{handle}
                </p>
              </div>
            </div>

            {isTiered && activeTiers.length > 0 && step !== "success" && step !== "error" && (
              <div className="flex items-center gap-2 text-caption font-semibold text-muted-fg">
                <span
                  className={cn(
                    "rounded-pill px-2.5 py-1",
                    step === "tier-select"
                      ? "bg-brand-soft text-brand-strong"
                      : "bg-surface-sunken text-muted-fg",
                  )}
                >
                  1. Package
                </span>
                <span aria-hidden="true">→</span>
                <span
                  className={cn(
                    "rounded-pill px-2.5 py-1",
                    step === "form"
                      ? "bg-brand-soft text-brand-strong"
                      : "bg-surface-sunken text-muted-fg",
                  )}
                >
                  2. Time & details
                </span>
              </div>
            )}
          </div>
        </Card>

        {step === "tier-select" && isTiered && (
          <Card className="p-5 sm:p-6">
            <div className="mb-5">
              <h2 className="text-title font-bold text-fg">Choose a session package</h2>
              <p className="mt-1 text-label text-muted-fg">
                Select the meeting option that fits what you need.
              </p>
            </div>

            {activeTiers.length === 0 ? (
              <EmptyState
                icon={<CalendarDays className="size-6" aria-hidden="true" />}
                title="No packages available yet"
                description="Check back later or return to the creator's profile."
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {activeTiers.map((tier) => {
                  const offers = (tier.offers || []).filter((o) => o.trim());
                  return (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => selectTier(tier)}
                      className="group flex flex-col justify-between rounded-card border border-line bg-surface-sunken p-5 text-left transition-all hover:border-brand-strong hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-body-lg font-bold text-fg group-hover:text-brand-strong">
                            {tier.name}
                          </h3>
                          <span className="shrink-0 text-title font-black tabular-nums text-brand-strong">
                            {formatTierPrice(tier)}
                          </span>
                        </div>
                        <p className="mt-1 text-caption font-semibold text-muted-fg">
                          {tier.duration} minutes
                        </p>
                        {tier.description && (
                          <p className="mt-2 text-label text-muted-fg">
                            {tier.description}
                          </p>
                        )}
                        {offers.length > 0 && (
                          <ul className="mt-3 space-y-1.5 border-t border-line pt-3">
                            {offers.map((offer, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-2 text-caption text-fg"
                              >
                                <Check
                                  className="mt-0.5 size-3.5 shrink-0 text-brand-strong"
                                  aria-hidden="true"
                                />
                                <span>{offer}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {tier.purpose && (
                          <p className="mt-3 text-caption italic text-muted-fg">
                            {tier.purpose}
                          </p>
                        )}
                      </div>

                      <div className="mt-4 flex items-center gap-1.5 text-label font-bold text-brand-strong">
                        <span>Choose package</span>
                        <ArrowRight
                          className="size-4 transition-transform group-hover:translate-x-0.5"
                          aria-hidden="true"
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
        )}

        {step === "form" && (
          <>
            {isTiered && selectedTier && (
              <Card className="mb-6 flex flex-wrap items-center justify-between gap-3 bg-surface-sunken p-4">
                <div>
                  <p className="text-caption font-semibold text-muted-fg">
                    Selected package
                  </p>
                  <p className="text-body font-bold text-fg">
                    {selectedTier.name} ·{" "}
                    <span className="text-brand-strong">
                      {formatTierPrice(selectedTier)}
                    </span>{" "}
                    · {selectedTier.duration} min
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSelectedTier(null);
                    setStep("tier-select");
                  }}
                >
                  Change package
                </Button>
              </Card>
            )}

            {!hasAvailability ? (
              <Card className="p-6">
                <EmptyState
                  icon={<CalendarDays className="size-6" aria-hidden="true" />}
                  title="Availability not set up yet"
                  description="This creator hasn't added open days or time slots yet."
                  action={
                    <Link
                      href={`/${handle}`}
                      className={buttonClasses({ variant: "secondary" })}
                    >
                      Back to profile
                    </Link>
                  }
                />
              </Card>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start"
              >
                {/* Left column: Date, time, and meeting format */}
                <Card className="space-y-6 p-5 sm:p-6">
                  <div>
                    <div className="mb-4 flex items-center justify-between">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="Previous month"
                        disabled={!canGoPrev}
                        onClick={() =>
                          setCurrentMonth(
                            new Date(
                              currentMonth.getFullYear(),
                              currentMonth.getMonth() - 1,
                              1,
                            ),
                          )
                        }
                      >
                        <ChevronLeft className="size-4" aria-hidden="true" />
                      </Button>
                      <h2 className="text-body font-bold text-fg">
                        {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                      </h2>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="Next month"
                        onClick={() =>
                          setCurrentMonth(
                            new Date(
                              currentMonth.getFullYear(),
                              currentMonth.getMonth() + 1,
                              1,
                            ),
                          )
                        }
                      >
                        <ChevronRight className="size-4" aria-hidden="true" />
                      </Button>
                    </div>

                    <div className="mb-1 grid grid-cols-7 gap-1">
                      {DAYS_OF_WEEK.map((d) => (
                        <div
                          key={d}
                          className="py-1.5 text-center text-caption font-semibold text-muted-fg"
                        >
                          {d}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1.5">
                      {(() => {
                        const firstDay = new Date(
                          currentMonth.getFullYear(),
                          currentMonth.getMonth(),
                          1,
                        ).getDay();
                        const daysInMonth = new Date(
                          currentMonth.getFullYear(),
                          currentMonth.getMonth() + 1,
                          0,
                        ).getDate();
                        const nodes: ReactNode[] = [];
                        for (let i = 0; i < firstDay; i++) {
                          nodes.push(<div key={`empty-${i}`} />);
                        }
                        for (let d = 1; d <= daysInMonth; d++) {
                          const dateStr = `${currentMonth.getFullYear()}-${String(
                            currentMonth.getMonth() + 1,
                          ).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                          const isAvailable = availableDateSet.has(dateStr);
                          const isSelected = selectedDate === dateStr;
                          nodes.push(
                            <button
                              key={dateStr}
                              type="button"
                              disabled={!isAvailable}
                              aria-label={formatReadableDate(dateStr)}
                              aria-pressed={isSelected}
                              onClick={() => isAvailable && setSelectedDate(dateStr)}
                              className={cn(
                                "flex min-h-11 items-center justify-center rounded-control text-label tabular-nums transition-colors outline-none focus-visible:ring-2 focus-visible:ring-focus",
                                isSelected
                                  ? "bg-brand-strong font-bold text-on-brand"
                                  : isAvailable
                                    ? "border border-line bg-surface-raised font-semibold text-fg hover:border-brand-strong hover:bg-brand-soft"
                                    : "cursor-not-allowed text-muted-fg/40",
                              )}
                            >
                              {d}
                            </button>,
                          );
                        }
                        return nodes;
                      })()}
                    </div>
                  </div>

                  {selectedDate ? (
                    <div className="border-t border-line pt-5">
                      <p className="mb-3 flex items-center gap-2 text-label font-bold text-fg">
                        <Clock className="size-4 text-brand-strong" aria-hidden="true" />
                        <span>Select a time for {formatReadableDate(selectedDate)}</span>
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {availability!.defaultSlots.map((slot) => {
                          const slotValue = `${slot.startTime} - ${slot.endTime}`;
                          const active = selectedTime === slotValue;
                          return (
                            <button
                              key={slot.id}
                              type="button"
                              aria-pressed={active}
                              onClick={() => setSelectedTime(slotValue)}
                              className={cn(
                                "min-h-11 rounded-control px-4 text-label font-semibold tabular-nums transition-colors outline-none focus-visible:ring-2 focus-visible:ring-focus",
                                active
                                  ? "bg-brand-strong text-on-brand"
                                  : "border border-line bg-surface-sunken text-fg hover:border-brand-strong hover:bg-surface-raised",
                              )}
                            >
                              {slotValue}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="border-t border-line pt-4 text-caption text-muted-fg">
                      Pick a highlighted day on the calendar to view available times.
                    </p>
                  )}

                  {availability!.bookingType === "both" ? (
                    <div className="border-t border-line pt-5">
                      <p className="mb-3 text-label font-bold text-fg">Meeting format</p>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          aria-pressed={resolvedType === "online"}
                          onClick={() => setSelectedType("online")}
                          className={cn(
                            "flex min-h-11 items-center justify-center gap-2 rounded-control px-3 text-label font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-focus",
                            resolvedType === "online"
                              ? "bg-brand-strong text-on-brand"
                              : "border border-line bg-surface-sunken text-fg hover:bg-surface-raised",
                          )}
                        >
                          <Video className="size-4" aria-hidden="true" />
                          <span>Online</span>
                        </button>
                        <button
                          type="button"
                          aria-pressed={resolvedType === "physical"}
                          onClick={() => setSelectedType("physical")}
                          className={cn(
                            "flex min-h-11 items-center justify-center gap-2 rounded-control px-3 text-label font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-focus",
                            resolvedType === "physical"
                              ? "bg-brand-strong text-on-brand"
                              : "border border-line bg-surface-sunken text-fg hover:bg-surface-raised",
                          )}
                        >
                          <MapPin className="size-4" aria-hidden="true" />
                          <span>In Person</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="border-t border-line pt-4">
                      <p className="inline-flex items-center gap-2 text-caption font-semibold text-muted-fg">
                        {resolvedType === "online" ? (
                          <Video className="size-4 text-brand-strong" aria-hidden="true" />
                        ) : (
                          <MapPin className="size-4 text-brand-strong" aria-hidden="true" />
                        )}
                        <span>
                          {resolvedType === "online" ? "Online video meeting" : "In-person meeting"}
                        </span>
                      </p>
                    </div>
                  )}
                </Card>

                {/* Right column: Contact details & submission */}
                <Card className="space-y-4 p-5 sm:p-6">
                  <div>
                    <h2 className="text-title font-bold text-fg">Your details</h2>
                    <p className="mt-1 text-caption text-muted-fg">
                      We&apos;ll email you updates once {displayName} responds.
                    </p>
                  </div>

                  <Input
                    label="Full name"
                    placeholder="Enter your name"
                    value={name}
                    error={fieldErrors.name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (fieldErrors.name) {
                        setFieldErrors((prev) => ({ ...prev, name: undefined }));
                      }
                    }}
                    required
                  />

                  <Input
                    type="email"
                    label="Email address"
                    placeholder="you@example.com"
                    value={email}
                    error={fieldErrors.email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email) {
                        setFieldErrors((prev) => ({ ...prev, email: undefined }));
                      }
                    }}
                    required
                  />

                  <Input
                    type="tel"
                    label="Phone number (optional)"
                    placeholder="+250 78…"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />

                  <Textarea
                    label="What would you like to discuss? (optional)"
                    placeholder="Share any context or goals for this meeting…"
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />

                  {selectedDate && selectedTime && (
                    <div className="rounded-control border border-line bg-surface-sunken p-3.5 text-caption">
                      <p className="font-bold text-fg">Booking summary</p>
                      <p className="mt-1 text-muted-fg">
                        {formatReadableDate(selectedDate)} · {selectedTime} ·{" "}
                        {resolvedType === "online" ? "Online" : "In person"}
                      </p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    loading={submitting}
                    disabled={!selectedDate || !selectedTime}
                    leadingIcon={<Calendar className="size-4" aria-hidden="true" />}
                  >
                    {isPaidTier
                      ? `Continue to payment (${formatTierPrice(selectedTier!)})`
                      : "Submit booking request"}
                  </Button>
                </Card>
              </form>
            )}
          </>
        )}

        {step === "success" && (
          <Card className="p-8 text-center sm:p-12">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-success-bg text-success">
              <Check className="size-8" aria-hidden="true" />
            </div>
            <h2 className="text-heading font-bold text-fg">
              {isPaidTier ? "Proceed to payment" : "Request sent!"}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-body text-muted-fg">
              {isPaidTier
                ? "Your booking request is pending payment. Complete payment to confirm your slot."
                : `Your booking request has been sent to ${displayName}. You'll receive an email once they respond.`}
            </p>
            <div className="mt-6">
              <Link
                href={`/${handle}`}
                className={buttonClasses({ variant: "primary", size: "md" })}
              >
                Back to profile
              </Link>
            </div>
          </Card>
        )}

        {step === "error" && (
          <Card className="p-8 text-center sm:p-12">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-danger-bg text-danger">
              <AlertCircle className="size-8" aria-hidden="true" />
            </div>
            <h2 className="text-heading font-bold text-fg">Something went wrong</h2>
            <p className="mx-auto mt-2 max-w-md text-body text-muted-fg">
              We couldn&apos;t submit your booking request. Please try again.
            </p>
            <div className="mt-6">
              <Button variant="primary" size="md" onClick={() => setStep("form")}>
                Try again
              </Button>
            </div>
          </Card>
        )}
      </div>

      {supportOpen && creator?.uid && (
        <Suspense fallback={null}>
          <LazySupportSheet
            open={supportOpen}
            onClose={() => setSupportOpen(false)}
            creator={{
              uid: creator.uid,
              handle,
              name: displayName,
              photoURL,
              verified: creator.verified,
              currency: creator.currency,
              storeEnabled: creator.storeEnabled,
              giveawayEnabled: creator.giveawayEnabled,
              gatheringsEnabled: creator.gatheringsEnabled,
              communityEnabled: creator.communityEnabled,
              bookingEnabled: creator.bookingEnabled,
            }}
            isLoggedIn={isLoggedIn}
            user={user}
          />
        </Suspense>
      )}
    </>
  );
}
