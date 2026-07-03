"use client";

import { Calendar, CheckCircle2, Heart, LogIn, Share2, User, MapPin, DollarSign } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SocialPill } from "../profile/SocialPill";
import { getIcon } from "../profile/GetLink";

/* eslint-disable @typescript-eslint/no-explicit-any */
export const SendGiftSection = ({
  name,
  socials,
  photoURL,
  verified,
  handle,
  bio,
<<<<<<< HEAD
  location,
  currency,
=======
  bannerURL,
>>>>>>> main
  setIsShareModalOpen,
  setIsModalOpen,
  currentUser,
  bookingEnabled,
}: {
  name: string;
  socials: {
    twitter: string | null;
    linkedin: string | null;
    youtube: string | null;
    tiktok: string | null;
    instagram: string | null;
    web: string | null;
  };
  photoURL: any;
  verified: boolean;
  handle: string;
  bio: string;
<<<<<<< HEAD
  location?: string;
  currency?: string;
=======
  bannerURL?: string;
>>>>>>> main
  setIsShareModalOpen: any;
  setIsModalOpen: any;
  currentUser: any;
  bookingEnabled?: boolean;
}) => {
  const pathname = usePathname();
  return (
    <div className="relative">
      <div className={`h-48 w-full relative overflow-hidden ${bannerURL ? "" : "bg-linear-to-r from-orange-100 via-orange-50 to-orange-100 dark:from-orange-950 dark:via-orange-900/50 dark:to-orange-950"}`}>
        {bannerURL ? (
          <>
            <img src={bannerURL} className="w-full h-full object-cover" alt="" />
            <div className="absolute inset-0 bg-black/30" />
            <p className="absolute bottom-3 right-4 text-white/15 text-4xl font-black tracking-tighter truncate max-w-[80%] select-none pointer-events-none">
              {name}
            </p>
          </>
        ) : (
          <p className="absolute bottom-3 right-4 text-orange-200 dark:text-orange-800/40 text-4xl font-black tracking-tighter truncate max-w-[80%] select-none pointer-events-none">
            {name}
          </p>
        )}
      </div>
      <div className="max-w-2xl mx-auto px-6 -mt-16 text-center">
        <div className="relative inline-block">
          <div className="w-32 h-32 bg-card rounded-lg p-1 shadow-2xl mx-auto">
            <div className="w-full h-full bg-muted rounded-lg flex items-center justify-center overflow-hidden">
              {photoURL ? (
                <img
                  src={photoURL}
                  alt={name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={50} className="text-muted-foreground" />
              )}
            </div>
          </div>
          {verified && (
            <div className="absolute bottom-0 right-0 bg-green-500 w-6 h-6 border-4 border-white dark:border-card rounded-full shadow-lg" />
          )}
        </div>

        <h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground flex items-center justify-center gap-2">
          {name}{" "}
          {verified && <CheckCircle2 size={20} className="text-orange-600" />}
        </h1>
        <p className="flex items-center justify-center text-orange-600 font-bold text-sm mb-4 tracking-wide">
          agaseke.me/{handle}{" "}
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="ml-3 p-1.5 rounded-full bg-orange-50 dark:bg-orange-900/50 text-orange-600 hover:bg-orange-100 dark:hover:bg-orange-800 transition-all border border-orange-100 dark:border-orange-800"
          >
            <Share2 size={14} />
          </button>
        </p>
        <p className="text-muted-foreground text-lg leading-relaxed max-w-lg mx-auto mb-8 font-medium">
          {bio}
        </p>

        {(location || currency) && (
          <div className="flex flex-wrap justify-center gap-3 mb-6">
            {location && (
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-50 rounded-full border border-slate-100 text-xs font-bold text-slate-500">
                <MapPin size={12} className="text-orange-500" />
                {location}
              </div>
            )}
            {currency && (
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-50 rounded-full border border-slate-100 text-xs font-bold text-slate-500">
                <DollarSign size={12} className="text-emerald-500" />
                {currency}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {Object.entries(socials).map(
            ([key, link]) =>
              link && (
                <SocialPill
                  key={key}
                  icon={getIcon(key)}
                  label={key}
                  link={link}
                />
              ),
          )}
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="group w-full bg-foreground text-background p-2 rounded-lg flex items-center justify-between hover:bg-orange-600 transition-all duration-500 shadow-2xl shadow-orange-100 active:scale-95"
        >
          <div className="flex items-center gap-4 pl-4">
            <div className="bg-background/10 p-3 rounded-lg group-hover:bg-background/20">
              <Heart
                size={24}
                fill="white"
                className="group-hover:animate-pulse"
              />
            </div>
            <span className="text-xl font-bold tracking-tight">
              Gift {name.split(" ")[0]}
            </span>
          </div>
          <div className="bg-background/10 group-hover:bg-background text-background group-hover:text-orange-600 px-6 py-4 rounded-lg font-bold text-sm transition-all uppercase tracking-widest">
            Send a Gift
          </div>
        </button>

        {bookingEnabled && (
          <Link
            href={`/${handle}/booking`}
            className="w-full mt-3 py-3 px-4 border border-border rounded-lg text-muted-foreground font-medium text-sm hover:bg-muted transition-all flex items-center justify-center gap-2"
          >
            <Calendar size={16} className="text-orange-600" />
            Book a Meeting
          </Link>
        )}

        {!currentUser && (
          <div className="mt-6 p-4 bg-orange-50 dark:bg-orange-950 border border-orange-100 dark:border-orange-800 rounded-lg flex items-center justify-center gap-3 text-orange-800 dark:text-orange-200 animate-pulse">
            <LogIn size={18} />
            <p className="text-sm font-bold">
              <Link
                href={`/login?referral=${handle}&redirect=${encodeURIComponent(pathname)}`}
                className="underline decoration-2"
              >
                Log in
              </Link>{" "}
              to stay in touch and track your gifts.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
