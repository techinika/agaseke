/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import {
  Search,
  Lock,
  ArrowRight,
  Zap,
  Star,
  Clock,
  Loader,
  ChevronRight,
  User,
} from "lucide-react";
import Image from "next/image";
import Navbar from "@/components/parts/Navigation";
import { useAuth } from "@/auth/AuthContext";
import Loading from "@/app/loading";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { Creator } from "@/types/creator";
import { db } from "@/db/firebase";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SupporterSpace() {
  const auth = useAuth();
  const router = useRouter();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyFavorites = async () => {
      if (!auth.user?.uid) return;
      setLoading(true);

      try {
        const supportRef = collection(db, "supportedCreators");
        const q = query(
          supportRef,
          where("supporterId", "==", auth.user.uid),
          orderBy("lastSupport", "desc"),
        );
        const supportSnap = await getDocs(q);

        const favoritesData = await Promise.all(
          supportSnap.docs.map(async (supportDoc) => {
            const relationship = supportDoc.data();
            const creatorId = relationship.creatorId;

            const creatorRef = doc(db, "creators", creatorId);
            const creatorSnap = await getDoc(creatorRef);
            const creatorProfile = creatorSnap.exists()
              ? creatorSnap.data()
              : {};

            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const contentQuery = query(
              collection(db, "creatorContent"),
              where("creatorId", "==", creatorId),
              where("createdAt", ">=", sevenDaysAgo),
              limit(1),
            );

            const gatheringQuery = query(
              collection(db, "creatorGatherings"),
              where("creatorId", "==", creatorId),
              where("createdAt", ">=", sevenDaysAgo),
              limit(1),
            );

            const [contentSnap, gatheringSnap] = await Promise.all([
              getDocs(contentQuery),
              getDocs(gatheringQuery),
            ]);

            const hasUpdates = !contentSnap.empty || !gatheringSnap.empty;

            return {
              id: creatorId,
              name: creatorProfile.name || creatorId,
              handle: creatorId,
              photoURL: creatorProfile.photoURL,
              lastPost: creatorProfile.bio || "No recent updates",
              time:
                relationship.lastSupport?.toDate().toLocaleDateString() ||
                "Recently",
              updates: hasUpdates ? 1 : 0,
              lastSupportDate: relationship.lastSupport?.toDate(),
            };
          }),
        );

        const sorted = favoritesData.sort((a, b) => {
          if (a.updates !== b.updates) return b.updates - a.updates;
          return b.lastSupportDate - a.lastSupportDate;
        });

        setFavorites(sorted);
      } catch (error) {
        console.error("Error fetching favorites:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMyFavorites();
  }, [auth.user]);

  useEffect(() => {
    const fetchCreators = async () => {
      try {
        const q = query(collection(db, "creators"), limit(100));
        const querySnapshot = await getDocs(q);

        const fetchedCreators = querySnapshot.docs.map((doc) => ({
          handle: doc.id,
          ...doc.data(),
        }));

        setCreators(fetchedCreators as any[]);
      } catch (error) {
        console.error("Error fetching creators:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCreators();
  }, []);

  const filteredCreators = creators.filter(
    (c) =>
      c.handle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (auth.loading || loading) return <Loading />;

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-900 pb-20">
      <Navbar />

      <main className="max-w-4xl mx-auto px-6 pt-10">
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <div className="md:col-span-2 bg-white p-8 rounded-lg border border-slate-100 shadow-sm flex flex-col justify-between">
            <div>
              <h1 className="text-3xl font-black mb-2">
                Amahoro,{" "}
                {auth.profile?.displayName?.split(" ")[0] || "Supporter"}!
              </h1>
              <p className="text-slate-500">
                Your contribution is fueling Rwandan creativity.
              </p>
            </div>
            <div className="mt-8 flex gap-8">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Total Support
                </p>
                <p className="text-2xl font-black text-orange-600">
                  {auth?.profile?.totalSupport || 0}
                  <span className="text-sm font-normal text-slate-400">
                    RWF
                  </span>
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Creators Helped
                </p>
                <p className="text-2xl font-black text-slate-900">
                  {auth?.profile?.totalSupportedCreators || 0}
                </p>
              </div>
            </div>
          </div>

          <button
            className="bg-slate-900 rounded-lg p-8 text-white flex flex-col justify-between group hover:bg-slate-800 transition-all text-left"
            onClick={() => (globalThis.location.href = "/onboarding")}
          >
            <div className="bg-orange-600 w-10 h-10 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Zap size={20} fill="white" />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Open your Agaseke</h3>
              <p className="text-slate-400 text-xs leading-relaxed mb-4">
                Start receiving support from your people via MoMo. Claim your
                Agaseke today.
              </p>
              <div className="flex items-center gap-2 text-orange-500 text-sm font-bold">
                Get Started <ArrowRight size={14} />
              </div>
            </div>
          </button>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
          <div className="lg:col-span-3 space-y-8">
            <section>
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-xl flex items-center gap-2">
                  <Star size={20} className="text-orange-500 fill-orange-500" />{" "}
                  My Favorites
                </h3>
              </div>

              <div className="space-y-4">
                {favorites.length > 0 ? (
                  favorites.map((creator, i) => (
                    <Link
                      key={i}
                      href={`/${creator.handle}`}
                      className="block bg-white p-5 rounded-lg border border-slate-100 hover:border-orange-200 transition-all group cursor-pointer shadow-sm"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden shrink-0 border border-slate-50">
                          {creator.photoURL ? (
                            <img
                              src={creator.photoURL}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-slate-400 font-bold text-xl">
                              {creator.name[0]}
                            </span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-slate-900 truncate">
                              {creator.name}
                            </h4>
                            <span className="text-[10px] text-slate-400 flex items-center gap-1 shrink-0">
                              <Clock size={10} /> {creator.time}
                            </span>
                          </div>
                          <p className="text-sm text-slate-500 line-clamp-1 mt-1">
                            {creator.lastPost}
                          </p>
                        </div>

                        {creator.updates > 0 && (
                          <div className="bg-orange-600 text-white text-[10px] font-black px-2 py-1 rounded-lg animate-pulse shrink-0">
                            NEW
                          </div>
                        )}

                        <ChevronRight
                          size={16}
                          className="text-slate-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all"
                        />
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="p-10 text-center border-2 border-dashed border-slate-100 rounded-lg">
                    <User className="mx-auto text-slate-200 mb-2" size={32} />
                    <p className="text-slate-400 text-sm font-medium">
                      No favorites yet. Start supporting creators!
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="lg:col-span-2 space-y-8">
            <section className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm">
              <h3 className="font-bold mb-6 flex items-center gap-2 text-slate-800">
                Discover Creators
              </h3>

              <div className="relative mb-6">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={14}
                />
                <input
                  type="text"
                  placeholder="Search by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border-none rounded-lg py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-orange-100 outline-none transition"
                />
              </div>

              <div className="space-y-6">
                {loading ? (
                  <p className="flex items-center justify-center text-xs text-slate-400 py-4">
                    <Loader className="animate-spin mr-2 inline-block" />
                    Loading creators...
                  </p>
                ) : (
                  <>
                    {filteredCreators.length > 0 ? (
                      filteredCreators.slice(0, 5).map((c) => (
                        <Link
                          key={c.handle}
                          href={`/${c.handle}`}
                          className="block group"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center text-orange-600 font-bold text-xs shrink-0 overflow-hidden border border-orange-100">
                              {c.photoURL ? (
                                <Image
                                  src={c.photoURL}
                                  alt={c.handle}
                                  width={40}
                                  height={40}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span>{c.name ? c.name[0] : c.handle[0]}</span>
                              )}
                            </div>
                            <div>
                              <h4 className="font-bold text-sm group-hover:text-orange-600 transition flex items-center gap-1">
                                @{c.handle}
                                {c.verified && (
                                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                                )}
                              </h4>
                              <p className="text-xs text-slate-500 leading-relaxed mt-1 line-clamp-2">
                                {c.bio || "No bio yet."}
                              </p>
                            </div>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <p className="text-center text-xs text-slate-400 py-4">
                        No creators found.
                      </p>
                    )}
                  </>
                )}

                <button
                  onClick={() => router.push("/explore")}
                  className="w-full py-3 text-xs font-bold text-slate-400 border-2 border-dashed border-slate-100 rounded-lg hover:bg-slate-50 transition"
                >
                  View More Creators
                </button>
              </div>
            </section>

            <div className="p-6 bg-slate-50 rounded-lg text-center border border-slate-100">
              <Lock size={24} className="mx-auto text-slate-300 mb-2" />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Premium Space
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Support more creators to unlock their private libraries.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
