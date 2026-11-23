"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Heart,
  Loader2,
  Lock,
  ShoppingBag,
  Users,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { Avatar } from "@/components/ui/Avatar";
import { Button, buttonClasses } from "@/components/ui/Button";
import { RESERVED_USERNAMES } from "@/features/onboarding/reservedUsernames";
import studioPortrait from "@/public/images/creator-studio-portrait.jpg";
import workspaceScene from "@/public/images/creator-workspace-scene.jpg";

interface FeaturedCreator {
  id: string;
  name: string;
  profilePicture?: string;
  photoURL?: string;
  country?: string;
  location?: string;
  focus?: string[];
  verified?: boolean;
}

const FALLBACK_CREATORS: FeaturedCreator[] = [
  {
    id: "kellys",
    name: "Kelly S.",
    country: "RW",
    focus: ["Musician"],
    verified: true,
  },
  {
    id: "achille_songa",
    name: "Achille S.",
    country: "RW",
    focus: ["Producer"],
    verified: false,
  },
  {
    id: "hollboi",
    name: "Hollboi",
    country: "KE",
    focus: ["Comedian"],
    verified: true,
  },
  {
    id: "aline",
    name: "Aline U.",
    country: "RW",
    focus: ["Visual Artist"],
    verified: true,
  },
];

type PreviewTab = "support" | "membership" | "store";

const PRESET_AMOUNTS = [2000, 5000, 10000] as const;

