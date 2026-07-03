"use client";

import { useEffect, useState, useMemo } from "react";
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
  ArrowRight,
  User,
  CheckCircle2,
  ChevronDown,
  Loader,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import { Creator } from "@/types/creator";
import { PlatformLocation } from "@/types/platform";
import ExploreSchema from "../seo/ExploreSchema";
import MobileBottomBar from "@/components/parts/MobileBottomBar";
import { MdVerifiedUser } from "react-icons/md";

export default function ExplorePage() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState("");
  const [locations, setLocations] = useState<PlatformLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastVisible, setLastVisible] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    fetchCreators(true);
    getDocs(collection(db, "locations")).then((snap) => {
      setLocations(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as PlatformLocation)),
      );
    });
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
    return creators.filter((c) => {
      if (locationFilter && c.location !== locationFilter) return false;
      if (verifiedFilter === "verified" && !c.verified) return false;
      if (verifiedFilter === "unverified" && c.verified) return false;
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        c.handle.toLowerCase().includes(term) ||
        (c.name && c.name.toLowerCase().includes(term)) ||
        (c.bio && c.bio.toLowerCase().includes(term))
      );
    });
  }, [searchTerm, locationFilter, verifiedFilter, creators]);

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <ExploreSchema />
      <header className="pt-20 pb-12 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tighter mb-6">
            Discover{" "}
            <span className="text-orange-600 underline decoration-orange-100">
              Creators
            </span>
          </h1>
<<<<<<< HEAD
          <p className="text-slate-500 font-medium text-lg max-w-xl mx-auto mb-10">
            Connect with the artists, storytellers, and innovators shaping
            the creative landscape.
          </p>

          <div className="max-w-2xl mx-auto space-y-3">
            <div className="relative group">
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
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-slate-400" />
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-bold outline-none focus:border-orange-500 transition-all cursor-pointer"
                >
                  <option value="">All locations</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.name}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                {["", "verified", "unverified"].map((val) => {
                  const label =
                    val === "" ? "All" : val === "verified" ? "Verified" : "Unverified";
                  return (
                    <button
                      key={val}
                      onClick={() => setVerifiedFilter(val)}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                        verifiedFilter === val
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
=======
          <p className="text-muted-foreground font-medium text-lg max-w-xl mx-auto mb-10">
            Connect with the artists, storytellers, and innovators shaping the
            creative landscape in Kigali.
          </p>

          <div className="max-w-2xl mx-auto relative group">
            <Search
              className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-orange-600 transition-colors"
              size={20}
            />
            <input
              type="text"
              placeholder="Search by name, handle, or bio keywords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-card border border-border shadow-xl shadow-border rounded-lg py-6 pl-14 pr-6 text-lg outline-none focus:ring-4 focus:ring-orange-50 transition-all font-medium"
            />
>>>>>>> main
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-80 bg-muted animate-pulse rounded-lg"
              />
            ))}
          </div>
        ) : (
          <>
            {/* Results Info */}
            <div className="flex items-center justify-between mb-8 px-2">
              <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground">
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
                  className="group bg-card border border-border p-8 rounded-lg shadow-sm hover:shadow-2xl hover:shadow-orange-900/5 hover:-translate-y-1 transition-all duration-500 relative overflow-hidden"
                >
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="flex items-start justify-between mb-6">
                    <div className="w-20 h-20 bg-muted rounded-lg p-1 border border-border">
                      <div className="w-full h-full bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                        {creator.profilePicture ? (
                          <img
                            src={creator.profilePicture}
                            alt={creator.name || creator.handle || "Creator profile"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User size={30} className="text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    {creator.verified && (
                      <div className="bg-orange-50 text-orange-600 p-2 rounded-lg">
                        <MdVerifiedUser size={16} fill="currentColor" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold tracking-tight group-hover:text-orange-600 transition-colors flex items-center gap-2">
                      {creator.name || creator.handle}
                      {creator.verified && (
                        <CheckCircle2 size={18} className="text-orange-600" />
                      )}
                    </h2>
                    <p className="text-orange-600 font-bold text-xs uppercase tracking-widest">
                      @{creator.handle}
                    </p>
<<<<<<< HEAD
                    {creator.location && (
                      <p className="flex items-center gap-1 text-xs font-bold text-slate-400">
                        <MapPin size={11} />
                        {creator.location}
                      </p>
                    )}
                    <p className="text-slate-500 text-sm leading-relaxed line-clamp-2 pt-2">
=======
                    <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2 pt-2">
>>>>>>> main
                      {creator.bio || "No bio available."}
                    </p>
                  </div>

                  <div className="mt-8 pt-6 border-t border-border flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      View Profile
                    </span>
                    <div className="w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center group-hover:bg-orange-600 transition-colors">
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
                  className="group relative inline-flex items-center gap-3 bg-card border border-border px-12 py-5 rounded-lg font-bold text-xs uppercase tracking-[0.2em] hover:border-orange-600 hover:text-orange-600 transition-all disabled:opacity-50 shadow-sm overflow-hidden"
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
                <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center mx-auto mb-8 border border-border">
                  <Search size={32} className="text-muted-foreground" />
                </div>
                <h3 className="text-3xl font-bold tracking-tighter">
                  No creators found
                </h3>
                <p className="text-muted-foreground mt-2 font-medium">
                  Try searching for different keywords or names.
                </p>
              </div>
            )}
          </>
        )}
      </main>
      <MobileBottomBar />
    </div>
  );
}
