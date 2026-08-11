/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useRef, Suspense, lazy } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  query,
  updateDoc,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/db/firebase";
import { useRouter } from "next/navigation";
import NotFound from "@/app/not-found";
import { useAuth } from "@/auth/AuthContext";
import { SupportModal } from "../parts/public/SupportModal";
import CreatorSchema from "../seo/CreatorSchma";
import { ShareModal } from "../parts/public/ShareModal";
import { LoginNotice } from "../parts/public/LoginNotice";
import { TabManager } from "../parts/public/TabManager";
import { SendGiftSection } from "../parts/public/SendGiftSection";
import { CommunityTab } from "../parts/public/CommunityTab";
import { Building2, ExternalLink } from "lucide-react";
import { normalizeSocialUrl } from "@/lib/urlUtils";

const LazyStoreTab = lazy(() =>
  import("../parts/public/StoreTab").then((m) => ({ default: m.StoreTab })),
);
const LazyGiveawayTab = lazy(() =>
  import("../parts/public/GiveawayTab").then((m) => ({ default: m.GiveawayTab })),
);
const LazyMessageTab = lazy(() =>
  import("../parts/public/MessageTab").then((m) => ({ default: m.MessageTab })),
);
const LazyGatheringsTab = lazy(() =>
  import("../parts/public/GatheringsTab").then((m) => ({ default: m.GatheringsTab })),
);

function TabFallback() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="h-32 bg-muted/60 rounded-2xl animate-pulse" />
      <div className="h-24 bg-muted/60 rounded-2xl animate-pulse" />
      <div className="h-24 bg-muted/60 rounded-2xl animate-pulse" />
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-2xl px-6" aria-busy="true">
      <div className="mt-8">
        <div className="h-40 sm:h-52 bg-muted/60 rounded-2xl animate-pulse" />
        <div className="mt-6 flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-muted/60 animate-pulse" />
          <div className="flex-1 space-y-3">
            <div className="h-5 w-1/2 bg-muted/60 rounded-lg animate-pulse" />
            <div className="h-3 w-1/3 bg-muted/60 rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="mt-5 space-y-2">
          <div className="h-3 w-full bg-muted/60 rounded-lg animate-pulse" />
          <div className="h-3 w-4/5 bg-muted/60 rounded-lg animate-pulse" />
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="h-12 bg-muted/60 rounded-xl animate-pulse" />
          <div className="h-12 bg-muted/60 rounded-xl animate-pulse" />
        </div>
      </div>
      <div className="mt-10 flex gap-6 border-b border-border">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-4 w-16 bg-muted/60 rounded-lg animate-pulse" />
        ))}
      </div>
      <div className="mt-8 space-y-4">
        <div className="h-28 bg-muted/60 rounded-2xl animate-pulse" />
        <div className="h-28 bg-muted/60 rounded-2xl animate-pulse" />
        <div className="h-28 bg-muted/60 rounded-2xl animate-pulse" />
      </div>
    </div>
  );
}

const GENERAL_WORKER_URL =
  process.env.NEXT_PUBLIC_GENERAL_WORKER_URL || "http://localhost:8787";

