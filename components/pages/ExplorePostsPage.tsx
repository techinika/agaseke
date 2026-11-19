/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element -- public media URLs are signed/arbitrary */
"use client";

import { useEffect, useState } from "react";
import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
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
  initialCreatorEntries = [],
}: {
  initialPosts?: any[];
  initialCreatorEntries?: Array<[string, any]>;
}) {
  const hasInitial = initialPosts.length > 0;
  const [posts, setPosts] = useState<any[]>(initialPosts);
  const [creatorMap, setCreatorMap] = useState<Map<string, any>>(
    () => new Map(initialCreatorEntries),
  );
  const [loading, setLoading] = useState(!hasInitial);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastVisible, setLastVisible] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(
    !hasInitial || initialPosts.length >= ITEMS_PER_PAGE,
  );
  const [searchTerm, setSearchTerm] = useState("");
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

  const ensureCreators = async (currentMap: Map<string, any>) => {
    if (currentMap.size > 0 && hasInitial) {
      return currentMap;
    }
    const [{ collection, getDocs }, { db }] = await Promise.all([
      import("firebase/firestore"),
      import("@/db/firebase"),
    ]);
    const creatorsSnap = await getDocs(collection(db, "creators"));
    const map = new Map<string, any>(currentMap);
    creatorsSnap.docs.forEach((doc) => {
      const data = doc.data();
      const entry = {
        name: data.name || doc.id,
        handle: doc.id,
        uid: data.uid,
        photoURL: data.profilePicture || data.photoURL || null,
      };
      map.set(doc.id, entry);
      if (data.uid) map.set(data.uid, entry);
    });
    setCreatorMap(map);
    return map;
  };

  const fetchPosts = async (
    cmap: Map<string, any>,
    cursor: QueryDocumentSnapshot<DocumentData> | null,
    pageLimit = ITEMS_PER_PAGE,
  ) => {
    try {
      const [{ collection, query, where, orderBy, limit, getDocs, startAfter }, { db }] =
        await Promise.all([import("firebase/firestore"), import("@/db/firebase")]);

      const postsRef = collection(db, "creatorContent");
      let q = query(
        postsRef,
        where("isPrivate", "==", false),
        orderBy("createdAt", "desc"),
        limit(pageLimit),
      );
      if (cursor) q = query(q, startAfter(cursor));

      const snap = await getDocs(q);
      const fetched = snap.docs
        .filter((doc) => doc.data().status !== "draft")
        .map((doc) => {
          const data = doc.data();
          const creatorId = data.creatorId || data.creatorUid || "";
          const creator =
            cmap.get(creatorId) || cmap.get(data.creatorUid) || cmap.get(data.creatorId);
          return {
            id: doc.id,
            ...data,
            authorName: creator?.name || creatorId.substring(0, 8) || "Creator",
            authorHandle: creator?.handle || creatorId,
            authorPhoto: creator?.photoURL || null,
          };
        })
        .sort(
          (a: any, b: any) =>
            (toMillis(b.publishedAt) || toMillis(b.createdAt)) -
            (toMillis(a.publishedAt) || toMillis(a.createdAt)),
        );

      if (!cursor) {
        setPosts(fetched);
      } else {
        setPosts((prev) => {
          const seen = new Set(prev.map((p) => p.id));
          return [...prev, ...fetched.filter((p) => !seen.has(p.id))];
        });
      }

      setLastVisible(snap.docs[snap.docs.length - 1] || null);
      if (snap.docs.length < pageLimit) setHasMore(false);
    } catch (error) {
      console.error("Error fetching posts:", error);
    }
  };

  useEffect(() => {
    if (hasInitial) return;
    async function init() {
      setLoading(true);
      const map = await ensureCreators(new Map());
      await fetchPosts(map, null);
      setLoading(false);
    }
    void init();
    // Fetch once on mount only when SSR data is absent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasInitial]);

  const loadMore = async () => {
    if (!hasMore) return;
    setLoadingMore(true);
    const map =
      creatorMap.size > 0 && !hasInitial
        ? creatorMap
        : await ensureCreators(creatorMap);
    await fetchPosts(
      map,
      lastVisible,
      lastVisible ? ITEMS_PER_PAGE : posts.length + ITEMS_PER_PAGE,
    );
    setLoadingMore(false);
  };

  const itemHref = (item: any): string =>
    item.type === "article" && item.slug
      ? `/articles/${item.slug}`
      : item.authorHandle
        ? `/${item.authorHandle}/community/${item.id}`
        : `/explore/posts/${item.id}`;

  const filteredPosts = (() => {
    let result = posts;
    if (typeFilter === "articles") result = result.filter((p) => p.type === "article");
    else if (typeFilter === "posts") result = result.filter((p) => p.type !== "article");

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (post) =>
          (post.title || "").toLowerCase().includes(term) ||
          (post.description || "").toLowerCase().includes(term) ||
          (post.authorName || "").toLowerCase().includes(term) ||
          (post.authorHandle || "").toLowerCase().includes(term),
      );
    }
    return result;
  })();

  return (
    <div className="min-h-screen bg-canvas pb-20 text-fg">
      <section className="border-b border-line bg-surface-sunken px-4 pb-10 pt-14 sm:px-6 sm:pb-12 sm:pt-16 lg:px-8">
        <div className="mx-auto w-full max-w-4xl">
          <div className="max-w-2xl">
            <p className="text-caption font-bold uppercase tracking-[0.16em] text-brand-strong">
              Public feed
            </p>
            <h1 className="mt-2 text-display font-black tracking-tight text-fg sm:text-hero">
              Posts & articles
            </h1>
            <p className="mt-3 text-body-lg text-muted-fg">
              Essays, videos, photos, and updates shared openly by creators across
              Agaseke.
            </p>
          </div>

          <div className="mt-7 flex flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <SearchInput
                label="Search posts"
                placeholder="Search by title, keyword, or creator…"
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
                <Link
                  href="/explore"
                  className="inline-flex min-h-10 items-center rounded-control px-4 text-label font-semibold text-muted-fg transition-colors hover:bg-surface-raised hover:text-fg"
                >
                  Creators
                </Link>
                <span
                  aria-current="page"
                  className="inline-flex min-h-10 items-center rounded-control bg-brand-strong px-4 text-label font-semibold text-on-brand"
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
                  onClick={() => setTypeFilter(key)}
                  aria-pressed={typeFilter === key}
                  className={cn(
                    "inline-flex min-h-9 items-center rounded-control px-4 text-label font-semibold transition-colors",
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
        ) : (
          <>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-caption font-bold uppercase tracking-wider text-muted-fg">
                {searchTerm
                  ? `Results for "${searchTerm}"`
                  : typeFilter === "articles"
                    ? "Latest articles"
                    : typeFilter === "posts"
                      ? "Latest posts"
                      : "Latest public feed"}
              </h2>
              <p aria-live="polite" className="text-label text-muted-fg">
                {filteredPosts.length} item{filteredPosts.length === 1 ? "" : "s"}
              </p>
            </div>

            <div className="space-y-5">
              {filteredPosts.map((item) => {
                const postUrl = itemHref(item);
                const bodyText = item.shortDescription || item.description || item.content || "";
                const excerpt =
                  bodyText.length > 220 ? `${bodyText.slice(0, 220).trimEnd()}…` : bodyText;

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
                                <p className="text-label font-semibold text-fg">Document</p>
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
                                  <span className="text-caption font-semibold text-muted-fg">
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
                      <span className="inline-flex items-center gap-1.5">
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

            {filteredPosts.length === 0 && (
              <EmptyState
                icon={<Search className="size-6" aria-hidden="true" />}
                title="No posts found"
                description={
                  searchTerm
                    ? "Try a different search keyword."
                    : "No public content has been published yet."
                }
              />
            )}

            {hasMore && !searchTerm && (
              <div className="mt-12 text-center">
                <Button
                  variant="secondary"
                  size="lg"
                  loading={loadingMore}
                  onClick={loadMore}
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
