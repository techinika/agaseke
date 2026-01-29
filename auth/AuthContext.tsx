/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
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
  isCreator: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  creator: null,
  loading: true,
  isLoggedIn: false,
  isCreator: false,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [creator, setCreator] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        const userRef = doc(db, "profiles", currentUser.uid);

        const unsubscribeProfile = onSnapshot(userRef, (userSnap) => {
          if (userSnap.exists()) {
            const userData = userSnap.data();
            setProfile(userData);

            if (userData.type === "creator" && userData.username) {
              const creatorRef = doc(db, "creators", userData.username);

              const unsubscribeCreator = onSnapshot(
                creatorRef,
                (creatorSnap) => {
                  if (creatorSnap.exists()) {
                    setCreator(creatorSnap.data());
                  }
                  setLoading(false);
                },
              );
              return () => unsubscribeCreator();
            } else {
              setCreator(null);
              setLoading(false);
            }
          } else {
            setProfile(null);
            setCreator(null);
            setLoading(false);
          }
        });

        return () => unsubscribeProfile();
      } else {
        setUser(null);
        setProfile(null);
        setCreator(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        creator,
        loading,
        isLoggedIn: !!user,
        isCreator: profile?.type === "creator",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
