/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useEffect, useState } from "react";
import {
  Lock,
  CheckCircle2,
  Coffee,
  BanknoteArrowDown,
  HandCoins,
  Zap,
  MessageSquare,
  ShoppingBag,
  ShieldCheck,
  Star,
  Users,
  ArrowRight,
  Loader,
  Check,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/db/firebase";
import { useAuth } from "@/auth/AuthContext";
import { PaymentMethods } from "../parts/home/PaymentSection";

export default function LandingPage() {
  const { isCreator, user } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "invalid"
  >("idle");

  const mockCreators = [
    { name: "Aline", img: "https://i.pravatar.cc/150?u=9" },
    { name: "Cedric", img: "https://i.pravatar.cc/150?u=12" },
    { name: "Sonia", img: "https://i.pravatar.cc/150?u=5" },
    { name: "Gabo", img: "https://i.pravatar.cc/150?u=8" },
  ];

  useEffect(() => {
    if (username.length < 3) {
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
            username === "signup"
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
      router.push(`/login?username=${username}`);
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
      "The creator monetization platform built for Rwanda. Receive fan support, tips, and gifts through local payment methods like MoMo.",
    applicationCategory: "BusinessApplication",
    operatingSystem: "All",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "RWF",
      description: "Free to start. 10% platform fee only when you earn.",
    },
    featureList: [
      "Mobile Money (MoMo) Payments",
      "Fan Support & Tips",
      "Exclusive Creator Space",
      "Monthly Payouts",
      "Personalized Creator Profile",
    ],
    author: {
      "@type": "Organization",
      name: "Techinika Limited",
      url: "https://techinika.co.rw",
    },
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-orange-100 font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="px-6 py-16 md:py-24 max-w-6xl mx-auto text-center">
        {/* Social Proof & Audience Labels */}
        <div className="flex flex-col items-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex -space-x-3 mb-4">
            {mockCreators.map((c, i) => (
              <img
                key={i}
                src={c.img}
                className="w-10 h-10 rounded-full border-4 border-white shadow-md object-cover"
                alt={c.name}
              />
            ))}
            <div className="w-10 h-10 rounded-full border-4 border-white bg-orange-600 flex items-center justify-center text-[10px] font-bold text-white shadow-md">
              50+
            </div>
          </div>
          <div className="bg-orange-50 text-orange-700 px-4 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest mb-2">
            Built for Rwandan Creators
          </div>
          <p className="text-sm font-medium text-slate-500 max-w-sm">
            The home for <strong>Influencers, Podcasters, Artists, </strong>
            and <strong>Content Creators</strong> in Rwanda.
          </p>
        </div>

        <h1 className="text-5xl md:text-8xl font-black tracking-tighter mb-8 leading-[0.9] uppercase">
          Get paid for <br />
          <span className="text-orange-600">Doing what you love</span>
        </h1>

        <p className="text-lg md:text-xl text-slate-600 mb-12 max-w-2xl mx-auto leading-relaxed">
          Agaseke is a simple link you put in your Bio. Your fans use it to
          <strong> send you gifts and tips</strong>, buy your digital products
          or merchs, or join your private community.
        </p>

        <div className="flex flex-col items-center gap-4 mb-20">
          {isCreator ? (
            <div className="animate-in zoom-in duration-500">
              <button
                onClick={() => router.push("/dashboard")}
                className="group flex items-center gap-4 bg-slate-900 text-white px-12 py-6 rounded-2xl font-black text-lg uppercase tracking-widest hover:bg-orange-600 transition-all shadow-2xl"
              >
                <span>Go to my Creator Space</span>
                <ArrowRight className="group-hover:translate-x-2 transition-transform" />
              </button>
              <p className="mt-4 text-slate-400 font-bold text-xs uppercase tracking-widest text-center">
                Welcome back, {user?.displayName?.split(" ")[0] || "Creator"}!
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row items-center bg-white p-2 rounded-lg border-2 border-slate-100 focus-within:border-orange-500 focus-within:ring-8 focus-within:ring-orange-50 transition-all w-full max-w-xl shadow-2xl shadow-slate-200">
                <div className="relative flex items-center flex-1 w-full px-4">
                  <span className="text-slate-400 font-bold select-none text-lg">
                    agaseke.me/
                  </span>
                  <input
                    autoFocus
                    type="text"
                    value={username}
                    onChange={(e) =>
                      setUsername(
                        e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
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
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck size={14} className="text-green-600" /> It takes 1
                minute to set up.
              </p>
            </>
          )}
        </div>
      </header>

      <PaymentMethods />

      <section className="bg-slate-50 py-24 px-6 border-y border-slate-100">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-4">
              One link, Many ways to earn
            </h2>
            <p className="text-slate-500">
              No need for complicated websites. Just use Agaseke.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<HandCoins />}
              title="Accept Tips & Gifts"
              desc="Your fans can send you support (like 'virtual coffee') directly to your Agaseke wallet."
            />
            <FeatureCard
              icon={<ShoppingBag />}
              title="Sell Your Work"
              desc="Sell your beats, photos, PDFs, lessons or merchs. Your fans pay and get the file instantly."
            />
            <FeatureCard
              icon={<Zap />}
              title="Run Giveaways"
              desc="Reward your followers with lucky draws and quizzes. Our system picks the winner for you."
            />
            <FeatureCard
              icon={<MessageSquare />}
              title="Chat with Fans"
              desc="Open a private message space for people who support you. Build a real community."
            />
            <FeatureCard
              icon={<Lock />}
              title="Private Content"
              desc="Post special photos or videos that only your 'supporters' can see and enjoy."
            />
            <FeatureCard
              icon={<BanknoteArrowDown />}
              title="Simple Payouts"
              desc="We send your total earnings to your MoMo or Bank account every month. No stress."
            />
          </div>
        </div>
      </section>

      <section className="py-24 px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-black uppercase tracking-tighter mb-12 text-orange-600">
            As easy as...
          </h2>
          <div className="grid md:grid-cols-3 gap-12">
            <Step
              icon={<Star className="text-orange-600" />}
              title="Create your Page"
              desc="Claim your name and add a nice profile picture."
            />
            <Step
              icon={<ShoppingBag className="text-orange-600" />}
              title="Add your stuff"
              desc="Tell fans how they can support you or what you are offering."
            />
            <Step
              icon={<Users className="text-orange-600" />}
              title="Share the link"
              desc="Put agaseke.me/yourname in your Instagram or TikTok Bio."
            />
          </div>
        </div>
      </section>

      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto bg-slate-900 rounded-lg p-12 md:p-20 text-center text-white relative overflow-hidden shadow-2xl">
          <div className="relative z-10">
            <h2 className="text-orange-500 font-bold uppercase tracking-[0.2em] text-sm mb-8">
              No Monthly Fees
            </h2>
            <div className="text-[100px] font-black leading-none mb-4">10%</div>
            <p className="text-xl text-slate-300 max-w-sm mx-auto leading-relaxed mb-10">
              We only make money when <strong>you</strong> make money. We take a
              small 10% fee from your earnings.
            </p>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="bg-orange-600 hover:bg-white hover:text-orange-600 text-white px-10 py-5 rounded-lg font-black uppercase tracking-widest transition-all"
            >
              Start Now
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="p-8 rounded-lg bg-white border border-slate-200/50 hover:shadow-xl hover:border-orange-100 transition-all duration-300">
      <div className="mb-6 inline-flex p-3 bg-orange-50 rounded-xl text-orange-600">
        {React.cloneElement(icon as React.ReactElement, { size: 24 } as any)}
      </div>
      <h3 className="text-lg font-bold uppercase tracking-tight mb-2">
        {title}
      </h3>
      <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

function Step({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-16 h-16 bg-slate-50 rounded-lg flex items-center justify-center mb-6 border border-slate-100 shadow-sm">
        {React.cloneElement(icon as React.ReactElement, { size: 28 } as any)}
      </div>
      <h4 className="font-bold uppercase tracking-tighter text-lg mb-2">
        {title}
      </h4>
      <p className="text-slate-500 text-sm">{desc}</p>
    </div>
  );
}
