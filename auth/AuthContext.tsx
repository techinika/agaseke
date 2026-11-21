"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
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
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  creator: null,
  loading: true,
  isLoggedIn: false,
  isAdmin: false,
  isCreator: false,
  refreshProfile: async () => {},
});

export function triggerAuthRefresh() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("agaseke:refresh-auth"));
  }
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [creator, setCreator] = useState<Creator | null>(null);
  const [isAdminClaim, setIsAdminClaim] = useState(false);
  const [loading, setLoading] = useState(true);
  const activeUidRef = useRef<string | null>(null);

  const hydrateUserDocs = useCallback(async (uid: string) => {
    const [{ doc, getDoc }, { db }] = await Promise.all([
      import("firebase/firestore"),
      import("@/db/firebase"),
    ]);
    if (!db || activeUidRef.current !== uid) return;

    const userSnap = await getDoc(doc(db, "profiles", uid));
    if (activeUidRef.current !== uid) return;

    if (!userSnap.exists()) {
      setProfile(null);
      setCreator(null);
      setLoading(false);
      return;
    }

    const userData = userSnap.data() as Profile;
    setProfile(userData);

    if (userData.isAdmin) {
      try {
        const { auth } = await import("@/db/firebase");
        if (auth?.currentUser?.uid === uid) {
          const fresh = await auth.currentUser.getIdTokenResult();
          if (fresh.claims.admin === true || fresh.claims.isAdmin === true) {
            setIsAdminClaim(true);
          }
        }
      } catch {
        // Fallback to profile.isAdmin when token claim check fails
      }
    }

    if (userData.type === "creator" && userData.username) {
      const creatorSnap = await getDoc(doc(db, "creators", userData.username));
      if (activeUidRef.current !== uid) return;
      setCreator(creatorSnap.exists() ? (creatorSnap.data() as Creator) : null);
    } else {
      setCreator(null);
    }
    setLoading(false);
  }, []);

  const refreshProfile = useCallback(async () => {
    const uid = activeUidRef.current;
    if (!uid) return;
    try {
      await hydrateUserDocs(uid);
    } catch (error) {
      console.error("Failed to refresh auth profile:", error);
    }
  }, [hydrateUserDocs]);

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
        const nextUid = currentUser?.uid ?? null;
        const uidChanged = activeUidRef.current !== nextUid;
        activeUidRef.current = nextUid;
        setUser(currentUser);

        if (!currentUser) {
          setProfile(null);
          setCreator(null);
          setIsAdminClaim(false);
          setLoading(false);
          return;
        }

        if (uidChanged) {
          setProfile(null);
          setCreator(null);
          setLoading(true);
        }

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

        if (uidChanged) {
          try {
            await hydrateUserDocs(currentUser.uid);
          } catch (error) {
            console.error("Failed to hydrate auth profile:", error);
            if (activeUidRef.current === currentUser.uid) setLoading(false);
          }
        }
      });
    })();

    return () => {
      cancelled = true;
      unsubscribeAuth?.();
    };
  }, [hydrateUserDocs]);

  useEffect(() => {
    const handleRefresh = () => {
      void refreshProfile();
    };
    window.addEventListener("agaseke:refresh-auth", handleRefresh);
    return () => {
      window.removeEventListener("agaseke:refresh-auth", handleRefresh);
    };
  }, [refreshProfile]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        creator,
        loading,
        isLoggedIn: !!user,
        isAdmin: isAdminClaim || profile?.isAdmin === true,
        isCreator: profile?.type === "creator",
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
