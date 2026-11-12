"use client";

import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Calendar, Gift, MessageCircle, Store, Users } from "lucide-react";
import NotFound from "@/app/not-found";
import { useAuth } from "@/auth/AuthContext";
import { CommunityTab } from "@/components/parts/public/CommunityTab";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import type { TabItem } from "@/components/ui/Tabs";
import { t } from "@/lib/i18n";
import { normalizeSocialUrl } from "@/lib/urlUtils";
import {
  clearSupportDraft,
  readPendingSupport,
  readSupportDraft,
  type SupportCreator,
} from "@/features/support";
import { CommunityJoinSheet, type CommunityTierView } from "@/features/community";
import { CreatorPageView } from "./components/CreatorPageView";
import { useCreatorPageData } from "./hooks/useCreatorPageData";
import { usePersistedTab } from "./hooks/usePersistedTab";
import type { CreatorPageInitialData } from "./types";

const LazySupportSheet = lazy(() =>
  import("@/features/support").then((module) => ({
    default: module.SupportSheet,
  })),
);
const LazySupportModal = lazy(() =>
  import("@/components/parts/public/SupportModal").then((module) => ({
    default: module.SupportModal,
  })),
);
const SUPPORT_SHEET_V2 = process.env.NEXT_PUBLIC_SUPPORT_SHEET_V2 !== "0";
const PENDING_FRESH_MS = 30 * 60 * 1000;
const LazyStoreTab = lazy(() =>
  import("@/components/parts/public/StoreTab").then((module) => ({
    default: module.StoreTab,
  })),
);
const LazyGiveawayTab = lazy(() =>
  import("@/components/parts/public/GiveawayTab").then((module) => ({
    default: module.GiveawayTab,
  })),
);
const LazyMessageTab = lazy(() =>
  import("@/components/parts/public/MessageTab").then((module) => ({
    default: module.MessageTab,
  })),
);
const LazyGatheringsTab = lazy(() =>
  import("@/components/parts/public/GatheringsTab").then((module) => ({
    default: module.GatheringsTab,
  })),
);

function TabFallback() {
  return (
    <div className="space-y-3" aria-busy="true">
      <Skeleton className="h-32 w-full" rounded="card" />
      <Skeleton className="h-24 w-full" rounded="card" />
      <Skeleton className="h-24 w-full" rounded="card" />
    </div>
  );
}

