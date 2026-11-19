/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element -- public media URLs are signed/arbitrary */
"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  startAfter,
  DocumentData,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/db/firebase";
import {
  Search,
  FileText,
  Globe,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Eye,
  Calendar,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { LinkifyText } from "@/components/ui/LinkifyText";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
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

export default function ExplorePostsPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [creatorMap, setCreatorMap] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastVisible, setLastVisible] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "articles" | "posts">("all");
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const [documentIndex, setDocumentIndex] = useState<Record<string, number>>({});
  const [viewingImage, setViewingImage] = useState<{
    url: string;
    title: string;
  } | null>(null);
  const [viewingDocument, setViewingDocument] = useState<{
    url: string;
    title: string;
  } | null>(null);

  const fetchPosts = async (
    cmap: Map<string, any>,
    cursor: QueryDocumentSnapshot<DocumentData> | null,
  ) => {
    try {
      const postsRef = collection(db, "creatorContent");
      let q = query(
        postsRef,
        where("isPrivate", "==", false),
        orderBy("createdAt", "desc"),
        limit(ITEMS_PER_PAGE),
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
            authorName: creator?.name || creatorId.substring(0, 8) || "Unknown",
            authorHandle: creator?.handle || creatorId,
            authorPhoto: creator?.photoURL || null,
          };
        })
        .sort(
          (a: any, b: any) =>
            (b.publishedAt?.toMillis?.() ?? b.createdAt?.toMillis?.() ?? 0) -
            (a.publishedAt?.toMillis?.() ?? a.createdAt?.toMillis?.() ?? 0),
        );

      if (!cursor) setPosts(fetched);
      else setPosts((prev) => [...prev, ...fetched]);

      setLastVisible(snap.docs[snap.docs.length - 1] || null);
      if (snap.docs.length < ITEMS_PER_PAGE) setHasMore(false);
    } catch (error) {
      console.error("Error fetching posts:", error);
    }
  };

  useEffect(() => {
    async function init() {
      setLoading(true);
      const creatorsSnap = await getDocs(collection(db, "creators"));
      const map = new Map<string, any>();
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
      await fetchPosts(map, null);
      setLoading(false);
    }
    void init();
    // Fetch once on mount; later pages are triggered by the load-more button.
  }, []);

  const loadMore = async () => {
    if (!lastVisible || !hasMore) return;
    setLoadingMore(true);
    await fetchPosts(creatorMap, lastVisible);
    setLoadingMore(false);
  };

  const toggleExpand = (id: string) => {
    setExpandedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const itemHref = (item: any): string =>
    item.type === "article" && item.slug
      ? `/articles/${item.slug}`
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
      <section className="border-b border-line bg-surface-sunken px-4 pb-12 pt-16 sm:px-6 sm:pb-16 sm:pt-20 lg:px-8">
        <div className="mx-auto w-full max-w-4xl text-center">
          <Badge tone="brand" className="mb-4 px-3 py-1">
            <Sparkles className="size-3.5" aria-hidden="true" />
            Public content
          </Badge>
          <h1 className="text-display font-black text-fg sm:text-hero">
            Discover <span className="text-brand-strong">posts</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-body-lg text-muted-fg">
            Explore stories, videos, and creative work shared publicly by creators across
            Agaseke.
          </p>

          <div className="mx-auto mt-8 max-w-2xl text-left">
            <SearchInput
              label="Search posts"
              placeholder="Search by title, content, or creator..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              onClear={() => setSearchTerm("")}
              autoComplete="off"
            />
          </div>

          <div
            className="mx-auto mt-6 inline-flex items-center gap-1 rounded-pill border border-line bg-surface p-1 shadow-sm"
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
                  "inline-flex min-h-11 items-center rounded-pill px-5 text-label font-semibold transition-colors",
                  typeFilter === key
                    ? "bg-brand-strong text-on-brand"
                    : "text-muted-fg hover:bg-surface-raised hover:text-fg",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-4xl px-4 pt-8 sm:px-6 lg:px-8">
        {loading ? (
          <div className="space-y-5">
            {[1, 2, 3].map((item) => (
              <Card key={item} className="p-5">
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
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2 px-1">
              <h2 className="text-label font-bold uppercase tracking-wide text-muted-fg">
                {searchTerm
                  ? `Searching for "${searchTerm}"`
                  : typeFilter === "articles"
                    ? "Latest public articles"
                    : typeFilter === "posts"
                      ? "Latest public posts"
                      : "Latest public content"}
              </h2>
              <p aria-live="polite" className="text-label text-muted-fg">
                {filteredPosts.length} item{filteredPosts.length === 1 ? "" : "s"}
              </p>
            </div>

            <div className="space-y-5">
              {filteredPosts.map((item) => (
                <Card key={item.id} className="p-5 sm:p-6">
                  <div className="mb-4 flex items-center gap-3 border-b border-line pb-3">
                    <Link href={`/${item.authorHandle}`} className="shrink-0">
                      <Avatar src={item.authorPhoto} name={item.authorName} size="sm" />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/${item.authorHandle}`}
                        className="text-label font-bold text-fg transition-colors hover:text-brand-strong"
                      >
                        {item.authorName}
                      </Link>
                      <p className="truncate text-caption text-muted-fg">
                        @{item.authorHandle}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      <Badge tone="neutral">{typeLabel(item.type)}</Badge>
                      <Badge tone="success">
                        <Globe className="size-2.5" aria-hidden="true" /> Public
                      </Badge>
                    </div>
                  </div>

                  {item.type === "article" && (item.coverUrl || item.contentUrl) && (
                    <div className="mb-4 overflow-hidden rounded-control">
                      <img
                        src={item.coverUrl || item.contentUrl}
                        alt={item.title || "Article cover"}
                        className="h-48 w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}

                  {item.type === "image" && item.contentUrl && (
                    <button
                      type="button"
                      className="mb-4 block w-full overflow-hidden rounded-control text-left"
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
                        className="h-48 w-full object-cover transition-opacity hover:opacity-90"
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
                          <div className="mb-3 flex items-center gap-3">
                            <span className="flex size-12 items-center justify-center rounded-control bg-brand-soft text-brand-strong">
                              <FileText className="size-6" aria-hidden="true" />
                            </span>
                            <div className="flex-1">
                              <p className="text-label font-semibold text-fg">Document</p>
                              <p className="text-caption text-muted-fg">
                                {pages.length} page{pages.length > 1 ? "s" : ""}
                              </p>
                            </div>
                          </div>
                          {pages.length > 1 && (
                            <div className="mb-3 flex items-center justify-between">
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
                              <span className="text-label text-muted-fg">
                                {currentIndex + 1} of {pages.length}
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
                            fullWidth
                            onClick={() =>
                              setViewingDocument({
                                url: currentUrl,
                                title: item.title || "Document",
                              })
                            }
                          >
                            Read document
                          </Button>
                        </div>
                      );
                    })()}

                  {item.title && (
                    <Link href={itemHref(item)} className="group block">
                      <h3 className="text-title font-bold text-fg transition-colors group-hover:text-brand-strong">
                        {item.title}
                      </h3>
                    </Link>
                  )}

                  {(item.description || item.content) && (
                    <div className="mt-2 whitespace-pre-wrap text-label leading-relaxed text-muted-fg">
                      {item.type === "article" ? (
                        <>
                          <LinkifyText
                            text={
                              (item.description || item.content).length > 200
                                ? `${(item.description || item.content).slice(0, 200)}...`
                                : item.description || item.content
                            }
                          />
                          {(item.description || item.content).length > 200 && (
                            <Link
                              href={itemHref(item)}
                              className="ml-1 inline font-semibold text-brand-strong hover:underline"
                            >
                              Read more
                            </Link>
                          )}
                        </>
                      ) : (
                        <>
                          <LinkifyText
                            text={
                              (item.description || item.content).length > 200 &&
                              !expandedPosts.has(item.id)
                                ? (item.description || item.content).slice(0, 200)
                                : item.description || item.content
                            }
                          />
                          {(item.description || item.content).length > 200 && (
                            <button
                              type="button"
                              onClick={() => toggleExpand(item.id)}
                              className="ml-1 font-semibold text-brand-strong hover:underline"
                            >
                              {expandedPosts.has(item.id) ? "Read less" : "Read more"}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {(() => {
                    const text = item.description || item.content || "";
                    const ytLink = hasYouTubeLink(text);
                    const videoId = ytLink ? extractYouTubeId(ytLink) : null;
                    if (!videoId) return null;
                    return (
                      <div className="mt-4 overflow-hidden rounded-control bg-black">
                        <iframe
                          src={`https://www.youtube.com/embed/${videoId}`}
                          className="aspect-video w-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          title={`YouTube video: ${item.title || "Creator post"}`}
                        />
                      </div>
                    );
                  })()}

                  <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-3 text-caption text-muted-fg">
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3" aria-hidden="true" />
                      {item.createdAt?.toDate?.().toLocaleDateString() || "Recently"}
                    </span>
                    {item.views !== undefined && (
                      <span className="flex items-center gap-1">
                        <Eye className="size-3" aria-hidden="true" /> {item.views} views
                      </span>
                    )}
                    <Link
                      href={itemHref(item)}
                      className="ml-auto flex items-center gap-1 font-semibold text-brand-strong hover:underline"
                    >
                      {item.type === "article" ? "Read article" : "View post"}
                      <ArrowRight className="size-3" aria-hidden="true" />
                    </Link>
                  </div>
                </Card>
              ))}
            </div>

            {filteredPosts.length === 0 && (
              <EmptyState
                icon={<Search className="size-6" aria-hidden="true" />}
                title="No posts found"
                description={
                  searchTerm
                    ? "Try a different search term."
                    : typeFilter === "articles"
                      ? "No public articles have been published yet."
                      : typeFilter === "posts"
                        ? "No public posts have been published yet."
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
                  Load more posts
                </Button>
              </div>
            )}
          </>
        )}
      </main>

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
            className="max-h-[70dvh] w-full rounded-control object-contain"
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
            className="h-[60dvh] w-full rounded-control border border-line"
            title={viewingDocument.title}
          />
        )}
      </Dialog>
    </div>
  );
}
