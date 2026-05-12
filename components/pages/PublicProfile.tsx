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
import { CommunityTab } from "../parts/public/CommunityTab";
import { StoreTab } from "../parts/public/StoreTab";
import { GiveawayTab } from "../parts/public/GiveawayTab";
import { MessageTab } from "../parts/public/MessageTab";
import { BookingModal } from "../parts/public/BookingModal";
import { GatheringsTab } from "../parts/public/GatheringsTab";
import Footer from "../parts/Footer";
import { Building2, ExternalLink } from "lucide-react";
import { SeoUpdater } from "../parts/public/SeoUpdater";
import { normalizeSocialUrl } from "@/lib/urlUtils";

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
  const [privatePosts, setPrivatePosts] = useState<any[]>([]);
  const [featuredPartners, setFeaturedPartners] = useState<any[]>([]);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

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
      if (!isLoggedIn || !currentUser?.uid || !username) {
        setIsSupporter(false);
        return;
      }

      try {
        const supportRef = collection(db, "supportedCreators");
        const q = query(
          supportRef,
          where("supporterId", "==", currentUser.uid),
          where("creatorId", "==", username),
        );
        const querySnapshot = await getDocs(q);

        setIsSupporter(!querySnapshot.empty);

        if (!creatorData?.uid) return;

        const contentRef = collection(db, "creatorContent");
        
        // Fetch public posts (for everyone)
        const publicQ = query(
          contentRef,
          where("creatorId", "==", creatorData.uid),
          where("isPrivate", "==", false),
          orderBy("createdAt", "desc"),
          limit(20),
        );
        const publicSnap = await getDocs(publicQ);
        const publicData = publicSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setPublicPosts(publicData);

        // Fetch private posts (only for supporters)
        if (!querySnapshot.empty) {
          const privateQ = query(
            contentRef,
            where("creatorId", "==", creatorData.uid),
            where("isPrivate", "==", true),
            orderBy("createdAt", "desc"),
            limit(20),
          );
          const privateSnap = await getDocs(privateQ);
          const privateData = privateSnap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setPrivatePosts(privateData);
        }
      } catch (error) {
        console.error("Error checking support status:", error);
      }
    };

    checkSupportStatus();
  }, [isLoggedIn, currentUser, creatorData?.uid, username]);

  // Fetch featured partners when creatorData is available
  useEffect(() => {
    if (!creatorData?.uid) return;

    const fetchPartners = async () => {
      try {
        const partnersRef = collection(db, "creatorPartners");
        const partnersQ = query(
          partnersRef,
          where("creatorId", "==", creatorData.uid),
          where("featured", "==", true)
        );
        const partnersSnap = await getDocs(partnersQ);
        const partnersData = partnersSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setFeaturedPartners(partnersData);
      } catch (error) {
        console.error("Error fetching partners:", error);
      }
    };

    fetchPartners();
  }, [creatorData?.uid]);

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
      twitter: normalizeSocialUrl(creatorData.socials?.twitter, "twitter"),
      instagram: normalizeSocialUrl(creatorData.socials?.instagram, "instagram"),
      linkedin: normalizeSocialUrl(creatorData.socials?.linkedin, "linkedin"),
      youtube: normalizeSocialUrl(creatorData.socials?.youtube, "youtube"),
      tiktok: normalizeSocialUrl(creatorData.socials?.tiktok, "tiktok"),
      web: normalizeSocialUrl(creatorData.socials?.web, "web"),
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
      creator.socials?.twitter,
      creator.socials?.instagram,
      creator.socials?.linkedin,
      creator.socials?.youtube,
      creator.socials?.tiktok,
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
    <div className="min-h-screen bg-[#FBFBFC] text-slate-900 selection:bg-orange-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
      />

      <SeoUpdater 
        data={{ creator: creatorData, profile: profileData }} 
        username={username} 
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
        bookingEnabled={creatorData?.bookingEnabled === true}
        setIsBookingModalOpen={setIsBookingModalOpen}
      />

      <TabManager
        name={creator?.name || ""}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        messagingEnabled={creatorData?.messagingEnabled !== false}
        storeEnabled={creatorData?.storeEnabled === true}
        giveawayEnabled={creatorData?.giveawayEnabled === true}
        gatheringsEnabled={creatorData?.gatheringsEnabled === true}
        isSupporter={isSupporter}
        username={username}
      />

      <main className="max-w-2xl mx-auto px-6 mt-8 min-h-[500px]">
        {activeTab === "community" && (
          <CommunityTab 
            publicPosts={publicPosts} 
            privatePosts={privatePosts}
            isSupporter={isSupporter}
            name={creator?.name} 
          />
        )}

        {activeTab === "message" && (
          <MessageTab
            isLoggedIn={isLoggedIn}
            isSupporter={isSupporter}
            setIsModalOpen={setIsModalOpen}
            name={creator?.name}
            handle={username}
            creatorId={creator.uid}
            currentUserId={currentUser?.uid || undefined}
            currentUserName={currentUser?.displayName || undefined}
            creatorData={creatorData}
            messagingEnabled={creatorData?.messagingEnabled !== false}
            messagingAllowAll={creatorData?.messagingAllowAll !== false}
            messagingMinAmount={creatorData?.messagingMinAmount || 0}
            userTotalSupport={profileData?.totalSupport || 0}
          />
        )}

        {activeTab === "store" && (
          <StoreTab
            creatorId={creator.uid}
            creatorName={creator.name}
            creatorHandle={username}
            storePublic={creatorData?.storePublic !== false}
            isLoggedIn={isLoggedIn}
            isSupporter={isSupporter}
            setIsModalOpen={setIsModalOpen}
          />
        )}

        {activeTab === "giveaways" && (
          <GiveawayTab
            creatorId={creator.uid}
            creatorName={creator.name}
            creatorHandle={username}
            isLoggedIn={isLoggedIn}
            isSupporter={isSupporter}
            userTotalSupport={profileData?.totalSupport || 0}
            setIsModalOpen={setIsModalOpen}
            currentUserId={currentUser?.uid}
          />
        )}

        {activeTab === "gatherings" && (
          <GatheringsTab
            creatorId={creator.uid}
            creatorHandle={username}
            isSupporter={isSupporter}
          />
        )}
      </main>

      {featuredPartners.length > 0 && (
        <section className="max-w-2xl mx-auto px-6 py-12">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-[#FBFBFC] px-4 flex items-center gap-2">
                <Building2 size={16} className="text-orange-500" />
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                  Partners & Collaborations
                </span>
              </span>
            </div>
          </div>
          
          <div className="mt-8 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {featuredPartners.map((partner) => (
                <a
                  key={partner.id}
                  href={partner.website || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-orange-50 hover:border-orange-200 border border-transparent transition-all"
                >
                  <div className="w-14 h-14 bg-white rounded-xl overflow-hidden flex items-center justify-center shadow-sm border border-slate-100">
                    {partner.logo ? (
                      <img src={partner.logo} alt={partner.name} className="w-full h-full object-cover" />
                    ) : (
                      <Building2 size={24} className="text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 group-hover:text-orange-700 transition-colors truncate">
                      {partner.name}
                    </p>
                    {partner.description && (
                      <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                        {partner.description}
                      </p>
                    )}
                    {partner.website && (
                      <p className="text-[10px] text-orange-500 mt-1 flex items-center gap-1">
                        Visit Website <ExternalLink size={10} />
                      </p>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

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

      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        creator={creatorData}
      />

      <Footer />
    </div>
  );
}
