"use client";

import { useCallback, useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { useAuth } from "@/auth/AuthContext";
import { db } from "@/db/firebase";
import type { Creator } from "@/types/creator";

export interface CreatorSubpageData {
  loading: boolean;
  creator: Creator | null;
  profile: Record<string, unknown> | null;
  isSupporter: boolean;
  referralId: string;
  error: boolean;
  creatorName: string;
  retry: () => void;
}

export function useCreatorSubpageData(username: string): CreatorSubpageData {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [creator, setCreator] = useState<Creator | null>(null);
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [isSupporter, setIsSupporter] = useState(false);
  const [referralId, setReferralId] = useState("");
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    if (!username) {
      queueMicrotask(() => setLoading(false));
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(false);
      try {
        const creatorSnap = await getDoc(doc(db, "creators", username));
        if (cancelled) return;
        if (!creatorSnap.exists()) {
          setCreator(null);
          setLoading(false);
          return;
        }

        const creatorData = creatorSnap.data() as Creator;
        setCreator(creatorData);

        const profileSnap = await getDoc(doc(db, "profiles", creatorData.uid));
        if (cancelled) return;
        const profileData = (profileSnap.data() || null) as Record<string, unknown> | null;
        setProfile(profileData);

        const referralHandle = profileData?.referralCreator;
        if (referralHandle != null && referralHandle !== "") {
          const referralSnap = await getDoc(
            doc(db, "creators", String(referralHandle)),
          );
          if (!cancelled && referralSnap.exists()) {
            setReferralId(String(referralSnap.data()?.uid ?? ""));
          }
        }
      } catch (caught) {
        if (!cancelled) {
          console.error("Error fetching creator:", caught);
          setError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [username, attempt]);

  useEffect(() => {
    if (!user?.uid || !username) {
      queueMicrotask(() => setIsSupporter(false));
      return;
    }

    let cancelled = false;
    const supportQuery = query(
      collection(db, "supportedCreators"),
      where("supporterId", "==", user.uid),
      where("creatorId", "==", username),
    );

    getDocs(supportQuery)
      .then((snapshot) => {
        if (!cancelled) setIsSupporter(!snapshot.empty);
      })
      .catch((caught) => {
        if (!cancelled) console.error("Error checking support status:", caught);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.uid, username, attempt]);

  const creatorName =
    (creator?.name as string | undefined) ||
    (profile?.displayName as string | undefined) ||
    "Creator";

  return {
    loading,
    creator,
    profile,
    isSupporter,
    referralId,
    error,
    creatorName,
    retry,
  };
}
