"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  collection,
  query,
  limit,
  getDocs,
  startAfter,
  orderBy,
  DocumentData,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/db/firebase";
import {
  Search,
  Sparkles,
  ArrowRight,
  User,
  CheckCircle2,
  ChevronDown,
  Loader,
} from "lucide-react";
import Link from "next/link";
import { Creator } from "@/types/creator";

export default function ExplorePage() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastVisible, setLastVisible] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    fetchCreators(true);
  }, []);

  const fetchCreators = async (isInitial = false) => {
    try {
      isInitial ? setLoading(true) : setLoadingMore(true);

      const creatorsRef = collection(db, "creators");

      let q = query(creatorsRef, orderBy("name"), limit(ITEMS_PER_PAGE));

      if (!isInitial && lastVisible) {
        q = query(
          creatorsRef,
          orderBy("name"),
          startAfter(lastVisible),
          limit(ITEMS_PER_PAGE),
        );
      }

      const querySnapshot = await getDocs(q);

      const fetched = querySnapshot.docs.map((doc) => ({
        handle: doc.id,
        ...doc.data(),
      }));

      if (isInitial) {
        setCreators(fetched as Creator[]);
      } else {
        setCreators((prev) => [...prev, ...fetched] as Creator[]);
      }

      const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
      setLastVisible(lastDoc);

      if (querySnapshot.docs.length < ITEMS_PER_PAGE) {
        setHasMore(false);
      }
    } catch (e) {
      console.error("Error loading creators:", e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const filteredCreators = useMemo(() => {
    if (!searchTerm) return creators;

    const term = searchTerm.toLowerCase();
    return creators.filter(
      (c) =>
        c.handle.toLowerCase().includes(term) ||
        (c.name && c.name.toLowerCase().includes(term)) ||
        (c.bio && c.bio.toLowerCase().includes(term)),
    );
  }, [searchTerm, creators]);

  return (
    <div className="min-h-screen bg-[#FBFBFC] text-slate-900 pb-20">
      <header className="pt-20 pb-12 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter mb-6">
            Discover{" "}
            <span className="text-orange-600 underline decoration-orange-100">
              Creators
            </span>
          </h1>
          <p className="text-slate-500 font-medium text-lg max-w-xl mx-auto mb-10">
            Connect with the artists, storytellers, and innovators shaping the
            creative landscape in Kigali.
          </p>

          <div className="max-w-2xl mx-auto relative group">
            <Search
              className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-600 transition-colors"
              size={20}
            />
            <input
              type="text"
              placeholder="Search by name, handle, or bio keywords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-100 shadow-xl shadow-slate-200/50 rounded-lg py-6 pl-14 pr-6 text-lg outline-none focus:ring-4 focus:ring-orange-50 transition-all font-medium"
            />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-80 bg-slate-100 animate-pulse rounded-lg"
              />
            ))}
          </div>
        ) : (
          <>
            {/* Results Info */}
            <div className="flex items-center justify-between mb-8 px-2">
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">
                {searchTerm
                  ? `Searching for "${searchTerm}"`
                  : "Community Spotlight"}
              </h3>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredCreators.map((creator) => (
                <Link
                  key={creator.handle}
                  href={`/${creator.handle}`}
                  className="group bg-white border border-slate-50 p-8 rounded-lg shadow-sm hover:shadow-2xl hover:shadow-orange-900/5 hover:-translate-y-1 transition-all duration-500 relative overflow-hidden"
                >
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="flex items-start justify-between mb-6">
                    <div className="w-20 h-20 bg-slate-50 rounded-lg p-1 border border-slate-100">
                      <div className="w-full h-full bg-slate-200 rounded-lg overflow-hidden flex items-center justify-center">
                        {creator.photoURL ? (
                          <img
                            src={creator.photoURL}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User size={30} className="text-slate-400" />
                        )}
                      </div>
                    </div>
                    {creator.verified && (
                      <div className="bg-orange-50 text-orange-600 p-2 rounded-lg">
                        <Sparkles size={16} fill="currentColor" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-2xl font-black tracking-tight group-hover:text-orange-600 transition-colors flex items-center gap-2">
                      {creator.name || creator.handle}
                      {creator.verified && (
                        <CheckCircle2 size={18} className="text-orange-600" />
                      )}
                    </h2>
                    <p className="text-orange-600 font-bold text-xs uppercase tracking-widest">
                      @{creator.handle}
                    </p>
                    <p className="text-slate-500 text-sm leading-relaxed line-clamp-2 pt-2">
                      {creator.bio || "No bio available."}
                    </p>
                  </div>

                  <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                      View Profile
                    </span>
                    <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center group-hover:bg-orange-600 transition-colors">
                      <ArrowRight size={18} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {hasMore && !searchTerm && (
              <div className="mt-20 text-center">
                <button
                  onClick={() => fetchCreators()}
                  disabled={loadingMore}
                  className="group relative inline-flex items-center gap-3 bg-white border border-slate-200 px-12 py-5 rounded-lg font-black text-xs uppercase tracking-[0.2em] hover:border-orange-600 hover:text-orange-600 transition-all disabled:opacity-50 shadow-sm overflow-hidden"
                >
                  {loadingMore ? (
                    <Loader
                      size={18}
                      className="animate-spin text-orange-600"
                    />
                  ) : (
                    <>
                      Load More Creators
                      <ChevronDown
                        size={16}
                        className="group-hover:translate-y-1 transition-transform"
                      />
                    </>
                  )}
                </button>
              </div>
            )}

            {filteredCreators.length === 0 && (
              <div className="py-24 text-center">
                <div className="w-24 h-24 bg-slate-50 rounded-lg flex items-center justify-center mx-auto mb-8 border border-slate-100">
                  <Search size={32} className="text-slate-300" />
                </div>
                <h3 className="text-3xl font-black tracking-tighter">
                  No creators found
                </h3>
                <p className="text-slate-500 mt-2 font-medium">
                  Try searching for different keywords or names.
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
