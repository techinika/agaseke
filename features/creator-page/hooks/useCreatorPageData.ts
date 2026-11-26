"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import {
  countCreatorView,
  fetchActiveCommunityTierIds,
  fetchCreatorRecord,
  fetchFeaturedPartners,
  fetchPrivatePosts,
  fetchPublicPosts,
  isSupportingCreator,
} from "../api";
import type {
  CreatorPageCreator,
  CreatorPageInitialData,
  CreatorPagePartner,
  CreatorPagePost,
  CreatorPageProfile,
} from "../types";
import { normalizePost, postTime } from "../utils";

export function useCreatorPageData(username: string, initial: CreatorPageInitialData) {
  const { user: currentUser, isLoggedIn } = useAuth();
  const [creator, setCreator] = useState<CreatorPageCreator | null>(
    initial.creator ?? null,
  );
  const [profile, setProfile] = useState<CreatorPageProfile | null>(
    initial.profile ?? null,
  );
  const [publicPosts, setPublicPosts] = useState<CreatorPagePost[]>(() =>
    (initial.publicPosts ?? []).map(normalizePost),
  );
  const [privatePosts, setPrivatePosts] = useState<CreatorPagePost[]>([]);
  const [partners, setPartners] = useState<CreatorPagePartner[]>(initial.partners ?? []);
  const [isSupporter, setIsSupporter] = useState(false);
  const [activeCommunityTierIds, setActiveCommunityTierIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(!initial.creator);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [referralId, setReferralId] = useState<string | null>(initial.referralId ?? null);

  const hasInitialCreator = Boolean(initial.creator);
  const hasInitialPosts = initial.publicPosts !== undefined;
  const hasInitialPartners = initial.partners !== undefined;

  useEffect(() => {
    if (hasInitialCreator || !username) return;
    let cancelled = false;

    async function run() {
      try {
        const result = await fetchCreatorRecord(username);
        if (!result) {
          if (!cancelled) setError(true);
          return;
        }
        if (cancelled) return;

        setCreator(result.creator);
        setProfile(result.profile);
        setReferralId(result.referralId);
      } catch (caught) {
        console.error("Error fetching creator:", caught);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [hasInitialCreator, reloadKey, username]);

  const creatorUid = creator?.uid;
  const creatorHandle = creator?.handle ?? username;

  useEffect(() => {
    if (!creatorUid || !username) return;
    const uid = creatorUid;
    let cancelled = false;

    async function run() {
      if (!hasInitialPosts) {
        try {
          const posts = await fetchPublicPosts(creatorHandle, uid);
          if (!cancelled) {
            setPublicPosts(
              posts
                .sort((a, b) => postTime(b) - postTime(a))
                .slice(0, 6)
                .map(normalizePost),
            );
          }
        } catch (caught) {
          console.error("Error fetching public posts:", caught);
        }
      }

      if (!isLoggedIn || !currentUser?.uid) {
        if (!cancelled) {
          setIsSupporter(false);
          setActiveCommunityTierIds([]);
        }
        return;
      }

      try {
        const [supporting, tierIds] = await Promise.all([
          isSupportingCreator(currentUser.uid, username),
          fetchActiveCommunityTierIds(currentUser.uid, creatorHandle).catch(() => []),
        ]);
        if (cancelled) return;
        setIsSupporter(supporting);
        setActiveCommunityTierIds(tierIds);
        if (!supporting && tierIds.length === 0) return;

        const posts = await fetchPrivatePosts(creatorHandle, uid);
        if (!cancelled) {
          setPrivatePosts(
            posts
              .sort((a, b) => postTime(b) - postTime(a))
              .slice(0, 6)
              .map(normalizePost),
          );
        }
      } catch (caught) {
        console.error("Error checking support status:", caught);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [
    creatorHandle,
    creatorUid,
    currentUser?.uid,
    hasInitialPosts,
    isLoggedIn,
    reloadKey,
    username,
  ]);

  useEffect(() => {
    if (!creatorUid || hasInitialPartners) return;
    const uid = creatorUid;
    let cancelled = false;

    async function run() {
      try {
        const records = await fetchFeaturedPartners(uid);
        if (!cancelled) setPartners(records);
      } catch (caught) {
        console.error("Error fetching partners:", caught);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [creatorUid, hasInitialPartners, reloadKey]);

  const viewCounted = useRef(false);

  useEffect(() => {
    if (!username || viewCounted.current) return;

    const key = `viewed_${username}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Storage can be unavailable; still count the view once per mount.
    }

    viewCounted.current = true;
    countCreatorView(username).catch((caught) => {
      console.error("Failed to update view count", caught);
    });
  }, [username]);

  const retry = useCallback(() => {
    setError(false);
    setLoading(!creator);
    setReloadKey((value) => value + 1);
  }, [creator]);

  return {
    creator,
    profile,
    publicPosts,
    privatePosts,
    partners,
    isSupporter,
    activeCommunityTierIds,
    isCommunityMember: activeCommunityTierIds.length > 0,
    loading,
    error,
    referralId,
    retry,
  };
}
