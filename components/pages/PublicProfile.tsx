/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import {
  doc,
  getDoc,
  increment,
  updateDoc,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/db/firebase";
import {
  Globe,
  Instagram,
  Twitter,
  Lock,
  Calendar,
  User,
  CheckCircle2,
  X,
  Smartphone,
  ShieldCheck,
  Heart,
  Youtube,
  Zap,
  Star,
  MessageCircle,
  LogIn,
} from "lucide-react";
import Navbar from "../parts/Navigation";
import Loading from "@/app/loading";
import NotFound from "@/app/not-found";
import { Creator } from "@/types/creator";
import { useAuth } from "@/auth/AuthContext"; // Assuming this exists
import Link from "next/link";
import { SupportModal } from "../parts/SupportModal";

export default function PublicProfile({ username }: { username: string }) {
  const { user: currentUser } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creatorData, setCreatorData] = useState<Creator | null>(null);
  const [profileData, setProfileData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const creatorRef = doc(db, "creators", username as string);
        const creatorSnap = await getDoc(creatorRef);

        if (creatorSnap.exists()) {
          const cData = creatorSnap.data();
          setCreatorData(cData as any);

          const userRef = doc(db, "profiles", cData.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            setProfileData(userSnap.data());
            await updateDoc(creatorRef, { views: increment(1) });
          }
        }
      } catch (error) {
        console.error("Error fetching creator:", error);
      } finally {
        setLoading(false);
      }
    };
    if (username) fetchData();
  }, [username]);

  if (loading) return <Loading />;
  if (!creatorData) return <NotFound />;

  const creator = {
    uid: creatorData.uid,
    name: profileData?.displayName || creatorData.name || "Creator",
    handle: username,
    bio: creatorData.bio || "No bio available yet.",
    photoURL: profileData?.photoURL,
    socials: {
      twitter: creatorData.socials?.twitter
        ? `https://twitter.com/${creatorData.socials.twitter}`
        : null,
      instagram: creatorData.socials?.instagram
        ? `https://instagram.com/${creatorData.socials.instagram}`
        : null,
      youtube: creatorData.socials?.youtube
        ? `${creatorData.socials.youtube}`
        : null,
      tiktok: creatorData.socials?.tiktok
        ? `${creatorData.socials.tiktok}`
        : null,
      web: creatorData.socials?.web || null,
    },
    events: creatorData.events || [],
  };

  return (
    <div className="min-h-screen bg-[#FBFBFC] text-slate-900 pb-32 selection:bg-orange-100">
      <Navbar />

      <div className="relative">
        <div className="h-48 w-full bg-linear-to-r from-orange-100 via-orange-50 to-orange-100" />
        <div className="max-w-2xl mx-auto px-6 -mt-16 text-center">
          <div className="relative inline-block">
            <div className="w-32 h-32 bg-white rounded-lg p-1 shadow-2xl mx-auto">
              <div className="w-full h-full bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden">
                {creator.photoURL ? (
                  <img
                    src={creator.photoURL}
                    alt={creator.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={50} className="text-slate-300" />
                )}
              </div>
            </div>
            {creatorData.verified && (
              <div className="absolute bottom-1 right-1 bg-green-500 w-6 h-6 border-4 border-white rounded-full shadow-lg" />
            )}
          </div>

          <h1 className="mt-6 text-4xl font-black tracking-tight text-slate-900 flex items-center justify-center gap-2">
            {creator.name}{" "}
            {creatorData.verified && (
              <CheckCircle2 size={20} className="text-orange-600" />
            )}
          </h1>
          <p className="text-orange-600 font-bold text-sm mb-4 tracking-wide">
            agaseke.me/{creator.handle}
          </p>
          <p className="text-slate-500 text-lg leading-relaxed max-w-lg mx-auto mb-8 font-medium">
            {creator.bio}
          </p>

          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {Object.entries(creator.socials).map(
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
              <span className="text-xl font-black tracking-tight">
                Support {creator.name.split(" ")[0]}
              </span>
            </div>
            <div className="bg-white/10 group-hover:bg-white text-white group-hover:text-orange-600 px-6 py-4 rounded-lg font-black text-sm transition-all uppercase tracking-widest">
              Send Support
            </div>
          </button>

          {/* Login Reminder for Guests */}
          {!currentUser && (
            <div className="mt-6 p-4 bg-orange-50 border border-orange-100 rounded-lg flex items-center justify-center gap-3 text-orange-800 animate-pulse">
              <LogIn size={18} />
              <p className="text-sm font-bold">
                <Link href="/login" className="underline decoration-2">
                  Log in
                </Link>{" "}
                to stay in touch and track your support.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 mt-16 space-y-12">
        {/* SUPPORT PERKS SECTION */}
        <section className="bg-white border border-slate-100 p-8 rounded-lg shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-orange-600 mb-8 flex items-center gap-2">
            <Star size={14} fill="currentColor" /> Why Support{" "}
            {creator.name.split(" ")[0]}?
          </h3>
          <div className="space-y-6">
            <PerkRow
              icon={<Lock className="text-orange-500" />}
              title="Private Contents"
              desc="Access daily life updates and exclusive behind-the-scenes footage."
            />
            <PerkRow
              icon={<Zap className="text-orange-500" />}
              title="Early Access"
              desc="Be the first to see new content before it hits the public feed."
            />
            <PerkRow
              icon={<Calendar className="text-orange-500" />}
              title="Private Gatherings"
              desc="Get exclusive invites to intimate meetups and private events."
            />
            <PerkRow
              icon={<MessageCircle className="text-orange-500" />}
              title="Direct Connection"
              desc="Top supporters get direct messaging access to the creator."
            />
          </div>
        </section>

        {creator.events.length > 0 && (
          <section>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                Next Gathering
              </h3>
              <div className="h-px bg-slate-100 flex-1 ml-6" />
            </div>
            {creator.events.map((event: any, i: number) => (
              <div
                key={i}
                className="bg-white border border-slate-100 p-6 rounded-lg flex items-center justify-between group hover:border-orange-500 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-slate-50 p-4 rounded-lg group-hover:bg-orange-50 group-hover:text-orange-600 transition-colors">
                    <Calendar size={24} />
                  </div>
                  <div>
                    <h4 className="font-black text-lg">{event.title}</h4>
                    <p className="text-sm text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
                      {event.date}{" "}
                      <span className="w-1 h-1 bg-slate-300 rounded-full" />{" "}
                      {event.type}
                    </p>
                  </div>
                </div>
                <button className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-black uppercase group-hover:bg-orange-600 transition-colors">
                  Join
                </button>
              </div>
            ))}
          </section>
        )}
      </div>

      <SupportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        creatorName={creator.name}
        creatorId={creator.handle}
        uid={creator.uid}
      />
    </div>
  );
}

function PerkRow({
  icon,
  title,
  desc,
}: {
  icon: any;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="mt-1 w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <h4 className="font-black text-slate-900">{title}</h4>
        <p className="text-sm text-slate-500 leading-relaxed font-medium">
          {desc}
        </p>
      </div>
    </div>
  );
}

function getIcon(key: string) {
  switch (key) {
    case "instagram":
      return <Instagram size={16} />;
    case "twitter":
      return <Twitter size={16} />;
    case "youtube":
      return <Youtube size={16} />;
    default:
      return <Globe size={16} />;
  }
}

function SocialPill({
  icon,
  label,
  link,
}: {
  icon: any;
  label: string;
  link: string;
}) {
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-500 hover:border-orange-500 hover:text-orange-600 hover:shadow-md transition-all capitalize"
    >
      {icon} <span>{label}</span>
    </a>
  );
}