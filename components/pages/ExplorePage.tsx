"use client";

import { useEffect, useState, useMemo } from "react";
import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { ArrowRight, CheckCircle2, ChevronDown, Search } from "lucide-react";
import Link from "next/link";
import { Creator } from "@/types/creator";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchInput } from "@/components/ui/SearchInput";
import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";

const ITEMS_PER_PAGE = 12;

export default function ExplorePage({
  initialCreators = [],
}: {
  initialCreators?: Creator[];
}) {
  const hasInitial = initialCreators.length > 0;
  const [creators, setCreators] = useState<Creator[]>(initialCreators);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(!hasInitial);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastVisible, setLastVisible] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(
    !hasInitial || initialCreators.length >= ITEMS_PER_PAGE,
  );

  const fetchCreators = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      else setLoadingMore(true);

      const [{ collection, query, limit, getDocs, startAfter, orderBy }, { db }] =
        await Promise.all([import("firebase/firestore"), import("@/db/firebase")]);

      const creatorsRef = collection(db, "creators");
      const batchSize =
        !isInitial && !lastVisible && creators.length > 0
          ? creators.length + ITEMS_PER_PAGE
          : ITEMS_PER_PAGE;

      let q = query(creatorsRef, orderBy("name"), limit(batchSize));

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

      if (isInitial || !lastVisible) {
        setCreators(fetched);
      } else {
        setCreators((prev) => {
          const seen = new Set(prev.map((c) => c.handle));
          return [...prev, ...fetched.filter((c) => !seen.has(c.handle))];
        });
      }

      const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1] ?? null;
      setLastVisible(lastDoc);
      if (querySnapshot.docs.length < batchSize) setHasMore(false);
    } catch (error) {
      console.error("Error loading creators:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (hasInitial) return;
    queueMicrotask(() => {
      void fetchCreators(true);
    });
    // Initial load only when SSR data is absent; pagination is triggered explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasInitial]);

  const filteredCreators = useMemo(() => {
    if (!searchTerm) return creators;
    const term = searchTerm.toLowerCase();
    return creators.filter(
      (creator) =>
        creator.handle.toLowerCase().includes(term) ||
        (creator.name && creator.name.toLowerCase().includes(term)) ||
        (creator.bio && creator.bio.toLowerCase().includes(term)) ||
        (creator.focus && creator.focus.some((f) => f.toLowerCase().includes(term))),
    );
  }, [searchTerm, creators]);

  return (
    <div className="min-h-screen bg-canvas pb-20 text-fg">
      <section className="border-b border-line bg-surface-sunken px-4 pb-10 pt-14 sm:px-6 sm:pb-12 sm:pt-16 lg:px-8">
        <div className="mx-auto w-full max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-caption font-bold uppercase tracking-[0.16em] text-brand-strong">
              Creator directory
            </p>
            <h1 className="mt-2 text-display font-black tracking-tight text-fg sm:text-hero">
              Explore creators
            </h1>
            <p className="mt-3 text-body-lg text-muted-fg">
              Discover artists, writers, podcasters, and builders supported by their
              communities on Agaseke.
            </p>
          </div>

          <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <SearchInput
              label="Search creators"
              placeholder="Search by name, @handle, or topic…"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              onClear={() => setSearchTerm("")}
              autoComplete="off"
              className="w-full sm:max-w-md"
            />

            <nav
              aria-label="Explore sections"
              className="inline-flex items-center gap-1 self-start rounded-control border border-line bg-surface p-1"
            >
              <span
                aria-current="page"
                className="inline-flex min-h-10 items-center rounded-control bg-brand-strong px-4 text-label font-semibold text-on-brand"
              >
                Creators
              </span>
              <Link
                href="/explore/posts"
                className="inline-flex min-h-10 items-center rounded-control px-4 text-label font-semibold text-muted-fg transition-colors hover:bg-surface-raised hover:text-fg"
              >
                Posts & articles
              </Link>
            </nav>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-6xl px-4 pt-10 sm:px-6 lg:px-8">
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
            <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-caption font-bold uppercase tracking-wider text-muted-fg">
                {searchTerm ? `Results for "${searchTerm}"` : "All creators"}
              </h2>
              <p aria-live="polite" className="text-label text-muted-fg">
                {filteredCreators.length} creator
                {filteredCreators.length === 1 ? "" : "s"}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {filteredCreators.map((creator) => {
                const focusLine = creator.focus?.slice(0, 3).join(" · ");
                return (
                  <Card
                    key={creator.handle}
                    className="group relative flex flex-col justify-between overflow-hidden p-6 transition-shadow hover:shadow-card"
                  >
                    <Link
                      href={`/${creator.handle}`}
                      className="absolute inset-0 z-10 outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                      aria-label={`View ${creator.name || creator.handle}'s profile`}
                    />

                    <div>
                      <div className="flex items-start gap-4">
                        <Avatar
                          src={creator.profilePicture || creator.photoURL}
                          name={creator.name || creator.handle}
                          size="lg"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h2 className="truncate text-title font-bold text-fg transition-colors group-hover:text-brand-strong">
                              {creator.name || creator.handle}
                            </h2>
                            {creator.verified && (
                              <CheckCircle2
                                className="size-4 shrink-0 text-success"
                                aria-label="Verified creator"
                              />
                            )}
                          </div>
                          <p className="mt-0.5 truncate text-caption font-semibold text-brand-strong">
                            @{creator.handle}
                          </p>
                          {focusLine && (
                            <p className="mt-1 truncate text-caption text-muted-fg">
                              {focusLine}
                            </p>
                          )}
                        </div>
                      </div>

                      <p className="mt-4 line-clamp-3 text-label leading-relaxed text-muted-fg">
                        {creator.bio || "Creator building on Agaseke."}
                      </p>
                    </div>

                    <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
                      <span className="text-label font-semibold text-muted-fg group-hover:text-fg">
                        Visit page
                      </span>
                      <ArrowRight
                        className="size-4 text-muted-fg transition-transform group-hover:translate-x-0.5 group-hover:text-brand-strong"
                        aria-hidden="true"
                      />
                    </div>
                  </Card>
                );
              })}
            </div>

            {filteredCreators.length === 0 && (
              <EmptyState
                icon={<Search className="size-6" aria-hidden="true" />}
                title="No creators found"
                description="Try another name, handle, or keyword."
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
      </div>
    </div>
  );
}
