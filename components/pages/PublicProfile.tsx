/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/db/firebase";
import { ArrowRight } from "lucide-react";
import Navbar from "../parts/Navigation";
import Loading from "@/app/loading";
import NotFound from "@/app/not-found";
import { Creator } from "@/types/creator";
import { useAuth } from "@/auth/AuthContext";
import { SupportModal } from "../parts/public/SupportModal";
import CreatorSchema from "../seo/CreatorSchma";
import { ShareModal } from "../parts/public/ShareModal";
import { LoginNotice } from "../parts/public/LoginNotice";
import { TabManager } from "../parts/public/TabManager";
import { SendGiftSection } from "../parts/public/SendGiftSection";
import { ProtectedSection } from "../parts/public/ProtectedSection";
import { CommunityTab } from "../parts/public/CommunityTab";
import { StoreTab } from "../parts/public/StoreTab";
import { GiveawayTab } from "../parts/public/GiveawayTab";
import { MessageTab } from "../parts/public/MessageTab";

export default function PublicProfile({ username }: { username: string }) {
  const { user: currentUser, isLoggedIn, isCreator } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creatorData, setCreatorData] = useState<Creator | null>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [referralId, setReferralId] = useState("");
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("community");
  const [isSupporter, setIsSupporter] = useState(false);
  const [publicPosts, setPublicPosts] = useState<any[]>([]);

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

  useEffect(() => {
    const checkSupportStatus = async () => {
      if (!isLoggedIn) {
        setIsSupporter(false);
        return;
      }

      try {
        const supportRef = collection(db, "supportedCreators");
        const q = query(
          supportRef,
          where("supporterId", "==", currentUser?.uid),
          where("creatorId", "==", username),
        );
        const querySnapshot = await getDocs(q);

        setIsSupporter(!querySnapshot.empty);

        const contentRef = collection(db, "creatorContent");
        const qPosts = query(
          contentRef,
          where("creatorId", "==", creatorData?.uid),
          where("isPrivate", "==", false),
          orderBy("createdAt", "desc"),
          limit(5),
        );

        const postsSnap = await getDocs(qPosts);
        const postsData = postsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setPublicPosts(postsData);
      } catch (error) {
        console.error("Error checking support status:", error);
      }
    };

    checkSupportStatus();
  }, [isLoggedIn, currentUser, creatorData?.uid]);

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

      <SendGiftSection
        photoURL={creator?.photoURL}
        socials={creator?.socials}
        name={creator?.name}
        verified={creatorData?.verified}
        handle={username}
        bio={creator?.bio}
        setIsShareModalOpen={setIsShareModalOpen}
        setIsModalOpen={setIsModalOpen}
        currentUser={currentUser}
      />

      <TabManager
        name={creator?.name}
        setActiveTab={setActiveTab}
        activeTab={activeTab}
      />

      <main className="max-w-2xl mx-auto px-6 mt-8 min-h-[500px]">
        {activeTab === "community" && (
          <CommunityTab publicPosts={publicPosts} name={creator?.name} />
        )}

        {activeTab === "message" && (
          <MessageTab
            isLoggedIn={isLoggedIn}
            isSupporter={isSupporter}
            setIsModalOpen={setIsModalOpen}
            name={creator?.name}
            handle={username}
          />
        )}

        {activeTab === "store" && <StoreTab />}

        {activeTab === "giveaways" && (
          <GiveawayTab
            isLoggedIn={isLoggedIn}
            setIsModalOpen={setIsModalOpen}
          />
        )}
      </main>

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

      {!isCreator && <LoginNotice loggedIn={isLoggedIn} handle={username} />}

      {isShareModalOpen && (
        <ShareModal
          setIsShareModalOpen={setIsShareModalOpen}
          name={creator?.name ?? ""}
          username={username}
        />
      )}
    </div>
  );
}