export default function LandingPage({
  initialCreators,
}: {
  initialCreators?: FeaturedCreator[];
}) {
  const { isCreator, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const claimInputRef = useRef<HTMLInputElement>(null);

  const [username, setUsername] = useState("");
  const [usernameCheck, setUsernameCheck] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");
  const [previewTab, setPreviewTab] = useState<PreviewTab>("support");
  const [previewAmount, setPreviewAmount] = useState<number>(5000);

  const featuredCreators: FeaturedCreator[] =
    initialCreators && initialCreators.length >= 4
      ? initialCreators.slice(0, 4)
      : initialCreators && initialCreators.length > 0
        ? [
            ...initialCreators,
            ...FALLBACK_CREATORS.filter(
              (fb) => !initialCreators.some((c) => c.id === fb.id),
            ),
          ].slice(0, 4)
        : FALLBACK_CREATORS;

  const usernameValidation: "idle" | "invalid" | null =
    username.length < 3
      ? "idle"
      : username.length > 19 || !/^[a-z0-9_]+$/.test(username)
        ? "invalid"
        : null;
  const usernameStatus = usernameValidation ?? usernameCheck;

  useEffect(() => {
    if (
      username.length < 3 ||
      username.length > 19 ||
      !/^[a-z0-9_]+$/.test(username)
    ) {
      return;
    }

    let cancelled = false;
    const checkUsername = async () => {
      if (cancelled) return;
      setUsernameCheck("checking");
      try {
        if (RESERVED_USERNAMES.has(username.toLowerCase())) {
          if (!cancelled) setUsernameCheck("taken");
          return;
        }
        const response = await fetch(
          `/api/creators/check-username?username=${encodeURIComponent(username)}`,
        );
        const data = (await response.json()) as { exists?: boolean };
        if (!cancelled) {
          setUsernameCheck(data?.exists ? "taken" : "available");
        }
      } catch {
        if (!cancelled) setUsernameCheck("idle");
      }
    };

    const timeoutId = setTimeout(checkUsername, 400);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [username]);

  const handleClaim = () => {
    if (username.length < 3) {
      toast.info("Enter at least 3 characters for your link.");
      claimInputRef.current?.focus();
    } else if (username.length > 19 || !/^[a-z0-9_]+$/.test(username)) {
      toast.error("Use 3–19 lowercase letters, numbers, or underscores.");
    } else if (usernameStatus === "taken") {
      toast.error("That link is already taken. Try another name.");
    } else {
      router.push(
        `/login?username=${username}&redirect=${encodeURIComponent(pathname)}`,
      );
    }
  };

  const focusClaimInput = () => {
    if (isCreator) {
      router.push("/creator");
      return;
    }
    claimInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    claimInputRef.current?.focus();
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Agaseke",
    url: "https://agaseke.me",
    description:
      "Direct fan support, memberships, digital sales, and bookings for creators — paid out via Mobile Money or bank.",
    applicationCategory: "BusinessApplication",
    operatingSystem: "All",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free to start. 10% fee only when you earn.",
    },
  };

  return (
    <div className="bg-canvas pb-20 text-fg">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* 1. Centered Editorial Hero + Interactive Product Showcase */}
      <section className="px-4 pt-12 pb-10 sm:px-6 sm:pt-20 sm:pb-14 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-label font-semibold text-brand-strong">
            Built for creators across Africa
          </p>

          <h1 className="mt-3 font-display text-display font-bold tracking-tight text-fg [text-wrap:balance] sm:text-hero">
            Get supported directly by your fans.
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-body-lg leading-relaxed text-muted-fg">
            One page for tips, memberships, digital sales, and bookings — paid
            via Mobile Money or card.
          </p>

          <div className="mx-auto mt-8 max-w-lg">
            {isCreator ? (
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/creator"
                  className={buttonClasses({ variant: "primary", size: "lg" })}
                >
                  Open creator space
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/explore"
                  className="inline-flex min-h-11 items-center gap-1.5 text-label font-semibold text-muted-fg transition-colors hover:text-fg"
                >
                  Explore creators
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
                <p className="w-full text-caption text-muted-fg">
                  Signed in as {user?.displayName?.split(" ")[0] || "creator"}
                </p>
              </div>
            ) : (
              <div>
                <div className="flex flex-col gap-2 rounded-card border border-line-strong bg-surface p-1.5 shadow-sm transition-shadow focus-within:ring-2 focus-within:ring-focus sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center px-3">
                    <span className="shrink-0 select-none font-mono text-label font-medium text-muted-fg">
                      agaseke.me/
                    </span>
                    <input
                      ref={claimInputRef}
                      id="claim-username"
                      type="text"
                      value={username}
                      maxLength={19}
                      aria-label="Claim your Agaseke username"
                      placeholder="yourname"
                      autoComplete="username"
                      onChange={(event) => {
                        setUsernameCheck("idle");
                        setUsername(
                          event.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9_]/g, ""),
                        );
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") handleClaim();
                      }}
                      className="min-h-11 min-w-0 flex-1 bg-transparent font-mono text-body font-medium text-fg placeholder:text-muted-fg/60 focus:outline-none"
                    />
                    {usernameStatus === "checking" && (
                      <Loader2
                        className="size-4 shrink-0 animate-spin text-muted-fg"
                        aria-hidden="true"
                      />
                    )}
                    {usernameStatus === "available" && (
                      <Check
                        className="size-4 shrink-0 text-success"
                        aria-label="Available"
                      />
                    )}
                    {(usernameStatus === "taken" ||
                      usernameStatus === "invalid") && (
                      <XCircle
                        className="size-4 shrink-0 text-danger"
                        aria-label="Unavailable"
                      />
                    )}
                  </div>
                  <Button
                    size="md"
                    onClick={handleClaim}
                    className="shrink-0 whitespace-nowrap sm:px-6"
                  >
                    Start free
                  </Button>
                </div>

                <p className="mt-2.5 text-caption text-muted-fg">
                  {usernameStatus === "taken" ? (
                    <span className="font-medium text-danger">
                      That link is already taken — try another name.
                    </span>
                  ) : usernameStatus === "invalid" ? (
                    <span className="font-medium text-danger">
                      Use 3–19 lowercase letters, numbers, or underscores.
                    </span>
                  ) : usernameStatus === "available" ? (
                    <span className="font-medium text-success">
                      agaseke.me/{username} is available to claim.
                    </span>
                  ) : (
                    <span>
                      Free to start · 10% fee only when you earn · Mobile Money
                      &amp; Bank payouts
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Interactive Product Preview Frame */}
        <div className="mx-auto mt-12 max-w-5xl overflow-hidden rounded-sheet border border-line bg-surface shadow-card">
          <div className="grid items-stretch lg:grid-cols-[1.05fr_0.95fr]">
            {/* Visual Creator Moment */}
            <div className="relative min-h-72 overflow-hidden bg-surface-sunken sm:min-h-96">
              <Image
                src={studioPortrait}
                alt="Musician and creator smiling inside a sunlit studio"
                fill
                priority
                referrerPolicy="no-referrer"
                sizes="(max-width: 1024px) 100vw, 520px"
                className="object-cover"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent"
              />
              <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                <div className="flex items-center gap-2 text-on-brand">
                  <p className="font-display text-title font-bold">
                    Aline Uwase
                  </p>
                  <CheckCircle2
                    className="size-4 shrink-0 text-on-brand"
                    aria-hidden="true"
                  />
                </div>
                <p className="mt-1 font-mono text-caption text-on-brand/85">
                  agaseke.me/aline · Musician · Kigali
                </p>
              </div>
            </div>

            {/* Interactive Creator Page Preview */}
            <div className="flex flex-col justify-between p-6 sm:p-8">
              <div>
                <div
                  role="tablist"
                  aria-label="Preview creator tools"
                  className="flex items-center gap-1 rounded-control bg-surface-sunken p-1"
                >
                  {(
                    [
                      { id: "support", label: "Support", icon: Heart },
                      { id: "membership", label: "Membership", icon: Users },
                      { id: "store", label: "Store", icon: ShoppingBag },
                    ] as const
                  ).map(({ id, label, icon: Icon }) => {
                    const active = previewTab === id;
                    return (
                      <button
                        key={id}
                        role="tab"
                        aria-selected={active}
                        type="button"
                        onClick={() => setPreviewTab(id)}
                        className={`flex min-h-11 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-control px-3 text-label font-semibold transition-colors ${
                          active
                            ? "bg-surface text-fg shadow-sm"
                            : "text-muted-fg hover:text-fg"
                        }`}
                      >
                        <Icon className="size-4 shrink-0" aria-hidden="true" />
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 min-h-52">
                  <AnimatePresence mode="wait">
                    {previewTab === "support" && (
                      <motion.div
                        key="support"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.16 }}
                        className="space-y-4"
                      >
                        <div className="flex items-baseline justify-between gap-4">
                          <h2 className="font-display text-title font-bold text-fg">
                            Send support
                          </h2>
                          <span className="font-mono text-label font-semibold tabular-nums text-brand-strong">
                            {previewAmount.toLocaleString()} RWF
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          {PRESET_AMOUNTS.map((amt) => (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => setPreviewAmount(amt)}
                              className={`min-h-11 rounded-control border text-label font-semibold tabular-nums transition-colors ${
                                previewAmount === amt
                                  ? "border-brand-strong bg-brand-soft text-brand-strong"
                                  : "border-line bg-surface text-fg hover:bg-surface-raised"
                              }`}
                            >
                              {amt.toLocaleString()}
                            </button>
                          ))}
                        </div>

                        <p className="rounded-control bg-surface-sunken px-4 py-3 text-label text-muted-fg">
                          &ldquo;Keep dropping the acoustic sessions — excited
                          for your next release.&rdquo;
                        </p>

                        <p className="text-caption text-muted-fg">
                          Pay with MTN MoMo · Airtel Money · Visa &amp; Mastercard
                        </p>
                      </motion.div>
                    )}

                    {previewTab === "membership" && (
                      <motion.div
                        key="membership"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.16 }}
                        className="space-y-4"
                      >
                        <div className="flex items-baseline justify-between gap-4">
                          <h2 className="font-display text-title font-bold text-fg">
                            Inner Circle
                          </h2>
                          <span className="font-mono text-label font-semibold tabular-nums text-brand-strong">
                            $5 / month
                          </span>
                        </div>

                        <ul className="space-y-2.5 text-label text-muted-fg">
                          <li className="flex items-center gap-2.5">
                            <Lock
                              className="size-4 shrink-0 text-brand-strong"
                              aria-hidden="true"
                            />
                            <span>
                              Early access to unreleased tracks &amp; demos
                            </span>
                          </li>
                          <li className="flex items-center gap-2.5">
                            <Users
                              className="size-4 shrink-0 text-brand-strong"
                              aria-hidden="true"
                            />
                            <span>Private supporter feed &amp; group chat</span>
                          </li>
                          <li className="flex items-center gap-2.5">
                            <CalendarDays
                              className="size-4 shrink-0 text-brand-strong"
                              aria-hidden="true"
                            />
                            <span>Member priority for live sessions</span>
                          </li>
                        </ul>

                        <p className="text-caption text-muted-fg">
                          Supporters unlock member posts and chat automatically.
                        </p>
                      </motion.div>
                    )}

                    {previewTab === "store" && (
                      <motion.div
                        key="store"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.16 }}
                        className="space-y-4"
                      >
                        <div className="flex items-baseline justify-between gap-4">
                          <h2 className="font-display text-title font-bold text-fg">
                            Kigali Sessions EP
                          </h2>
                          <span className="font-mono text-label font-semibold tabular-nums text-brand-strong">
                            12,000 RWF
                          </span>
                        </div>

                        <div className="rounded-control bg-surface-sunken p-4">
                          <p className="text-label font-semibold text-fg">
                            Digital download · Studio WAV + lyric booklet
                          </p>
                          <p className="mt-1 text-caption text-muted-fg">
                            Instant delivery right after Mobile Money or card
                            checkout.
                          </p>
                        </div>

                        <p className="text-caption text-muted-fg">
                          Sell digital files, merch, or paid 1:1 bookings from
                          one storefront.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="mt-6 border-t border-line pt-5">
                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  onClick={focusClaimInput}
                  trailingIcon={
                    <ArrowRight className="size-4" aria-hidden="true" />
                  }
                >
                  {isCreator ? "Go to your dashboard" : "Create a page like this"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. What You Can Offer (4-Card Asymmetric Bento) */}
      <section id="features" className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="max-w-xl">
            <p className="text-label font-semibold text-brand-strong">
              Built for direct income
            </p>
            <h2 className="mt-2 font-display text-heading font-bold tracking-tight text-fg [text-wrap:balance] sm:text-display">
              Everything in one creator link.
            </h2>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-12">
            {/* Card 1: Direct Support */}
            <div className="flex flex-col justify-between rounded-card border border-line bg-surface p-6 sm:p-8 md:col-span-7">
              <div>
                <h3 className="font-display text-title font-bold text-fg">
                  Direct fan support
                </h3>
                <p className="mt-2 text-body text-muted-fg">
                  Fans send tips in seconds using MTN MoMo, Airtel Money, Visa,
                  or Mastercard.
                </p>
              </div>

              <div className="mt-6 space-y-2.5">
                <div className="flex items-center justify-between rounded-control bg-surface-sunken px-4 py-3 text-label">
                  <span className="truncate font-medium text-fg">
                    Clarisse N. · MTN MoMo
                  </span>
                  <span className="shrink-0 font-mono font-bold tabular-nums text-fg">
                    +5,000 RWF
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-control bg-surface-sunken px-4 py-3 text-label">
                  <span className="truncate font-medium text-fg">
                    David K. · Card
                  </span>
                  <span className="shrink-0 font-mono font-bold tabular-nums text-fg">
                    +$10.00 USD
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Memberships & Posts */}
            <div className="flex flex-col justify-between rounded-card border border-line bg-surface p-6 sm:p-8 md:col-span-5">
              <div>
                <span className="inline-flex size-10 items-center justify-center rounded-control bg-brand-soft text-brand-strong">
                  <Users className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-5 font-display text-title font-bold text-fg">
                  Memberships &amp; posts
                </h3>
                <p className="mt-2 text-body text-muted-fg">
                  Host monthly supporter tiers with gated posts, essays, audio,
                  and community chat.
                </p>
              </div>
            </div>

            {/* Card 3: Store, Bookings & Events */}
            <div className="flex flex-col justify-between rounded-card border border-line bg-surface p-6 sm:p-8 md:col-span-5">
              <div>
                <span className="inline-flex size-10 items-center justify-center rounded-control bg-brand-soft text-brand-strong">
                  <ShoppingBag className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-5 font-display text-title font-bold text-fg">
                  Store &amp; 1:1 bookings
                </h3>
                <p className="mt-2 text-body text-muted-fg">
                  Sell digital products, merch, coaching sessions, and event
                  tickets with QR check-in.
                </p>
              </div>
            </div>

            {/* Card 4: Local Payouts with Editorial Scene */}
            <div className="relative min-h-60 overflow-hidden rounded-card border border-line bg-surface-sunken md:col-span-7">
              <Image
                src={workspaceScene}
                alt="Creator desk with camera, notebook, and laptop by natural window light"
                fill
                referrerPolicy="no-referrer"
                sizes="(max-width: 768px) 100vw, 580px"
                className="object-cover"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/15"
              />
              <div className="relative flex h-full flex-col justify-end p-6 text-on-brand sm:p-8">
                <h3 className="font-display text-title font-bold">
                  Direct Mobile Money &amp; bank payouts
                </h3>
                <p className="mt-1.5 max-w-md text-label leading-relaxed text-on-brand/90">
                  Withdraw earnings straight to Mobile Money or bank. You keep
                  90% of every tip, membership, and sale.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Featured Creators & 3-Step Strip */}
      <section className="border-y border-line bg-surface px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-display text-heading font-bold tracking-tight text-fg">
              Creators on Agaseke
            </h2>
            <Link
              href="/explore"
              className="inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap text-label font-semibold text-brand-strong hover:underline"
            >
              Explore all
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {featuredCreators.map((creator) => (
              <Link
                key={creator.id}
                href={`/${creator.id}`}
                className="flex items-center gap-3 rounded-card border border-line bg-canvas p-4 outline-none transition-colors hover:border-line-strong hover:bg-surface-raised focus-visible:ring-2 focus-visible:ring-focus"
              >
                <Avatar
                  src={creator.profilePicture || creator.photoURL}
                  name={creator.name}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-body font-bold text-fg">
                      {creator.name}
                    </p>
                    {creator.verified && (
                      <CheckCircle2
                        className="size-4 shrink-0 text-success"
                        aria-label="Verified creator"
                      />
                    )}
                  </div>
                  <p className="truncate font-mono text-caption text-muted-fg">
                    /{creator.id}
                    {creator.focus?.[0] ? ` · ${creator.focus[0]}` : ""}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          <ol className="mt-12 grid gap-8 border-t border-line pt-10 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Claim your link",
                text: "Pick your agaseke.me handle and publish your page in two minutes.",
              },
              {
                step: "02",
                title: "Share anywhere",
                text: "Drop one link in your Instagram, TikTok, YouTube, or WhatsApp bio.",
              },
              {
                step: "03",
                title: "Earn directly",
                text: "Accept Mobile Money or card support and cash out anytime.",
              },
            ].map((item) => (
              <li key={item.step} className="space-y-1.5">
                <p className="font-mono text-caption font-semibold tabular-nums text-brand-strong">
                  {item.step}
                </p>
                <h3 className="font-display text-body-lg font-bold text-fg">
                  {item.title}
                </h3>
                <p className="text-label leading-relaxed text-muted-fg">
                  {item.text}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 4. Simple Final CTA */}
      <section className="px-4 pt-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-sheet bg-brand-strong px-6 py-10 text-on-brand sm:px-12 sm:py-14">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div className="max-w-lg">
              <h2 className="font-display text-heading font-bold tracking-tight [text-wrap:balance] sm:text-display">
                Free to start. 10% only when you earn.
              </h2>
              <p className="mt-2 text-body text-on-brand/90">
                No monthly fee or setup cost. Launch your creator page today.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={isCreator ? "/creator" : "/onboarding"}
                className={buttonClasses({
                  variant: "secondary",
                  size: "lg",
                  className:
                    "border-transparent bg-surface text-brand-strong hover:bg-surface-raised",
                })}
              >
                {isCreator ? "Open creator space" : "Create your page"}
              </Link>
              <Link
                href="/explore/posts"
                className={buttonClasses({
                  variant: "ghost",
                  size: "lg",
                  className: "text-on-brand hover:bg-on-brand/10",
                })}
              >
                Browse posts
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
