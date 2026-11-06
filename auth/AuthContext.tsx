"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onIdTokenChanged, User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/db/firebase";
import { Creator } from "@/types/creator";
import { Profile } from "@/types/profile";

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
    const unsubscribeAuth = onIdTokenChanged(auth, async (currentUser) => {
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
            tokenResult.claims.admin === true ||
              tokenResult.claims.isAdmin === true,
          );
        }
      } catch {
        if (auth.currentUser?.uid === currentUser.uid) setIsAdminClaim(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    const userRef = doc(db, "profiles", user.uid);
    let unsubscribeCreator: (() => void) | null = null;

    const unsubscribeProfile = onSnapshot(userRef, (userSnap) => {
      if (unsubscribeCreator) {
        unsubscribeCreator();
        unsubscribeCreator = null;
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

    return () => {
      unsubscribeProfile();
      if (unsubscribeCreator) unsubscribeCreator();
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
