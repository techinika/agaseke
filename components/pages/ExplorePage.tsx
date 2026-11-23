"use client";

import { useEffect, useState } from "react";
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
  const [remoteCreators, setRemoteCreators] = useState<Creator[] | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(!hasInitial);
  const [loadingMore, setLoadingMore] = useState(false);
  const [remoteHasMore, setRemoteHasMore] = useState(false);

  const creators = remoteCreators ?? initialCreators;
  const hasMore =
    remoteCreators !== null
      ? remoteHasMore
      : !hasInitial || initialCreators.length >= ITEMS_PER_PAGE;

  useEffect(() => {
    const trimmed = searchTerm.trim();
    const timer = setTimeout(() => {
      setDebouncedSearch(trimmed);
      if (!trimmed && hasInitial) {
        setRemoteCreators(null);
        setLoading(false);
      } else if (trimmed !== debouncedSearch) {
        setLoading(true);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm, hasInitial, debouncedSearch]);

  const fetchDirectory = async (
    queryText: string,
    offset: number,
    append: boolean,
  ) => {
    try {
      if (append) setLoadingMore(true);

      const params = new URLSearchParams({
        kind: "creators",
        offset: String(offset),
        limit: String(ITEMS_PER_PAGE),
      });
      if (queryText) params.set("q", queryText);

      const response = await fetch(`/api/public/explore?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to load creators");
      const data = (await response.json()) as {
        items?: Creator[];
        hasMore?: boolean;
      };
      const items = Array.isArray(data.items) ? data.items : [];

      if (append) {
        setRemoteCreators((prev) => {
          const base = prev ?? initialCreators;
          const seen = new Set(base.map((c) => c.handle));
          return [...base, ...items.filter((c) => !seen.has(c.handle))];
        });
      } else {
        setRemoteCreators(items);
      }
      setRemoteHasMore(Boolean(data.hasMore));
    } catch (error) {
      console.error("Error loading creators:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!debouncedSearch && hasInitial) return;
    let cancelled = false;

    async function load() {
      try {
        const params = new URLSearchParams({
          kind: "creators",
          offset: "0",
          limit: String(ITEMS_PER_PAGE),
        });
        if (debouncedSearch) params.set("q", debouncedSearch);
        const response = await fetch(`/api/public/explore?${params.toString()}`);
        if (!response.ok) throw new Error("Failed to load creators");
        const data = (await response.json()) as {
          items?: Creator[];
          hasMore?: boolean;
        };
        if (cancelled) return;
        setRemoteCreators(Array.isArray(data.items) ? data.items : []);
        setRemoteHasMore(Boolean(data.hasMore));
      } catch (error) {
        console.error("Error loading creators:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, hasInitial]);

  return (
    <div className="bg-canvas pb-14 text-fg">
      <section className="border-b border-line bg-canvas px-4 pb-10 pt-10 sm:px-6 sm:pb-12 sm:pt-14 lg:px-8">
        <div className="mx-auto w-full max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-label font-semibold text-brand-strong">
              Creator directory
            </p>
            <h1 className="mt-2 font-display text-display font-bold tracking-tight text-fg [text-wrap:balance] sm:text-hero">
              Explore creators
            </h1>
            <p className="mt-3 text-body-lg text-muted-fg">
              Artists, writers, podcasters, and builders supported directly on
              Agaseke.
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
                className="inline-flex min-h-10 items-center whitespace-nowrap rounded-control bg-brand-strong px-4 text-label font-semibold text-on-brand"
              >
                Creators
              </span>
              <Link
                href="/explore/posts"
                className="inline-flex min-h-10 items-center whitespace-nowrap rounded-control px-4 text-label font-semibold text-muted-fg transition-colors hover:bg-surface-raised hover:text-fg"
              >
                Posts &amp; articles
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
              <h2 className="text-caption font-semibold text-muted-fg">
                {debouncedSearch ? `Results for "${debouncedSearch}"` : "All creators"}
              </h2>
              <p aria-live="polite" className="text-label tabular-nums text-muted-fg">
                {creators.length} creator{creators.length === 1 ? "" : "s"}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {creators.map((creator) => {
                const focusLine = creator.focus?.slice(0, 2).join(" · ");
                return (
                  <Card
                    key={creator.handle}
                    className="group relative flex flex-col justify-between overflow-hidden p-5 transition-colors hover:border-line-strong"
                  >
                    <Link
                      href={`/${creator.handle}`}
                      className="absolute inset-0 z-10 outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                      aria-label={`View ${creator.name || creator.handle}'s profile`}
                    />

                    <div>
                      <div className="flex items-start gap-3.5">
                        <Avatar
                          src={creator.profilePicture || creator.photoURL}
                          name={creator.name || creator.handle}
                          size="lg"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h2 className="truncate font-display text-title font-bold text-fg transition-colors group-hover:text-brand-strong">
                              {creator.name || creator.handle}
                            </h2>
                            {creator.verified && (
                              <CheckCircle2
                                className="size-4 shrink-0 text-success"
                                aria-label="Verified creator"
                              />
                            )}
                          </div>
                          <p className="mt-0.5 truncate font-mono text-caption text-muted-fg">
                            agaseke.me/{creator.handle}
                            {focusLine ? ` · ${focusLine}` : ""}
                          </p>
                        </div>
                      </div>

                      {creator.bio && (
                        <p className="mt-3.5 line-clamp-2 text-label leading-relaxed text-muted-fg">
                          {creator.bio}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-line pt-3.5">
                      <span className="text-label font-semibold text-muted-fg transition-colors group-hover:text-fg">
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

            {creators.length === 0 && (
              <EmptyState
                icon={<Search className="size-6" aria-hidden="true" />}
                title="No creators found"
                description="Try another name, handle, or keyword."
                action={
                  searchTerm ? (
                    <Button variant="secondary" onClick={() => setSearchTerm("")}>
                      Clear search
                    </Button>
                  ) : undefined
                }
              />
            )}

            {hasMore && (
              <div className="mt-12 text-center">
                <Button
                  variant="secondary"
                  size="lg"
                  loading={loadingMore}
                  onClick={() =>
                    void fetchDirectory(debouncedSearch, creators.length, true)
                  }
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
