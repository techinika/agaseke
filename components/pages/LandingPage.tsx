/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowRight,
  Banknote,
  CalendarCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  CreditCard,
  HandCoins,
  Heart,
  Loader,
  Lock,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Store,
  TrendingUp,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

const FALLBACK_CREATORS = [
  {
    id: "kellys",
    name: "Kelly S.",
    profilePicture: "https://i.pravatar.cc/150?u=kellys",
    country: "RW",
    focus: ["Musician", "Songwriter"],
    bio: "Afrobeat artist from Kigali. New EP out now.",
    verified: true,
  },
  {
    id: "achille_songa",
    name: "Achille S.",
    profilePicture: "https://i.pravatar.cc/150?u=achille",
    country: "RW",
    focus: ["Producer", "Artist"],
    bio: "Beats that cross borders. Open for collabs.",
    verified: false,
  },
  {
    id: "hollboi",
    name: "Hollboi",
    profilePicture: "https://i.pravatar.cc/150?u=hollboi",
    country: "KE",
    focus: ["Comedian", "Creator"],
    bio: "Laughing across East Africa. Tour dates below.",
    verified: true,
  },
];

const FEATURES = [
  {
    icon: Users,
    title: "A community you own",
    text: "Invite your biggest fans into a private space that belongs to you, not an algorithm.",
  },
  {
    icon: Lock,
    title: "Exclusive content",
    text: "Publish posts and articles for everyone, your supporters, or a specific tier.",
  },
  {
    icon: Store,
    title: "A store that fits your work",
    text: "Sell physical or digital products from your page with secure checkout.",
  },
  {
    icon: CalendarCheck,
    title: "Paid bookings",
    text: "Offer one-on-one sessions and get paid for your time.",
  },
  {
    icon: CalendarDays,
    title: "Gatherings and giveaways",
    text: "Sell tickets to events and run giveaways that bring your audience closer.",
  },
  {
    icon: Wallet,
    title: "Payouts that make sense",
    text: "Withdraw to Mobile Money or bank in the currency you earn in.",
  },
];

const PAINS = [
  "Platform fees take a large cut of your work.",
  "Tools are built for cards, not Mobile Money.",
  "Your audience belongs to an algorithm.",
  "Content, store, and messages live in different places.",
];

const WINS = [
  "A flat 10% platform fee. You keep 90%.",
  "Mobile Money and card payments in one place.",
  "Your supporters, your community, your rules.",
  "Content, store, bookings, and messages together.",
];

function getFlagEmoji(countryCode?: string): string {
  if (!countryCode) return "🌍";
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
  return map[countryCode.toUpperCase()] || "🌍";
}

