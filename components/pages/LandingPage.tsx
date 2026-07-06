/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Lock,
  BanknoteArrowDown,
  CheckCircle2,
  HandCoins,
  MessageSquare,
  ShoppingBag,
  ShieldCheck,
  Star,
  Users,
  ArrowRight,
  Loader,
  Check,
  XCircle,
  Globe,
  Heart,
  TrendingUp,
  Smartphone,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import {
  doc,
  getDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import { db } from "@/db/firebase";
import { useAuth } from "@/auth/AuthContext";
import MobileBottomBar from "@/components/parts/MobileBottomBar";
import { FaCcVisa, FaCcMastercard, FaCcAmex } from "react-icons/fa";
import { FeatureCard, Step } from "./landingpage/index";

export default function LandingPage() {
  const { isCreator, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "invalid"
  >("idle");

  const [featuredCreators, setFeaturedCreators] = useState<any[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const fallbackCreators = [
    {
      id: "kellys",
      name: "Kelly S.",
      profilePicture: "https://i.pravatar.cc/150?u=kellys",
      country: "RW",
      focus: ["Musician", "Songwriter"],
      bio: "Afrobeat artist from Kigali. New EP out now.",
      verified: true,
      socials: {
        instagram: "https://instagram.com/kellys",
        twitter: "https://twitter.com/kellys",
      },
    },
    {
      id: "achille_songa",
      name: "Achille S.",
      profilePicture: "https://i.pravatar.cc/150?u=achille",
      country: "RW",
      focus: ["Producer", "Artist"],
      bio: "Beats that cross borders. DM for collabs.",
      verified: false,
      socials: {
        instagram: "https://instagram.com/achille",
        youtube: "https://youtube.com/@achille",
      },
    },
    {
      id: "hollboi",
      name: "Hollboi",
      profilePicture: "https://i.pravatar.cc/150?u=hollboi",
      country: "KE",
      focus: ["Comedian", "Content Creator"],
      bio: "Laughing across East Africa. Tour dates below.",
      verified: true,
      socials: {
        tiktok: "https://tiktok.com/@hollboi",
        instagram: "https://instagram.com/hollboi",
        twitter: "https://twitter.com/hollboi",
      },
    },
  ];

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const creatorsRef = collection(db, "creators");
        const q = query(creatorsRef, orderBy("createdAt", "desc"), limit(5));
        const snap = await getDocs(q);
        const fetched = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setFeaturedCreators(fetched.length > 0 ? fetched : fallbackCreators);
      } catch {
        setFeaturedCreators(fallbackCreators);
      } finally {
        setFeaturedLoading(false);
      }
    };
    fetchFeatured();
  }, []);

  function getFlagEmoji(countryCode: string): string {
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

  const displayCreators = featuredCreators.slice(0, 5);

  const handleCardClick = (id: string) => {
    setExpandedCard((prev) => (prev === id ? null : id));
  };

  useEffect(() => {
    if (username.length < 3) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUsernameStatus("idle");
      return;
    }

    const validUsernameRegex = /^[a-z0-9_]+$/;
    if (!validUsernameRegex.test(username)) {
      setUsernameStatus("invalid");
      return;
    }

    const checkUsername = async () => {
      setUsernameStatus("checking");
      try {
        const docRef = doc(db, "creators", username);
        const docSnap = await getDoc(docRef);
        setUsernameStatus(
          docSnap.exists() ||
            username === "admin" ||
            username === "creator" ||
            username === "supporter" ||
            username === "explore" ||
            username === "login" ||
            username === "signup" ||
            username === "terms" ||
            username === "privacy" ||
            username === "auth" ||
            username === "help-center" ||
            username === "api" ||
            username === "test" ||
            username === "offline" ||
            username === "sitemap" ||
            username === "sitemap.xml" ||
            username === "robots" ||
            username === "robots.txt" ||
            username === "robot" ||
            username === "profile" ||
            username === "payout" ||
            username === "payout-policy" ||
            username === "onboarding" ||
            username === "payment" ||
            username === "dashboard" ||
            username === "checkout" ||
            username === "verify" ||
            username === "payments" ||
            username === "help" ||
            username === "api" ||
            username === "search" ||
            username === "about" ||
            username === "contact" ||
            username === "faq" ||
            username === "privacy" ||
            username === "terms" ||
            username === "support" ||
            username === "feedback" ||
            username === "blog" ||
            username === "contact-us" ||
            username === "help-us-improve" ||
            username === "login-demo" ||
            username === "payout" ||
            username === "settings" ||
            username === "notification" ||
            username === "support-us" ||
            username === "store" ||
            username === "messages" ||
            username === "explore" ||
            username === "artist" ||
            username === "podcasts" ||
            username === "photographers" ||
            username === "vloggers" ||
            username === "dancers" ||
            username === "comedians" ||
            username === "musicians" ||
            username === "public" ||
            username === "business" ||
            username === "entrepreneurs" ||
            username === "athletes" ||
            username === "reviewers" ||
            username === "content-creators" ||
            username === "journalists" ||
            username === "models" ||
            username === "educators" ||
            username === "interviewers" ||
            username === "bloggers" ||
            username === "designers"
            ? "taken"
            : "available",
        );
      } catch (err) {
        console.error(err);
      }
    };

    const timeoutId = setTimeout(checkUsername, 500);
    return () => clearTimeout(timeoutId);
  }, [username]);

  const handleClaim = () => {
    if (username.length > 2) {
      router.push(
        `/login?username=${username}&redirect=${encodeURIComponent(pathname)}`,
      );
    } else {
      toast.info("Please enter a username (at least 3 characters).");
    }
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Agaseke",
    url: "https://agaseke.me",
    description:
      "A private community platform for content creators and influencers across Africa. Your biggest fans support you directly through tips, subscriptions, and exclusive content.",
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
    <div className="min-h-screen bg-card text-foreground selection:bg-orange-100 font-sans pb-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="px-6 py-16 md:py-20 max-w-6xl mx-auto">
        <div className="md:grid md:grid-cols-5 md:gap-12 items-center">
          {/* Left Column - Main Content */}
          <div className="md:col-span-3 text-center md:text-left">
            <div className="mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="bg-orange-50 text-orange-700 px-4 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest inline-block mb-4">
                Audience Monetization Platform
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                For <strong>Influencers, Podcasters, Artists, </strong>
                and <strong>Content Creators</strong> across Africa.
              </p>
            </div>

            <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-6 leading-[1.05] uppercase">
              Build Your <br />
              <span className="text-orange-600">Private Community</span>
            </h1>

            <p className="text-base md:text-lg text-muted-foreground mb-8 max-w-lg leading-relaxed">
              Get paid directly by your biggest fans through tips,
              subscriptions, and exclusive content.
            </p>

            <div className="flex flex-col items-center md:items-start gap-4 mb-10">
              {isCreator ? (
                <div className="animate-in zoom-in duration-500">
                  <button
                    onClick={() => router.push("/creator")}
                    className="group flex items-center gap-4 bg-slate-900 text-white px-10 py-5 rounded-2xl font-black text-lg uppercase tracking-widest hover:bg-orange-600 transition-all shadow-2xl"
                  >
                    <span>Go to my Creator Space</span>
                    <ArrowRight className="group-hover:translate-x-2 transition-transform" />
                  </button>
                  <p className="mt-4 text-muted-foreground font-bold text-xs uppercase tracking-widest text-center md:text-left">
                    Welcome back,{" "}
                    {user?.displayName?.split(" ")[0] || "Creator"}!
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row items-center bg-card p-2 rounded-lg border-2 border-border focus-within:border-orange-500 focus-within:ring-8 focus-within:ring-orange-50 transition-all w-full max-w-lg shadow-2xl shadow-border-strong">
                    <div className="relative flex items-center flex-1 w-full px-4">
                      <span className="text-muted-foreground font-bold select-none text-lg">
                        agaseke.me/
                      </span>
                      <input
                        autoFocus
                        type="text"
                        value={username}
                        onChange={(e) =>
                          setUsername(
                            e.target.value
                              .toLowerCase()
                              .replace(/[^a-z0-9_]/g, ""),
                          )
                        }
                        placeholder="yourname"
                        className={`bg-transparent outline-none font-bold text-slate-800 flex-1 py-5 text-xl placeholder:text-slate-200 w-full tracking-tighter ${
                          usernameStatus === "taken"
                            ? "border-red-400"
                            : usernameStatus === "available"
                              ? "border-green-400"
                              : "border-transparent focus:border-orange-500"
                        }`}
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        {usernameStatus === "checking" && (
                          <Loader
                            className="animate-spin text-slate-300"
                            size={20}
                          />
                        )}
                        {usernameStatus === "available" && (
                          <Check className="text-green-500" size={20} />
                        )}
                        {usernameStatus === "taken" && (
                          <XCircle className="text-red-500" size={20} />
                        )}
                        {usernameStatus === "invalid" && (
                          <XCircle className="text-red-500" size={20} />
                        )}
                      </div>
                    </div>

                    <button
                      onClick={handleClaim}
                      className="w-full sm:w-auto bg-slate-900 text-white px-10 py-5 rounded-lg font-bold text-sm uppercase tracking-widest hover:bg-orange-600 transition-all active:scale-95 whitespace-nowrap shadow-lg"
                    >
                      Start for Free
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest flex items-center gap-2">
                    <ShieldCheck size={14} className="text-green-600" /> It
                    takes 1 minute to set up. No credit card needed.
                  </p>
                </>
              )}
            </div>

            {/* Payment Methods - Compact */}
            <div className="flex flex-wrap items-center gap-4 md:gap-6 pt-6 border-t border-border/50 opacity-60">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
                Get paid via:
              </p>
              <div className="flex items-center gap-2">
                <div className="bg-yellow-400 p-1 rounded-md">
                  <Smartphone size={14} className="text-foreground" />
                </div>
                <span className="font-bold text-xs uppercase tracking-tighter">
                  Mobile Money
                </span>
              </div>
              <div className="flex items-center gap-3">
                <FaCcVisa size={22} className="text-blue-600" />
                <FaCcMastercard size={22} className="text-orange-500" />
                <FaCcAmex size={22} className="text-blue-400" />
              </div>
            </div>
          </div>

          {/* Right Column - Fanned Creator Cards (desktop only) */}
          <div className="hidden md:block md:col-span-2 mt-12 md:mt-0">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-5 text-center">
              Creators on Agaseke
            </p>
            <div className="relative min-h-[250px]">
              {featuredLoading ? (
                <div className="w-full flex items-center justify-center py-16">
                  <div className="w-8 h-8 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : displayCreators.length === 0 ? (
                <div className="flex items-center justify-center gap-0">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="w-[260px] bg-card border border-border rounded-xl p-4 shadow-lg"
                      style={{
                        transform: `rotate(${(i - 1) * 6}deg)`,
                        transformOrigin: "bottom center",
                        marginLeft: i === 0 ? "0" : "-60px",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                          <div className="h-2 w-16 bg-muted rounded animate-pulse" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="relative h-[300px]">
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-[500px] h-[500px] bg-orange-500/[0.07] rotate-45 rounded-3xl" />
                  </div>
                  {displayCreators.map((c, i) => {
                    const angleDeg = (i - 1) * 7;
                    const isExpanded = expandedCard === c.id;
                    return (
                      <motion.div
                        key={c.id}
                        initial={{ opacity: 0, y: 40 }}
                        animate={{
                          opacity: 1,
                          rotate: isExpanded ? 0 : angleDeg,
                          y: isExpanded ? -25 : 0,
                          scale: isExpanded ? 1.05 : 1,
                        }}
                        transition={{
                          delay: 0.2 + i * 0.15,
                          duration: 0.5,
                          rotate: {
                            type: "spring",
                            stiffness: 300,
                            damping: 30,
                          },
                          y: { type: "spring", stiffness: 300, damping: 30 },
                          scale: {
                            type: "spring",
                            stiffness: 300,
                            damping: 30,
                          },
                        }}
                        onClick={() => handleCardClick(c.id)}
                        whileHover={!isExpanded ? { y: -15, scale: 1.02 } : {}}
                        className="absolute left-1/2 cursor-pointer select-none"
                        style={{
                          width: 260,
                          marginLeft: -130,
                          bottom: 0,
                          transformOrigin: "bottom center",
                          zIndex: isExpanded ? 10 : displayCreators.length - i,
                        }}
                      >
                        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xl">
                          <div
                            className={`h-24 bg-gradient-to-r ${i === 0 ? "from-violet-500 to-pink-500" : i === 1 ? "from-blue-500 to-cyan-400" : "from-amber-500 to-orange-500"}`}
                          />
                          <div className="px-4 pb-4">
                            <div className="-mt-12 mb-2 flex items-end justify-between">
                              <div className="relative">
                                <img
                                  src={
                                    c.profilePicture ||
                                    c.photoURL ||
                                    `https://i.pravatar.cc/150?u=${c.id}`
                                  }
                                  className="w-16 h-16 rounded-lg border-[3px] border-white shadow-md object-cover"
                                  alt={c.name}
                                />
                                {c.verified && (
                                  <div className="absolute -bottom-1 -right-1 bg-green-500 w-5 h-5 border-2 border-white rounded-full flex items-center justify-center">
                                    <CheckCircle2
                                      size={10}
                                      className="text-white"
                                    />
                                  </div>
                                )}
                              </div>
                              <span className="text-lg">
                                {getFlagEmoji(c.country || c.location)}
                              </span>
                            </div>
                            <h3 className="font-bold text-base text-foreground leading-tight">
                              {c.name}
                            </h3>
                            <p className="text-[10px] text-orange-600 font-bold tracking-tight">
                              agaseke.me/{c.id}
                            </p>
                            {c.bio && (
                              <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                                {c.bio}
                              </p>
                            )}
                            {c.focus && c.focus.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {c.focus.slice(0, 2).map((f: string) => (
                                  <span
                                    key={f}
                                    className="text-[8px] bg-muted px-1.5 py-0.5 rounded font-bold text-muted-foreground uppercase tracking-wider"
                                  >
                                    {f}
                                  </span>
                                ))}
                              </div>
                            )}
                            {c.socials &&
                              Object.values(c.socials).some(Boolean) && (
                                <div className="flex gap-1 mt-2">
                                  {Object.entries(
                                    c.socials as Record<string, string>,
                                  ).map(([platform, url]) =>
                                    url ? (
                                      <a
                                        key={platform}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-5 h-5 rounded-full bg-muted flex items-center justify-center hover:bg-orange-100 transition-colors group"
                                        title={platform}
                                      >
                                        <span className="text-[7px] font-black text-muted-foreground group-hover:text-orange-600 uppercase">
                                          {platform === "instagram"
                                            ? "IG"
                                            : platform === "twitter"
                                              ? "𝕏"
                                              : platform === "youtube"
                                                ? "YT"
                                                : platform === "tiktok"
                                                  ? "TK"
                                                  : platform.slice(0, 2)}
                                        </span>
                                      </a>
                                    ) : null,
                                  )}
                                </div>
                              )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <section className="border-y border-border bg-card">
        <div className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <p className="text-3xl md:text-4xl font-black text-foreground">
              100+
            </p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
              Creators Onboarded
            </p>
          </div>
          <div>
            <p className="text-3xl md:text-4xl font-black text-foreground">
              USD 2k+
            </p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
              Paid Out to Creators
            </p>
          </div>
          <div>
            <p className="text-3xl md:text-4xl font-black text-foreground">
              30+
            </p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
              Countries Active
            </p>
          </div>
          <div>
            <p className="text-3xl md:text-4xl font-black text-foreground">
              10%
            </p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
              Platform Fee Only
            </p>
          </div>
        </div>
      </section>

      <section className="bg-card py-24 px-6 overflow-hidden">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
              <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-[1.05]">
              Why Creators{" "}
              <span className="text-orange-600">Choose Agaseke</span>
            </h2>
          </div>

          <div className="relative grid md:grid-cols-2 gap-0 md:gap-0">
            {/* Left side — The broken system */}
            <div className="relative bg-red-50/80 p-8 md:p-10 rounded-2xl md:rounded-r-none border border-red-100/50 md:border-r-0 z-10">
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-red-600 mb-6">
                What Platforms Built
              </div>
              <div className="space-y-6">
                {[
                  ["30% Fees", "They take nearly a third of what you earn."],
                  ["No Mobile Money", "Built for card users. Africa uses MoMo."],
                  ["You Don't Own Your Audience", "Followers are rented, not yours."],
                  ["Scattered Tools", "WhatsApp + Forms + Store = chaos."],
                ].map(([title, desc], i) => (
                  <div key={i}>
                    <p className="font-black text-foreground text-lg">{title}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Center divider — visible on md+ */}
            <div className="hidden md:flex absolute left-1/2 top-0 bottom-0 -translate-x-1/2 items-center justify-center z-20">
              <div className="w-10 h-10 rounded-full bg-orange-600 text-white flex items-center justify-center font-black text-lg shadow-lg shadow-orange-200">
                →
              </div>
            </div>

            {/* Right side — Agaseke solution */}
            <div className="relative bg-orange-50/80 p-8 md:p-10 rounded-2xl md:rounded-l-none border border-orange-100/50 md:border-l-0 mt-4 md:mt-0">
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-600 mb-6">
                What Agaseke Built
              </div>
              <div className="space-y-6">
                {[
                  ["10% Flat Fee", "You keep 90%. No hidden cuts."],
                  ["MoMo & Card Payments", "Tips, subscriptions, sales — all supported."],
                  ["You Own Your Community", "Private space for your biggest fans."],
                  ["One Link Does It All", "Content, store, events, messaging — together."],
                ].map(([title, desc], i) => (
                  <div key={i}>
                    <p className="font-black text-foreground text-lg">{title}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Mobile arrow */}
          <div className="flex md:hidden justify-center my-4">
            <div className="w-10 h-10 rounded-full bg-orange-600 text-white flex items-center justify-center font-black text-lg shadow-lg shadow-orange-200">
              ↓
            </div>
          </div>

          <div className="text-center mt-12">
            <p className="text-xl md:text-2xl font-bold text-foreground">
              Global platforms weren't built for African creators.
            </p>
            <p className="text-orange-600 font-black text-lg mt-1">
              Agaseke was.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-6 bg-card border-y border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-4">
              How It Works in <br />
              <span className="text-orange-600">3 Simple Steps</span>
            </h2>
            <p className="text-muted-foreground">
              From zero to earning — faster than posting your next reel.
            </p>
          </div>
          <div className="relative grid md:grid-cols-3 gap-8">
            {/* Connector line */}
            {/* <div className="hidden md:block absolute top-16 left-[16.66%] right-[16.66%] h-0.5 bg-gradient-to-r from-orange-200 via-orange-400 to-orange-200" /> */}
            <Step
              icon={<Star className="text-orange-600" />}
              title="Claim Your Space"
              desc="Set up your creator page in under a minute. No credit card needed — just your name and what you create."
              step={1}
            />
            <Step
              icon={<Globe className="text-orange-600" />}
              title="Move Your Fans Here"
              desc="Share your Agaseke link on Instagram, TikTok, Twitter, or WhatsApp. The fans who value you most will follow."
              step={2}
            />
            <Step
              icon={<Users className="text-orange-600" />}
              title="Start Earning"
              desc="Post exclusive content, connect with your community, and get paid directly through tips, subscriptions, and sales."
              step={3}
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto bg-slate-900 rounded-lg p-12 md:p-20 text-center text-white relative overflow-hidden shadow-2xl">
          <div className="relative z-10">
            <h2 className="text-orange-500 font-bold uppercase tracking-[0.2em] text-sm mb-8">
              No Monthly Fees
            </h2>
            <div className="text-[100px] font-black leading-none mb-4">10%</div>
            <p className="text-xl text-slate-300 max-w-lg mx-auto leading-relaxed mb-10">
              We only make money when <strong>you</strong> make money. A small
              10% platform fee — that's it. No hidden charges, no subscription.
              <span className="block mt-2 text-sm text-orange-400">
                Perfect for individual creators and management companies
                onboarding multiple talents.
              </span>
            </p>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="bg-orange-600 hover:bg-white hover:text-orange-600 text-white px-10 py-5 rounded-lg font-black uppercase tracking-widest transition-all"
            >
              Start Your Community
            </button>
          </div>
        </div>
      </section>
      <MobileBottomBar />
    </div>
  );
}
