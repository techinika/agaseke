"use client";

import { CheckCircle2, Heart, LogIn, Share2, User } from "lucide-react";
import Link from "next/link";
import { SocialPill } from "../profile/SocialPill";
import { getIcon } from "../profile/GetLink";

export const SendGiftSection = ({
  name,
  socials,
  photoURL,
  verified,
  handle,
  bio,
  setIsShareModalOpen,
  setIsModalOpen,
  currentUser,
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
  setIsShareModalOpen: any;
  setIsModalOpen: any;
  currentUser: any;
}) => {
  return (
    <div className="relative">
      <div className="h-48 w-full bg-linear-to-r from-orange-100 via-orange-50 to-orange-100" />
      <div className="max-w-2xl mx-auto px-6 -mt-16 text-center">
        <div className="relative inline-block">
          <div className="w-32 h-32 bg-white rounded-lg p-1 shadow-2xl mx-auto">
            <div className="w-full h-full bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden">
              {photoURL ? (
                <img
                  src={photoURL}
                  alt={name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={50} className="text-slate-300" />
              )}
            </div>
          </div>
          {verified && (
            <div className="absolute bottom-0 right-0 bg-green-500 w-6 h-6 border-4 border-white rounded-full shadow-lg" />
          )}
        </div>

        <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 flex items-center justify-center gap-2">
          {name}{" "}
          {verified && <CheckCircle2 size={20} className="text-orange-600" />}
        </h1>
        <p className="flex items-center justify-center text-orange-600 font-bold text-sm mb-4 tracking-wide">
          agaseke.me/{handle}{" "}
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="ml-3 p-1.5 rounded-full bg-orange-50 text-orange-600 hover:bg-orange-100 transition-all border border-orange-100"
          >
            <Share2 size={14} />
          </button>
        </p>
        <p className="text-slate-500 text-lg leading-relaxed max-w-lg mx-auto mb-8 font-medium">
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
          className="group w-full bg-slate-900 text-white p-2 rounded-lg flex items-center justify-between hover:bg-orange-600 transition-all duration-500 shadow-2xl shadow-orange-100 active:scale-95"
        >
          <div className="flex items-center gap-4 pl-4">
            <div className="bg-white/10 p-3 rounded-lg group-hover:bg-white/20">
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
          <div className="bg-white/10 group-hover:bg-white text-white group-hover:text-orange-600 px-6 py-4 rounded-lg font-bold text-sm transition-all uppercase tracking-widest">
            Send a Gift
          </div>
        </button>

        {!currentUser && (
          <div className="mt-6 p-4 bg-orange-50 border border-orange-100 rounded-lg flex items-center justify-center gap-3 text-orange-800 animate-pulse">
            <LogIn size={18} />
            <p className="text-sm font-bold">
              <Link
                href={`/login?referral=${handle}`}
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