export default function LandingPage({ initialCreators }: { initialCreators?: any[] }) {
  const { isCreator, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [username, setUsername] = useState("");
  const [usernameCheck, setUsernameCheck] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");
  const featuredCreators = initialCreators?.length ? initialCreators : FALLBACK_CREATORS;

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
        const response = await fetch(
          `/api/creators/check-username?username=${encodeURIComponent(username)}`,
        );
        const data = (await response.json()) as { exists?: boolean };
        const reserved = new Set([
          "admin",
          "creator",
          "supporter",
          "explore",
          "login",
          "signup",
          "terms",
          "privacy",
          "auth",
          "help-center",
          "api",
          "test",
          "offline",
          "sitemap",
          "sitemap.xml",
          "robots",
          "robots.txt",
          "robot",
          "profile",
          "payout",
          "payout-policy",
          "content-guidelines",
          "onboarding",
          "payment",
          "dashboard",
          "checkout",
          "verify",
          "payments",
          "help",
          "search",
          "about",
          "contact",
          "faq",
          "support",
          "feedback",
          "blog",
          "contact-us",
          "help-us-improve",
          "login-demo",
          "settings",
          "notification",
          "support-us",
          "store",
          "messages",
          "artist",
          "podcasts",
          "photographers",
          "vloggers",
          "dancers",
          "comedians",
          "musicians",
          "public",
          "business",
          "entrepreneurs",
          "athletes",
          "reviewers",
          "content-creators",
          "journalists",
          "models",
          "educators",
          "interviewers",
          "bloggers",
          "designers",
          "transactions",
          "bookings",
          "for-creators",
          "for-supporters",
          "for-brands",
        ]);
        if (!cancelled) {
          setUsernameCheck(
            Boolean(data?.exists) || reserved.has(username) ? "taken" : "available",
          );
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) setUsernameCheck("idle");
      }
    };

    const timeoutId = setTimeout(checkUsername, 500);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [username]);

  const handleClaim = () => {
    if (username.length < 3) {
      toast.info("Please enter a username (at least 3 characters).");
    } else if (username.length > 19) {
      toast.error("Username must be under 20 characters.");
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
      ? "This link is available."
      : usernameStatus === "idle"
        ? "This will be your public Agaseke link."
        : undefined;
  const usernameTrailing =
    usernameStatus === "checking" ? (
      <Loader className="size-5 animate-spin text-muted-fg" aria-hidden="true" />
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
      "A private community platform for content creators and influencers. Your biggest fans support you directly through tips, subscriptions, and exclusive content.",
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
      "Exclusive Content",
      "Direct Fan Messaging",
      "Mobile Money & Card Payments",
      "Digital Storefront",
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
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <Badge tone="brand" className="mb-5 gap-1.5 px-3 py-1">
              <Sparkles className="size-3.5" aria-hidden="true" />
              Built for African creators
            </Badge>
            <h1 className="max-w-2xl text-display font-black tracking-tight text-fg sm:text-hero">
              Build your private community.
              <span className="block text-brand-strong">Get paid directly.</span>
            </h1>
            <p className="mt-5 max-w-xl text-body-lg leading-relaxed text-muted-fg">
              Agaseke gives creators one home for content, community, store, bookings, and
              events — with Mobile Money and card payments from your biggest fans.
            </p>

            <div className="mt-8 max-w-xl">
              {isCreator ? (
                <div className="flex flex-col gap-3">
                  <Link
                    href="/creator"
                    className={buttonClasses({ variant: "primary", size: "lg" })}
                  >
                    Go to my creator space
                    <ArrowRight className="size-5" aria-hidden="true" />
                  </Link>
                  <p className="text-label font-medium text-muted-fg">
                    Welcome back, {user?.displayName?.split(" ")[0] || "creator"}.
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
                      placeholder="yourname"
                      autoComplete="username"
                      error={usernameError}
                      hint={usernameHint}
                      trailing={usernameTrailing}
                      containerClassName="flex-1"
                    />
                    <Button size="lg" onClick={handleClaim} className="sm:shrink-0">
                      Start for free
                    </Button>
                  </div>
                  <p className="mt-2 flex items-center gap-2 text-caption text-muted-fg">
                    <ShieldCheck className="size-4 text-success" aria-hidden="true" />
                    Takes a minute. No credit card needed.
                  </p>
                </>
              )}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-line pt-6 text-caption font-semibold text-muted-fg">
              <span className="uppercase tracking-wide">Get paid via</span>
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
                Bank payout
              </span>
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-label font-bold uppercase tracking-wide text-muted-fg">
                Creators on Agaseke
              </p>
              <Link
                href="/explore"
                className="inline-flex min-h-11 items-center gap-1 text-label font-semibold text-brand-strong"
              >
                Explore
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>

            <div className="space-y-3">
              {featuredCreators.slice(0, 3).map((creator) => (
                <Card
                  key={creator.id}
                  className="flex items-start gap-3 p-4 transition-colors hover:bg-surface-raised"
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
                      <span className="ml-auto text-body">
                        {getFlagEmoji(creator.country || creator.location)}
                      </span>
                    </div>
                    <p className="truncate text-caption font-semibold text-brand-strong">
                      agaseke.me/{creator.id}
                    </p>
                    {creator.bio && (
                      <p className="mt-1 line-clamp-2 text-caption leading-relaxed text-muted-fg">
                        {creator.bio}
                      </p>
                    )}
                    {creator.focus?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {creator.focus.slice(0, 2).map((focus: string) => (
                          <Badge key={focus} tone="neutral">
                            {focus}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-surface">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-6 px-4 py-10 sm:px-6 lg:grid-cols-4 lg:px-8">
          {[
            ["300+", "Creators onboarded"],
            ["USD 2k+", "Paid to creators"],
            ["30+", "Countries active"],
            ["10%", "Platform fee only"],
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

      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto w-full max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-heading font-black text-fg sm:text-display">
              Everything your audience needs, in one place
            </h2>
            <p className="mt-3 text-body text-muted-fg">
              No patchwork of links, forms, and payment apps. Your page connects the whole
              relationship with your supporters.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <Card key={title} className="p-5">
                <span className="flex size-11 items-center justify-center rounded-control bg-brand-soft text-brand-strong">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-body-lg font-bold text-fg">{title}</h3>
                <p className="mt-1.5 text-label leading-relaxed text-muted-fg">{text}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-surface-sunken px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto w-full max-w-5xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-heading font-black text-fg sm:text-display">
              Global platforms were not built for African creators
            </h2>
            <p className="mt-3 text-body text-muted-fg">
              Agaseke starts with how creators here actually get paid and how fans
              actually support them.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <Card className="p-6">
              <p className="text-label font-bold uppercase tracking-wide text-muted-fg">
                The usual stack
              </p>
              <ul className="mt-4 space-y-3">
                {PAINS.map((item) => (
                  <li key={item} className="flex gap-3 text-label text-muted-fg">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-danger-bg text-danger">
                      <XCircle className="size-3.5" aria-hidden="true" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="border-brand-strong/30 bg-brand-soft p-6">
              <p className="text-label font-bold uppercase tracking-wide text-brand-strong">
                With Agaseke
              </p>
              <ul className="mt-4 space-y-3">
                {WINS.map((item) => (
                  <li key={item} className="flex gap-3 text-label text-fg">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-surface text-success">
                      <Check className="size-3.5" aria-hidden="true" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto w-full max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-heading font-black text-fg sm:text-display">
              From claim to first supporter in three steps
            </h2>
          </div>

          <ol className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              {
                icon: Sparkles,
                title: "Claim your space",
                text: "Choose your link, add what you create, and publish your page. No credit card needed.",
              },
              {
                icon: TrendingUp,
                title: "Move your fans",
                text: "Share your Agaseke link on Instagram, TikTok, X, or WhatsApp and bring your audience home.",
              },
              {
                icon: HandCoins,
                title: "Start earning",
                text: "Post exclusive content, open your store, take bookings, and get paid directly.",
              },
            ].map(({ icon: Icon, title, text }, index) => (
              <li key={title}>
                <Card className="h-full p-6">
                  <div className="flex items-center justify-between">
                    <span className="flex size-11 items-center justify-center rounded-control bg-brand-soft text-brand-strong">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="text-display font-black text-line-strong">
                      {index + 1}
                    </span>
                  </div>
                  <h3 className="mt-4 text-body-lg font-bold text-fg">{title}</h3>
                  <p className="mt-1.5 text-label leading-relaxed text-muted-fg">
                    {text}
                  </p>
                </Card>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="px-4 pb-8 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-sheet bg-brand-strong px-6 py-12 text-center text-on-brand sm:px-10 sm:py-16">
          <p className="text-label font-bold uppercase tracking-[0.2em] text-on-brand/90">
            No monthly fees
          </p>
          <p className="mt-3 text-hero font-black leading-none">10%</p>
          <h2 className="mt-4 text-heading font-black sm:text-display">
            We only earn when you earn
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-body leading-relaxed text-on-brand/90">
            A flat 10% platform fee on what you earn. No subscriptions, no hidden charges,
            no surprise cuts.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/onboarding"
              className={buttonClasses({
                variant: "secondary",
                size: "lg",
                className:
                  "border-transparent bg-surface text-brand-strong hover:bg-surface-raised",
              })}
            >
              Start your community
            </Link>
            <Link
              href="/for-creators"
              className={buttonClasses({
                variant: "ghost",
                size: "lg",
                className: "text-on-brand hover:bg-on-brand/10",
              })}
            >
              See how it works
              <ArrowRight className="size-5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-4 rounded-card border border-line bg-surface p-6 sm:flex-row">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-full bg-brand-soft text-brand-strong">
              <Heart className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-body font-bold text-fg">Here to support creators?</p>
              <p className="text-label text-muted-fg">
                Explore pages, join communities, and back the work you love.
              </p>
            </div>
          </div>
          <Link
            href="/explore"
            className={buttonClasses({ variant: "secondary", size: "md" })}
          >
            Explore creators
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}