function CreatorPageSkeleton() {
  return (
    <div
      className="mx-auto max-w-2xl px-4 pt-4"
      aria-busy="true"
      aria-label={t("common.loading")}
    >
      <Skeleton className="aspect-[16/7] w-full" rounded="card" />
      <div className="-mt-10 px-2">
        <Skeleton className="size-20" rounded="full" />
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-7 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      <div className="mt-5 flex gap-2">
        <Skeleton className="h-12 flex-1" />
        <Skeleton className="h-12 flex-1" />
      </div>
      <div className="mt-6 flex gap-2 border-b border-line pb-3">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}

export type CreatorPageProps = CreatorPageInitialData & {
  username: string;
};

export default function CreatorPage({
  username,
  creator: initialCreator,
  profile: initialProfile,
  partners: initialPartners,
  publicPosts: initialPublicPosts,
  referralId: initialReferralId,
}: CreatorPageProps) {
  const { user, isLoggedIn, isCreator } = useAuth();
  const data = useCreatorPageData(username, {
    creator: initialCreator,
    profile: initialProfile,
    partners: initialPartners,
    publicPosts: initialPublicPosts,
    referralId: initialReferralId,
  });
  const [supportOpen, setSupportOpen] = useState(false);
  const [joinTier, setJoinTier] = useState<CommunityTierView | null>(null);
  const [communityVersion, setCommunityVersion] = useState(0);
  const [resumeReference, setResumeReference] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  const creator = data.creator;
  const displayName =
    creator?.name || data.profile?.displayName || t("creator.fallbackName");
  const handle = creator?.handle || username;
  const bio = creator?.bio || t("creator.noBio");
  const photoURL = creator?.profilePicture || data.profile?.photoURL || null;
  const resumeChecked = useRef(false);

  useEffect(() => {
    if (!creator || resumeChecked.current) return;
    resumeChecked.current = true;

    /* eslint-disable react-hooks/set-state-in-effect -- browser storage can only be resumed after hydration */
    const pending = readPendingSupport(handle);
    if (pending && Date.now() - pending.createdAt < PENDING_FRESH_MS) {
      setResumeReference(pending.reference);
      setSupportOpen(true);
      return;
    }

    if (readSupportDraft(handle)) {
      setSupportOpen(true);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [creator, handle]);

  const closeSupport = () => {
    setSupportOpen(false);
    setResumeReference(null);
    clearSupportDraft();
  };

  const socials = {
    twitter: normalizeSocialUrl(creator?.socials?.twitter, "twitter"),
    instagram: normalizeSocialUrl(creator?.socials?.instagram, "instagram"),
    linkedin: normalizeSocialUrl(creator?.socials?.linkedin, "linkedin"),
    youtube: normalizeSocialUrl(creator?.socials?.youtube, "youtube"),
    tiktok: normalizeSocialUrl(creator?.socials?.tiktok, "tiktok"),
    web: normalizeSocialUrl(creator?.socials?.web, "web"),
  };

  const tabs = useMemo<TabItem[]>(() => {
    if (!creator) return [];
    const items: TabItem[] = [
      {
        id: "community",
        label: t("creator.community"),
        icon: <Users className="size-4" aria-hidden="true" />,
      },
    ];

    if (creator.storeEnabled === true) {
      items.push({
        id: "store",
        label: t("creator.store"),
        icon: <Store className="size-4" aria-hidden="true" />,
      });
    }
    if (creator.giveawayEnabled === true) {
      items.push({
        id: "giveaways",
        label: t("creator.giveaways"),
        icon: <Gift className="size-4" aria-hidden="true" />,
      });
    }
    if (creator.gatheringsEnabled === true) {
      items.push({
        id: "gatherings",
        label: t("creator.events"),
        icon: <Calendar className="size-4" aria-hidden="true" />,
      });
    }
    if (creator.messagingEnabled !== false) {
      items.push({
        id: "message",
        label: t("creator.message"),
        icon: <MessageCircle className="size-4" aria-hidden="true" />,
      });
    }

    return items;
  }, [creator]);

  const [activeTab, setActiveTab] = usePersistedTab(
    `creator:${username}:tab`,
    "community",
    tabs.map((tab) => tab.id),
  );

  if (data.loading) return <CreatorPageSkeleton />;

  if (data.error && !creator) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <ErrorState
          title={t("creator.loadErrorTitle")}
          description={t("creator.loadErrorBody")}
          onRetry={data.retry}
        />
      </div>
    );
  }

  if (!creator) return <NotFound />;

  const supportCreator: SupportCreator = {
    uid: creator.uid,
    handle,
    name: displayName,
    photoURL,
    verified: creator.verified,
    currency: creator.currency,
    storeEnabled: creator.storeEnabled,
    giveawayEnabled: creator.giveawayEnabled,
    gatheringsEnabled: creator.gatheringsEnabled,
    communityEnabled: creator.communityEnabled,
    bookingEnabled: creator.bookingEnabled,
  };

  const tabContent = (() => {
    switch (activeTab) {
      case "community":
        return (
          <CommunityTab
            key={communityVersion}
            publicPosts={data.publicPosts}
            privatePosts={data.privatePosts}
            isSupporter={data.isSupporter}
            name={displayName}
            compact
            username={username}
            uid={creator.uid}
            communityEnabled={creator.communityEnabled === true}
            communityTiers={creator.communityTiers ?? []}
            onSubscribe={setJoinTier}
          />
        );
      case "message":
        return (
          <Suspense fallback={<TabFallback />}>
            <LazyMessageTab
              isLoggedIn={isLoggedIn}
              isSupporter={data.isSupporter}
              setIsModalOpen={setSupportOpen}
              name={displayName}
              handle={username}
              creatorId={creator.uid}
              currentUserId={user?.uid || undefined}
              currentUserName={user?.displayName || undefined}
              creatorData={creator}
              messagingEnabled={creator.messagingEnabled !== false}
              messagingAllowAll={creator.messagingAllowAll !== false}
              messagingMinAmount={creator.messagingMinAmount || 0}
              userTotalSupport={data.profile?.totalSupport || 0}
            />
          </Suspense>
        );
      case "store":
        return (
          <Suspense fallback={<TabFallback />}>
            <LazyStoreTab
              creatorId={creator.uid}
              creatorName={displayName}
              creatorHandle={username}
              creatorPhotoURL={photoURL}
              creatorVerified={creator.verified}
              storePublic={creator.storePublic !== false}
              isLoggedIn={isLoggedIn}
              isSupporter={data.isSupporter}
              setIsModalOpen={setSupportOpen}
              compact={false}
            />
          </Suspense>
        );
      case "giveaways":
        return (
          <Suspense fallback={<TabFallback />}>
            <LazyGiveawayTab
              creatorId={creator.uid}
              creatorName={displayName}
              creatorHandle={username}
              creatorPhotoURL={photoURL}
              creatorVerified={creator.verified}
              isLoggedIn={isLoggedIn}
              isSupporter={data.isSupporter}
              userTotalSupport={data.profile?.totalSupport || 0}
              setIsModalOpen={setSupportOpen}
              currentUserId={user?.uid}
              compact
              username={username}
            />
          </Suspense>
        );
      case "gatherings":
        return (
          <Suspense fallback={<TabFallback />}>
            <LazyGatheringsTab
              creatorId={creator.uid}
              creatorHandle={username}
              creatorName={displayName}
              creatorPhotoURL={photoURL}
              creatorVerified={creator.verified}
              isSupporter={data.isSupporter}
              compact
              username={username}
            />
          </Suspense>
        );
      default:
        return null;
    }
  })();

  return (
    <>
      <CreatorPageView
        creator={creator}
        displayName={displayName}
        handle={handle}
        bio={bio}
        photoURL={photoURL}
        socials={socials}
        partners={data.partners}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSupport={() => setSupportOpen(true)}
        onShare={() => setShareOpen(true)}
        shareOpen={shareOpen}
        onCloseShare={() => setShareOpen(false)}
        isLoggedIn={isLoggedIn}
        showCreateBanner={!isCreator}
      >
        {tabContent}
      </CreatorPageView>

      {joinTier && (
        <CommunityJoinSheet
          open
          onClose={() => setJoinTier(null)}
          creatorName={displayName}
          creatorPhotoURL={photoURL}
          creatorVerified={creator.verified}
          creatorHandle={username}
          creatorUid={creator.uid}
          tiers={creator.communityTiers ?? []}
          initialTierId={joinTier.id}
          user={user}
          displayName={data.profile?.displayName}
          onJoined={() => setCommunityVersion((version) => version + 1)}
        />
      )}

      {supportOpen && (
        <Suspense fallback={null}>
          {SUPPORT_SHEET_V2 ? (
            <LazySupportSheet
              open={supportOpen}
              onClose={closeSupport}
              creator={supportCreator}
              isLoggedIn={isLoggedIn}
              user={user}
              resumeReference={resumeReference}
              onSuccess={data.retry}
            />
          ) : (
            <LazySupportModal
              isOpen={supportOpen}
              onClose={closeSupport}
              creatorName={displayName}
              creatorId={handle}
              uid={creator.uid}
              includeReferral={data.profile?.referralCreator != null}
              referralUid={data.referralId}
              referralId={data.profile?.referralCreator}
            />
          )}
        </Suspense>
      )}
    </>
  );
}
