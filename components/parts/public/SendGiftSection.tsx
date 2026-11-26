"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Heart,
  LogIn,
  Share2,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/db/firebase";
import { isSubscriptionActive } from "@/lib/contentAccess";
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
  bannerURL,
  setIsShareModalOpen,
  setIsModalOpen,
  currentUser,
  bookingEnabled,
  communityEnabled,
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
  bannerURL?: string;
  setIsShareModalOpen: any;
  setIsModalOpen: any;
  currentUser: any;
  bookingEnabled?: boolean;
  communityEnabled?: boolean;
}) => {
  const pathname = usePathname();
  const [isMember, setIsMember] = useState(false);

  useEffect(() => {
    const uid = currentUser?.uid;
    if (!communityEnabled || !uid || !handle) {
      return;
    }
    let cancelled = false;
    getDocs(
      query(
        collection(db, "communitySubscriptions"),
        where("userId", "==", uid),
      ),
    )
      .then((snap) => {
        if (cancelled) return;
        const active = snap.docs.some((docSnap) => {
          const d = docSnap.data() as Record<string, unknown>;
          return d.creatorHandle === handle && isSubscriptionActive(d);
        });
        setIsMember(active);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [communityEnabled, currentUser?.uid, handle]);

  const showExploreCommunity = Boolean(communityEnabled && currentUser?.uid && handle) && isMember;

  return (
    <div className="relative">
      <div
        className={`h-48 w-full relative overflow-hidden ${bannerURL ? "" : "bg-linear-to-r from-brand-soft via-brand-soft to-brand-soft dark:from-brand-strong dark:via-brand-strong/50 dark:to-brand-strong"}`}
      >
        {bannerURL ? (
          <>
            <img
              src={bannerURL}
              className="w-full h-full object-cover"
              alt=""
              width={1200}
              height={192}
              sizes="100vw"
              decoding="async"
              fetchPriority="high"
            />
            <div className="absolute inset-0 bg-black/30" />
            <p className="absolute bottom-3 right-4 text-white/15 text-4xl font-black tracking-tighter truncate max-w-[80%] select-none pointer-events-none">
              {name}
            </p>
          </>
        ) : (
          <p className="absolute bottom-3 right-4 text-brand-strong dark:text-brand-strong/40 text-4xl font-black tracking-tighter truncate max-w-[80%] select-none pointer-events-none">
            {name}
          </p>
        )}
      </div>
      <div className="max-w-2xl mx-auto px-6 -mt-16 text-center">
        <div className="relative inline-block">
          <div className="w-32 h-32 bg-surface rounded-control p-1 shadow-2xl mx-auto">
            <div className="w-full h-full bg-surface-sunken rounded-control flex items-center justify-center overflow-hidden">
              {photoURL ? (
                <img
                  src={photoURL}
                  alt={name}
                  className="w-full h-full object-cover"
                  width={128}
                  height={128}
                  sizes="128px"
                  decoding="async"
                  fetchPriority="high"
                />
              ) : (
                <User size={50} className="text-muted-fg" />
              )}
            </div>
          </div>
          {verified && (
            <div className="absolute bottom-0 right-0 bg-success w-6 h-6 border-4 border-white dark:border-card rounded-full shadow-lg" />
          )}
        </div>

        <h1 className="mt-6 text-4xl font-bold tracking-tight text-fg flex items-center justify-center gap-2">
          {name}{" "}
          {verified && <CheckCircle2 size={20} className="text-brand-strong" />}
        </h1>
        <p className="flex items-center justify-center text-brand-strong font-bold text-sm mb-4 tracking-wide">
          agaseke.me/{handle}{" "}
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="ml-3 p-1.5 rounded-full bg-brand-soft dark:bg-brand-strong/50 text-brand-strong hover:bg-brand-soft dark:hover:bg-brand-strong transition-all border border-brand-soft dark:border-brand-strong"
          >
            <Share2 size={14} />
          </button>
        </p>
        <p className="text-muted-fg text-lg leading-relaxed max-w-lg mx-auto mb-8 font-medium">
          {bio}
        </p>

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
          className="group w-full bg-foreground text-background p-2 rounded-control flex items-center justify-between hover:bg-brand-strong transition-all duration-500 shadow-2xl shadow-brand-strong active:scale-95"
        >
          <div className="flex items-center gap-4 pl-4">
            <div className="bg-canvas/10 p-3 rounded-control group-hover:bg-canvas/20">
              <Heart
                size={24}
                fill="white"
                className="group-hover:animate-pulse"
              />
            </div>
            <span className="text-xl font-bold tracking-tight">
              Support {name.split(" ")[0]}
            </span>
          </div>
        </button>

        {communityEnabled && (
          <Link
            href={`/${handle}/community`}
            className="w-full mt-3 py-3 px-4 bg-success text-on-success rounded-control font-bold text-sm hover:bg-success transition-all flex items-center justify-center gap-2 shadow-lg shadow-success"
          >
            <Users size={16} />
            {showExploreCommunity
              ? "Explore Community"
              : `Join ${name.split(" ")[0]}'s Community`}
          </Link>
        )}

        {bookingEnabled && (
          <Link
            href={`/${handle}/booking`}
            className="w-full mt-3 py-3 px-4 border border-line rounded-control text-muted-fg font-medium text-sm hover:bg-surface-sunken transition-all flex items-center justify-center gap-2"
          >
            <Calendar size={16} className="text-brand-strong" />
            Book a Meeting
          </Link>
        )}

        {!currentUser && (
          <div className="mt-6 p-4 bg-brand-soft dark:bg-brand-strong border border-brand-soft dark:border-brand-strong rounded-control flex items-center justify-center gap-3 text-brand-strong dark:text-brand-strong animate-pulse">
            <LogIn size={18} />
            <p className="text-sm font-bold">
              <Link
                href={`/login?referral=${handle}&redirect=${encodeURIComponent(pathname)}`}
                className="underline decoration-2"
              >
                Log in
              </Link>{" "}
              to stay in touch and track your support.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
