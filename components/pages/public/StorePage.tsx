/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Heart, Loader } from "lucide-react";
import { db } from "@/db/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { Creator } from "@/types/creator";
import { useAuth } from "@/auth/AuthContext";
import { SupportModal } from "@/components/parts/public/SupportModal";
import { StoreTab } from "@/components/parts/public/StoreTab";
import Navbar from "@/components/parts/Navigation";
import Footer from "@/components/parts/Footer";
import Loading from "@/app/loading";

interface StorePageProps {
  username: string;
}

export default function StorePage({ username }: StorePageProps) {
  const { user: currentUser, isLoggedIn } = useAuth();
  const [loading, setLoading] = useState(true);
  const [creatorData, setCreatorData] = useState<Creator | null>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSupporter, setIsSupporter] = useState(false);
  const [referralId, setReferralId] = useState("");

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
      if (!currentUser?.uid || !username) {
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
      } catch (error) {
        console.error("Error checking support status:", error);
      }
    };

    checkSupportStatus();
  }, [currentUser, username]);

  if (loading) {
    return <Loading />;
  }

  if (!creatorData) {
    return (
      <div className="min-h-screen bg-[#FBFBFC] flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500">Creator not found</p>
          <Link
            href="/"
            className="text-orange-500 font-bold mt-4 inline-block"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  const creatorName = creatorData.name || profileData?.displayName || "Creator";

  return (
    <div className="min-h-screen bg-[#FBFBFC]">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <Link
            href={`/${username}`}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft size={20} />
            <span className="font-medium">Back to Profile</span>
          </Link>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-orange-700 transition"
          >
            <Heart size={18} className="fill-current" />
            Gift Once
          </button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Store</h1>
          <p className="text-slate-500 mt-1">
            Shop products from {creatorName} and track your orders
          </p>
        </div>

        <main className="min-h-[500px]">
          <StoreTab
            creatorId={creatorData.uid}
            creatorName={creatorName}
            creatorHandle={username}
            storePublic={creatorData.storePublic !== false}
            isLoggedIn={isLoggedIn}
            isSupporter={isSupporter}
            setIsModalOpen={setIsModalOpen}
          />
        </main>
      </div>

      <Footer />

      <SupportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        creatorName={creatorName}
        creatorId={username}
        uid={creatorData.uid}
        includeReferral={profileData?.referralCreator != null}
        referralUid={referralId}
        referralId={profileData?.referralCreator}
      />
    </div>
  );
}
