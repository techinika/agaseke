/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element -- public media URLs are signed/arbitrary */
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Search,
} from "lucide-react";
import Link from "next/link";
import { LinkifyText } from "@/components/ui/LinkifyText";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { SearchInput } from "@/components/ui/SearchInput";
import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";

const extractYouTubeId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]+)/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]+)/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

const hasYouTubeLink = (text: string): string | null => {
  const urls = text.match(/(https?:\/\/[^\s]+)/g);
  if (!urls) return null;
  for (const url of urls) {
    if (extractYouTubeId(url)) return url;
  }
  return null;
};

const ITEMS_PER_PAGE = 10;

const FILTERS = [
  { key: "all", label: "All" },
  { key: "posts", label: "Posts" },
  { key: "articles", label: "Articles" },
] as const;

function typeLabel(type?: string) {
  if (type === "video") return "Video";
  if (type === "image") return "Image";
  if (type === "document") return "Document";
  if (type === "article") return "Article";
  return "Post";
}

function toMillis(value: any): number {
  if (!value) return 0;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function formatPostDate(value: any): string {
  const ms = toMillis(value);
  if (!ms) return "Recently";
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ExplorePostsPage({
  initialPosts = [],
}: {
  initialPosts?: any[];
  initialCreatorEntries?: Array<[string, any]>;
}) {
  const hasInitial = initialPosts.length > 0;
  const [remotePosts, setRemotePosts] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(!hasInitial);
  const [loadingMore, setLoadingMore] = useState(false);
  const [remoteHasMore, setRemoteHasMore] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "articles" | "posts">("all");
  const [documentIndex, setDocumentIndex] = useState<Record<string, number>>({});
  const [viewingImage, setViewingImage] = useState<{
    url: string;
    title: string;
  } | null>(null);
  const [viewingDocument, setViewingDocument] = useState<{
    url: string;
    title: string;
  } | null>(null);

  const posts = remotePosts ?? initialPosts;
  const hasMore =
    remotePosts !== null
      ? remoteHasMore
      : !hasInitial || initialPosts.length >= ITEMS_PER_PAGE;

  useEffect(() => {
    const trimmed = searchTerm.trim();
    const timer = setTimeout(() => {
      if (!trimmed && typeFilter === "all" && hasInitial) {
        setDebouncedSearch("");
        setRemotePosts(null);
        setFetchError(null);
        setLoading(false);
        return;
      }
      setDebouncedSearch((prev) => {
        if (prev !== trimmed) {
          setLoading(true);
          setFetchError(null);
        }
        return trimmed;
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm, typeFilter, hasInitial]);

  const fetchPosts = useCallback(
    async (
      queryText: string,
      filter: "all" | "articles" | "posts",
      offset: number,
      append: boolean,
    ) => {
      try {
        if (append) setLoadingMore(true);
        setFetchError(null);

        const params = new URLSearchParams({
          kind: "posts",
          type: filter,
          offset: String(offset),
          limit: String(ITEMS_PER_PAGE),
        });
        if (queryText) params.set("q", queryText);

        const response = await fetch(`/api/public/explore?${params.toString()}`);
        if (!response.ok) throw new Error("Failed to load posts");
        const data = (await response.json()) as {
          items?: any[];
          hasMore?: boolean;
        };
        const items = Array.isArray(data.items) ? data.items : [];

        if (append) {
          setRemotePosts((prev) => {
            const base = prev ?? initialPosts;
            const seen = new Set(base.map((p) => p.id));
            return [...base, ...items.filter((p) => !seen.has(p.id))];
          });
        } else {
          setRemotePosts(items);
        }
        setRemoteHasMore(Boolean(data.hasMore));
      } catch (error) {
        console.error("Error fetching posts:", error);
        if (!append) {
          setFetchError("We couldn't complete your search. Please try again.");
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [initialPosts],
  );

  useEffect(() => {
    if (!debouncedSearch && typeFilter === "all" && hasInitial) {
      return;
    }

    const controller = new AbortController();

    async function load() {
      try {
        const params = new URLSearchParams({
          kind: "posts",
          type: typeFilter,
          offset: "0",
          limit: String(ITEMS_PER_PAGE),
        });
        if (debouncedSearch) params.set("q", debouncedSearch);
        const response = await fetch(`/api/public/explore?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Failed to load posts");
        const data = (await response.json()) as {
          items?: any[];
          hasMore?: boolean;
        };
        if (controller.signal.aborted) return;
        setRemotePosts(Array.isArray(data.items) ? data.items : []);
        setRemoteHasMore(Boolean(data.hasMore));
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("Error fetching posts:", error);
        if (!controller.signal.aborted) {
          setFetchError("We couldn't complete your search. Please try again.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => {
      controller.abort();
    };
  }, [debouncedSearch, typeFilter, hasInitial, reloadNonce]);

  const itemHref = (item: any): string =>
    item.type === "article" && item.slug
      ? `/articles/${item.slug}`
      : item.authorHandle
        ? `/${item.authorHandle}/community/${item.id}`
        : `/explore/posts/${item.id}`;

  return (
    <div className="bg-canvas pb-12 text-fg">
      <section className="border-b border-line bg-surface-sunken px-4 pb-10 pt-8 sm:px-6 sm:pb-12 sm:pt-12 lg:px-8">
        <div className="mx-auto w-full max-w-4xl">
          <div className="max-w-2xl">
            <p className="text-caption font-semibold text-brand-strong">Public feed</p>
            <h1 className="mt-2 text-display font-black tracking-tight text-fg sm:text-hero [text-wrap:balance]">
              Posts & articles
            </h1>
            <p className="mt-3 text-body-lg text-muted-fg">
              Essays, videos, photos, and updates shared openly by creators across
              Agaseke.
            </p>
          </div>

          <div className="mt-7 flex flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  const trimmed = searchTerm.trim();
                  if (!trimmed && typeFilter === "all" && hasInitial) {
                    setDebouncedSearch("");
                    setRemotePosts(null);
                    setFetchError(null);
                    setLoading(false);
                  } else {
                    setLoading(true);
                    setFetchError(null);
                    setDebouncedSearch(trimmed);
                  }
                }}
                className="w-full sm:max-w-md"
              >
                <SearchInput
                  label="Search posts"
                  placeholder="Search by title, keyword, or creator…"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  onClear={() => {
                    setSearchTerm("");
                    setDebouncedSearch("");
                    if (typeFilter === "all" && hasInitial) {
                      setRemotePosts(null);
                      setFetchError(null);
                      setLoading(false);
                    } else {
                      setLoading(true);
                      setFetchError(null);
                    }
                  }}
                  autoComplete="off"
                />
              </form>

              <nav
                aria-label="Explore sections"
                className="inline-flex items-center gap-1 self-start rounded-control border border-line bg-surface p-1"
              >
                <Link
                  href="/explore"
                  className="inline-flex min-h-10 items-center whitespace-nowrap rounded-control px-4 text-label font-semibold text-muted-fg transition-colors hover:bg-surface-raised hover:text-fg"
                >
                  Creators
                </Link>
                <span
                  aria-current="page"
                  className="inline-flex min-h-10 items-center whitespace-nowrap rounded-control bg-brand-strong px-4 text-label font-semibold text-on-brand"
                >
                  Posts & articles
                </span>
              </nav>
            </div>

            <div
              className="inline-flex items-center gap-1 self-start rounded-control border border-line bg-surface p-1"
              role="group"
              aria-label="Filter content"
            >
              {FILTERS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setTypeFilter(key);
                    if (key === "all" && !debouncedSearch && hasInitial) {
                      setRemotePosts(null);
                      setFetchError(null);
                      setLoading(false);
                    } else if (key !== typeFilter) {
                      setLoading(true);
                      setFetchError(null);
                    }
                  }}
                  aria-pressed={typeFilter === key}
                  className={cn(
                    "inline-flex min-h-10 items-center whitespace-nowrap rounded-control px-4 text-label font-semibold transition-colors",
                    typeFilter === key
                      ? "bg-brand-soft text-brand-strong"
                      : "text-muted-fg hover:bg-surface-raised hover:text-fg",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-4xl px-4 pt-8 sm:px-6 lg:px-8">
        {loading ? (
          <div className="space-y-5">
            {[1, 2, 3].map((item) => (
              <Card key={item} className="p-6">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-10" rounded="full" />
                  <div className="flex-1">
                    <SkeletonText lines={2} />
                  </div>
                </div>
                <SkeletonText lines={4} className="mt-5" />
              </Card>
            ))}
          </div>
        ) : fetchError ? (
          <ErrorState
            title="Could not load matching posts"
            description={fetchError}
            onRetry={() => {
              setLoading(true);
              setFetchError(null);
              setReloadNonce((n) => n + 1);
            }}
          />
        ) : (
          <>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-caption font-semibold text-muted-fg">
                {debouncedSearch
                  ? `Results for "${debouncedSearch}"`
                  : typeFilter === "articles"
                    ? "Latest articles"
                    : typeFilter === "posts"
                      ? "Latest posts"
                      : "Latest public feed"}
              </h2>
              <p aria-live="polite" className="text-label tabular-nums text-muted-fg">
                {posts.length} item{posts.length === 1 ? "" : "s"}
              </p>
            </div>

            <div className="space-y-5">
              {posts.map((item) => {
                const postUrl = itemHref(item);
                const bodyText =
                  item.shortDescription || item.description || item.content || "";
                const excerpt =
                  bodyText.length > 220
                    ? `${bodyText.slice(0, 220).trimEnd()}…`
                    : bodyText;

                return (
                  <Card key={item.id} className="overflow-hidden p-5 sm:p-6">
                    <div className="mb-4 flex items-center gap-3">
                      <Link
                        href={item.authorHandle ? `/${item.authorHandle}` : "/explore"}
                        className="shrink-0"
                      >
                        <Avatar src={item.authorPhoto} name={item.authorName} size="sm" />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <Link
                            href={item.authorHandle ? `/${item.authorHandle}` : "/explore"}
                            className="text-label font-bold text-fg transition-colors hover:text-brand-strong"
                          >
                            {item.authorName}
                          </Link>
                          <span className="text-caption text-muted-fg">
                            @{item.authorHandle}
                          </span>
                        </div>
                        <p className="text-caption text-muted-fg">
                          <span className="font-semibold text-brand-strong">
                            {typeLabel(item.type)}
                          </span>
                          {" · "}
                          {formatPostDate(item.publishedAt || item.createdAt)}
                        </p>
                      </div>
                    </div>

                    {item.type === "article" && (item.coverUrl || item.contentUrl) && (
                      <Link
                        href={postUrl}
                        className="mb-4 block overflow-hidden rounded-control bg-surface-raised"
                      >
                        <img
                          src={item.coverUrl || item.contentUrl}
                          alt={item.title || "Article cover"}
                          className="aspect-video w-full object-cover transition-transform duration-300 hover:scale-[1.02]"
                          loading="lazy"
                        />
                      </Link>
                    )}

                    {item.type === "image" && item.contentUrl && (
                      <button
                        type="button"
                        className="mb-4 block w-full overflow-hidden rounded-control bg-surface-raised text-left"
                        onClick={() =>
                          setViewingImage({
                            url: item.contentUrl,
                            title: item.title || "Post image",
                          })
                        }
                      >
                        <img
                          src={item.contentUrl}
                          alt={item.title || "Post image"}
                          className="max-h-96 w-full object-cover transition-opacity hover:opacity-90"
                          loading="lazy"
                        />
                      </button>
                    )}

                    {item.type === "video" && item.contentUrl && (
                      <div className="mb-4 overflow-hidden rounded-control bg-black">
                        <video
                          src={item.contentUrl}
                          controls
                          controlsList="nodownload"
                          className="aspect-video w-full"
                        />
                      </div>
                    )}

                    {item.type === "document" &&
                      item.contentUrl &&
                      (() => {
                        const pages = Array.isArray(item.contentUrl)
                          ? item.contentUrl
                          : [item.contentUrl];
                        const currentIndex = documentIndex[item.id] || 0;
                        const currentUrl = pages[currentIndex] || pages[0];
                        return (
                          <div className="mb-4 rounded-control border border-line bg-surface-sunken p-4">
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="flex size-11 items-center justify-center rounded-control bg-brand-soft text-brand-strong">
                                <FileText className="size-5" aria-hidden="true" />
                              </span>
                              <div className="flex-1">
                                <p className="text-label font-semibold text-fg">
                                  Document
                                </p>
                                <p className="text-caption text-muted-fg">
                                  {pages.length} page{pages.length > 1 ? "s" : ""}
                                </p>
                              </div>
                              {pages.length > 1 && (
                                <div className="flex items-center gap-1.5">
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    aria-label="Previous document page"
                                    disabled={currentIndex === 0}
                                    onClick={() =>
                                      setDocumentIndex((prev) => ({
                                        ...prev,
                                        [item.id]: Math.max(0, currentIndex - 1),
                                      }))
                                    }
                                  >
                                    <ChevronLeft className="size-4" aria-hidden="true" />
                                  </Button>
                                  <span className="text-caption font-semibold tabular-nums text-muted-fg">
                                    {currentIndex + 1}/{pages.length}
                                  </span>
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    aria-label="Next document page"
                                    disabled={currentIndex === pages.length - 1}
                                    onClick={() =>
                                      setDocumentIndex((prev) => ({
                                        ...prev,
                                        [item.id]: Math.min(
                                          pages.length - 1,
                                          currentIndex + 1,
                                        ),
                                      }))
                                    }
                                  >
                                    <ChevronRight className="size-4" aria-hidden="true" />
                                  </Button>
                                </div>
                              )}
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() =>
                                  setViewingDocument({
                                    url: currentUrl,
                                    title: item.title || "Document",
                                  })
                                }
                              >
                                Open PDF
                              </Button>
                            </div>
                          </div>
                        );
                      })()}

                    {item.title && (
                      <Link href={postUrl} className="group block">
                        <h3 className="text-title font-bold tracking-tight text-fg transition-colors group-hover:text-brand-strong">
                          {item.title}
                        </h3>
                      </Link>
                    )}

                    {excerpt && (
                      <div className="mt-2 whitespace-pre-wrap text-body leading-relaxed text-muted-fg">
                        <LinkifyText text={excerpt} />
                      </div>
                    )}

                    {(() => {
                      const ytLink = hasYouTubeLink(bodyText);
                      const videoId = ytLink ? extractYouTubeId(ytLink) : null;
                      if (!videoId) return null;
                      return (
                        <div className="mt-4 overflow-hidden rounded-control bg-black">
                          <iframe
                            src={`https://www.youtube.com/embed/${videoId}`}
                            className="aspect-video w-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            title={`Video: ${item.title || "Creator post"}`}
                          />
                        </div>
                      );
                    })()}

                    <div className="mt-5 flex items-center justify-between border-t border-line pt-3 text-caption text-muted-fg">
                      <span className="inline-flex items-center gap-1.5 tabular-nums">
                        {typeof item.views === "number" ? (
                          <>
                            <Eye className="size-3.5" aria-hidden="true" /> {item.views}{" "}
                            views
                          </>
                        ) : (
                          "Public post"
                        )}
                      </span>
                      <Link
                        href={postUrl}
                        className="inline-flex items-center gap-1 text-label font-semibold text-brand-strong hover:underline"
                      >
                        {item.type === "article" ? "Read article" : "Open post"}
                        <ArrowRight className="size-3.5" aria-hidden="true" />
                      </Link>
                    </div>
                  </Card>
                );
              })}
            </div>

            {posts.length === 0 && (
              <EmptyState
                icon={<Search className="size-6" aria-hidden="true" />}
                title="No posts found"
                description={
                  debouncedSearch
                    ? "Try a different search keyword."
                    : "No public content has been published yet."
                }
                action={
                  searchTerm || typeFilter !== "all" ? (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setSearchTerm("");
                        setDebouncedSearch("");
                        setTypeFilter("all");
                        if (hasInitial) {
                          setRemotePosts(null);
                          setLoading(false);
                        }
                      }}
                    >
                      Reset filters
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
                    void fetchPosts(debouncedSearch, typeFilter, posts.length, true)
                  }
                  trailingIcon={<ArrowRight className="size-4" aria-hidden="true" />}
                >
                  Load more
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <Dialog
        open={!!viewingImage}
        onClose={() => setViewingImage(null)}
        title={viewingImage?.title || "Post image"}
        size="xl"
        contentClassName="p-2 sm:p-4"
      >
        {viewingImage && (
          <img
            src={viewingImage.url}
            alt={viewingImage.title}
            className="max-h-[75dvh] w-full rounded-control object-contain"
          />
        )}
      </Dialog>

      <Dialog
        open={!!viewingDocument}
        onClose={() => setViewingDocument(null)}
        title={viewingDocument?.title || "Document"}
        size="xl"
        contentClassName="p-2 sm:p-4"
      >
        {viewingDocument && (
          <iframe
            src={`https://docs.google.com/viewer?url=${encodeURIComponent(viewingDocument.url)}&embedded=true`}
            className="h-[65dvh] w-full rounded-control border border-line"
            title={viewingDocument.title}
          />
        )}
      </Dialog>
    </div>
  );
}