export default function PublicProfile({
  username,
  initialCreator,
  initialProfile,
  initialPartners,
  initialPublicPosts,
  initialReferralId,
}: {
  username: string;
  initialCreator?: any;
  initialProfile?: any;
  initialPartners?: any[];
  initialPublicPosts?: any[];
  initialReferralId?: string | null;
}) {
  const { user: currentUser, isLoggedIn, isCreator } = useAuth();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creatorData, setCreatorData] = useState<any>(initialCreator || null);
  const [profileData, setProfileData] = useState<any>(initialProfile || null);
  const [loading, setLoading] = useState(!initialCreator);
  const [fetchError, setFetchError] = useState(false);
  const [referralId, setReferralId] = useState<string | null>(
    initialReferralId ?? null,
  );
  const [isSupporter, setIsSupporter] = useState(false);
  const [publicPosts, setPublicPosts] = useState<any[]>(
    initialPublicPosts?.length
      ? initialPublicPosts.map((p) => ({
          ...p,
          createdAt:
            typeof p.createdAt === "string"
              ? Timestamp.fromMillis(new Date(p.createdAt).getTime())
              : p.createdAt,
        }))
      : [],
  );
  const [privatePosts, setPrivatePosts] = useState<any[]>([]);
  const [featuredPartners, setFeaturedPartners] = useState<any[]>(
    initialPartners || [],
  );
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("community");

  useEffect(() => {
    if (initialCreator || !username) return;

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
          }
        } else {
          setFetchError(true);
        }
      } catch (error) {
        console.error("Error fetching creator:", error);
        setFetchError(true);
        fetch(`${GENERAL_WORKER_URL}/api/general/log-error`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            level: "error",
            category: "general",
            message: "Error fetching creator in PublicProfile",
            metadata: { username, error: String(error) },
          }),
        }).catch(() => {});
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  useEffect(() => {
    const fetchPosts = async () => {
      if (!creatorData?.uid || !username) return;

      const contentRef = collection(db, "creatorContent");

      // Only re-fetch public posts when we don't already have server-provided ones
      if (!initialPublicPosts?.length) {
        try {
          const publicQ = query(
            contentRef,
            where("creatorId", "in", [creatorData.handle, creatorData.uid]),
            where("isPrivate", "==", false),
            limit(10),
          );
          const publicSnap = await getDocs(publicQ);
          setPublicPosts(
            publicSnap.docs
              .map((doc) => ({ id: doc.id, ...doc.data() }) as any)
              .sort(
                (a, b) =>
                  (b.createdAt?.toMillis?.() || 0) -
                  (a.createdAt?.toMillis?.() || 0),
              )
              .slice(0, 3),
          );
        } catch (error) {
          console.error("Error fetching public posts:", error);
        }
      }

      // Only check support status and fetch private posts if logged in
      if (!isLoggedIn || !currentUser?.uid) {
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

        if (!querySnapshot.empty) {
          const privateQ = query(
            contentRef,
            where("creatorId", "in", [creatorData.handle, creatorData.uid]),
            where("isPrivate", "==", true),
            limit(10),
          );
          const privateSnap = await getDocs(privateQ);
          setPrivatePosts(
            privateSnap.docs
              .map((doc) => ({ id: doc.id, ...doc.data() }) as any)
              .sort(
                (a, b) =>
                  (b.createdAt?.toMillis?.() || 0) -
                  (a.createdAt?.toMillis?.() || 0),
              )
              .slice(0, 3),
          );
        }
      } catch (error) {
        console.error("Error checking support status:", error);
      }
    };

    fetchPosts();
  }, [isLoggedIn, currentUser, creatorData?.uid, username]);

  // Fetch featured partners when creatorData is available
  useEffect(() => {
    if (!creatorData?.uid || initialPartners?.length) return;

    const fetchPartners = async () => {
      try {
        const partnersRef = collection(db, "creatorPartners");
        const partnersQ = query(
          partnersRef,
          where("creatorId", "==", creatorData.uid),
          where("featured", "==", true),
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

  const viewCounted = useRef(false);

  useEffect(() => {
    if (!username || viewCounted.current) return;
    const key = `viewed_${username}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    viewCounted.current = true;
    const creatorRef = doc(db, "creators", username);
    updateDoc(creatorRef, { views: increment(1) }).catch((err) => { console.error("Failed to update view count", err); });
  }, [username]);

  if (loading) return <ProfileSkeleton />;
  if (fetchError && !creatorData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-6">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Couldn&apos;t load this profile
          </h2>
          <p className="text-muted-foreground mb-6">
            There was a network error while fetching this creator. Please try
            again.
          </p>
          <button
            onClick={() => router.refresh()}
            className="bg-foreground text-background px-6 py-3 rounded-lg font-bold hover:bg-orange-600 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }
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
      instagram: normalizeSocialUrl(
        creatorData.socials?.instagram,
        "instagram",
      ),
      linkedin: normalizeSocialUrl(creatorData.socials?.linkedin, "linkedin"),
      youtube: normalizeSocialUrl(creatorData.socials?.youtube, "youtube"),
      tiktok: normalizeSocialUrl(creatorData.socials?.tiktok, "tiktok"),
      web: normalizeSocialUrl(creatorData.socials?.web, "web"),
    },
    events: creatorData.events || [],
  };

  return (
    <>
      <CreatorSchema creator={creatorData} handle={username} />

      <SendGiftSection
        photoURL={creator?.photoURL}
        socials={creator?.socials}
        name={creator?.name}
        verified={creatorData?.verified}
        handle={username}
        bio={creator?.bio}
        bannerURL={creatorData?.bannerURL}
        setIsShareModalOpen={setIsShareModalOpen}
        setIsModalOpen={setIsModalOpen}
        currentUser={currentUser}
        bookingEnabled={creatorData?.bookingEnabled === true}
        communityEnabled={creatorData?.communityEnabled === true}
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
            compact={true}
            username={username}
            uid={creator?.uid || ""}
          />
        )}

        {activeTab === "message" && (
          <Suspense fallback={<TabFallback />}>
            <LazyMessageTab
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
          </Suspense>
        )}

        {activeTab === "store" && (
          <Suspense fallback={<TabFallback />}>
            <LazyStoreTab
              creatorId={creator.uid}
              creatorName={creator.name}
              creatorHandle={username}
              storePublic={creatorData?.storePublic !== false}
              isLoggedIn={isLoggedIn}
              isSupporter={isSupporter}
              setIsModalOpen={setIsModalOpen}
              compact={false}
            />
          </Suspense>
        )}

        {activeTab === "giveaways" && (
          <Suspense fallback={<TabFallback />}>
            <LazyGiveawayTab
              creatorId={creator.uid}
              creatorName={creator.name}
              creatorHandle={username}
              isLoggedIn={isLoggedIn}
              isSupporter={isSupporter}
              userTotalSupport={profileData?.totalSupport || 0}
              setIsModalOpen={setIsModalOpen}
              currentUserId={currentUser?.uid}
              compact={true}
              username={username}
            />
          </Suspense>
        )}

        {activeTab === "gatherings" && (
          <Suspense fallback={<TabFallback />}>
            <LazyGatheringsTab
              creatorId={creator.uid}
              creatorHandle={username}
              isSupporter={isSupporter}
              compact={true}
              username={username}
            />
          </Suspense>
        )}
      </main>

      {featuredPartners.length > 0 && (
        <section className="max-w-2xl mx-auto px-6 py-12">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-4 flex items-center gap-2">
                <Building2 size={16} className="text-orange-500" />
                <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
                  Partners & Collaborations
                </span>
              </span>
            </div>
          </div>

          <div className="mt-8 bg-card rounded-2xl border border-border p-6 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {featuredPartners.map((partner) => (
                <a
                  key={partner.id}
                  href={partner.website || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-4 p-4 bg-muted rounded-xl hover:bg-orange-50 hover:border-orange-200 border border-transparent transition-all"
                >
                  <div className="w-14 h-14 bg-card rounded-xl overflow-hidden flex items-center justify-center shadow-sm border border-border">
                    {partner.logo ? (
                      <img
                        src={partner.logo}
                        alt={partner.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Building2 size={24} className="text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground group-hover:text-orange-700 transition-colors truncate">
                      {partner.name}
                    </p>
                    {partner.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
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
    </>
  );
}
