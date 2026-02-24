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
  FileText,
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

  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isRSVPing, setIsRSVPing] = useState(false);

  useEffect(() => {
    const fetchSupporterData = async () => {
      if (!auth.user?.uid) return;
      setLoading(true);

      try {
        // 1. Get IDs of creators this user currently supports
        const supportRef = collection(db, "supportedCreators");
        const qSupport = query(
          supportRef,
          where("supporterId", "==", auth.user.uid),
        );
        const supportSnap = await getDocs(qSupport);

        // Create a Set of creatorUids for O(1) lookup
        const supportedCreatorUids = new Set(
          supportSnap.docs.map((d) => d.data().creatorId),
        );

        // 2. Fetch all Content and all Gatherings
        // Note: For large scale, you'd filter these in the query,
        // but for current scale, fetching and filtering in memory is fine.
        const [contentSnap, gatheringSnap, creatorsSnap] = await Promise.all([
          getDocs(collection(db, "creatorContent")),
          getDocs(collection(db, "creatorGatherings")),
          getDocs(collection(db, "creators")),
        ]);

        // 3. Map creators for metadata lookup (Name, Handle, Photo)
        const creatorMap = new Map();
        creatorsSnap.docs.forEach((d) => {
          const data = d.data();
          creatorMap.set(data.uid, {
            name: data.name,
            handle: d.id, // The document ID is the handle
            photoURL: data.photoURL,
          });
        });

        // 4. Process Content: Show if Public OR User is a Supporter
        const contents = contentSnap.docs
          .map((d) => ({
            id: d.id,
            ...d.data(),
            type: "content",
          }))
          .filter((item: any) => {
            const isSupporter = supportedCreatorUids.has(item.creatorId);
            return !item.isPrivate || isSupporter;
          });

        // 5. Process Gatherings: STRICTLY only show if User is a Supporter
        const gatherings = gatheringSnap.docs
          .map((d) => ({
            id: d.id,
            ...d.data(),
            type: "gathering",
          }))
          .filter((item: any) => supportedCreatorUids.has(item.creatorId));

        // 6. Merge, Attach Creator Details, and Sort
        const combinedFeed = [...contents, ...gatherings].map((item: any) => {
          const creator = creatorMap.get(item.creatorId);
          return {
            ...item,
            creatorName: creator?.name || "Unknown Creator",
            creatorHandle: creator?.handle || "creator",
            creatorPhoto: creator?.photoURL || null,
          };
        });

        // 7. Update Favorites Sidebar (only the creators user supports)
        const favoritesData = creatorsSnap.docs
          .filter((d) => supportedCreatorUids.has(d.data().uid))
          .map((d) => ({
            id: d.id,
            name: d.data().name,
            photoURL: d.data().photoURL,
            handle: d.id,
            updates: 0, // You can add logic here to count new items if desired
          }));

        setFavorites(favoritesData);
        setFeed(
          combinedFeed.sort(
            (a: any, b: any) =>
              (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0),
          ),
        );

        // 8. Discovery Creators (Not supported yet)
        const discoveryList = creatorsSnap.docs
          .map((d) => ({ handle: d.id, ...d.data() }))
          .filter((c: any) => !supportedCreatorUids.has(c.uid));
        setCreators(discoveryList);
      } catch (error) {
        console.error("Fetch Supporter Space Error:", error);
        toast.error("Failed to load your feed.");
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

    // 1. Date and Time Validation
    const now = new Date();
    const gatheringDateTime = new Date(
      `${selectedItem.date}T${selectedItem.time}`,
    );

    if (now > gatheringDateTime) {
      return toast.error("This gathering has already passed.");
    }

    setIsRSVPing(true);
    try {
      await addDoc(collection(db, "gatheringsAttendance"), {
        gatheringId: selectedItem.id,
        gatheringTitle: selectedItem.title,
        gatheringDate: selectedItem.date,
        supporterId: auth.user.uid,
        supporterName: auth.profile?.displayName || "Anonymous",
        supporterEmail: auth.user.email,
        status: "confirmed",
        createdAt: serverTimestamp(),
      });

      toast.success("RSVP Successful! See you there.");
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
              <p className="text-slate-500">
                {`"When you learn, teach. When you get, give."`}
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
                    className="bg-white rounded-2xl border border-slate-100 overflow-hidden cursor-pointer hover:border-orange-200 hover:shadow-xl hover:shadow-slate-200/50 transition-all group"
                  >
                    <div className="relative aspect-video bg-slate-100 overflow-hidden">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          alt=""
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          {item.type === "gathering" ? (
                            <MapPin size={40} />
                          ) : (
                            <FileText size={40} />
                          )}
                        </div>
                      )}

                      {/* Access Badge */}
                      <div className="absolute top-4 left-4 flex gap-2">
                        <span
                          className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${
                            item.type === "gathering"
                              ? "bg-purple-600 text-white"
                              : "bg-blue-600 text-white"
                          }`}
                        >
                          {item.type}
                        </span>
                      </div>
                    </div>

                    <div className="p-6">
                      <div className="flex justify-between items-center mb-3">
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                          {item.createdAt?.toDate().toLocaleDateString()}
                        </p>
                        {item.isPrivate && (
                          <div className="flex items-center gap-1 text-orange-600 text-[10px] font-black uppercase tracking-widest">
                            <Lock size={10} /> Supporters Only
                          </div>
                        )}
                      </div>

                      <h4 className="font-bold text-lg mb-2 line-clamp-1 uppercase tracking-tight group-hover:text-orange-600 transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-slate-500 text-sm line-clamp-2 mb-6">
                        {item.description}
                      </p>

                      <div className="pt-4 border-t border-slate-50 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <span className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-slate-100 overflow-hidden">
                            {/* You can add creator mini-avatar here if you pass it through the feed */}
                          </div>
                          @{item.creatorHandle}
                        </span>
                        <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded">
                          <Eye size={12} /> {item.views || 0}
                        </span>
                      </div>
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

      {selectedItem && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            {(selectedItem.imageUrl || selectedItem.videoUrl) && (
              <div className="relative w-full aspect-video bg-black">
                {selectedItem.videoUrl ? (
                  <video
                    src={selectedItem.videoUrl}
                    controls
                    className="w-full h-full"
                    poster={selectedItem.imageUrl}
                  />
                ) : (
                  <img
                    src={selectedItem.imageUrl}
                    alt={selectedItem.title}
                    className="w-full h-full object-contain"
                  />
                )}
              </div>
            )}

            <div className="p-8 overflow-y-auto">
              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-2">
                  <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-1 rounded tracking-tighter uppercase">
                    {selectedItem.type}
                  </span>
                  {!selectedItem.isPrivate && (
                    <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded tracking-tighter uppercase">
                      Public
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="text-slate-300 hover:text-slate-600 transition-colors"
                >
                  <X size={28} />
                </button>
              </div>

              <h2 className="text-2xl font-black mb-2 uppercase tracking-tight">
                {selectedItem.title}
              </h2>

              <div className="text-xs font-bold text-slate-400 mb-6 flex flex-wrap gap-4">
                <span className="flex items-center gap-1">
                  <Clock size={14} />{" "}
                  {selectedItem.createdAt?.toDate().toLocaleDateString()}
                </span>
                {selectedItem.type === "gathering" && (
                  <span className="flex items-center gap-1 text-orange-600">
                    <MapPin size={14} /> {selectedItem.location}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Eye size={14} /> {selectedItem.views || 0} views
                </span>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl mb-8">
                <p className="text-slate-600 leading-relaxed whitespace-pre-wrap text-sm">
                  {selectedItem.description || selectedItem.content}
                </p>
              </div>

              {selectedItem.docUrl && (
                <Link
                  href={selectedItem.docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 mb-8 bg-blue-50 border border-blue-100 rounded-2xl group hover:bg-blue-600 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600 group-hover:bg-white transition-colors">
                      <FileText size={20} />
                    </div>
                    <span className="text-sm font-bold text-blue-700 group-hover:text-white">
                      View Attached Document
                    </span>
                  </div>
                  <ArrowRight
                    size={18}
                    className="text-blue-400 group-hover:text-white"
                  />
                </Link>
              )}

              {selectedItem.type === "gathering" ? (
                <button
                  disabled={isRSVPing}
                  onClick={handleRSVP}
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-sm tracking-widest flex items-center justify-center gap-2 hover:bg-orange-600 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                >
                  {isRSVPing ? (
                    <Loader className="animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 size={18} /> I'm Interested to Attend
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={() => setSelectedItem(null)}
                  className="w-full bg-slate-100 text-slate-900 py-4 rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-slate-200 transition-all"
                >
                  Back to Feed
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
