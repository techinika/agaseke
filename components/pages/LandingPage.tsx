/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowRight,
  Banknote,
  CalendarDays,
  Check,
  CheckCircle2,
  CreditCard,
  Heart,
  Loader2,
  Lock,
  ShieldCheck,
  Smartphone,
  Store,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { Avatar } from "@/components/ui/Avatar";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { RESERVED_USERNAMES } from "@/features/onboarding/reservedUsernames";

interface FeaturedCreator {
  id: string;
  name: string;
  profilePicture?: string;
  photoURL?: string;
  country?: string;
  location?: string;
  focus?: string[];
  bio?: string;
  verified?: boolean;
}

const FALLBACK_CREATORS: FeaturedCreator[] = [
  {
    id: "kellys",
    name: "Kelly S.",
    country: "RW",
    focus: ["Musician", "Songwriter"],
    bio: "Afrobeat artist from Kigali sharing new releases with supporters.",
    verified: true,
  },
  {
    id: "achille_songa",
    name: "Achille S.",
    country: "RW",
    focus: ["Producer", "Artist"],
    bio: "Beats that cross borders. Open for creative collaborations.",
    verified: false,
  },
  {
    id: "hollboi",
    name: "Hollboi",
    country: "KE",
    focus: ["Comedian", "Creator"],
    bio: "Live stand-up, tour dates, and supporter-only clips across East Africa.",
    verified: true,
  },
];

const FEATURES = [
  {
    icon: Heart,
    title: "Direct fan support",
    text: "Accept tips and one-off contributions in seconds via Mobile Money or card.",
  },
  {
    icon: Users,
    title: "Private community",
    text: "Host your biggest supporters in tiers you control — free from noisy feeds.",
  },
  {
    icon: Lock,
    title: "Posts & longform articles",
    text: "Publish essays, audio, video, and downloads for everyone or members only.",
  },
  {
    icon: CalendarDays,
    title: "Bookings & gatherings",
    text: "Host paid coaching sessions, event tickets with QR check-in, and giveaways.",
  },
  {
    icon: Wallet,
    title: "Local payouts",
    text: "Withdraw earnings directly to Mobile Money or bank with transparent fees.",
  },
  {
    icon: Store,
    title: "Creator store",
    text: "Optionally sell digital downloads or merchandise right from your page.",
  },
];

function getFlagEmoji(countryCode?: string): string {
  if (!countryCode) return "";
  const map: Record<string, string> = {
    RW: "🇷🇼",
    KE: "🇰🇪",
    NG: "🇳🇬",
    ZA: "🇿🇦",
    TZ: "🇹🇿",
    UG: "🇺🇬",
    GH: "🇬🇭",
    CM: "🇨🇲",
    SN: "🇸🇳",
    CI: "🇨🇮",
    ET: "🇪🇹",
    CD: "🇨🇩",
    ZM: "🇿🇲",
    ZW: "🇿🇼",
    MW: "🇲🇼",
    MZ: "🇲🇿",
    AO: "🇦🇴",
    BJ: "🇧🇯",
    ML: "🇲🇱",
    BF: "🇧🇫",
  };
  return map[countryCode.toUpperCase()] || "";
}

