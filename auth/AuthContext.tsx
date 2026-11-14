"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import type { Creator } from "@/types/creator";
import type { Profile } from "@/types/profile";

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  creator: Creator | null;
  loading: boolean;
  isLoggedIn: boolean;
  isAdmin: boolean;
  isCreator: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  creator: null,
  loading: true,
  isLoggedIn: false,
  isAdmin: false,
  isCreator: false,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [creator, setCreator] = useState<Creator | null>(null);
  const [isAdminClaim, setIsAdminClaim] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let unsubscribeAuth: (() => void) | undefined;

    (async () => {
      const [{ onIdTokenChanged }, { auth }] = await Promise.all([
        import("firebase/auth"),
        import("@/db/firebase"),
      ]);
      if (cancelled) return;

      if (!auth) {
        setLoading(false);
        return;
      }

      unsubscribeAuth = onIdTokenChanged(auth, async (currentUser) => {
        setUser(currentUser);

        if (!currentUser) {
          setProfile(null);
          setCreator(null);
          setIsAdminClaim(false);
          setLoading(false);
          return;
        }

        setProfile(null);
        setCreator(null);
        setLoading(true);

        try {
          const tokenResult = await currentUser.getIdTokenResult();
          if (auth.currentUser?.uid === currentUser.uid) {
            setIsAdminClaim(
              tokenResult.claims.admin === true || tokenResult.claims.isAdmin === true,
            );
          }
        } catch {
          if (auth.currentUser?.uid === currentUser.uid) setIsAdminClaim(false);
        }
      });
    })();

    return () => {
      cancelled = true;
      unsubscribeAuth?.();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    let cancelled = false;
    let unsubscribeProfile: (() => void) | undefined;
    let unsubscribeCreator: (() => void) | undefined;

    (async () => {
      const [{ doc, onSnapshot }, { db }] = await Promise.all([
        import("firebase/firestore"),
        import("@/db/firebase"),
      ]);
      if (cancelled || !db) {
        return;
      }

      const userRef = doc(db, "profiles", user.uid);

      unsubscribeProfile = onSnapshot(userRef, (userSnap) => {
        if (unsubscribeCreator) {
          unsubscribeCreator();
          unsubscribeCreator = undefined;
        }

        if (!userSnap.exists()) {
          setProfile(null);
          setCreator(null);
          setLoading(false);
          return;
        }

        const userData = userSnap.data();
        setProfile(userData as Profile);

        if (userData.type === "creator" && userData.username) {
          const creatorRef = doc(db, "creators", userData.username);
          unsubscribeCreator = onSnapshot(creatorRef, (creatorSnap) => {
            setCreator(creatorSnap.exists() ? (creatorSnap.data() as Creator) : null);
            setLoading(false);
          });
        } else {
          setCreator(null);
          setLoading(false);
        }
      });
    })();

    return () => {
      cancelled = true;
      unsubscribeProfile?.();
      unsubscribeCreator?.();
    };
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        creator,
        loading,
        isLoggedIn: !!user,
        isAdmin: isAdminClaim,
        isCreator: profile?.type === "creator",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
