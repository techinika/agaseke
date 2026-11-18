/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { useAuth } from "@/auth/AuthContext";
import { CreatorSubpage } from "@/components/shell/CreatorSubpage";
import { CommunityTab } from "@/components/parts/public/CommunityTab";
import { CommunityJoinSheet, type CommunityTierView } from "@/features/community";
import { useCreatorSubpageData } from "@/features/creator-page/hooks/useCreatorSubpageData";
import { db } from "@/db/firebase";
import { t } from "@/lib/i18n";

const GENERAL_WORKER_URL =
  process.env.NEXT_PUBLIC_GENERAL_WORKER_URL || "http://localhost:8787";

function logError(message: string, username: string, error: unknown) {
  fetch(`${GENERAL_WORKER_URL}/api/general/log-error`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      level: "error",
      category: "general",
      message,
      metadata: { username, error: String(error) },
    }),
  }).catch(() => {});
}

export default function CommunityPage({ username }: { username: string }) {
  const { user } = useAuth();
  const data = useCreatorSubpageData(username);
  const [publicPosts, setPublicPosts] = useState<any[]>([]);
  const [privatePosts, setPrivatePosts] = useState<any[]>([]);
  const [joinTier, setJoinTier] = useState<CommunityTierView | null>(null);

  const uid = data.creator?.uid;

  useEffect(() => {
    if (!uid || !username) return;
    let cancelled = false;
    const contentRef = collection(db, "creatorContent");
    const creatorIds = [data.creator?.handle, uid].filter(Boolean) as string[];

    const load = async () => {
      try {
        const publicQuery = query(
          contentRef,
          where("creatorId", "in", creatorIds),
          where("isPrivate", "==", false),
          limit(20),
        );
        const snapshot = await getDocs(publicQuery);
        if (cancelled) return;
        const posts = snapshot.docs
          .map((item) => ({ id: item.id, ...item.data() }))
          .filter((item: any) => item.status !== "draft")
          .sort(
            (a: any, b: any) =>
              (b.publishedAt?.toMillis?.() ?? b.createdAt?.toMillis?.() ?? 0) -
              (a.publishedAt?.toMillis?.() ?? a.createdAt?.toMillis?.() ?? 0),
          );
        setPublicPosts(posts);
      } catch (error) {
        if (!cancelled) {
          console.error("Error fetching public posts:", error);
          logError("Error fetching public posts", username, error);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [uid, username, data.creator?.handle]);

  useEffect(() => {
    if (!uid || !username || !user?.uid || !data.isSupporter) {
      queueMicrotask(() => setPrivatePosts([]));
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const snapshot = await getDocs(
          query(
            collection(db, "creatorContent"),
            where("creatorId", "in", [data.creator?.handle, uid].filter(Boolean)),
            where("isPrivate", "==", true),
            limit(20),
          ),
        );
        if (cancelled) return;
        const posts = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
        posts.sort(
          (a: any, b: any) =>
            (b.publishedAt?.toMillis?.() ?? b.createdAt?.toMillis?.() ?? 0) -
            (a.publishedAt?.toMillis?.() ?? a.createdAt?.toMillis?.() ?? 0),
        );
        setPrivatePosts(posts);
      } catch (error) {
        if (!cancelled) {
          console.error("Error fetching private posts:", error);
          logError("Error checking support status", username, error);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [uid, username, user?.uid, data.isSupporter, data.creator?.handle]);

  return (
    <CreatorSubpage
      username={username}
      title={t("creator.community")}
      description={t("creatorSubpage.communityDescription", { name: data.creatorName })}
      data={data}
    >
      {() => (
        <>
          <CommunityTab
            publicPosts={publicPosts}
            privatePosts={privatePosts}
            isSupporter={data.isSupporter}
            name={data.creatorName}
            username={username}
            uid={uid ?? ""}
            communityEnabled={data.creator?.communityEnabled === true}
            communityTiers={data.creator?.communityTiers ?? []}
            onSubscribe={setJoinTier}
          />

          {joinTier && data.creator && (
            <CommunityJoinSheet
              open
              onClose={() => setJoinTier(null)}
              creatorName={data.creatorName}
              creatorPhotoURL={data.creator.photoURL}
              creatorVerified={data.creator.verified}
              creatorHandle={username}
              creatorUid={data.creator.uid}
              tiers={data.creator.communityTiers ?? []}
              initialTierId={joinTier.id}
              user={user}
              displayName={data.profile?.displayName as string | undefined}
              onJoined={data.retry}
            />
          )}
        </>
      )}
    </CreatorSubpage>
  );
}