export default function LandingPage({
  initialCreators,
}: {
  initialCreators?: FeaturedCreator[];
}) {
  const { isCreator, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [username, setUsername] = useState("");
  const [usernameCheck, setUsernameCheck] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");
  const featuredCreators: FeaturedCreator[] = initialCreators?.length
    ? (initialCreators as any[])
    : FALLBACK_CREATORS;

  const usernameValidation: "idle" | "invalid" | null =
    username.length < 3
      ? "idle"
      : username.length > 19 || !/^[a-z0-9_]+$/.test(username)
        ? "invalid"
        : null;
  const usernameStatus = usernameValidation ?? usernameCheck;

  useEffect(() => {
    if (username.length < 3 || username.length > 19 || !/^[a-z0-9_]+$/.test(username)) {
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
      } catch (error) {
        console.error(error);
        if (!cancelled) setUsernameCheck("idle");
      }
    };

    const timeoutId = setTimeout(checkUsername, 450);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [username]);

  const handleClaim = () => {
    if (username.length < 3) {
      toast.info("Enter a username with at least 3 characters.");
    } else if (username.length > 19 || !/^[a-z0-9_]+$/.test(username)) {
      toast.error("Use 3–19 lowercase letters, numbers, or underscores.");
    } else if (usernameStatus === "taken") {
      toast.error("That link is already taken. Try another name.");
    } else {
      router.push(`/login?username=${username}&redirect=${encodeURIComponent(pathname)}`);
    }
  };

  const usernameError =
    usernameStatus === "taken"
      ? "That link is already taken. Try another one."
      : usernameStatus === "invalid"
        ? "Use 3–19 lowercase letters, numbers, or underscores."
        : undefined;
  const usernameHint =
    usernameStatus === "available"
      ? "Available — claim this link now."
      : usernameStatus === "idle"
        ? "Your public link on agaseke.me"
        : undefined;
  const usernameTrailing =
    usernameStatus === "checking" ? (
      <Loader2 className="size-5 animate-spin text-muted-fg" aria-hidden="true" />
    ) : usernameStatus === "available" ? (
      <Check className="size-5 text-success" aria-hidden="true" />
    ) : usernameStatus === "taken" || usernameStatus === "invalid" ? (
      <XCircle className="size-5 text-danger" aria-hidden="true" />
    ) : undefined;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Agaseke",
    url: "https://agaseke.me",
    description:
      "A private community platform for content creators and influencers. Supporters back your work directly through tips, memberships, store purchases, and bookings.",
    applicationCategory: "BusinessApplication",
    operatingSystem: "All",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free to start. 10% platform fee only when you earn.",
    },
    featureList: [
      "Private Creator Community",
      "Fan Support & Tips",
      "Exclusive Content & Articles",
      "Creator Storefront",
      "Paid Bookings & Gatherings",
      "Mobile Money & Card Payouts",
    ],
    author: {
      "@type": "Organization",
      name: "Techinika Limited",
      url: "https://techinika.co.rw",
    },
  };

  return (
    <div className="bg-canvas pb-20 text-fg">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-caption font-bold uppercase tracking-[0.16em] text-brand-strong">
              Built for African creators
            </p>
            <h1 className="mt-3 max-w-2xl text-display font-black tracking-tight text-fg sm:text-hero">
              Your community and creative work —{" "}
              <span className="text-brand-strong">paid directly.</span>
            </h1>
            <p className="mt-5 max-w-xl text-body-lg leading-relaxed text-muted-fg">
              One home for your biggest supporters. Receive direct support, run memberships,
              share exclusive posts, and accept Mobile Money or card payments with zero
              monthly fee.
            </p>

            <div className="mt-8 max-w-xl">
              {isCreator ? (
                <div className="flex flex-wrap items-center gap-4">
                  <Link
                    href="/creator"
                    className={buttonClasses({ variant: "primary", size: "lg" })}
                  >
                    Open creator space
                    <ArrowRight className="size-5" aria-hidden="true" />
                  </Link>
                  <p className="text-label font-medium text-muted-fg">
                    Signed in as {user?.displayName?.split(" ")[0] || "creator"}
                  </p>
                </div>
              ) : (
                <>
                  <label
                    htmlFor="claim-username"
                    className="mb-1.5 block text-label font-semibold text-fg"
                  >
                    Claim your agaseke.me link
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      id="claim-username"
                      value={username}
                      maxLength={19}
                      onChange={(event) => {
                        setUsernameCheck("idle");
                        setUsername(
                          event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
                        );
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") handleClaim();
                      }}
                      placeholder="yourname"
                      autoComplete="username"
                      error={usernameError}
                      hint={usernameHint}
                      trailing={usernameTrailing}
                      containerClassName="flex-1"
                    />
                    <Button size="lg" onClick={handleClaim} className="sm:shrink-0">
                      Start free
                    </Button>
                  </div>
                  <p className="mt-2 flex items-center gap-2 text-caption text-muted-fg">
                    <ShieldCheck className="size-4 text-success" aria-hidden="true" />
                    Free to start. We only charge 10% when you earn.
                  </p>
                </>
              )}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-6 text-caption font-semibold text-muted-fg">
              <span className="inline-flex items-center gap-1.5">
                <Smartphone className="size-4 text-brand-strong" aria-hidden="true" />
                Mobile Money
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CreditCard className="size-4 text-brand-strong" aria-hidden="true" />
                Visa & Mastercard
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Banknote className="size-4 text-brand-strong" aria-hidden="true" />
                Bank payouts
              </span>
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-caption font-bold uppercase tracking-wider text-muted-fg">
                Featured creators
              </p>
              <Link
                href="/explore"
                className="inline-flex min-h-11 items-center gap-1 text-label font-semibold text-brand-strong hover:underline"
              >
                Explore all
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>

            <div className="space-y-3">
              {featuredCreators.slice(0, 3).map((creator) => {
                const flag = getFlagEmoji(creator.country || creator.location);
                const focusLine = creator.focus?.slice(0, 2).join(" · ");
                return (
                  <Link
                    key={creator.id}
                    href={`/${creator.id}`}
                    className="block rounded-card outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  >
                    <Card className="flex items-start gap-3.5 p-4 transition-colors hover:bg-surface-raised">
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
                          {flag && (
                            <span className="ml-auto text-body" aria-hidden="true">
                              {flag}
                            </span>
                          )}
                        </div>
                        <p className="truncate text-caption font-semibold text-brand-strong">
                          agaseke.me/{creator.id}
                          {focusLine ? (
                            <span className="font-medium text-muted-fg">
                              {" "}
                              · {focusLine}
                            </span>
                          ) : null}
                        </p>
                        {creator.bio && (
                          <p className="mt-1 line-clamp-2 text-caption leading-relaxed text-muted-fg">
                            {creator.bio}
                          </p>
                        )}
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-surface">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-6 px-4 py-10 sm:px-6 lg:grid-cols-4 lg:px-8">
          {[
            ["300+", "Creators"],
            ["USD 2k+", "Paid out"],
            ["30+", "Countries"],
            ["10%", "Flat platform fee"],
          ].map(([value, label]) => (
            <div key={label} className="text-center">
              <p className="text-heading font-black text-fg sm:text-display">{value}</p>
              <p className="mt-1 text-caption font-semibold uppercase tracking-wide text-muted-fg">
                {label}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto w-full max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-caption font-bold uppercase tracking-wider text-brand-strong">
              Everything in one place
            </p>
            <h2 className="mt-2 text-heading font-black text-fg sm:text-display">
              Tools built for direct support
            </h2>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <Card key={title} className="p-5">
                <span className="flex size-10 items-center justify-center rounded-control bg-brand-soft text-brand-strong">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-body-lg font-bold text-fg">{title}</h3>
                <p className="mt-1.5 text-label leading-relaxed text-muted-fg">{text}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-surface-sunken px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-6xl">
          <h2 className="text-heading font-black text-fg sm:text-display">
            Start in three steps
          </h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Claim your link",
                text: "Pick your agaseke.me handle, add a bio, and publish in under two minutes.",
              },
              {
                title: "Share with supporters",
                text: "Add your link to Instagram, TikTok, X, YouTube, or WhatsApp.",
              },
              {
                title: "Earn directly",
                text: "Accept support, memberships, bookings, and more with 90% going to you.",
              },
            ].map(({ title, text }, index) => (
              <li key={title}>
                <Card className="h-full p-6">
                  <p className="text-caption font-bold uppercase tracking-wider text-brand-strong">
                    Step 0{index + 1}
                  </p>
                  <h3 className="mt-2 text-body-lg font-bold text-fg">{title}</h3>
                  <p className="mt-1.5 text-label leading-relaxed text-muted-fg">
                    {text}
                  </p>
                </Card>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="px-4 pt-14 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-6xl overflow-hidden rounded-sheet bg-brand-strong px-6 py-12 text-on-brand sm:px-10 sm:py-14">
          <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <div className="max-w-xl">
              <p className="text-caption font-bold uppercase tracking-[0.18em] text-on-brand/90">
                Simple pricing
              </p>
              <h2 className="mt-2 text-heading font-black sm:text-display">
                Free to start. 10% only when you earn.
              </h2>
              <p className="mt-3 text-body leading-relaxed text-on-brand/90">
                No monthly fees or upfront costs. Your fans pay via Mobile Money or card.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/onboarding"
                className={buttonClasses({
                  variant: "secondary",
                  size: "lg",
                  className:
                    "border-transparent bg-surface text-brand-strong hover:bg-surface-raised",
                })}
              >
                Create your page
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
