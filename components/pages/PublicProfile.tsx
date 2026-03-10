/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import { doc, getDoc, increment, updateDoc } from "firebase/firestore";
import { db } from "@/db/firebase";
import {
  Lock,
  Calendar,
  User,
  CheckCircle2,
  Heart,
  Zap,
  Star,
  MessageCircle,
  LogIn,
  ArrowRight,
} from "lucide-react";
import Navbar from "../parts/Navigation";
import Loading from "@/app/loading";
import NotFound from "@/app/not-found";
import { Creator } from "@/types/creator";
import { useAuth } from "@/auth/AuthContext";
import Link from "next/link";
import { SupportModal } from "../parts/SupportModal";
import CreatorSchema from "../seo/CreatorSchma";
import { SocialPill } from "../parts/profile/SocialPill";
import { getIcon } from "../parts/profile/GetLink";
import { PerkRow } from "../parts/profile/PerkRow";

export default function PublicProfile({ username }: { username: string }) {
  const { user: currentUser, isLoggedIn, isCreator } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creatorData, setCreatorData] = useState<Creator | null>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [referralId, setReferralId] = useState("");

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
            if (userSnap.data().referralCreator != null) {
              const referralRef = doc(
                db,
                "creators",
                String(userSnap.data().referralCreator),
              );
              const referralSnap = await getDoc(referralRef);
              if (referralSnap.exists()) {
                setReferralId(referralSnap.data().uid);
              }
            }
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
    name: creatorData.name || profileData?.displayName || "Creator",
    handle: username,
    bio: creatorData.bio || "No bio available yet.",
    photoURL: creatorData?.profilePicture
      ? creatorData?.profilePicture
      : profileData?.photoURL,
    socials: {
      twitter: creatorData.socials?.twitter
        ? `https://twitter.com/${creatorData.socials.twitter}`
        : null,
      instagram: creatorData.socials?.instagram
        ? `https://instagram.com/${creatorData.socials.instagram}`
        : null,
      linkedin: creatorData.socials?.linkedin
        ? `${creatorData.socials.linkedin}`
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

  const schemaData = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: creator.name,
    alternateName: creator?.handle,
    url: `https://agaseke.me/${creator?.handle}`,
    image: creator.photoURL || "https://agaseke.me/agaseke.png",
    description: creator.bio || `Content creator on Agaseke`,
    jobTitle: "Creator",
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://agaseke.me/${creator?.handle}`,
    },
    sameAs: [
      creator.socials?.twitter
        ? `https://x.com/${creator.socials.twitter}`
        : null,
      creator.socials?.instagram
        ? `https://instagram.com/${creator.socials.instagram}`
        : null,
      creator.socials?.linkedin ? creator.socials.linkedin : null,
      creator.socials?.youtube ? creator.socials.youtube : null,
      creator.socials?.tiktok ? creator.socials.tiktok : null,
    ].filter(Boolean),
    interactionStatistic: creatorData.views
      ? {
          "@type": "InteractionCounter",
          interactionType: "https://schema.org/WatchAction",
          userInteractionCount: creatorData.views,
        }
      : undefined,
  };

  return (
    <div className="min-h-screen bg-[#FBFBFC] text-slate-900 pb-32 selection:bg-orange-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
      />
      
      <Navbar />
      <CreatorSchema creator={creatorData} handle={username} />

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
              <div className="absolute bottom-0 right-0 bg-green-500 w-6 h-6 border-4 border-white rounded-full shadow-lg" />
            )}
          </div>

          <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 flex items-center justify-center gap-2">
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
              <span className="text-xl font-bold tracking-tight">
                Gift {creator.name.split(" ")[0]}
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
                <Link href="/login" className="underline decoration-2">
                  Log in
                </Link>{" "}
                to stay in touch and track your gifts.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 mt-16 space-y-12">
        {/* SUPPORT PERKS SECTION */}
        <section className="bg-white border border-slate-100 p-8 rounded-lg shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-orange-600 mb-8 flex items-center gap-2">
            <Star size={14} fill="currentColor" /> Why Send a Gift to{" "}
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
              desc="Top gifters get direct messaging access to the creator."
            />
          </div>
        </section>

        {creator.events.length > 0 && (
          <section>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
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
                    <h4 className="font-bold text-lg">{event.title}</h4>
                    <p className="text-sm text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
                      {event.date}{" "}
                      <span className="w-1 h-1 bg-slate-300 rounded-full" />{" "}
                      {event.type}
                    </p>
                  </div>
                </div>
                <button className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase group-hover:bg-orange-600 transition-colors">
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
        includeReferral={profileData?.referralCreator != null}
        referralUid={referralId}
        referralId={profileData?.referralCreator}
      />

      {!isCreator && (
        <div className="fixed bottom-2 right-2 flex justify-center z-[100] pointer-events-none">
          <Link
            href={
              isLoggedIn
                ? `/onboarding?referral=${creator?.handle}`
                : `/login?referral=${creator?.handle}`
            }
            className="pointer-events-auto flex items-center gap-3 bg-slate-900 text-white px-4 py-2 rounded-lg shadow-2xl shadow-orange-500/20 hover:bg-orange-600 hover:-translate-y-1 transition-all duration-300 group"
          >
            <div className="w-4 h-4 bg-orange-600 rounded-lg flex items-center justify-center text-white font-bold text-xs group-hover:bg-white group-hover:text-orange-600 transition-colors">
              a
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-widest leading-none text-orange-400">
                Start yours
              </span>
              <span className="text-sm font-bold leading-tight">
                Create an Agaseke
              </span>
            </div>
            <div className="ml-2 bg-white/10 p-1 rounded-full group-hover:bg-white/20 transition-colors">
              <ArrowRight size={16} />
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
