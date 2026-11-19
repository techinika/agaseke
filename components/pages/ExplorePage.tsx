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
import { ArrowRight, CheckCircle2, ChevronDown, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { Creator } from "@/types/creator";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchInput } from "@/components/ui/SearchInput";
import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";

const ITEMS_PER_PAGE = 12;

export default function ExplorePage() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastVisible, setLastVisible] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchCreators = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      else setLoadingMore(true);

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
      })) as Creator[];

      if (isInitial) {
        setCreators(fetched);
      } else {
        setCreators((prev) => [...prev, ...fetched]);
      }

      const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
      setLastVisible(lastDoc);
      if (querySnapshot.docs.length < ITEMS_PER_PAGE) setHasMore(false);
    } catch (error) {
      console.error("Error loading creators:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => {
      void fetchCreators(true);
    });
    // Initial load only; pagination is triggered explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredCreators = useMemo(() => {
    if (!searchTerm) return creators;
    const term = searchTerm.toLowerCase();
    return creators.filter(
      (creator) =>
        creator.handle.toLowerCase().includes(term) ||
        (creator.name && creator.name.toLowerCase().includes(term)) ||
        (creator.bio && creator.bio.toLowerCase().includes(term)),
    );
  }, [searchTerm, creators]);

  return (
    <div className="min-h-screen bg-canvas pb-20 text-fg">
      <section className="border-b border-line bg-surface-sunken px-4 pb-12 pt-16 sm:px-6 sm:pb-16 sm:pt-20 lg:px-8">
        <div className="mx-auto w-full max-w-6xl text-center">
          <Badge tone="brand" className="mb-4 px-3 py-1">
            <Sparkles className="size-3.5" aria-hidden="true" />
            Explore creators
          </Badge>
          <h1 className="text-display font-black text-fg sm:text-hero">
            Find your next favourite{" "}
            <span className="text-brand-strong">African creator.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-body-lg text-muted-fg">
            Connect with the artists, storytellers, and innovators shaping the creative
            landscape across the continent.
          </p>

          <div className="mx-auto mt-8 max-w-2xl text-left">
            <SearchInput
              label="Search creators"
              placeholder="Search by name, handle, or bio keywords..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              onClear={() => setSearchTerm("")}
              autoComplete="off"
            />
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-6xl px-4 pt-10 sm:px-6 lg:px-8">
        {loading ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <Card key={item} className="p-6">
                <div className="flex items-center gap-4">
                  <Skeleton className="size-16" rounded="full" />
                  <div className="flex-1">
                    <SkeletonText lines={2} />
                  </div>
                </div>
                <SkeletonText lines={3} className="mt-6" />
                <Skeleton className="mt-6 h-10 w-full" />
              </Card>
            ))}
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-2 px-1">
              <h2 className="text-label font-bold uppercase tracking-wide text-muted-fg">
                {searchTerm ? `Searching for "${searchTerm}"` : "Community spotlight"}
              </h2>
              <p aria-live="polite" className="text-label text-muted-fg">
                {filteredCreators.length} creator
                {filteredCreators.length === 1 ? "" : "s"}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {filteredCreators.map((creator) => (
                <Card
                  key={creator.handle}
                  className="group relative overflow-hidden p-6 transition-shadow hover:shadow-card"
                >
                  <Link
                    href={`/${creator.handle}`}
                    className="absolute inset-0 z-10 outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                    aria-label={`View ${creator.name || creator.handle}'s profile`}
                  />

                  <div className="flex items-start justify-between gap-4">
                    <Avatar
                      src={creator.profilePicture || creator.photoURL}
                      name={creator.name || creator.handle}
                      size="lg"
                    />
                    {creator.verified && (
                      <span className="flex size-9 items-center justify-center rounded-control bg-success-bg text-success">
                        <CheckCircle2 className="size-4" aria-hidden="true" />
                        <span className="sr-only">Verified creator</span>
                      </span>
                    )}
                  </div>

                  <div className="mt-5">
                    <h2 className="flex items-center gap-2 text-title font-bold text-fg transition-colors group-hover:text-brand-strong">
                      {creator.name || creator.handle}
                    </h2>
                    <p className="mt-0.5 text-caption font-bold uppercase tracking-wide text-brand-strong">
                      @{creator.handle}
                    </p>
                    <p className="mt-3 line-clamp-3 text-label leading-relaxed text-muted-fg">
                      {creator.bio || "No bio available yet."}
                    </p>

                    {creator.focus && creator.focus.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {creator.focus.slice(0, 3).map((focus) => (
                          <Badge key={focus} tone="neutral">
                            {focus}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
                    <span className="text-label font-semibold text-muted-fg">
                      View profile
                    </span>
                    <span className="flex size-10 items-center justify-center rounded-control bg-surface-raised text-fg transition-colors group-hover:bg-brand-strong group-hover:text-on-brand">
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </span>
                  </div>
                </Card>
              ))}
            </div>

            {filteredCreators.length === 0 && (
              <EmptyState
                icon={<Search className="size-6" aria-hidden="true" />}
                title="No creators found"
                description="Try searching for a different name, handle, or keyword."
              />
            )}

            {hasMore && !searchTerm && (
              <div className="mt-12 text-center">
                <Button
                  variant="secondary"
                  size="lg"
                  loading={loadingMore}
                  onClick={() => fetchCreators()}
                  trailingIcon={<ChevronDown className="size-4" aria-hidden="true" />}
                >
                  Load more creators
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
