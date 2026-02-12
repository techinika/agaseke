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
  User,
  MapPin,
  X,
  CheckCircle2,
  Eye,
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
  addDoc,
  updateDoc,
  increment,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/db/firebase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function SupporterSpace() {
  const auth = useAuth();
  const router = useRouter();
  const [creators, setCreators] = useState<any[]>([]); // For Discovery Sidebar
  const [searchTerm, setSearchTerm] = useState("");
  const [favorites, setFavorites] = useState<any[]>([]);
  const [feed, setFeed] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isRSVPing, setIsRSVPing] = useState(false);

  useEffect(() => {
    const fetchSupporterData = async () => {
      if (!auth.user?.uid) return;
      setLoading(true);

      try {
        // 1. Get Supported Creators (stored by handle)
        const supportRef = collection(db, "supportedCreators");
        const qSupport = query(
          supportRef,
          where("supporterId", "==", auth.user.uid),
        );
        const supportSnap = await getDocs(qSupport);

        const supportedHandles = [
          ...new Set(supportSnap.docs.map((d) => d.data().creatorId)),
        ];

        if (supportedHandles.length === 0) {
          setLoading(false);
          return;
        }

        const favoritesData: any[] = [];
        let allFeedItems: any[] = [];

        // 2. Resolve Handles to UIDs and Fetch Content
        for (const handle of supportedHandles) {
          const creatorRef = doc(db, "creators", handle);
          const creatorSnap = await getDoc(creatorRef);

          if (creatorSnap.exists()) {
            const creatorData = creatorSnap.data();
            const creatorUid = creatorData.uid; // This is the ID used in content/gatherings

            // Fetch Recent Content & Gatherings using UID
            const contentQ = query(
              collection(db, "creatorContent"),
              where("creatorId", "==", creatorUid),
              orderBy("createdAt", "desc"),
              limit(3),
            );
            const gatheringQ = query(
              collection(db, "creatorGatherings"),
              where("creatorId", "==", creatorUid),
              orderBy("createdAt", "desc"),
              limit(3),
            );

            const [cSnap, gSnap] = await Promise.all([
              getDocs(contentQ),
              getDocs(gatheringQ),
            ]);

            const contents = cSnap.docs.map((d) => ({
              id: d.id,
              ...d.data(),
              type: "content",
              creatorName: creatorData.name,
              creatorHandle: handle,
            }));

            const gatherings = gSnap.docs.map((d) => ({
              id: d.id,
              ...d.data(),
              type: "gathering",
              creatorName: creatorData.name,
              creatorHandle: handle,
            }));

            allFeedItems = [...allFeedItems, ...contents, ...gatherings];
            favoritesData.push({
              id: handle,
              name: creatorData.name,
              photoURL: creatorData.photoURL,
              handle: handle,
              updates: cSnap.size + gSnap.size > 0 ? 1 : 0,
            });
          }
        }

        setFavorites(favoritesData);
        setFeed(
          allFeedItems.sort(
            (a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis(),
          ),
        );

        // 3. Fetch Discovery Creators (the ones the user doesn't follow yet)
        const creatorsSnap = await getDocs(
          query(collection(db, "creators"), limit(20)),
        );
        const discoveryList = creatorsSnap.docs
          .map((d) => ({ handle: d.id, ...d.data() }))
          .filter((c) => !supportedHandles.includes(c.handle));
        setCreators(discoveryList);
      } catch (error) {
        console.error("Fetch Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSupporterData();
  }, [auth.user]);

  const filteredCreators = creators.filter(
    (c) =>
      c.handle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  const openDetails = async (item: any) => {
    setSelectedItem(item);

    setFeed((prevFeed) =>
      prevFeed.map((feedItem) =>
        feedItem.id === item.id
          ? { ...feedItem, views: (feedItem.views || 0) + 1 }
          : feedItem,
      ),
    );

    const collectionName =
      item.type === "content" ? "creatorContent" : "creatorGatherings";
    try {
      const docRef = doc(db, collectionName, item.id);
      await updateDoc(docRef, {
        views: increment(1),
      });
    } catch (e) {
      console.error("View count error", e);
    }
  };

  const handleRSVP = async () => {
    if (!auth.user) return toast.error("Please login to RSVP");
    setIsRSVPing(true);
    try {
      await addDoc(collection(db, "gatheringAttendees"), {
        gatheringId: selectedItem.id,
        supporterId: auth.user.uid,
        supporterName: auth.profile?.displayName || "Anonymous",
        supporterPhone: auth.profile?.phoneNumber || "No phone provided",
        createdAt: serverTimestamp(),
      });
      toast.success("RSVP Sent! The creator can now see your interest.");
      setSelectedItem(null);
    } catch (e) {
      toast.error("Failed to RSVP");
    } finally {
      setIsRSVPing(false);
    }
  };

  if (auth.loading || loading) return <Loading />;

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-slate-900 pb-20">
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 pt-10">
        {/* Header Stats */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="md:col-span-2 bg-white p-8 rounded-lg border border-slate-100 shadow-sm flex flex-col justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                Amahoro,{" "}
                {auth.profile?.displayName?.split(" ")[0] || "Supporter"}!
              </h1>
              <p className="text-slate-500 italic">
                "Ubumuntu bugirwa n'abantu."
              </p>
            </div>
            <div className="mt-8 flex gap-10">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Impact
                </p>
                <p className="text-2xl font-bold text-orange-600">
                  {auth?.profile?.totalSupport || 0}{" "}
                  <span className="text-sm font-normal">RWF</span>
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Supports
                </p>
                <p className="text-2xl font-bold">{favorites.length} Times</p>
              </div>
            </div>
          </div>
          <Link
            href={auth?.isCreator ? "/creator" : "/onboarding"}
            className="bg-slate-900 rounded-lg p-8 text-white flex flex-col justify-between group hover:bg-black transition-all"
          >
            <Zap size={24} className="text-orange-500 fill-orange-500 mb-4" />
            <div>
              <h3 className="text-xl font-bold mb-1">
                {auth?.isCreator
                  ? "You are already a Creator"
                  : "Become a Creator"}
              </h3>
              <p className="text-slate-400 text-xs mb-4">
                {auth?.isCreator
                  ? "Continue Managing your Agaseke."
                  : "Start your own Agaseke."}
              </p>
              <div className="text-orange-500 text-sm font-bold flex items-center gap-2">
                {auth?.isCreator ? "Continue" : "Launch"}
                <ArrowRight size={14} />
              </div>
            </div>
          </Link>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 space-y-8">
            <h3 className="font-bold text-xl flex items-center gap-2">
              <Star size={20} className="text-orange-500 fill-orange-500" />{" "}
              Recent Activity
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {feed.length > 0 ? (
                feed.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => openDetails(item)}
                    className="bg-white rounded-lg border border-slate-100 p-6 cursor-pointer hover:border-orange-200 transition-all shadow-sm"
                  >
                    <div className="flex justify-between mb-4">
                      <span
                        className={`text-[9px] font-bold px-2 py-1 rounded uppercase ${item.type === "gathering" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}
                      >
                        {item.type}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">
                        {item.createdAt?.toDate().toLocaleDateString()}
                      </span>
                    </div>
                    <h4 className="font-bold text-lg mb-2 line-clamp-1">
                      {item.title}
                    </h4>
                    <p className="text-slate-500 text-sm line-clamp-2 mb-4">
                      {item.description}
                    </p>
                    <div className="pt-4 border-t border-slate-50 flex justify-between items-center text-xs font-bold text-slate-400">
                      <span>@{item.creatorHandle}</span>
                      <span className="flex items-center gap-1">
                        <Eye size={12} /> {item.views || 0}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 py-20 text-center bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                  <User className="mx-auto text-slate-300 mb-2" size={40} />
                  <p className="text-slate-400 font-medium">
                    No updates found from your creators.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar: Following & Discover */}
          <div className="lg:col-span-4 space-y-8">
            <section className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm">
              <h3 className="font-bold mb-4">Following</h3>
              <div className="space-y-3">
                {favorites.length > 0 ? (
                  favorites.map((c) => (
                    <Link
                      key={c.id}
                      href={`/${c.handle}`}
                      className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition"
                    >
                      <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center font-bold text-orange-600 text-xs overflow-hidden">
                        {c.photoURL ? (
                          <img
                            src={c.photoURL}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          c.name[0]
                        )}
                      </div>
                      <span className="text-sm font-bold truncate">
                        {c.name}
                      </span>
                      {c.updates > 0 && (
                        <div className="ml-auto w-2 h-2 bg-orange-600 rounded-full" />
                      )}
                    </Link>
                  ))
                ) : (
                  <p className="text-xs text-slate-400">
                    Not following anyone yet.
                  </p>
                )}
              </div>
            </section>

            <section className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm">
              <h3 className="font-bold mb-4">Discover</h3>
              <div className="relative mb-4">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"
                  size={14}
                />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Find creators..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-1 focus:ring-orange-200 outline-none"
                />
              </div>
              <div className="space-y-4">
                {filteredCreators.slice(0, 4).map((c) => (
                  <Link
                    key={c.handle}
                    href={`/${c.handle}`}
                    className="flex items-center gap-3 group"
                  >
                    <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-400 text-xs overflow-hidden shrink-0">
                      {c.photoURL ? (
                        <img
                          src={c.photoURL}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        c.handle[0]
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate group-hover:text-orange-600 transition">
                        @{c.handle}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {c.bio || "New Creator"}
                      </p>
                    </div>
                  </Link>
                ))}
                <button
                  onClick={() => router.push("/explore")}
                  className="w-full py-2 mt-2 text-xs font-bold text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100 transition"
                >
                  Explore More
                </button>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-1 rounded tracking-tighter uppercase">
                  {selectedItem.type}
                </span>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="text-slate-300 hover:text-slate-600"
                >
                  <X size={24} />
                </button>
              </div>
              <h2 className="text-2xl font-bold mb-2">{selectedItem.title}</h2>
              <p className="text-xs font-bold text-slate-400 mb-6 flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <Clock size={14} />{" "}
                  {selectedItem.createdAt?.toDate().toLocaleDateString()}
                </span>
                {selectedItem.type === "gathering" && (
                  <span className="flex items-center gap-1 text-orange-600">
                    <MapPin size={14} /> {selectedItem.location}
                  </span>
                )}
              </p>
              <div className="bg-slate-50 p-6 rounded-lg mb-8 max-h-60 overflow-y-auto">
                <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {selectedItem.description || selectedItem.content}
                </p>
              </div>
              {selectedItem.type === "gathering" ? (
                <button
                  disabled={isRSVPing}
                  onClick={handleRSVP}
                  className="w-full bg-slate-900 text-white py-4 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  {isRSVPing ? (
                    <Loader className="animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 size={18} /> I'M INTERESTED TO ATTEND
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={() => setSelectedItem(null)}
                  className="w-full bg-slate-100 text-slate-900 py-4 rounded-lg font-bold"
                >
                  CLOSE
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
